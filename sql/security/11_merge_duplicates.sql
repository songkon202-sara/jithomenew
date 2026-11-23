-- ═══════════════════════════════════════════════════════════════════
-- JitHome — รวมผู้ป่วยที่ถูกบันทึกซ้ำ 15 คู่ (รพ.สต.สองคอน, ตรวจ 23 พ.ย. 2569)
-- รันใน Supabase SQL Editor · ทำทั้งหมดใน transaction เดียว (ผิดพลาด = ไม่เปลี่ยนอะไร)
--
-- แต่ละคู่ (keeper, donor):
--   keeper = แถวที่มีคำนำหน้าชื่อ (ใช้งานอยู่ มีประวัติฉีดยา หรือ ADL) — คงชื่อและหมู่บ้านเดิม
--   donor  = แถวที่นำเข้าจาก HOSxP (รหัสโรคจริง + เลขบัตร) — ถูกรวมแล้วลบ
-- ขั้นตอน: สำรอง donor → ย้ายประวัติ (ฉีดยา/เยี่ยมบ้าน/นัดแพทย์) → เติมข้อมูลที่ keeper ขาด → ลบ donor
-- ย้อนกลับ: ข้อมูล donor ทั้งแถว และ id ของประวัติที่ย้าย อยู่ในตาราง jh_merge_backup
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS public.jh_merge_backup (
  id          bigserial PRIMARY KEY,
  merged_at   timestamptz NOT NULL DEFAULT now(),
  keeper_id   bigint NOT NULL,
  donor_id    bigint NOT NULL,
  donor_row   jsonb NOT NULL,
  moved_injection_ids   bigint[],
  moved_visit_ids       bigint[],
  moved_appointment_ids bigint[]
);
ALTER TABLE public.jh_merge_backup ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.jh_merge_backup FROM anon, authenticated;

CREATE TEMP TABLE jh_pairs (keeper_id bigint, donor_id bigint) ON COMMIT DROP;
INSERT INTO jh_pairs VALUES
  (11, 137), (10, 82), (227, 71), (215, 38), (23, 83),
  (6, 80), (20, 116), (168, 62), (19, 37), (3, 126),
  (17, 76), (4, 75), (212, 48), (16, 101), (1, 78);

-- ตรวจความถูกต้องก่อนทำ: ทั้งสองแถวต้องมีอยู่ และชื่อ (ไม่นับคำนำหน้า/ช่องว่าง) ต้องตรงกัน
DO $$
DECLARE r record; bad int := 0;
BEGIN
  FOR r IN
    SELECT pr.keeper_id, pr.donor_id, k.name AS kn, d.name AS dn
    FROM jh_pairs pr
    LEFT JOIN public.patients k ON k.id = pr.keeper_id
    LEFT JOIN public.patients d ON d.id = pr.donor_id
  LOOP
    IF r.kn IS NULL OR r.dn IS NULL THEN
      RAISE NOTICE 'ข้ามคู่ % / %: ไม่พบแถว (อาจรวมไปแล้ว)', r.keeper_id, r.donor_id;
      DELETE FROM jh_pairs WHERE keeper_id = r.keeper_id;
    ELSIF regexp_replace(regexp_replace(r.kn, '^(นางสาว|นาง|นาย|น\.ส\.|นส\.|ด\.ช\.|ด\.ญ\.|เด็กชาย|เด็กหญิง|พระ)\s*', ''), '\s+', '', 'g')
       <> regexp_replace(regexp_replace(r.dn, '^(นางสาว|นาง|นาย|น\.ส\.|นส\.|ด\.ช\.|ด\.ญ\.|เด็กชาย|เด็กหญิง|พระ)\s*', ''), '\s+', '', 'g') THEN
      bad := bad + 1;
      RAISE NOTICE 'ชื่อไม่ตรงกัน: id % / %', r.keeper_id, r.donor_id;
    END IF;
  END LOOP;
  IF bad > 0 THEN RAISE EXCEPTION 'หยุด: มี % คู่ที่ชื่อไม่ตรงกัน — ไม่มีการเปลี่ยนแปลง', bad; END IF;
END $$;

-- 1. สำรอง donor + id ของประวัติที่จะย้าย
INSERT INTO public.jh_merge_backup (keeper_id, donor_id, donor_row, moved_injection_ids, moved_visit_ids, moved_appointment_ids)
SELECT pr.keeper_id, pr.donor_id, to_jsonb(d),
       ARRAY(SELECT id FROM public.injection_records   WHERE patient_id = pr.donor_id),
       ARRAY(SELECT id FROM public.home_visits         WHERE patient_id = pr.donor_id),
       ARRAY(SELECT id FROM public.doctor_appointments WHERE patient_id = pr.donor_id)
FROM jh_pairs pr JOIN public.patients d ON d.id = pr.donor_id;

