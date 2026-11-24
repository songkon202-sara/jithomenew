-- ═══════════════════════════════════════════════════════════════════
-- JitHome — ปิดเลขบัตรประชาชนของสมาชิก (อสม./เจ้าหน้าที่) ไม่ให้ใครอ่านเลขเต็มผ่านแอปได้ (รวมแอดมิน)
-- รันใน Supabase SQL Editor · ทำใน transaction เดียว (ผิดพลาด = ไม่เปลี่ยนอะไร) · รันซ้ำได้
--
--  • เลขเต็มย้ายไปเก็บในตาราง jh_member_nid ซึ่งแอป/API อ่านไม่ได้เลย
--  • user_profiles.national_id เหลือแค่เลขที่ปิดแล้ว เช่น X-XXX1-234XX-XX-X
--  • สมัครสมาชิก/สร้างบัญชี อสม. ใส่เลขบัตรได้ตามเดิม — ระบบย้ายเลขเต็มไปเก็บและปิดเลขให้อัตโนมัติ
--  • เลขเต็มดูได้เฉพาะเจ้าของโปรเจกต์ใน SQL Editor:
--      SELECT p.display_name, n.national_id FROM public.jh_member_nid n JOIN public.user_profiles p ON p.id = n.user_id;
--  • ย้อนกลับ: 16_rollback.sql
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- 1. ตารางเก็บเลขเต็ม (ปิดสิทธิ์ทุกทางจากแอป)
CREATE TABLE IF NOT EXISTS public.jh_member_nid (
  user_id     uuid PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  national_id text NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.jh_member_nid ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.jh_member_nid FROM PUBLIC, anon, authenticated;

-- 2. รูปแบบเลขที่ปิดแล้ว (หลักที่ 5–8 แบบเดียวกับผู้ป่วย)
CREATE OR REPLACE FUNCTION public.jh_mask_nid(raw text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN d = '' THEN ''
    WHEN length(d) = 13 THEN 'X-XXX' || substr(d, 5, 1) || '-' || substr(d, 6, 3) || 'XX-XX-X'
    ELSE 'X-XXXX-XXXXX-XX-X' END
  FROM (SELECT regexp_replace(COALESCE(raw, ''), '[^0-9]', '', 'g') AS d) x
$$;

-- 3. ย้ายเลขเต็มของสมาชิกเดิม แล้วปิดเลขในตารางสมาชิก (ข้ามแถวที่ปิดไปแล้ว)
INSERT INTO public.jh_member_nid (user_id, national_id)
SELECT id, regexp_replace(national_id, '[^0-9]', '', 'g')
FROM public.user_profiles
WHERE national_id !~ 'X' AND regexp_replace(COALESCE(national_id, ''), '[^0-9]', '', 'g') <> ''
ON CONFLICT (user_id) DO UPDATE SET national_id = EXCLUDED.national_id, updated_at = now();

DROP TRIGGER IF EXISTS jh_member_nid_guard ON public.user_profiles;
UPDATE public.user_profiles SET national_id = public.jh_mask_nid(national_id)
WHERE national_id IS NOT NULL AND national_id <> '' AND national_id !~ 'X';

-- 4. ทุกครั้งที่บันทึกเลขบัตรใหม่: เก็บเลขเต็มแยก แล้วเหลือแค่เลขที่ปิดในตารางสมาชิก
CREATE OR REPLACE FUNCTION public.jh_member_nid_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE d text := regexp_replace(COALESCE(NEW.national_id, ''), '[^0-9]', '', 'g');
BEGIN
  IF NEW.national_id ~ 'X' THEN
    -- ส่งเลขที่ปิดแล้วกลับมา (เช่น upsert ทั้งแถว) = ไม่เปลี่ยนเลข
    -- (INSERT ... ON CONFLICT: ขั้น INSERT ต้องคงค่าไว้ ขั้น UPDATE จะใช้ค่าเดิมของแถว)
    -- ค่าที่ถูกต้องคือเลขปิดของเลขที่เก็บไว้ล่าสุด (กรณี upsert เลขใหม่ ขั้น INSERT เพิ่งบันทึกเลขใหม่ไว้)
    IF TG_OP = 'UPDATE' THEN
      NEW.national_id := COALESCE((SELECT public.jh_mask_nid(n.national_id) FROM public.jh_member_nid n WHERE n.user_id = NEW.id), OLD.national_id);
    END IF;
  ELSIF d = '' THEN
    IF TG_OP = 'UPDATE' AND NEW.national_id IS DISTINCT FROM OLD.national_id THEN
      DELETE FROM public.jh_member_nid WHERE user_id = NEW.id;   -- ลบเลขออก
    END IF;
    NEW.national_id := CASE WHEN TG_OP = 'UPDATE' AND NEW.national_id IS NOT DISTINCT FROM OLD.national_id
                            THEN OLD.national_id ELSE '' END;
  ELSE
    INSERT INTO public.jh_member_nid (user_id, national_id) VALUES (NEW.id, d)
    ON CONFLICT (user_id) DO UPDATE SET national_id = EXCLUDED.national_id, updated_at = now();
    NEW.national_id := public.jh_mask_nid(d);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.jh_member_nid_guard() FROM PUBLIC, anon, authenticated;

-- AFTER-insert ไม่ได้เพราะต้องแก้ค่าก่อนบันทึก → BEFORE · แต่ jh_member_nid อ้างอิง user_profiles
-- จึงต้องให้แถวสมาชิกมีอยู่ก่อน: FK ตรวจตอนจบคำสั่ง (DEFERRABLE)
ALTER TABLE public.jh_member_nid DROP CONSTRAINT IF EXISTS jh_member_nid_user_id_fkey;
ALTER TABLE public.jh_member_nid ADD CONSTRAINT jh_member_nid_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;

CREATE TRIGGER jh_member_nid_guard
  BEFORE INSERT OR UPDATE OF national_id ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.jh_member_nid_guard();

COMMIT;

-- ─── ตรวจผล (ควรได้: เลขเต็มที่ยังเหลือในตารางสมาชิก = 0) ───
SELECT (SELECT count(*) FROM public.jh_member_nid) AS เก็บเลขเต็มแยกแล้ว,
       (SELECT count(*) FROM public.user_profiles WHERE national_id ~ 'X') AS ปิดเลขแล้ว,
       (SELECT count(*) FROM public.user_profiles
         WHERE COALESCE(national_id, '') <> '' AND national_id !~ 'X') AS เลขเต็มที่ยังเหลือในตารางสมาชิก,
       has_table_privilege('authenticated', 'public.jh_member_nid', 'SELECT') AS แอปอ่านเลขเต็มได้;
