-- ═══════════════════════════════════════════════════════════════════
-- JitHome — เก็บกลุ่มสีไว้ที่ตัวผู้ป่วยด้วย
-- ตั้งสีได้แม้ยังไม่มีบันทึกฉีดยา · สีที่แสดง = สีจากบันทึกล่าสุด ถ้าไม่มีบันทึกใช้สีของผู้ป่วย
-- รันซ้ำได้ (รวมการแก้ของไฟล์ 12 "ไม่มีนัด" และ 13 "เสียชีวิต" ไว้ด้วย)
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS group_color text;
ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS patients_group_color_check;
ALTER TABLE public.patients ADD CONSTRAINT patients_group_color_check
  CHECK (group_color IS NULL OR group_color IN ('red', 'yellow', 'green'));
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS deceased_date date;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS deceased_note text;

-- ผู้ป่วยที่มีบันทึกแล้ว: คัดลอกสีจากบันทึกล่าสุดมาเก็บที่ตัวผู้ป่วย (ไม่ทับค่าที่มี)
UPDATE public.patients p
SET group_color = r.group_color
FROM (SELECT DISTINCT ON (patient_id) patient_id, group_color
      FROM public.injection_records
      WHERE group_color IN ('red', 'yellow', 'green')
      ORDER BY patient_id, injection_date DESC, id DESC) r
WHERE r.patient_id = p.id AND p.group_color IS NULL;

-- ถ้ารันไฟล์ 15 (ปิดเลขบัตร) ไปแล้ว ไม่สร้าง view นี้ซ้ำ — กันเลขบัตรเต็มกลับมา / คอลัมน์ใหม่หาย
DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public'
             AND table_name = 'patients' AND column_name = 'national_id_masked') THEN
    RAISE NOTICE 'รันไฟล์ 15 แล้ว — ข้ามการสร้าง view (ใช้ของไฟล์ 15/17)';
  ELSE
    EXECUTE $v$
CREATE OR REPLACE VIEW public.patient_status WITH (security_invoker = true) AS
 SELECT p.id, p.name, p.village, p.note, p.house_no, p.national_id,
    p.disease_code, p.disease_name, p.medication_name, p.oral_medication,
    p.staff_responsible, p.aosomo_responsible, p.visit_interval, p.inject_interval,
    p.next_visit_date, p.photo_urls, p.file_url,
    ir.injection_date AS last_date,
    COALESCE(ir.group_color, p.group_color) AS group_color,
    COALESCE(ir.group_label, CASE p.group_color WHEN 'red' THEN 'สุขภาพจิต กลุ่ม สีแดง'
                                                WHEN 'yellow' THEN 'สุขภาพจิต กลุ่ม สีเหลือง'
                                                WHEN 'green' THEN 'สุขภาพจิต กลุ่ม สีเขียว' END) AS group_label,
    ir.interval_str, ir.interval_days, ir.note AS last_note,
    CASE WHEN p.deceased_date IS NOT NULL THEN NULL
         WHEN ir.injection_date > CURRENT_DATE THEN ir.injection_date
         WHEN ir.interval_days <= 0 THEN NULL
         ELSE (ir.injection_date + (ir.interval_days || ' days')::interval)::date END AS next_date,
    CASE WHEN p.deceased_date IS NOT NULL THEN NULL
         WHEN ir.injection_date > CURRENT_DATE THEN ir.injection_date - CURRENT_DATE
         WHEN ir.interval_days <= 0 THEN NULL
         ELSE (ir.injection_date + (ir.interval_days || ' days')::interval)::date - CURRENT_DATE END AS days_until,
    p.deceased_date, p.deceased_note,
    p.group_color AS base_color
   FROM public.patients p
   LEFT JOIN LATERAL (
     SELECT r.id, r.patient_id, r.injection_date, r.group_color, r.group_label,
            r.interval_str, r.interval_days, r.note, r.created_at, r.record_type
     FROM public.injection_records r
     WHERE r.patient_id = p.id
     ORDER BY r.injection_date DESC, r.id DESC
     LIMIT 1) ir ON true
    $v$;
  END IF;
END $do$;

-- ─── ตรวจผล ──────────────────────────────────────────────────────────
SELECT CASE WHEN COALESCE(trim(p.disease_code), '') = '' THEN '🛡️ กลุ่มเสี่ยง' ELSE '🩺 กลุ่มป่วย' END AS กลุ่ม,
       count(*) FILTER (WHERE s.group_color = 'red')    AS แดง,
       count(*) FILTER (WHERE s.group_color = 'yellow') AS เหลือง,
       count(*) FILTER (WHERE s.group_color = 'green')  AS เขียว,
       count(*) FILTER (WHERE s.group_color IS NULL)    AS ยังไม่มีสี
FROM public.patients p JOIN public.patient_status s ON s.id = p.id
WHERE p.deceased_date IS NULL
GROUP BY 1 ORDER BY 1;
