-- JitHome — Supabase Schema
-- วางใน SQL Editor แล้วกด Run

SET search_path TO public;

-- DROP ของเก่าก่อน
DROP VIEW  IF EXISTS public.monthly_trend     CASCADE;
DROP VIEW  IF EXISTS public.patient_status    CASCADE;
DROP TABLE IF EXISTS public.home_visits       CASCADE;
DROP TABLE IF EXISTS public.injection_records CASCADE;
DROP TABLE IF EXISTS public.app_settings      CASCADE;
DROP TABLE IF EXISTS public.patients          CASCADE;

-- TABLES
CREATE TABLE public.patients (
  id         BIGSERIAL    PRIMARY KEY,
  name       VARCHAR(200) NOT NULL UNIQUE,
  village    VARCHAR(50)  DEFAULT '',
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE public.injection_records (
  id             BIGSERIAL   PRIMARY KEY,
  patient_id     BIGINT      NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  injection_date DATE        NOT NULL,
  group_color    VARCHAR(10) NOT NULL DEFAULT 'yellow'
                   CHECK (group_color IN ('red','yellow','green')),
  group_label    VARCHAR(50) DEFAULT '',
  interval_str   VARCHAR(30) DEFAULT '1 เดือน',
  interval_days  INT         DEFAULT 30,
  note           TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ir_patient_date ON public.injection_records (patient_id, injection_date);

CREATE TABLE public.home_visits (
  id           BIGSERIAL    PRIMARY KEY,
  patient_id   BIGINT       REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name VARCHAR(200) DEFAULT '',
  village      VARCHAR(50)  DEFAULT '',
  visit_type   VARCHAR(10)  NOT NULL DEFAULT 'aosomo'
                 CHECK (visit_type IN ('staff','aosomo')),
  visit_date   DATE         NOT NULL,
  visitor      VARCHAR(100) DEFAULT '',
  checks_json  TEXT,
  score        INT          DEFAULT 0,
  note         TEXT,
  refer        BOOLEAN      DEFAULT FALSE,
  next_appt    DATE,
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- ใช้ชื่อ app_settings แทน settings เพื่อหลีกเลี่ยง conflict
CREATE TABLE public.app_settings (
  setting_key   VARCHAR(100) PRIMARY KEY,
  setting_value TEXT         DEFAULT '',
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- DEFAULT SETTINGS
INSERT INTO public.app_settings (setting_key, setting_value) VALUES
  ('hospital_name',    'รพ.สต.สองคอน'),
  ('alert_days',       '1'),
  ('telegram_bot',     '@JitHomeBot'),
  ('telegram_chatid',  '-1001234567890'),
  ('line_token',       ''),
  ('sheets_url',       ''),
  ('cloud_backup',     '1'),
  ('hosxp_enabled',    '1'),
  ('line_enabled',     '1'),
  ('telegram_enabled', '1')
ON CONFLICT (setting_key) DO NOTHING;

-- VIEWS
CREATE VIEW public.patient_status AS
SELECT
  p.id,
  p.name,
  p.village,
  ir.id                                                           AS record_id,
  ir.injection_date                                               AS last_date,
  ir.group_color,
  ir.group_label,
  ir.interval_str,
  ir.interval_days,
  ir.note,
  ir.injection_date + (ir.interval_days || ' days')::INTERVAL     AS next_date,
  EXTRACT(DAY FROM
    (ir.injection_date + (ir.interval_days || ' days')::INTERVAL)
    - CURRENT_DATE
  )::INT                                                          AS days_until
FROM public.patients p
INNER JOIN public.injection_records ir ON ir.id = (
  SELECT id FROM public.injection_records r2
  WHERE r2.patient_id = p.id
  ORDER BY injection_date DESC, id DESC
  LIMIT 1
);

CREATE VIEW public.monthly_trend AS
SELECT
  TO_CHAR(injection_date, 'YYYY-MM')             AS month_key,
  COUNT(*)                                        AS total,
  COUNT(*) FILTER (WHERE group_color = 'red')     AS red_count,
  COUNT(*) FILTER (WHERE group_color = 'yellow')  AS yellow_count,
  COUNT(*) FILTER (WHERE group_color = 'green')   AS green_count
FROM public.injection_records
GROUP BY TO_CHAR(injection_date, 'YYYY-MM')
ORDER BY month_key;

-- ตรวจสอบ
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
