-- ย้อนกลับ 16_hide_member_national_id.sql — คืนเลขบัตรเต็มกลับไปที่ตารางสมาชิก
BEGIN;
DROP TRIGGER IF EXISTS jh_member_nid_guard ON public.user_profiles;
UPDATE public.user_profiles p SET national_id = n.national_id
FROM public.jh_member_nid n WHERE n.user_id = p.id;
DROP FUNCTION IF EXISTS public.jh_member_nid_guard();
DROP TABLE IF EXISTS public.jh_member_nid;
COMMIT;
