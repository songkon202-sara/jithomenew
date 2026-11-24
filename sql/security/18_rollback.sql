-- ย้อนกลับ 18_enforce_mfa.sql — เลิกบังคับ 2FA ที่ฐานข้อมูล (แอปยังขอรหัส 6 หลักในหน้าจอเหมือนเดิม)
CREATE OR REPLACE FUNCTION public.jh_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_profiles
  WHERE id = auth.uid() AND COALESCE(status, 'active') = 'active'
$$;
