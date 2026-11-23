-- ═══════════════════════════════════════════════════════════════════
-- JitHome — รองรับ "ไม่มีนัด"
-- บันทึกที่เลือกรอบนัด "ไม่มีนัด" (interval_days = 0) จะไม่มีวันนัดครั้งต่อไป
-- และไม่ขึ้นว่าเกินนัด · รันซ้ำได้ (แก้เฉพาะ view patient_status)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.patient_status WITH (security_invoker = true) AS
 SELECT p.id, p.name, p.village, p.note, p.house_no, p.national_id,
    p.disease_code, p.disease_name, p.medication_name, p.oral_medication,
    p.staff_responsible, p.aosomo_responsible, p.visit_interval, p.inject_interval,
    p.next_visit_date, p.photo_urls, p.file_url,
    ir.injection_date AS last_date, ir.group_color, ir.group_label,
    ir.interval_str, ir.interval_days, ir.note AS last_note,
    CASE WHEN ir.injection_date > CURRENT_DATE THEN ir.injection_date
         WHEN ir.interval_days <= 0 THEN NULL
         ELSE (ir.injection_date + (ir.interval_days || ' days')::interval)::date END AS next_date,
    CASE WHEN ir.injection_date > CURRENT_DATE THEN ir.injection_date - CURRENT_DATE
         WHEN ir.interval_days <= 0 THEN NULL
         ELSE (ir.injection_date + (ir.interval_days || ' days')::interval)::date - CURRENT_DATE END AS days_until
   FROM public.patients p
   LEFT JOIN LATERAL (
     SELECT r.id, r.patient_id, r.injection_date, r.group_color, r.group_label,
            r.interval_str, r.interval_days, r.note, r.created_at, r.record_type
     FROM public.injection_records r
     WHERE r.patient_id = p.id
     ORDER BY r.injection_date DESC, r.id DESC
     LIMIT 1) ir ON true;

-- ─── ตรวจผล ──────────────────────────────────────────────────────────
SELECT 'รองรับ "ไม่มีนัด" แล้ว' AS ผล,
       count(*) FILTER (WHERE days_until < 0) AS เกินนัด,
       count(*) FILTER (WHERE last_date IS NOT NULL AND next_date IS NULL) AS ไม่มีนัด
FROM public.patient_status;
