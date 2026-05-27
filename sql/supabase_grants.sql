-- JitHome: Grant anon role access to all tables (run in Supabase SQL Editor)
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients          TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.injection_records TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.home_visits       TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE          ON public.app_settings     TO anon, authenticated;
GRANT SELECT ON public.patient_status TO anon, authenticated;
GRANT SELECT ON public.monthly_trend  TO anon, authenticated;

GRANT USAGE, SELECT ON SEQUENCE public.patients_id_seq          TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.injection_records_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.home_visits_id_seq       TO anon, authenticated;
