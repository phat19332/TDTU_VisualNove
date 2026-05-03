-- =============================================
-- Thêm cột Sound Effect (SFX) vào bảng scripts
-- Chạy file này trong Supabase SQL Editor
-- =============================================

-- Cột sfx: tên file âm thanh hiệu ứng (VD: 'thunder.mp3', 'rain.mp3')
-- Đặt giá trị 'stop' để dừng SFX đang phát
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS sfx TEXT;

-- Cột sfx_volume: âm lượng riêng cho SFX (0.0 - 1.0, mặc định 1.0)
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS sfx_volume FLOAT DEFAULT 1.0;

-- Cột sfx_loop: cho phép SFX lặp lại (dùng cho ambient: mưa, gió, tiếng ồn...)
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS sfx_loop BOOLEAN DEFAULT false;
