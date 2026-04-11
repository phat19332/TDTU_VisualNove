-- ============================================
-- SQL Update Script: Dual Character Support
-- ============================================
-- Chạy script này trong Supabase Dashboard → SQL Editor → New Query

-- 1. Thêm các cột cho hệ thống nhân vật kép (Left/Right)
ALTER TABLE scripts 
ADD COLUMN IF NOT EXISTS char_l TEXT,       -- Nhân vật bên trái
ADD COLUMN IF NOT EXISTS char_r TEXT,       -- Nhân vật bên phải
ADD COLUMN IF NOT EXISTS emotion_l TEXT,    -- Biểu cảm trái
ADD COLUMN IF NOT EXISTS emotion_r TEXT;    -- Biểu cảm phải

-- 2. Ví dụ cách nhập liệu mới (Bạn có thể bỏ qua bước này nếu không muốn sửa kịch bản ngay)
-- UPDATE scripts SET 
-- char_l = 'hao_nhien', 
-- char_r = 'chi_lan',
-- emotion_l = 'happy',
-- emotion_r = 'surprised'
-- WHERE order_index = 100;

COMMENT ON COLUMN scripts.char_l IS 'Mã nhân vật đứng bên trái (VD: hao_nhien)';
COMMENT ON COLUMN scripts.char_r IS 'Mã nhân vật đứng bên phải';
