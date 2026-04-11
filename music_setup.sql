-- ============================================
-- SQL Setup Script: Music Table
-- Time, Dreams, Trials & Us - Visual Novel
-- ============================================
-- Chạy script này trong Supabase Dashboard → SQL Editor → New Query

-- 1. Tạo bảng music (Danh sách nhạc)
CREATE TABLE IF NOT EXISTS music (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,              -- Tên bài hát
  artist        TEXT DEFAULT 'Unknown',     -- Nghệ sĩ
  url           TEXT NOT NULL,              -- URL nhạc (Supabase Storage hoặc link ngoài)
  cover_url     TEXT,                       -- URL ảnh bìa (tùy chọn)
  category      TEXT DEFAULT 'bgm',         -- Phân loại: bgm, sfx, vocal, etc.
  is_active     BOOLEAN DEFAULT true,       -- Bật/tắt bài hát
  sort_order    INTEGER DEFAULT 0,          -- Thứ tự sắp xếp
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bật RLS
ALTER TABLE music ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Ai cũng đọc được danh sách nhạc
CREATE POLICY "Public read music" ON music
  FOR SELECT USING (true);

-- 4. Policy: Cho phép insert/update/delete từ anon key (để bạn quản lý trên Supabase Dashboard)
CREATE POLICY "Public insert music" ON music
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public update music" ON music
  FOR UPDATE USING (true);

CREATE POLICY "Public delete music" ON music
  FOR DELETE USING (true);

-- 5. Nhập bài hát mẫu (Bạn có thể copy đoạn này vào SQL Editor để chạy)
INSERT INTO music (title, artist, url, category, sort_order) VALUES
('Tự hào sinh viên Tôn Đức Thắng', 'TDTU Chorus', 'https://wqslipfvtrkjnnlpxsic.supabase.co/storage/v1/object/public/game-assets/tdtu_theme.mp3', 'bgm', 1);
