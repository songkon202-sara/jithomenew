-- ย้อนกลับ 20_audit_identity.sql
DROP TRIGGER IF EXISTS jh_audit_identity ON public.audit_logs;
DROP FUNCTION IF EXISTS public.jh_audit_identity();