-- 2. ย้ายประวัติ
UPDATE public.injection_records   x SET patient_id = pr.keeper_id FROM jh_pairs pr WHERE x.patient_id = pr.donor_id;
UPDATE public.home_visits         x SET patient_id = pr.keeper_id FROM jh_pairs pr WHERE x.patient_id = pr.donor_id;
UPDATE public.doctor_appointments x SET patient_id = pr.keeper_id FROM jh_pairs pr WHERE x.patient_id = pr.donor_id;

-- 3. เติมข้อมูลที่ keeper ขาด (รหัสโรคจริงแทน F99/ค่าว่าง · ไม่ทับค่าที่มีอยู่)
UPDATE public.patients k SET
  disease_code = CASE WHEN COALESCE(trim(k.disease_code), '') IN ('', 'F99') AND COALESCE(trim(d.disease_code), '') NOT IN ('', 'F99')
                      THEN d.disease_code ELSE k.disease_code END,
  disease_name = CASE WHEN COALESCE(trim(k.disease_code), '') IN ('', 'F99') AND COALESCE(trim(d.disease_code), '') NOT IN ('', 'F99')
                      THEN d.disease_name ELSE k.disease_name END,
  national_id        = CASE WHEN COALESCE(k.national_id, '') = '' THEN d.national_id ELSE k.national_id END,
  house_no           = CASE WHEN COALESCE(k.house_no, '') = '' THEN d.house_no ELSE k.house_no END,
  staff_responsible  = CASE WHEN COALESCE(k.staff_responsible, '') = '' THEN d.staff_responsible ELSE k.staff_responsible END,
  aosomo_responsible = CASE WHEN COALESCE(k.aosomo_responsible, '') = '' THEN d.aosomo_responsible ELSE k.aosomo_responsible END,
  file_url           = CASE WHEN COALESCE(k.file_url, '') = '' THEN d.file_url ELSE k.file_url END,
  note = CASE WHEN COALESCE(d.note, '') = '' OR position(d.note IN COALESCE(k.note, '')) > 0 THEN k.note
              WHEN COALESCE(k.note, '') = '' THEN d.note
              ELSE k.note || ' · ' || d.note END,
  medication_name  = COALESCE(k.medication_name, d.medication_name),
  oral_medication  = COALESCE(k.oral_medication, d.oral_medication),
  visit_interval   = COALESCE(k.visit_interval, d.visit_interval),
  inject_interval  = COALESCE(k.inject_interval, d.inject_interval),
  next_visit_date  = COALESCE(k.next_visit_date, d.next_visit_date),
  next_inject_date = COALESCE(k.next_inject_date, d.next_inject_date),
  photo_url        = COALESCE(k.photo_url, d.photo_url),
  photo_urls       = ARRAY(SELECT DISTINCT u FROM unnest(COALESCE(k.photo_urls, '{}') || COALESCE(d.photo_urls, '{}')) u WHERE u <> ''),
  consent_given    = COALESCE(k.consent_given, false) OR COALESCE(d.consent_given, false),
  consent_date     = COALESCE(k.consent_date, d.consent_date),
  consent_signature = COALESCE(k.consent_signature, d.consent_signature),
  birth_date       = COALESCE(k.birth_date, d.birth_date),
  adl_group        = COALESCE(k.adl_group, d.adl_group),
  risk_flags       = ARRAY(SELECT DISTINCT f FROM unnest(COALESCE(k.risk_flags, '{}') || COALESCE(d.risk_flags, '{}')) f)
FROM jh_pairs pr JOIN public.patients d ON d.id = pr.donor_id
WHERE k.id = pr.keeper_id;

-- 4. ลบ donor (ประวัติย้ายไป keeper แล้ว)
DELETE FROM public.patients d USING jh_pairs pr WHERE d.id = pr.donor_id;

COMMIT;

-- ─── ตรวจผล ──────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM public.jh_merge_backup) AS รวมแล้ว_คู่,
  (SELECT count(*) FROM public.patients) AS ผู้ป่วยคงเหลือ,
  (SELECT count(*) FROM public.patients WHERE COALESCE(trim(disease_code), '') <> '') AS กลุ่มป่วย,
  (SELECT count(*) FROM public.patients WHERE COALESCE(trim(disease_code), '') = '') AS กลุ่มเสี่ยง,
  (SELECT count(*) FROM public.patients WHERE disease_code = 'F99') AS ยังเป็น_F99,
  (SELECT count(*) FROM (
     SELECT regexp_replace(regexp_replace(name, '^(นางสาว|นาง|นาย|น\.ส\.|นส\.|ด\.ช\.|ด\.ญ\.|เด็กชาย|เด็กหญิง|พระ)\s*', ''), '\s+', '', 'g') nm
     FROM public.patients GROUP BY 1 HAVING count(*) > 1) x) AS ชื่อซ้ำคงเหลือ;
