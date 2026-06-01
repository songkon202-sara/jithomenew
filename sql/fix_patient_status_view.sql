-- ══════════════════════════════════════════════════════════════
-- แก้ไข View patient_status ให้คำนวณวันนัดถูกต้อง
-- รันใน Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════
--
-- ปัญหาเดิม: next_date = injection_date + interval เสมอ
--   → ถ้าบันทึกวันนัดล่วงหน้า (อนาคต) ระบบจะบวกเพิ่มอีก 1 รอบ
--
-- แก้ไข: ถ้า injection_date > วันนี้ ให้ใช้วันนั้นโดยตรง (ไม่บวก interval)
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.patient_status AS
SELECT
  p.id,
  p.name,
  p.village,
  p.note,
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
