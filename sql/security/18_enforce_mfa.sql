-- ═══════════════════════════════════════════════════════════════════
-- JitHome — บังคับยืนยันตัวตน 2 ขั้น (2FA) ของแอดมิน/เจ้าหน้าที่ ที่ฐานข้อมูล
-- รันใน Supabase SQL Editor · รันซ้ำได้ · ย้อนกลับ: 18_rollback.sql
--
--  เดิม: แอปขอรหัส 6 หลักเฉพาะในหน้าจอ — คนที่ได้รหัสผ่านไปเรียก API ตรงได้โดยไม่ต้องใช้ 2FA
--  ใหม่: ถ้าแอดมิน/เจ้าหน้าที่ยังไม่ได้ยืนยันรหัส 6 หลักในการเข้าระบบครั้งนั้น (aal2)
--        ฐานข้อมูลถือว่า "ไม่มีสิทธิ์" — อ่าน/แก้ข้อมูลผู้ป่วยไม่ได้เลย
--  อสม. และผู้สังเกตการณ์: เหมือนเดิม (ไม่บังคับ 2FA)
--
--  ⚠️ ก่อนรัน: ดูผลตรวจด้านล่างสุด — แอดมิน/เจ้าหน้าที่ที่ "ยังไม่ได้ตั้ง 2FA"
--     จะต้องตั้งค่าตอนเข้าระบบครั้งถัดไป (แอปบังคับอยู่แล้ว) ก่อนจะเห็นข้อมูล
--  ⚠️ ถ้ามือถือที่ใช้ 2FA หาย: เจ้าของโปรเจกต์ลบ factor ได้ที่ Supabase → Authentication → Users
--     → เลือกผู้ใช้ → ลบ MFA factor แล้วให้ผู้ใช้ตั้งใหม่ตอนเข้าระบบ
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.jh_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_profiles
  WHERE id = auth.uid() AND COALESCE(status, 'active') = 'active'
    AND (role NOT IN ('admin', 'staff')
         OR COALESCE(auth.jwt() ->> 'aal', 'aal1') = 'aal2')
$$;
REVOKE ALL ON FUNCTION public.jh_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.jh_role() TO authenticated;

-- ─── ตรวจผล: แอดมิน/เจ้าหน้าที่ที่ active และสถานะ 2FA ───
SELECT p.display_name AS ชื่อ, p.role AS บทบาท,
       CASE WHEN EXISTS (SELECT 1 FROM auth.mfa_factors f
                         WHERE f.user_id = p.id AND f.status = 'verified')
            THEN '✅ ตั้ง 2FA แล้ว' ELSE '⚠️ ยังไม่ได้ตั้ง — ต้องตั้งตอนเข้าระบบครั้งถัดไป' END AS สถานะ_2FA
FROM public.user_profiles p
WHERE p.role IN ('admin', 'staff') AND COALESCE(p.status, 'active') = 'active'
ORDER BY EXISTS (SELECT 1 FROM auth.mfa_factors f WHERE f.user_id = p.id AND f.status = 'verified'), 2, 1;
