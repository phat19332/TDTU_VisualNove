-- =========================================================
-- BẢN VÁ BẢO MẬT (ANONYMOUS AUTH PATCH) CHO SUPABASE
-- Chạy đoạn script này trong Supabase Dashboard -> SQL Editor
-- =========================================================

-- Lưu ý: Phải bật tính năng "Anonymous sign-ins" trong
-- Authentication -> Providers -> Email -> Anonymous Sign-ins (BẬT)

-- ─────────────────────────────────────────────────────────
-- 1. BẢNG `saves`
-- ─────────────────────────────────────────────────────────
-- Thêm cột auth_id (nếu chưa có) tự động lấy auth.uid()
ALTER TABLE public.saves ADD COLUMN IF NOT EXISTS auth_id UUID DEFAULT auth.uid();

-- Xóa các policy hiện tại
DROP POLICY IF EXISTS "Public insert saves" ON public.saves;
DROP POLICY IF EXISTS "Public update saves" ON public.saves;
DROP POLICY IF EXISTS "Anon insert saves" ON public.saves;
DROP POLICY IF EXISTS "Anon update saves" ON public.saves;

-- Chỉ cho phép cập nhật nếu auth_id khớp
CREATE POLICY "Anon insert saves" ON public.saves
  FOR INSERT WITH CHECK (auth_id = auth.uid());

CREATE POLICY "Anon update saves" ON public.saves
  FOR UPDATE USING (auth_id = auth.uid());


-- ─────────────────────────────────────────────────────────
-- 2. BẢNG `listening_scores`
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.listening_scores ADD COLUMN IF NOT EXISTS auth_id UUID DEFAULT auth.uid();

-- Xóa các policy hiện tại
DROP POLICY IF EXISTS "leaderboard_anon_upsert" ON public.listening_scores;
DROP POLICY IF EXISTS "leaderboard_anon_update" ON public.listening_scores;
DROP POLICY IF EXISTS "Anon insert listening_scores" ON public.listening_scores;
DROP POLICY IF EXISTS "Anon update listening_scores" ON public.listening_scores;

CREATE POLICY "Anon insert listening_scores" ON public.listening_scores
  FOR INSERT WITH CHECK (auth_id = auth.uid());

CREATE POLICY "Anon update listening_scores" ON public.listening_scores
  FOR UPDATE USING (auth_id = auth.uid());


-- ─────────────────────────────────────────────────────────
-- 3. BẢNG `global_player_data`
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.global_player_data ADD COLUMN IF NOT EXISTS auth_id UUID DEFAULT auth.uid();

-- Xóa các policy hiện tại
DROP POLICY IF EXISTS "Public insert global_player_data" ON public.global_player_data;
DROP POLICY IF EXISTS "Public update global_player_data" ON public.global_player_data;
DROP POLICY IF EXISTS "Public insert/update global_player_data" ON public.global_player_data;
DROP POLICY IF EXISTS "Anon insert global_player_data" ON public.global_player_data;
DROP POLICY IF EXISTS "Anon update global_player_data" ON public.global_player_data;

CREATE POLICY "Anon insert global_player_data" ON public.global_player_data
  FOR INSERT WITH CHECK (auth_id = auth.uid());

CREATE POLICY "Anon update global_player_data" ON public.global_player_data
  FOR UPDATE USING (auth_id = auth.uid());

-- Hoàn tất! Dữ liệu của người chơi hiện tại sẽ bị trói buộc với trình duyệt của họ.
