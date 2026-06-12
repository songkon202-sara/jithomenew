-- ═══════════════════════════════════════════════════════════════
-- JitHome — Migration: อัปเดต home_visits และตารางที่เกี่ยวข้อง
-- รัน SQL นี้ใน Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ─── home_visits: เพิ่มคอลัมน์ที่ขาดหายไป ────────────────────────
ALTER TABLE public.home_visits
  ADD COLUMN IF NOT EXISTS patient_id     BIGINT REFERENCES public.patients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS checks_json   TEXT    NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS photo_url     TEXT,
  ADD COLUMN IF NOT EXISTS assessment_json JSONB,
  ADD COLUMN IF NOT EXISTS refer_resolved  BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── patients: เพิ่มคอลัมน์ที่ขาดหายไป ─────────────────────────
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS house_no           TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS national_id        TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS disease_code       TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS disease_name       TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS medication_name    TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS oral_medication    TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS staff_responsible  TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS aosomo_responsible TEXT    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS visit_interval     INT,
  ADD COLUMN IF NOT EXISTS inject_interval    INT,
  ADD COLUMN IF NOT EXISTS next_visit_date    DATE,
  ADD COLUMN IF NOT EXISTS next_inject_date   DATE,
  ADD COLUMN IF NOT EXISTS photo_urls         TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS file_url           TEXT;

-- ─── audit_logs: สร้างตาราง (ถ้ายังไม่มี) ───────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID,
  user_email  TEXT,
  user_name   TEXT,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   TEXT,
  details     JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─── สิทธิ์ ───────────────────────────────────────────────────────
GRANT SELECT, INSERT ON public.audit_logs TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.audit_logs_id_seq TO anon, authenticated;

-- ─── อัปเดต View patient_status ให้รวมคอลัมน์ใหม่ ────────────────
CREATE OR REPLACE VIEW public.patient_status AS
SELECT
  p.id,
  p.name,
  p.village,
  p.note,
  p.house_no,
  p.national_id,
  p.disease_code,
  p.disease_name,
  p.medication_name,
  p.oral_medication,
  p.staff_responsible,
  p.aosomo_responsible,
  p.visit_interval,
  p.inject_interval,
  p.next_visit_date,
  p.next_inject_date,
  p.photo_urls,
  p.file_url,
  ir.injection_date                                              AS last_date,
  ir.group_color,
  ir.group_label,
  ir.interval_str,
  ir.interval_days,
  ir.note                                                        AS last_note,
  CASE
    WHEN ir.injection_date > CURRENT_DATE THEN ir.injection_date
    ELSE (ir.injection_date + (ir.interval_days || ' days')::INTERVAL)::DATE
  END                                                            AS next_date,
  CASE
    WHEN ir.injection_date > CURRENT_DATE
      THEN (ir.injection_date - CURRENT_DATE)::INT
    ELSE ((ir.injection_date + (ir.interval_days || ' days')::INTERVAL)::DATE
      - CURRENT_DATE)::INT
  END                                                            AS days_until
FROM public.patients p
LEFT JOIN LATERAL (
  SELECT *
  FROM public.injection_records r
  WHERE r.patient_id = p.id
  ORDER BY r.injection_date DESC, r.id DESC
  LIMIT 1
) ir ON TRUE;

GRANT SELECT ON public.patient_status TO anon, authenticated;
