-- ═══════════════════════════════════════════════════════════════════
-- JitHome — ลดการเปิดเผยข้อมูลผู้ป่วยตามหลัก PDPA (ใช้เท่าที่จำเป็น)
-- รันใน Supabase SQL Editor (รันซ้ำได้) · ย้อนกลับด้วย 08_rollback.sql
--
--  1. รายงาน Telegram 07:00 น. แสดงชื่อแบบปิดบางส่วน เช่น "ส*** แส***"
--     (ดูชื่อเต็มได้ในแอปซึ่งต้อง login)
--  2. งานตั้งเวลา 07:00 น. เรียกฟังก์ชันในฐานข้อมูลโดยตรง
--     → เลิกเก็บ Service Role Key ไว้ในตาราง cron
--  3. อสม. เห็นข้อมูลผู้ป่วยเฉพาะหมู่บ้านของตัวเอง (บังคับที่ฐานข้อมูล)
--     อสม. ที่ยังไม่ได้กำหนดหมู่บ้าน ยังเห็นทั้งหมดเหมือนเดิม จนกว่าแอดมินจะกำหนด
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. ฟังก์ชันปิดบังชื่อ (ตรงกับ maskPersonName() ในแอป) ─────────
CREATE OR REPLACE FUNCTION public.jh_mask_name(n TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(NULLIF(string_agg(left(w, CASE WHEN w ~ '^[เแโใไ]' THEN 2 ELSE 1 END) || '***', ' ' ORDER BY i), ''), 'ผู้ป่วย')
  FROM regexp_split_to_table(
         trim(regexp_replace(
           regexp_replace(COALESCE(n, ''), '^(นางสาว|นาง|นาย|น\.?\s*ส\.?|ด\.?\s*ช\.?|ด\.?\s*ญ\.?)[\s.]*', ''),
           '\.', ' ', 'g')),
         '\s+') WITH ORDINALITY AS t(w, i)
  WHERE w <> ''
$$;

-- ─── 2. รายงานผู้เกินนัด / นัดพรุ่งนี้ (ชื่อปิดบางส่วน) ───────────────
CREATE OR REPLACE FUNCTION public.send_overdue_notification()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  bot_token   TEXT;
  chat_id     TEXT;
  today       DATE := CURRENT_DATE;
  tomorrow    DATE := CURRENT_DATE + 1;
  th_months   TEXT[] := ARRAY['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  th_date     TEXT := EXTRACT(DAY FROM today)||' '||th_months[EXTRACT(MONTH FROM today)]||' '||(EXTRACT(YEAR FROM today)+543)::int;
  th_tomorrow TEXT := EXTRACT(DAY FROM tomorrow)||' '||th_months[EXTRACT(MONTH FROM tomorrow)]||' '||(EXTRACT(YEAR FROM tomorrow)+543)::int;
  msg         TEXT := '';
  inj_cnt     INT := 0;
  visit_cnt   INT := 0;
  appt_cnt    INT := 0;
  tinj_cnt    INT := 0;
  tvisit_cnt  INT := 0;
  tappt_cnt   INT := 0;
  r           RECORD;
BEGIN
  SELECT telegram_bot_token, telegram_chat_id INTO bot_token, chat_id
  FROM notification_settings WHERE enabled = true LIMIT 1;
  IF bot_token IS NULL THEN RETURN 'disabled'; END IF;

  SELECT COUNT(*) INTO inj_cnt   FROM patients WHERE next_inject_date < today AND next_inject_date IS NOT NULL;
  SELECT COUNT(*) INTO visit_cnt FROM patients WHERE next_visit_date  < today AND next_visit_date  IS NOT NULL;
  SELECT COUNT(*) INTO appt_cnt  FROM doctor_appointments WHERE appoint_date < today AND status NOT IN ('done','missed');
  SELECT COUNT(*) INTO tinj_cnt   FROM patients WHERE next_inject_date = tomorrow;
  SELECT COUNT(*) INTO tvisit_cnt FROM patients WHERE next_visit_date  = tomorrow;
  SELECT COUNT(*) INTO tappt_cnt  FROM doctor_appointments WHERE appoint_date = tomorrow AND status NOT IN ('done','missed');

  IF inj_cnt=0 AND visit_cnt=0 AND appt_cnt=0 AND tinj_cnt=0 AND tvisit_cnt=0 AND tappt_cnt=0 THEN
    RETURN 'no_data';
  END IF;

  msg := '🏥 <b>JiTHome — รายงานวันนี้</b>' || chr(10) || '📅 ' || th_date || chr(10)
      || '<i>ชื่อแสดงแบบย่อเพื่อคุ้มครองข้อมูล — ดูรายละเอียดในแอป</i>' || chr(10);

  IF tinj_cnt > 0 OR tvisit_cnt > 0 OR tappt_cnt > 0 THEN
    msg := msg || chr(10) || '📌 <b>นัดพรุ่งนี้ (' || th_tomorrow || ')</b>' || chr(10);
    IF tinj_cnt > 0 THEN
      msg := msg || chr(10) || '💉 นัดฉีดยา ' || tinj_cnt || ' ราย' || chr(10);
      FOR r IN SELECT name, village FROM patients WHERE next_inject_date = tomorrow ORDER BY village, name LIMIT 15 LOOP
        msg := msg || '• ' || jh_mask_name(r.name) || ' (' || COALESCE(r.village,'—') || ')' || chr(10);
      END LOOP;
      IF tinj_cnt > 15 THEN msg := msg || '…และอีก ' || (tinj_cnt-15) || ' ราย' || chr(10); END IF;
    END IF;
    IF tvisit_cnt > 0 THEN
      msg := msg || chr(10) || '🏡 นัดเยี่ยมบ้าน ' || tvisit_cnt || ' ราย' || chr(10);
      FOR r IN SELECT name, village FROM patients WHERE next_visit_date = tomorrow ORDER BY village, name LIMIT 15 LOOP
        msg := msg || '• ' || jh_mask_name(r.name) || ' (' || COALESCE(r.village,'—') || ')' || chr(10);
      END LOOP;
      IF tvisit_cnt > 15 THEN msg := msg || '…และอีก ' || (tvisit_cnt-15) || ' ราย' || chr(10); END IF;
    END IF;
    IF tappt_cnt > 0 THEN
      msg := msg || chr(10) || '🏥 นัดพบแพทย์ ' || tappt_cnt || ' ราย' || chr(10);
      FOR r IN SELECT p.name, p.village, da.hospital
               FROM doctor_appointments da JOIN patients p ON p.id = da.patient_id
               WHERE da.appoint_date = tomorrow AND da.status NOT IN ('done','missed')
               ORDER BY p.village, p.name LIMIT 10 LOOP
        msg := msg || '• ' || jh_mask_name(r.name) || ' (' || COALESCE(r.village,'—') || ') → ' || COALESCE(r.hospital,'') || chr(10);
      END LOOP;
      IF tappt_cnt > 10 THEN msg := msg || '…และอีก ' || (tappt_cnt-10) || ' ราย' || chr(10); END IF;
    END IF;
  END IF;

  IF inj_cnt > 0 OR visit_cnt > 0 OR appt_cnt > 0 THEN
    msg := msg || chr(10) || '─────────────' || chr(10) || '⚠️ <b>เกินนัด</b>' || chr(10);
    IF inj_cnt > 0 THEN
      msg := msg || chr(10) || '💉 เกินนัดฉีดยา ' || inj_cnt || ' ราย' || chr(10);
      FOR r IN SELECT name, village, today - next_inject_date AS days
               FROM patients WHERE next_inject_date < today AND next_inject_date IS NOT NULL
               ORDER BY next_inject_date LIMIT 15 LOOP
        msg := msg || '• ' || jh_mask_name(r.name) || ' (' || COALESCE(r.village,'—') || ') เกิน ' || r.days || ' วัน' || chr(10);
      END LOOP;
      IF inj_cnt > 15 THEN msg := msg || '…และอีก ' || (inj_cnt-15) || ' ราย' || chr(10); END IF;
    END IF;
    IF visit_cnt > 0 THEN
      msg := msg || chr(10) || '🏡 เกินนัดเยี่ยมบ้าน ' || visit_cnt || ' ราย' || chr(10);
      FOR r IN SELECT name, village, today - next_visit_date AS days
               FROM patients WHERE next_visit_date < today AND next_visit_date IS NOT NULL
               ORDER BY next_visit_date LIMIT 15 LOOP
        msg := msg || '• ' || jh_mask_name(r.name) || ' (' || COALESCE(r.village,'—') || ') เกิน ' || r.days || ' วัน' || chr(10);
      END LOOP;
      IF visit_cnt > 15 THEN msg := msg || '…และอีก ' || (visit_cnt-15) || ' ราย' || chr(10); END IF;
    END IF;
    IF appt_cnt > 0 THEN
      msg := msg || chr(10) || '🏥 เกินนัดพบแพทย์ ' || appt_cnt || ' ราย' || chr(10);
      FOR r IN SELECT p.name, p.village, today - da.appoint_date AS days
               FROM doctor_appointments da JOIN patients p ON p.id = da.patient_id
               WHERE da.appoint_date < today AND da.status NOT IN ('done','missed')
               ORDER BY da.appoint_date LIMIT 10 LOOP
        msg := msg || '• ' || jh_mask_name(r.name) || ' (' || COALESCE(r.village,'—') || ') เกิน ' || r.days || ' วัน' || chr(10);
      END LOOP;
      IF appt_cnt > 10 THEN msg := msg || '…และอีก ' || (appt_cnt-10) || ' ราย' || chr(10); END IF;
    END IF;
  END IF;

  PERFORM net.http_post(
    url  := 'https://api.telegram.org/bot' || bot_token || '/sendMessage',
    body := jsonb_build_object('chat_id', chat_id, 'text', msg, 'parse_mode', 'HTML')
  );
  RETURN 'sent';
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.send_overdue_notification() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.send_overdue_notification() TO authenticated;

-- ─── 3. งานตั้งเวลา 07:00 น. (00:00 UTC) เรียกฟังก์ชันโดยตรง ───────
-- เดิมเรียก Edge Function send-telegram พร้อม Service Role Key ที่เก็บไว้ในตาราง cron
DO $$
BEGIN
  IF to_regnamespace('cron') IS NOT NULL THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'jithome-daily-notification';
    PERFORM cron.schedule('jithome-daily-notification', '0 0 * * *', 'SELECT public.send_overdue_notification()');
  END IF;
END $$;

-- ─── 4. อสม. เห็นเฉพาะหมู่บ้านของตัวเอง ─────────────────────────────
CREATE OR REPLACE FUNCTION public.jh_village()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NULLIF(trim(village), '') FROM public.user_profiles
  WHERE id = auth.uid() AND COALESCE(status, 'active') = 'active'
$$;
REVOKE ALL ON FUNCTION public.jh_village() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.jh_village() TO authenticated;

-- เห็นข้อมูลของหมู่บ้าน v ได้ไหม: เจ้าหน้าที่/แอดมิน/ผู้สังเกตการณ์ เห็นทั้งหมด
-- อสม. เห็นเฉพาะหมู่บ้านตัวเอง (ยังไม่กำหนดหมู่บ้าน → เห็นทั้งหมด ชั่วคราว)
CREATE OR REPLACE FUNCTION public.jh_sees_village(v TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT CASE public.jh_role()
    WHEN 'admin'  THEN true
    WHEN 'staff'  THEN true
    WHEN 'viewer' THEN true
    WHEN 'aosomo' THEN public.jh_village() IS NULL OR v = public.jh_village()
    ELSE false END
$$;
GRANT EXECUTE ON FUNCTION public.jh_sees_village(TEXT) TO authenticated;

DO $$
DECLARE t TEXT;
BEGIN
  -- ตารางที่มีคอลัมน์ village ของตัวเอง
  FOREACH t IN ARRAY ARRAY['patients', 'home_visits'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS jh_select ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS jh_update ON public.%I', t);
    EXECUTE format($p$CREATE POLICY jh_select ON public.%I FOR SELECT TO authenticated
                    USING (public.jh_sees_village(village))$p$, t);
    EXECUTE format($p$CREATE POLICY jh_update ON public.%I FOR UPDATE TO authenticated
                    USING (public.jh_role() IN ('admin','staff','aosomo') AND public.jh_sees_village(village))
                    WITH CHECK (public.jh_role() IN ('admin','staff','aosomo'))$p$, t);
  END LOOP;
  -- ตารางที่อ้างผู้ป่วยผ่าน patient_id
  FOREACH t IN ARRAY ARRAY['injection_records', 'doctor_appointments'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS jh_select ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS jh_update ON public.%I', t);
    EXECUTE format($p$CREATE POLICY jh_select ON public.%I FOR SELECT TO authenticated
                    USING (public.jh_role() IN ('admin','staff','viewer')
                           OR (public.jh_role() = 'aosomo' AND (public.jh_village() IS NULL
                               OR EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.village = public.jh_village()))))$p$, t);
    EXECUTE format($p$CREATE POLICY jh_update ON public.%I FOR UPDATE TO authenticated
                    USING (public.jh_role() IN ('admin','staff')
                           OR (public.jh_role() = 'aosomo' AND (public.jh_village() IS NULL
                               OR EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.village = public.jh_village()))))
                    WITH CHECK (public.jh_role() IN ('admin','staff','aosomo'))$p$, t);
  END LOOP;
END $$;

-- ─── ตรวจผล ──────────────────────────────────────────────────────────
-- (ก) ตัวอย่างการปิดบังชื่อ
-- (ข) อสม. ที่ยังไม่ได้กำหนดหมู่บ้าน (ยังเห็นผู้ป่วยทุกหมู่บ้าน — แอดมินควรกำหนดให้)
-- (ค) หมู่บ้านของ อสม. ที่ไม่ตรงกับหมู่บ้านใดในทะเบียนผู้ป่วย (สะกดไม่ตรง → จะไม่เห็นผู้ป่วยเลย)
SELECT 'ก) ตัวอย่างชื่อ' AS ตรวจ, public.jh_mask_name('นาง สมหมาย แสงหิน') AS ผล
UNION ALL
SELECT 'ข) อสม. ไม่มีหมู่บ้าน', count(*)::text || ' คน'
FROM public.user_profiles WHERE role = 'aosomo' AND COALESCE(status,'active') = 'active' AND NULLIF(trim(village), '') IS NULL
UNION ALL
SELECT 'ค) หมู่บ้าน อสม. ที่ไม่มีในทะเบียนผู้ป่วย', COALESCE(string_agg(DISTINCT u.village, ', '), 'ไม่มี (ถูกต้อง)')
FROM public.user_profiles u
WHERE u.role = 'aosomo' AND COALESCE(u.status,'active') = 'active' AND NULLIF(trim(u.village), '') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.patients p WHERE p.village = u.village);
