-- ═══════════════════════════════════════════════════════════════════
-- JitHome — ปิดเลขบัตรประชาชนผู้ป่วย ไม่ให้ใครอ่านเลขเต็มผ่านแอปได้ (รวมแอดมิน)
-- รันใน Supabase SQL Editor · ทำใน transaction เดียว (ผิดพลาด = ไม่เปลี่ยนอะไร) · รันซ้ำได้
--
--  • แอป/API (ทุกบัญชี รวมแอดมิน และบัญชีที่ถูกขโมย) อ่านคอลัมน์ national_id ไม่ได้
--    ได้แค่ national_id_masked เช่น X-XXX1-234XX-XX-X (หลักที่ 5–8)
--  • ยังเพิ่ม/แก้เลขบัตรได้ตามเดิม (เขียนได้ อ่านไม่ได้)
--  • นำเข้าไฟล์: เทียบเลขบัตรซ้ำผ่านฟังก์ชัน jh_find_patients_by_nid
--    (ตอบแค่ว่าเลขที่ส่งไป ตรงกับผู้ป่วย id ไหน — ไม่ส่งเลขของคนอื่นกลับมา)
--  • เลขเต็มยังอยู่ในฐานข้อมูล ดูได้เฉพาะเจ้าของโปรเจกต์ใน Supabase SQL Editor
--  • ย้อนกลับ: 15_rollback.sql
--  หมายเหตุ: ถ้าเพิ่มคอลัมน์ใหม่ในตาราง patients ภายหลัง ให้รันไฟล์นี้ซ้ำ
--  (สิทธิ์อ่านให้ทีละคอลัมน์ คอลัมน์ใหม่จะยังอ่านไม่ได้จนกว่าจะรันซ้ำ)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- 1. คอลัมน์เลขบัตรแบบปิดบางส่วน (คำนวณอัตโนมัติทุกครั้งที่เลขบัตรเปลี่ยน)
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS national_id_masked text
  GENERATED ALWAYS AS (
    CASE
      WHEN regexp_replace(COALESCE(national_id, ''), '[^0-9]', '', 'g') = '' THEN ''
      WHEN length(regexp_replace(national_id, '[^0-9]', '', 'g')) = 13 THEN
        'X-XXX' || substr(regexp_replace(national_id, '[^0-9]', '', 'g'), 5, 1) || '-' ||
        substr(regexp_replace(national_id, '[^0-9]', '', 'g'), 6, 3) || 'XX-XX-X'
      ELSE 'X-XXXX-XXXXX-XX-X'
    END
  ) STORED;

-- 2. สิทธิ์อ่าน: ทุกคอลัมน์ ยกเว้น national_id
REVOKE SELECT ON public.patients FROM anon, authenticated;
DO $$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position) INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'patients' AND column_name <> 'national_id';
  EXECUTE format('GRANT SELECT (%s) ON public.patients TO authenticated', cols);
END $$;

-- 3. view ที่แอปใช้แสดงรายชื่อ: ช่อง national_id ส่งเลขที่ปิดแล้ว (โครงสร้างเดิมจากไฟล์ 14)
--    ข้ามถ้า view ส่งเลขที่ปิดอยู่แล้ว (เช่น รันไฟล์ 17 ไปแล้ว — กันลบคอลัมน์ที่ไฟล์ใหม่เพิ่มไว้)
DO $do$
BEGIN
  IF pg_get_viewdef('public.patient_status'::regclass) LIKE '%national_id_masked%' THEN
    RAISE NOTICE 'view patient_status ปิดเลขบัตรอยู่แล้ว — ข้าม';
  ELSE
    EXECUTE $v$
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
    p.group_color AS base_color
   FROM public.patients p
   LEFT JOIN LATERAL (
     SELECT r.id, r.patient_id, r.injection_date, r.group_color, r.group_label,
            r.interval_str, r.interval_days, r.note, r.created_at, r.record_type
     FROM public.injection_records r
     WHERE r.patient_id = p.id
     ORDER BY r.injection_date DESC, r.id DESC
     LIMIT 1) ir ON true
    $v$;
  END IF;
END $do$;

-- 4. เทียบเลขบัตรตอนนำเข้าไฟล์ (เฉพาะแอดมิน/เจ้าหน้าที่ · ครั้งละไม่เกิน 1,000 เลข)
CREATE OR REPLACE FUNCTION public.jh_find_patients_by_nid(nids text[])
RETURNS TABLE (nid text, patient_id bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.nid, p.id
  FROM (SELECT DISTINCT x AS nid FROM unnest(nids[1:1000]) x WHERE x ~ '^[0-9]{13}$') d
  JOIN public.patients p ON regexp_replace(COALESCE(p.national_id, ''), '[^0-9]', '', 'g') = d.nid
  WHERE public.jh_role() IN ('admin', 'staff')
$$;
REVOKE ALL ON FUNCTION public.jh_find_patients_by_nid(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.jh_find_patients_by_nid(text[]) TO authenticated;

COMMIT;

-- ─── ตรวจผล (ควรได้: อ่านเลขเต็มได้ = false · มีเลขบัตร = จำนวนผู้ป่วยที่มีเลข) ───
SELECT has_column_privilege('authenticated', 'public.patients', 'national_id', 'SELECT') AS อ่านเลขเต็มได้,
       has_column_privilege('authenticated', 'public.patients', 'national_id_masked', 'SELECT') AS อ่านเลขปิดได้,
       has_column_privilege('authenticated', 'public.patients', 'national_id', 'UPDATE') AS แก้เลขได้,
       (SELECT count(*) FROM public.patients WHERE national_id_masked <> '') AS มีเลขบัตร;
