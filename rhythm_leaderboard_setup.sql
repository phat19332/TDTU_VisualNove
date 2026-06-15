-- =============================================
-- Rhythm Game Leaderboard Setup
-- Chạy trong Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS rhythm_scores (
    id           BIGSERIAL PRIMARY KEY,
    player_id    TEXT        NOT NULL,
    beatmap_id   TEXT        NOT NULL,
    score        INT         NOT NULL DEFAULT 0,
    max_combo    INT         NOT NULL DEFAULT 0,
    achieved_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_rhythm_player_song UNIQUE (player_id, beatmap_id)
);

CREATE INDEX IF NOT EXISTS idx_rs_song_score
    ON rhythm_scores (beatmap_id, score DESC);

ALTER TABLE rhythm_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rhythm_leaderboard_public_read" ON rhythm_scores;
CREATE POLICY "rhythm_leaderboard_public_read"
    ON rhythm_scores FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "rhythm_leaderboard_anon_upsert" ON rhythm_scores;
CREATE POLICY "rhythm_leaderboard_anon_upsert"
    ON rhythm_scores FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "rhythm_leaderboard_anon_update" ON rhythm_scores;
CREATE POLICY "rhythm_leaderboard_anon_update"
    ON rhythm_scores FOR UPDATE
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);
