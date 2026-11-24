-- ย้อนกลับ 17_aosomo_visible.sql — อสม. เห็นผู้ป่วยทุกคนในหมู่บ้านตัวเองเหมือนเดิม
-- (คอลัมน์ aosomo_visible และ view ยังอยู่ ไม่กระทบแอป · แค่เลิกใช้ในการกำหนดสิทธิ์)
BEGIN;
DROP TRIGGER IF EXISTS jh_guard_aosomo_visible ON public.patients;
DROP POLICY IF EXISTS jh_select ON public.patients;
CREATE POLICY jh_select ON public.patients FOR SELECT TO authenticated USING (public.jh_sees_village(village));
DROP POLICY IF EXISTS jh_update ON public.patients;
CREATE POLICY jh_update ON public.patients FOR UPDATE TO authenticated
  USING (public.jh_role() IN ('admin','staff','aosomo') AND public.jh_sees_village(village))
  WITH CHECK (public.jh_role() IN ('admin','staff','aosomo'));
DROP POLICY IF EXISTS jh_select ON public.home_visits;
CREATE POLICY jh_select ON public.home_visits FOR SELECT TO authenticated USING (public.jh_sees_village(village));
DROP POLICY IF EXISTS jh_update ON public.home_visits;
CREATE POLICY jh_update ON public.home_visits FOR UPDATE TO authenticated
  USING (public.jh_role() IN ('admin','staff','aosomo') AND public.jh_sees_village(village))
  WITH CHECK (public.jh_role() IN ('admin','staff','aosomo'));
DO $$
DECLARE t text;
BEGIN
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
DROP FUNCTION IF EXISTS public.jh_aosomo_sees_patient(bigint);
COMMIT;
