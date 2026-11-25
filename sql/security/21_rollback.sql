-- ย้อนกลับ 21_clear_login_lock.sql (แอปจะกลับไปใช้วิธีลบตรง ซึ่งอาจล้างตัวนับไม่ได้)
DROP FUNCTION IF EXISTS public.clear_my_login_lock();
