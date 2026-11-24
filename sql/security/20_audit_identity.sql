-- ═══════════════════════════════════════════════════════════════════
-- JitHome — กันปลอมชื่อผู้ทำรายการใน Audit Log
-- รันใน Supabase SQL Editor · รันซ้ำได้ · ย้อนกลับ: 20_rollback.sql
--
--  เดิม: แอปส่งชื่อ/อีเมลผู้ทำรายการมาเอง — ผู้ใช้ที่เรียก API ตรง ใส่ชื่อคนอื่นได้
--  ใหม่: ฐานข้อมูลใส่รหัสผู้ใช้ ชื่อ และอีเมล จากบัญชีที่ล็อกอินอยู่จริงทุกครั้ง
--        (ค่าที่แอปส่งมาถูกแทนที่) · เวลาบันทึกใช้เวลาของเซิร์ฟเวอร์
--  บันทึกก่อนล็อกอิน (เช่น ใส่รหัสผิด) ยังบันทึกได้เหมือนเดิม แต่ระบุว่า "ยังไม่ได้ล็อกอิน"
--  การแก้/ลบ Audit Log: ผู้ใช้แอปทำไม่ได้อยู่แล้ว (ตั้งไว้ในไฟล์ 02)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.jh_audit_identity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NOT NULL THEN
    NEW.user_id := uid;
    SELECT COALESCE(NULLIF(p.display_name, ''), p.email), p.email
      INTO NEW.user_name, NEW.user_email
    FROM public.user_profiles p WHERE p.id = uid;
    IF NEW.user_email IS NULL THEN
      SELECT u.email INTO NEW.user_email FROM auth.users u WHERE u.id = uid;
    END IF;
  ELSIF current_setting('role', true) IN ('anon', 'authenticated') THEN
    -- ก่อนล็อกอิน: เก็บอีเมลที่พยายามเข้า (ไว้ดูการเดารหัสผ่าน) แต่ไม่เชื่อชื่อที่ส่งมา
    NEW.user_id := NULL;
    NEW.user_name := 'ยังไม่ได้ล็อกอิน';
  END IF;
  -- รายการจากระบบเอง (cron / trigger / SQL Editor) ใช้ค่าที่ส่งมา
  IF to_jsonb(NEW) ? 'created_at' THEN NEW.created_at := now(); END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.jh_audit_identity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS jh_audit_identity ON public.audit_logs;
CREATE TRIGGER jh_audit_identity BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.jh_audit_identity();

-- ─── ตรวจผล ───
SELECT tgname AS trigger, tgenabled AS เปิดใช้ FROM pg_trigger
WHERE tgrelid = 'public.audit_logs'::regclass AND NOT tgisinternal;
