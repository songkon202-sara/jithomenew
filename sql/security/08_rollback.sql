-- ═══════════════════════════════════════════════════════════════════
-- JitHome — ย้อนกลับการจำกัดหมู่บ้านของ อสม. (08_pdpa_minimize.sql ข้อ 2)
-- คืน policy เดิมจาก 02_lockdown.sql: ผู้ใช้ active ทุกคนเห็นผู้ป่วยทุกหมู่บ้าน
-- (ไม่ย้อนงาน 07:00 น. และผู้รับแจ้งเหตุ — สองส่วนนั้นไม่กระทบการใช้งาน)
-- ═══════════════════════════════════════════════════════════════════
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['patients', 'home_visits', 'injection_records', 'doctor_appointments'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS jh_select ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS jh_update ON public.%I', t);
    EXECUTE format($p$CREATE POLICY jh_select ON public.%I FOR SELECT TO authenticated
                    USING (public.jh_role() IS NOT NULL)$p$, t);
    EXECUTE format($p$CREATE POLICY jh_update ON public.%I FOR UPDATE TO authenticated
                    USING (public.jh_role() IN ('admin','staff','aosomo'))
                    WITH CHECK (public.jh_role() IN ('admin','staff','aosomo'))$p$, t);
  END LOOP;
END $$;
SELECT 'ย้อนกลับแล้ว: อสม. เห็นผู้ป่วยทุกหมู่บ้าน' AS status;
