-- ═══════════════════════════════════════════════════════════════════
-- JitHome — สถานะ "เสียชีวิต"
-- ผู้เสียชีวิตไม่มีวันนัดครั้งต่อไป และไม่ขึ้นเกินนัด · ประวัติยังเก็บไว้ครบ
-- รันซ้ำได้ (รวมการแก้ "ไม่มีนัด" ของไฟล์ 12 ไว้ด้วย)
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS deceased_date date;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS deceased_note text;

CREATE OR REPLACE VIEW public.patient_status WITH (security_invoker = true) AS
 SELECT p.id, p.name, p.village, p.note, p.house_no, p.national_id,
    p.disease_code, p.disease_name, p.medication_name, p.oral_medication,
    p.staff_responsible, p.aosomo_responsible, p.visit_interval, p.inject_interval,
    p.next_visit_date, p.photo_urls, p.file_url,
    ir.injection_date AS last_date, ir.group_color, ir.group_label,
    ir.interval_str, ir.interval_days, ir.note AS last_note,
    CASE WHEN p.deceased_date IS NOT NULL THEN NULL
         WHEN ir.injection_date > CURRENT_DATE THEN ir.injection_date
         WHEN ir.interval_days <= 0 THEN NULL
         ELSE (ir.injection_date + (ir.interval_days || ' days')::interval)::date END AS next_date,
    CASE WHEN p.deceased_date IS NOT NULL THEN NULL
         WHEN ir.injection_date > CURRENT_DATE THEN ir.injection_date - CURRENT_DATE
         WHEN ir.interval_days <= 0 THEN NULL
         ELSE (ir.injection_date + (ir.interval_days || ' days')::interval)::date - CURRENT_DATE END AS days_until,
    p.deceased_date, p.deceased_note
   FROM public.patients p
   LEFT JOIN LATERAL (
     SELECT r.id, r.patient_id, r.injection_date, r.group_color, r.group_label,
            r.interval_str, r.interval_days, r.note, r.created_at, r.record_type
     FROM public.injection_records r
     WHERE r.patient_id = p.id
     ORDER BY r.injection_date DESC, r.id DESC
     LIMIT 1) ir ON true;

-- ─── ตรวจผล ──────────────────────────────────────────────────────────
SELECT 'เพิ่มสถานะเสียชีวิตแล้ว' AS ผล,
       count(*) FILTER (WHERE deceased_date IS NOT NULL) AS เสียชีวิต,
       count(*) FILTER (WHERE days_until < 0) AS เกินนัด
FROM public.patient_status;
