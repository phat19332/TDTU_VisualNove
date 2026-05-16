-- =========================================================
-- BẢN VÁ BẢO MẬT (SECURITY PATCH) CHO SUPABASE - TDTU VN
-- Chạy đoạn script này trong Supabase Dashboard -> SQL Editor
-- =========================================================

-- ─────────────────────────────────────────────────────────
-- 1. KHÓA CHẶT BẢNG `music` (Ngăn chặn hack đổi nhạc)
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.music ENABLE ROW LEVEL SECURITY;

-- Xóa các quyền (Policy) lỏng lẻo hiện có (nếu có)
DROP POLICY IF EXISTS "Public insert music" ON public.music;
DROP POLICY IF EXISTS "Public update music" ON public.music;
DROP POLICY IF EXISTS "Public delete music" ON public.music;
-- (Lưu ý: Nếu Supabase Dashboard vẫn còn hiện policy khác, hãy xóa thủ công bằng tay)

-- Cấp lại duy nhất 1 quyền: Cho phép người ngoài ĐỌC
DROP POLICY IF EXISTS "Chỉ cho phép đọc danh sách nhạc" ON public.music;
CREATE POLICY "Chỉ cho phép đọc danh sách nhạc" ON public.music
  FOR SELECT USING (true);

-- Xóa dữ liệu rác hacker để lại
DELETE FROM public.music WHERE title = 'Hacked';


-- ─────────────────────────────────────────────────────────
-- 2. VÁ LỖ HỔNG HÀM `rls_auto_enable()` (Chặn người ngoài gọi hàm)
-- ─────────────────────────────────────────────────────────
-- Tước quyền kích hoạt (EXECUTE) khỏi tay người dùng công khai (Public/Anon)
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;


-- ─────────────────────────────────────────────────────────
-- 3. BẢO MẬT BẢNG `global_player_data`
-- ─────────────────────────────────────────────────────────
ALTER TABLE public.global_player_data ENABLE ROW LEVEL SECURITY;

-- Xóa quyền ghi bừa bãi
DROP POLICY IF EXISTS "Public insert global_player_data" ON public.global_player_data;
DROP POLICY IF EXISTS "Public update global_player_data" ON public.global_player_data;
DROP POLICY IF EXISTS "Public delete global_player_data" ON public.global_player_data;

-- Cấp quyền chỉ Đọc
DROP POLICY IF EXISTS "Chỉ cho phép đọc global_player_data" ON public.global_player_data;
CREATE POLICY "Chỉ cho phép đọc global_player_data" ON public.global_player_data
  FOR SELECT USING (true);


-- =========================================================
-- LƯU Ý VỀ BẢNG `saves` VÀ `listening_scores`:
-- Supabase vẫn sẽ báo đỏ 2 bảng này vì chúng dùng `USING (true)` cho lệnh INSERT.
-- ĐÂY LÀ ĐIỀU BẮT BUỘC vì game của bạn không bắt người dùng Đăng Nhập (Auth).
-- Bạn có thể an tâm phớt lờ cảnh báo đỏ của riêng 2 bảng lưu điểm/lưu game này.
-- =========================================================
