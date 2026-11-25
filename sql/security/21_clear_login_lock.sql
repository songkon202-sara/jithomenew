-- ═══════════════════════════════════════════════════════════════════
-- JitHome — แก้ตัวนับ "ใส่รหัสผิด" ไม่ถูกล้างหลังเข้าระบบสำเร็จ
-- รันใน Supabase SQL Editor · รันซ้ำได้ · ย้อนกลับ: 21_rollback.sql
--
--  ปัญหา: แอปล้างตัวนับด้วยการลบแถวในตาราง login_lockouts โดยตรง แต่บัญชีผู้ใช้
--         ไม่มีสิทธิ์ลบ → ล้างไม่สำเร็จ (แอปไม่แจ้ง) → ใส่ผิดวันละครั้งก็สะสมจนถูกล็อก
--  แก้:   ฟังก์ชัน clear_my_login_lock() ลบได้เฉพาะตัวนับของบัญชีที่เพิ่งเข้าระบบสำเร็จ
--         (อ้างอีเมลจากบัญชีที่ล็อกอินอยู่จริง — ล้างของคนอื่นไม่ได้)
--  และล้างตัวนับเก่าที่ค้างสะสมของทุกบัญชีที่ไม่ได้ถูกล็อกอยู่ตอนนี้ (ครั้งเดียว)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.clear_my_login_lock()
RETURNS void LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.login_lockouts
  WHERE auth.uid() IS NOT NULL
    AND email = lower(auth.jwt() ->> 'email');
$$;
REVOKE ALL ON FUNCTION public.clear_my_login_lock() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_my_login_lock() TO authenticated;

-- ตัวนับที่ค้างจากปัญหานี้ (ไม่ล็อกอยู่ตอนนี้) — เริ่มนับใหม่
DELETE FROM public.login_lockouts WHERE locked_until IS NULL OR locked_until < now();

-- ─── ตรวจผล ───
SELECT has_table_privilege('authenticated', 'public.login_lockouts', 'DELETE') AS สิทธิ์ลบตารางเดิม_ของผู้ใช้,
       has_function_privilege('authenticated', 'public.clear_my_login_lock()', 'EXECUTE') AS ฟังก์ชันใหม่ใช้ได้,
       (SELECT count(*) FROM public.login_lockouts) AS ตัวนับที่ยังค้าง_ล็อกอยู่;
