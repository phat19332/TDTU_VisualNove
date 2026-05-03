-- =============================================
-- Thêm cột Sound Effect (SFX) vào bảng scripts
-- Chạy file này trong Supabase SQL Editor
-- =============================================

-- Cột sfx: tên file âm thanh hiệu ứng (VD: 'thunder.mp3', 'door_knock.wav')
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS sfx TEXT;

-- Cột sfx_volume: âm lượng riêng cho SFX (0.0 - 1.0, mặc định 1.0)
-- Hữu ích khi muốn tiếng mưa nhỏ hơn tiếng sét
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS sfx_volume FLOAT DEFAULT 1.0;
