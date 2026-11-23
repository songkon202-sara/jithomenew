-- ═══════════════════════════════════════════════════════════════════
-- JitHome — เติม ADL และ "สูงอายุ" จากหมายเหตุที่นำเข้า (ต้องรัน 09_risk_groups.sql ก่อน)
-- หมายเหตุรูปแบบ "ผู้สูงอายุติดบ้านติดเตียง ADL <คะแนน> กลุ่ม <n>"
-- เกณฑ์ Barthel ADL: 0–4 ติดเตียง · 5–11 ติดบ้าน · 12–20 ติดสังคม
-- ไม่ทับค่าที่กรอกไว้แล้ว · รันซ้ำได้
-- ═══════════════════════════════════════════════════════════════════

-- อนุญาตค่า elderly (ติ๊ก "สูงอายุ" เมื่อยังไม่ทราบวันเกิด)
ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS patients_risk_flags_check;
ALTER TABLE public.patients ADD CONSTRAINT patients_risk_flags_check
  CHECK (risk_flags <@ ARRAY['elderly', 'smiv', 'disabled', 'alone', 'substance']::text[]);

-- ADL จากคะแนนในหมายเหตุ
UPDATE public.patients
SET adl_group = CASE
      WHEN (substring(note from '(?i)adl\s*(\d{1,2})'))::int <= 4  THEN 'bed'
      WHEN (substring(note from '(?i)adl\s*(\d{1,2})'))::int <= 11 THEN 'home'
      ELSE 'social' END
WHERE adl_group IS NULL
  AND note ~* 'adl\s*\d{1,2}'
  AND (substring(note from '(?i)adl\s*(\d{1,2})'))::int BETWEEN 0 AND 20;

-- สูงอายุ จากคำว่า "ผู้สูงอายุ" ในหมายเหตุ
UPDATE public.patients
SET risk_flags = array_append(risk_flags, 'elderly')
WHERE note LIKE '%ผู้สูงอายุ%'
  AND NOT ('elderly' = ANY(risk_flags));

-- ─── ตรวจผล ──────────────────────────────────────────────────────────
SELECT count(*) FILTER (WHERE adl_group = 'social')        AS ติดสังคม,
       count(*) FILTER (WHERE adl_group = 'home')          AS ติดบ้าน,
       count(*) FILTER (WHERE adl_group = 'bed')           AS ติดเตียง,
       count(*) FILTER (WHERE 'elderly' = ANY(risk_flags)) AS สูงอายุ
FROM public.patients;
