-- =============================================
-- Listening Game Leaderboard Setup
-- Chạy trong Supabase SQL Editor
-- =============================================

-- Bảng lưu điểm cao nhất mỗi người chơi cho mỗi bài hát
CREATE TABLE IF NOT EXISTS listening_scores (
    id           BIGSERIAL PRIMARY KEY,
    player_id    TEXT        NOT NULL,
    song_id      TEXT        NOT NULL,
    score        INT         NOT NULL CHECK (score >= 0 AND score <= 100),
    correct      INT         NOT NULL DEFAULT 0,
    total        INT         NOT NULL DEFAULT 0,
    achieved_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Mỗi người chỉ có 1 hàng per bài hát (upsert sẽ cập nhật thay vì chèn thêm)
    CONSTRAINT uq_player_song UNIQUE (player_id, song_id)
);

-- Index tìm kiếm leaderboard nhanh (theo bài hát, giảm dần theo điểm)
CREATE INDEX IF NOT EXISTS idx_ls_song_score
    ON listening_scores (song_id, score DESC);

-- Row Level Security: cho phép đọc công khai, chỉ insert/update khi anon
ALTER TABLE listening_scores ENABLE ROW LEVEL SECURITY;

-- Policy: tất cả mọi người đều đọc được leaderboard
CREATE POLICY "leaderboard_public_read"
    ON listening_scores FOR SELECT
    USING (true);

-- Policy: anon user có thể insert/update hàng của chính mình
CREATE POLICY "leaderboard_anon_upsert"
    ON listening_scores FOR INSERT
    WITH CHECK (true);

CREATE POLICY "leaderboard_anon_update"
    ON listening_scores FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- ─── Optional: View top-10 per song ───────────────────────────────────────
CREATE OR REPLACE VIEW leaderboard_top10 AS
SELECT
    song_id,
    player_id,
    score,
    correct,
    total,
    achieved_at,
    RANK() OVER (PARTITION BY song_id ORDER BY score DESC) AS rank
FROM listening_scores;
