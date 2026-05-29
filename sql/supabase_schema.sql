-- ═══════════════════════════════════════════════════════════════
-- JitHome — Supabase Schema (PostgreSQL)
-- รัน SQL นี้ใน Supabase SQL Editor ก่อนรัน grants และ import
-- ═══════════════════════════════════════════════════════════════
SET search_path TO public;

-- Drop ของเก่าก่อน (ถ้ามี)
DROP VIEW  IF EXISTS public.monthly_trend   CASCADE;
DROP VIEW  IF EXISTS public.patient_status  CASCADE;
DROP TABLE IF EXISTS public.home_visits     CASCADE;
DROP TABLE IF EXISTS public.injection_records CASCADE;
DROP TABLE IF EXISTS public.patients        CASCADE;
DROP TABLE IF EXISTS public.app_settings    CASCADE;

-- ─── ตารางผู้ป่วย ────────────────────────────────────────────────
CREATE TABLE public.patients (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  village    TEXT NOT NULL DEFAULT '',
  note       TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ตารางประวัติฉีดยา ──────────────────────────────────────────
CREATE TABLE public.injection_records (
  id             BIGSERIAL PRIMARY KEY,
  patient_id     BIGINT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  injection_date DATE NOT NULL,
  group_color    TEXT NOT NULL DEFAULT 'yellow',
  group_label    TEXT NOT NULL DEFAULT '',
  interval_str   TEXT NOT NULL DEFAULT '1 เดือน',
  interval_days  INT  NOT NULL DEFAULT 30,
  note           TEXT NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ตารางเยี่ยมบ้าน ────────────────────────────────────────────
CREATE TABLE public.home_visits (
  id           BIGSERIAL PRIMARY KEY,
  patient_name TEXT NOT NULL DEFAULT '',
  village      TEXT NOT NULL DEFAULT '',
  visit_date   DATE NOT NULL,
  visitor      TEXT NOT NULL DEFAULT '',
  visit_type   TEXT NOT NULL DEFAULT 'aosomo',
  checklist    TEXT[] NOT NULL DEFAULT '{}',
  score        INT  NOT NULL DEFAULT 0,
  refer        BOOLEAN NOT NULL DEFAULT FALSE,
  note         TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── ตั้งค่าระบบ ─────────────────────────────────────────────────
CREATE TABLE public.app_settings (
  setting_key   TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL DEFAULT ''
);

-- ─── View: สถานะผู้ป่วย (รวมวันนัดล่าสุด) ────────────────────────
CREATE VIEW public.patient_status AS
SELECT
  p.id,
  p.name,
  p.village,
  p.note,
  ir.injection_date                                              AS last_date,
  ir.group_color,
  ir.group_label,
  ir.interval_str,
  ir.interval_days,
  ir.note                                                        AS last_note,
  (ir.injection_date + (ir.interval_days || ' days')::INTERVAL)::DATE AS next_date,
  ((ir.injection_date + (ir.interval_days || ' days')::INTERVAL)::DATE
    - CURRENT_DATE)::INT                                         AS days_until
FROM public.patients p
LEFT JOIN LATERAL (
  SELECT *
  FROM public.injection_records r
  WHERE r.patient_id = p.id
  ORDER BY r.injection_date DESC, r.id DESC
  LIMIT 1
) ir ON TRUE;

-- ─── View: แนวโน้มรายเดือน ───────────────────────────────────────
CREATE VIEW public.monthly_trend AS
SELECT
  TO_CHAR(injection_date, 'YYYY-MM')                            AS month_key,
  COUNT(*)                                                       AS total,
  COUNT(*) FILTER (WHERE group_color = 'red')                   AS red_count,
  COUNT(*) FILTER (WHERE group_color = 'yellow')                AS yellow_count,
  COUNT(*) FILTER (WHERE group_color = 'green')                 AS green_count
FROM public.injection_records
GROUP BY TO_CHAR(injection_date, 'YYYY-MM')
ORDER BY month_key;
