-- ═══════════════════════════════════════════════════════════════════
-- JitHome — ลดการเปิดเผยข้อมูลผู้ป่วยตามหลัก PDPA (ใช้เท่าที่จำเป็น)
-- รันใน Supabase SQL Editor (รันซ้ำได้) · ย้อนกลับด้วย 08_rollback.sql
--
--  • รายงาน Telegram 07:00 น. คงชื่อเต็ม (กลุ่มมีเฉพาะเจ้าหน้าที่ — ตัดสินใจโดย รพ.สต. 30 ต.ค. 2569)
--    ต้องตรวจสมาชิกกลุ่มให้มีเฉพาะเจ้าหน้าที่อยู่เสมอ
--  1. งานตั้งเวลา 07:00 น. เรียกฟังก์ชันในฐานข้อมูลโดยตรง
--     → เลิกเก็บ Service Role Key ไว้ในตาราง cron
--  2. อสม. เห็นข้อมูลผู้ป่วยเฉพาะหมู่บ้านของตัวเอง (บังคับที่ฐานข้อมูล)
--     อสม. ที่ยังไม่ได้กำหนดหมู่บ้าน ยังเห็นทั้งหมดเหมือนเดิม จนกว่าแอดมินจะกำหนด
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. งานตั้งเวลา 07:00 น. (00:00 UTC) เรียกฟังก์ชันโดยตรง ───────
-- เดิมเรียก Edge Function send-telegram พร้อม Service Role Key ที่เก็บไว้ในตาราง cron
DO $$
BEGIN
  IF to_regnamespace('cron') IS NOT NULL THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'jithome-daily-notification';
    PERFORM cron.schedule('jithome-daily-notification', '0 0 * * *', 'SELECT public.send_overdue_notification()');
  END IF;
END $$;

-- ─── 2. อสม. เห็นเฉพาะหมู่บ้านของตัวเอง ─────────────────────────────
CREATE OR REPLACE FUNCTION public.jh_village()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(trim(village), '') FROM public.user_profiles
  WHERE id = auth.uid() AND COALESCE(status, 'active') = 'active'
$$;
REVOKE ALL ON FUNCTION public.jh_village() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.jh_village() TO authenticated;

-- เห็นข้อมูลของหมู่บ้าน v ได้ไหม: เจ้าหน้าที่/แอดมิน/ผู้สังเกตการณ์ เห็นทั้งหมด
-- อสม. เห็นเฉพาะหมู่บ้านตัวเอง (ยังไม่กำหนดหมู่บ้าน → เห็นทั้งหมด ชั่วคราว)
CREATE OR REPLACE FUNCTION public.jh_sees_village(v TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT CASE public.jh_role()
    WHEN 'admin'  THEN true
    WHEN 'staff'  THEN true
    WHEN 'viewer' THEN true
    WHEN 'aosomo' THEN public.jh_village() IS NULL OR v = public.jh_village()
    ELSE false END
$$;
GRANT EXECUTE ON FUNCTION public.jh_sees_village(TEXT) TO authenticated;

DO $$
DECLARE t TEXT;
BEGIN
  -- ตารางที่มีคอลัมน์ village ของตัวเอง
  FOREACH t IN ARRAY ARRAY['patients', 'home_visits'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS jh_select ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS jh_update ON public.%I', t);
    EXECUTE format($p$CREATE POLICY jh_select ON public.%I FOR SELECT TO authenticated
                    USING (public.jh_sees_village(village))$p$, t);
    EXECUTE format($p$CREATE POLICY jh_update ON public.%I FOR UPDATE TO authenticated
                    USING (public.jh_role() IN ('admin','staff','aosomo') AND public.jh_sees_village(village))
                    WITH CHECK (public.jh_role() IN ('admin','staff','aosomo'))$p$, t);
  END LOOP;
  -- ตารางที่อ้างผู้ป่วยผ่าน patient_id
  FOREACH t IN ARRAY ARRAY['injection_records', 'doctor_appointments'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS jh_select ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS jh_update ON public.%I', t);
    EXECUTE format($p$CREATE POLICY jh_select ON public.%I FOR SELECT TO authenticated
                    USING (public.jh_role() IN ('admin','staff','viewer')
                           OR (public.jh_role() = 'aosomo' AND (public.jh_village() IS NULL
                               OR EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.village = public.jh_village()))))$p$, t);
    EXECUTE format($p$CREATE POLICY jh_update ON public.%I FOR UPDATE TO authenticated
                    USING (public.jh_role() IN ('admin','staff')
                           OR (public.jh_role() = 'aosomo' AND (public.jh_village() IS NULL
                               OR EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.village = public.jh_village()))))
                    WITH CHECK (public.jh_role() IN ('admin','staff','aosomo'))$p$, t);
  END LOOP;
END $$;

-- ─── ตรวจผล ──────────────────────────────────────────────────────────
-- (ข) อสม. ที่ยังไม่ได้กำหนดหมู่บ้าน (ยังเห็นผู้ป่วยทุกหมู่บ้าน — แอดมินควรกำหนดให้)
-- (ค) หมู่บ้านของ อสม. ที่ไม่ตรงกับหมู่บ้านใดในทะเบียนผู้ป่วย (สะกดไม่ตรง → จะไม่เห็นผู้ป่วยเลย)
SELECT 'ข) อสม. ไม่มีหมู่บ้าน' AS ตรวจ, count(*)::text || ' คน' AS ผล
FROM public.user_profiles WHERE role = 'aosomo' AND COALESCE(status,'active') = 'active' AND NULLIF(trim(village), '') IS NULL
UNION ALL
SELECT 'ค) หมู่บ้าน อสม. ที่ไม่มีในทะเบียนผู้ป่วย', COALESCE(string_agg(DISTINCT u.village, ', '), 'ไม่มี (ถูกต้อง)')
FROM public.user_profiles u
WHERE u.role = 'aosomo' AND COALESCE(u.status,'active') = 'active' AND NULLIF(trim(u.village), '') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.patients p WHERE p.village = u.village);
