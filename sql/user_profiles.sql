-- ═══════════════════════════════════════════════════════════════
-- JitHome — User Profiles & Roles
-- รัน SQL นี้ใน Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ตารางโปรไฟล์ผู้ใช้และสิทธิ์
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  role         TEXT NOT NULL DEFAULT 'viewer'
                 CHECK (role IN ('admin','staff','aosomo','viewer')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login   TIMESTAMPTZ
);

-- ให้สิทธิ์ anon/authenticated อ่าน-เขียน
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO anon, authenticated;

-- เปิด RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- ผู้ใช้อ่านได้ทุกโปรไฟล์ (เพื่อให้ admin เห็นรายการ)
CREATE POLICY "profiles_select" ON public.user_profiles
  FOR SELECT USING (true);

-- ผู้ใช้ insert โปรไฟล์ตัวเองได้
CREATE POLICY "profiles_insert_own" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admin update ได้ทุกโปรไฟล์, คนอื่น update แค่ตัวเอง
CREATE POLICY "profiles_update" ON public.user_profiles
  FOR UPDATE USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
