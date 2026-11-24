-- ย้อนกลับ 19_storage_scope.sql — อสม. เปิดไฟล์ได้ทุกไฟล์เหมือนเดิม
-- (สถานะ bucket public/private ไม่ย้อนอัตโนมัติ — ถ้าเดิมเป็น public และต้องการคืน ให้ตั้งเองในหน้า Storage)
BEGIN;
DROP POLICY IF EXISTS jh_files_select ON storage.objects;
CREATE POLICY jh_files_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'patient-files' AND public.jh_role() IN ('admin', 'staff', 'aosomo'));
DROP FUNCTION IF EXISTS public.jh_aosomo_sees_file(text);
COMMIT;
