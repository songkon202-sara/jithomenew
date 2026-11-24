-- ย้อนกลับ 15_hide_national_id.sql — ให้แอปอ่านเลขบัตรเต็มได้เหมือนเดิม
BEGIN;
GRANT SELECT ON public.patients TO authenticated;
DROP FUNCTION IF EXISTS public.jh_find_patients_by_nid(text[]);
-- view: ใช้ national_id เต็มเหมือนไฟล์ 14 (รันไฟล์ 14_patient_color.sql ซ้ำได้เลย)
COMMIT;
-- จากนั้นรัน 14_patient_color.sql ซ้ำ เพื่อให้ view กลับไปใช้ national_id เต็ม
