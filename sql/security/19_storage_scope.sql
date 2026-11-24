-- ═══════════════════════════════════════════════════════════════════
-- JitHome — จำกัดรูป/ไฟล์ผู้ป่วยที่ อสม. เปิดได้ (Storage bucket patient-files)
-- รันใน Supabase SQL Editor · ทำใน transaction เดียว · รันซ้ำได้ · ย้อนกลับ: 19_rollback.sql
-- (ต้องรัน 04_storage.sql และ 17_aosomo_visible.sql ก่อน)
--
--  เดิม: อสม. เปิดไฟล์ได้ทุกไฟล์ในคลัง (รูปบ้าน เอกสาร ลายเซ็น ของผู้ป่วยทุกคน)
--  ใหม่: อสม. เปิดได้เฉพาะ
--        • ไฟล์ที่ตัวเองอัปโหลด
--        • รูป/ไฟล์ของผู้ป่วยที่เจ้าหน้าที่ส่งให้ (หมู่บ้านตัวเอง)
--        • รูปในบันทึกเยี่ยมบ้านที่ตัวเองเห็นได้
--  แอดมิน/เจ้าหน้าที่: เหมือนเดิม · การอัปโหลด/แก้/ลบ: เหมือนเดิม
--  และปิดไม่ให้เปิดไฟล์จากลิงก์สาธารณะโดยไม่ล็อกอิน (bucket = private)
--  — แอปเปิดรูปด้วยลิงก์ชั่วคราว (signed URL) อยู่แล้ว ไม่กระทบการใช้งาน
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ไฟล์นี้เป็นของผู้ป่วยที่ อสม. คนนี้เห็นได้ไหม (เทียบท้ายลิงก์ที่เก็บไว้กับชื่อไฟล์)
CREATE OR REPLACE FUNCTION public.jh_aosomo_sees_file(obj text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.patients p
    WHERE p.aosomo_visible
      AND (public.jh_village() IS NULL OR p.village = public.jh_village())
      AND EXISTS (SELECT 1 FROM unnest(array_cat(COALESCE(p.photo_urls, '{}'::text[]),
                                                 ARRAY[p.photo_url, p.file_url, p.consent_signature])) u
                  WHERE u = obj OR right(u, length(obj) + 1) = '/' || obj)
  ) OR EXISTS (
    SELECT 1 FROM public.home_visits v
    WHERE v.photo_url IS NOT NULL
      AND (v.photo_url = obj OR right(v.photo_url, length(obj) + 1) = '/' || obj)
      AND public.jh_sees_village(v.village)
      AND (v.patient_id IS NULL OR public.jh_aosomo_sees_patient(v.patient_id))
  )
$$;
REVOKE ALL ON FUNCTION public.jh_aosomo_sees_file(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.jh_aosomo_sees_file(text) TO authenticated;

DROP POLICY IF EXISTS jh_files_select ON storage.objects;
CREATE POLICY jh_files_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'patient-files'
         AND (public.jh_role() IN ('admin', 'staff')
              OR (public.jh_role() = 'aosomo'
                  AND (owner = auth.uid() OR public.jh_aosomo_sees_file(name)))));

-- ปิดลิงก์สาธารณะ: ต้องล็อกอินและมีสิทธิ์จึงจะเปิดไฟล์ได้
UPDATE storage.buckets SET public = false WHERE id = 'patient-files';

COMMIT;

-- ─── ตรวจผล (ควรได้ public = false) ───
SELECT id AS bucket, public AS เปิดสาธารณะ,
       (SELECT count(*) FROM storage.objects o WHERE o.bucket_id = b.id) AS จำนวนไฟล์
FROM storage.buckets b WHERE id = 'patient-files';
