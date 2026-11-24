-- ═══════════════════════════════════════════════════════════════════
-- JitHome — เจ้าหน้าที่เลือกส่งผู้ป่วยให้ อสม. เห็น/เยี่ยมบ้าน ทีละราย
-- รันใน Supabase SQL Editor · ทำใน transaction เดียว (ผิดพลาด = ไม่เปลี่ยนอะไร) · รันซ้ำได้
-- (ต้องรัน 15_hide_national_id.sql ก่อน)
--
--  • patients.aosomo_visible = true → อสม. ของหมู่บ้านนั้นเห็นผู้ป่วยรายนี้
--  • เริ่มต้น: ซ่อนทุกคน (false) — อสม. จะไม่เห็นผู้ป่วยเลยจนกว่าเจ้าหน้าที่จะกดส่ง
--  • บังคับที่ฐานข้อมูล: อสม. ดึงรายชื่อ/ประวัติฉีดยา/นัดแพทย์/บันทึกเยี่ยมบ้าน
--    ของผู้ป่วยที่ไม่ได้ส่งไม่ได้ แม้เรียก API ตรง
--  • อสม. เปลี่ยนสถานะการส่งเองไม่ได้ (เฉพาะเจ้าหน้าที่/แอดมิน)
--  • ทุกครั้งที่ส่ง/ยกเลิก: บันทึกใน Audit Log (aosomo_share / aosomo_unshare) โดยฐานข้อมูลเอง
--    และเก็บ "ส่งล่าสุดโดยใคร เมื่อไร" ไว้ที่ตัวผู้ป่วย (aosomo_shared_by / aosomo_shared_at)
--  • เจ้าหน้าที่ แอดมิน ผู้สังเกตการณ์ เห็นทุกคนเหมือนเดิม
--  • ย้อนกลับ: 17_rollback.sql
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS aosomo_visible boolean NOT NULL DEFAULT false;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS aosomo_shared_at timestamptz;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS aosomo_shared_by text;
-- สิทธิ์อ่านรายคอลัมน์ (จากไฟล์ 15) — คอลัมน์ใหม่ต้องให้สิทธิ์อ่านเพิ่ม
GRANT SELECT (aosomo_visible, aosomo_shared_at, aosomo_shared_by) ON public.patients TO authenticated;

-- อสม. เห็นผู้ป่วยรายนี้ได้ไหม (ส่งแล้ว + หมู่บ้านตรง หรือ อสม. ยังไม่กำหนดหมู่บ้าน)
-- เรียกได้เฉพาะในนโยบาย RLS · SECURITY DEFINER เพื่อไม่ติด RLS ของ patients ซ้อนกัน
CREATE OR REPLACE FUNCTION public.jh_aosomo_sees_patient(pid bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.patients p
                 WHERE p.id = pid AND p.aosomo_visible
                   AND (public.jh_village() IS NULL OR p.village = public.jh_village()))
