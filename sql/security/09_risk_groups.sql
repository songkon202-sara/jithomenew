-- ═══════════════════════════════════════════════════════════════════
-- JitHome — กลุ่มเสี่ยงของผู้ป่วย
-- รันใน Supabase SQL Editor (รันซ้ำได้ ไม่ลบข้อมูล)
--
--   birth_date : วันเกิด → ระบบคำนวณอายุ และจัดกลุ่มสูงอายุ (60 ปีขึ้นไป)
--   adl_group  : social = ติดสังคม · home = ติดบ้าน · bed = ติดเตียง
--   risk_flags : smiv = SMI-V · disabled = พิการ · alone = อยู่คนเดียว · substance = ใช้สารเสพติด
--
-- สิทธิ์อ่าน/แก้ใช้ policy เดิมของตาราง patients (อสม. เห็นเฉพาะหมู่บ้านตัวเอง)
-- ย้อนกลับ: ALTER TABLE public.patients DROP COLUMN birth_date, DROP COLUMN adl_group, DROP COLUMN risk_flags;
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS birth_date date;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS adl_group  text;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS risk_flags text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS patients_adl_group_check;
ALTER TABLE public.patients ADD CONSTRAINT patients_adl_group_check
  CHECK (adl_group IS NULL OR adl_group IN ('social', 'home', 'bed'));

ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS patients_risk_flags_check;
ALTER TABLE public.patients ADD CONSTRAINT patients_risk_flags_check
  CHECK (risk_flags <@ ARRAY['smiv', 'disabled', 'alone', 'substance']::text[]);

ALTER TABLE public.patients DROP CONSTRAINT IF EXISTS patients_birth_date_check;
ALTER TABLE public.patients ADD CONSTRAINT patients_birth_date_check
  CHECK (birth_date IS NULL OR birth_date > DATE '1900-01-01');

-- ─── ตรวจผล ──────────────────────────────────────────────────────────
SELECT 'เพิ่มช่องกลุ่มเสี่ยงแล้ว' AS ผล,
       count(*) FILTER (WHERE birth_date IS NOT NULL) AS มีวันเกิด,
       count(*) AS ผู้ป่วยทั้งหมด
FROM public.patients;
