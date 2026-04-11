-- ============================================
-- SQL Update: Advanced VN Features
-- ============================================

-- 1. Cập nhật bảng saves hỗ trợ dữ liệu mở rộng (JSONB)
ALTER TABLE saves 
ADD COLUMN IF NOT EXISTS save_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS mc_name TEXT;

-- 2. Tạo bảng global_player_data để lưu trữ dữ liệu bền vững (Gallery, Achievements)
-- Dữ liệu này không bị mất đi khi người chơi bắt đầu game mới (New Game)
CREATE TABLE IF NOT EXISTS global_player_data (
  player_id       TEXT PRIMARY KEY,
  unlocked_cgs    JSONB DEFAULT '[]'::jsonb,
  unlocked_bgm    JSONB DEFAULT '[]'::jsonb,
  achievements    JSONB DEFAULT '[]'::jsonb,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bật RLS cho bảng mới
ALTER TABLE global_player_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read global_player_data" ON global_player_data
  FOR SELECT USING (true);

CREATE POLICY "Public insert/update global_player_data" ON global_player_data
  FOR ALL USING (true);

-- 4. Thống nhất cột bgm_lock (đề phòng chưa chạy file trước)
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS bgm_lock BOOLEAN DEFAULT false;