$$;
REVOKE ALL ON FUNCTION public.jh_aosomo_sees_patient(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.jh_aosomo_sees_patient(bigint) TO authenticated;

-- ─── patients ───
DROP POLICY IF EXISTS jh_select ON public.patients;
CREATE POLICY jh_select ON public.patients FOR SELECT TO authenticated
  USING (public.jh_role() IN ('admin', 'staff', 'viewer')
         OR (public.jh_role() = 'aosomo' AND aosomo_visible AND public.jh_sees_village(village)));
DROP POLICY IF EXISTS jh_update ON public.patients;
CREATE POLICY jh_update ON public.patients FOR UPDATE TO authenticated
  USING (public.jh_role() IN ('admin', 'staff')
         OR (public.jh_role() = 'aosomo' AND aosomo_visible AND public.jh_sees_village(village)))
  WITH CHECK (public.jh_role() IN ('admin', 'staff', 'aosomo'));

-- อสม./ผู้สังเกตการณ์ เปลี่ยนสถานะการส่งไม่ได้ · ทุกการเปลี่ยนแปลงบันทึกประวัติ
CREATE OR REPLACE FUNCTION public.jh_guard_aosomo_visible()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE who text;
BEGIN
  -- เจ้าของสิทธิ์อ้างจากบัญชีที่ล็อกอิน (ไม่ใช้ค่าที่แอปส่งมา)
  NEW.aosomo_shared_at := OLD.aosomo_shared_at;
  NEW.aosomo_shared_by := OLD.aosomo_shared_by;
  IF NEW.aosomo_visible IS NOT DISTINCT FROM OLD.aosomo_visible THEN RETURN NEW; END IF;
  IF public.jh_role() IN ('aosomo', 'viewer') THEN
    RAISE EXCEPTION 'เฉพาะเจ้าหน้าที่/แอดมิน เปลี่ยนการส่งให้ อสม. ได้';
  END IF;
  SELECT COALESCE(NULLIF(display_name, ''), email) INTO who FROM public.user_profiles WHERE id = auth.uid();
  who := COALESCE(who, 'ระบบ (SQL)');
  NEW.aosomo_shared_at := now();
  NEW.aosomo_shared_by := who;
  IF to_regclass('public.audit_logs') IS NOT NULL THEN
    INSERT INTO public.audit_logs (user_id, user_name, action, entity_type, entity_id, details)
    VALUES (auth.uid(), who, CASE WHEN NEW.aosomo_visible THEN 'aosomo_share' ELSE 'aosomo_unshare' END,
            'patient', NEW.id::text, jsonb_build_object('name', NEW.name, 'village', NEW.village));
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.jh_guard_aosomo_visible() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS jh_guard_aosomo_visible ON public.patients;
CREATE TRIGGER jh_guard_aosomo_visible BEFORE UPDATE OF aosomo_visible, aosomo_shared_at, aosomo_shared_by ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.jh_guard_aosomo_visible();

-- ─── บันทึกเยี่ยมบ้าน: อสม. เห็นเฉพาะของผู้ป่วยที่ส่งแล้ว (บันทึกที่ไม่ผูกผู้ป่วย เห็นตามหมู่บ้านเหมือนเดิม) ───
DROP POLICY IF EXISTS jh_select ON public.home_visits;
CREATE POLICY jh_select ON public.home_visits FOR SELECT TO authenticated
  USING (public.jh_sees_village(village)
         AND (public.jh_role() <> 'aosomo' OR patient_id IS NULL OR public.jh_aosomo_sees_patient(patient_id)));
DROP POLICY IF EXISTS jh_update ON public.home_visits;
CREATE POLICY jh_update ON public.home_visits FOR UPDATE TO authenticated
  USING (public.jh_role() IN ('admin', 'staff', 'aosomo') AND public.jh_sees_village(village)
         AND (public.jh_role() <> 'aosomo' OR patient_id IS NULL OR public.jh_aosomo_sees_patient(patient_id)))
  WITH CHECK (public.jh_role() IN ('admin', 'staff', 'aosomo'));

-- ─── ประวัติฉีดยา / นัดพบแพทย์ ───
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['injection_records', 'doctor_appointments'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS jh_select ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS jh_update ON public.%I', t);
    EXECUTE format($p$CREATE POLICY jh_select ON public.%I FOR SELECT TO authenticated
                    USING (public.jh_role() IN ('admin','staff','viewer')
                           OR (public.jh_role() = 'aosomo' AND public.jh_aosomo_sees_patient(patient_id)))$p$, t);
    EXECUTE format($p$CREATE POLICY jh_update ON public.%I FOR UPDATE TO authenticated
                    USING (public.jh_role() IN ('admin','staff')
                           OR (public.jh_role() = 'aosomo' AND public.jh_aosomo_sees_patient(patient_id)))
                    WITH CHECK (public.jh_role() IN ('admin','staff','aosomo'))$p$, t);
  END LOOP;
END $$;

-- ─── view รายชื่อ: เพิ่มช่อง aosomo_visible ต่อท้าย (ที่เหลือเหมือนไฟล์ 15) ───
CREATE OR REPLACE VIEW public.patient_status WITH (security_invoker = true) AS
 SELECT p.id, p.name, p.village, p.note, p.house_no, p.national_id_masked AS national_id,
    p.disease_code, p.disease_name, p.medication_name, p.oral_medication,
    p.staff_responsible, p.aosomo_responsible, p.visit_interval, p.inject_interval,
    p.next_visit_date, p.photo_urls, p.file_url,
    ir.injection_date AS last_date,
    COALESCE(ir.group_color, p.group_color) AS group_color,
    COALESCE(ir.group_label, CASE p.group_color WHEN 'red' THEN 'สุขภาพจิต กลุ่ม สีแดง'
                                                WHEN 'yellow' THEN 'สุขภาพจิต กลุ่ม สีเหลือง'
                                                WHEN 'green' THEN 'สุขภาพจิต กลุ่ม สีเขียว' END) AS group_label,
    ir.interval_str, ir.interval_days, ir.note AS last_note,
    CASE WHEN p.deceased_date IS NOT NULL THEN NULL
         WHEN ir.injection_date > CURRENT_DATE THEN ir.injection_date
         WHEN ir.interval_days <= 0 THEN NULL
         ELSE (ir.injection_date + (ir.interval_days || ' days')::interval)::date END AS next_date,
    CASE WHEN p.deceased_date IS NOT NULL THEN NULL
         WHEN ir.injection_date > CURRENT_DATE THEN ir.injection_date - CURRENT_DATE
         WHEN ir.interval_days <= 0 THEN NULL
         ELSE (ir.injection_date + (ir.interval_days || ' days')::interval)::date - CURRENT_DATE END AS days_until,
    p.deceased_date, p.deceased_note,
    p.group_color AS base_color,
    p.aosomo_visible, p.aosomo_shared_at, p.aosomo_shared_by
   FROM public.patients p
   LEFT JOIN LATERAL (
     SELECT r.id, r.patient_id, r.injection_date, r.group_color, r.group_label,
            r.interval_str, r.interval_days, r.note, r.created_at, r.record_type
     FROM public.injection_records r
     WHERE r.patient_id = p.id
     ORDER BY r.injection_date DESC, r.id DESC
     LIMIT 1) ir ON true;

COMMIT;

-- ─── ตรวจผล ───
SELECT count(*) AS ผู้ป่วยทั้งหมด,
       count(*) FILTER (WHERE aosomo_visible) AS ส่งให้_อสม_แล้ว,
       count(*) FILTER (WHERE NOT aosomo_visible) AS ซ่อนจาก_อสม
FROM public.patients;
