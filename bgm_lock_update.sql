-- ============================================
-- SQL Update Script: BGM Mood Locking
-- ============================================
-- Chạy script này trong Supabase Dashboard → SQL Editor → New Query

-- 1. Thêm cột bgm_lock để khóa nhạc theo cảnh
ALTER TABLE scripts 
ADD COLUMN IF NOT EXISTS bgm_lock BOOLEAN DEFAULT false;

COMMENT ON COLUMN scripts.bgm_lock IS 'Nếu TRUE, người chơi không thể đổi nhạc thủ công trong cảnh này.';
