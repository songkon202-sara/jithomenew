-- ย้อนกลับ 15_hide_national_id.sql — ให้แอปอ่านเลขบัตรเต็มได้เหมือนเดิม
BEGIN;
GRANT SELECT ON public.patients TO authenticated;
DROP FUNCTION IF EXISTS public.jh_find_patients_by_nid(text[]);
-- view: เปลี่ยนช่อง national_id กลับเป็นเลขเต็ม (คงคอลัมน์อื่นที่ไฟล์หลัง ๆ เพิ่มไว้)
DO $do$
DECLARE d text := pg_get_viewdef('public.patient_status'::regclass);
BEGIN
  IF d LIKE '%national_id_masked AS national_id%' THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.patient_status WITH (security_invoker = true) AS '
            || replace(d, 'national_id_masked AS national_id', 'national_id');
  END IF;
END $do$;
COMMIT;
-- หมายเหตุ: แอปเวอร์ชันปัจจุบันยังแสดงเลขแบบปิดบางส่วนกับทุกคนเหมือนเดิม
