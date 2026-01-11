-- ============================================
-- AuraTicTac Database Setup Script
-- Database: auratictac
-- ============================================

-- Run these commands on your PostgreSQL server (45.45.239.13)
-- Make sure PostgreSQL is installed and running

-- Step 1: Create the database and user
-- Run as postgres superuser:
-- sudo -u postgres psql

CREATE DATABASE auratictac;
CREATE USER auratictac_user WITH ENCRYPTED PASSWORD 'TicTacAura2010@...';
GRANT ALL PRIVILEGES ON DATABASE auratictac TO auratictac_user;

-- Connect to the database
\c auratictac

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO auratictac_user;

-- ============================================
-- Players Table
-- ============================================
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- For authenticated users (optional)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    total_games INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    draws INTEGER DEFAULT 0
);

-- Index for leaderboard queries
CREATE INDEX idx_players_wins ON players(wins DESC);
CREATE INDEX idx_players_username ON players(username);

-- ============================================
-- Games Table
-- ============================================
CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(6) UNIQUE,
    player_x_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    player_o_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    mode VARCHAR(20) NOT NULL CHECK (mode IN ('single', 'multiplayer')),
    difficulty VARCHAR(10) CHECK (difficulty IN ('easy', 'medium', 'hard')),
    board_state VARCHAR(9) DEFAULT '---------', -- '-' for empty, 'X', 'O'
    current_turn CHAR(1) DEFAULT 'X' CHECK (current_turn IN ('X', 'O')),
    winner CHAR(1) CHECK (winner IN ('X', 'O', 'D')), -- D for draw
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- If the table already exists with restrictive foreign keys, alter it:
-- ALTER TABLE games DROP CONSTRAINT IF EXISTS games_ibfk_1;
-- ALTER TABLE games DROP CONSTRAINT IF EXISTS games_ibfk_2;
-- ALTER TABLE games ADD CONSTRAINT games_player_x_fk FOREIGN KEY (player_x_id) REFERENCES players(id) ON DELETE SET NULL;
-- ALTER TABLE games ADD CONSTRAINT games_player_o_fk FOREIGN KEY (player_o_id) REFERENCES players(id) ON DELETE SET NULL;

-- Indexes for game queries
CREATE INDEX idx_games_session_id ON games(session_id);
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_player_x ON games(player_x_id);
CREATE INDEX idx_games_player_o ON games(player_o_id);

-- ============================================
-- Game Moves Table (for replay/history)
-- ============================================
CREATE TABLE IF NOT EXISTS game_moves (
    id SERIAL PRIMARY KEY,
    game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES players(id),
    position INTEGER NOT NULL CHECK (position >= 0 AND position <= 8),
    symbol CHAR(1) NOT NULL CHECK (symbol IN ('X', 'O')),
    move_number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_game_moves_game_id ON game_moves(game_id);

-- ============================================
-- Leaderboard View
-- ============================================
CREATE OR REPLACE VIEW leaderboard AS
SELECT 
    ROW_NUMBER() OVER (ORDER BY 
        CASE WHEN (wins + losses + draws) > 0 
             THEN (wins * 100.0 / (wins + losses + draws)) 
             ELSE 0 
        END DESC,
        wins DESC
    ) as rank,
    username as player_name,
    wins,
    losses,
    draws,
    (wins + losses + draws) as total_games,
    CASE 
        WHEN (wins + losses + draws) > 0 
        THEN ROUND((wins * 100.0 / (wins + losses + draws)), 1)
        ELSE 0 
    END as win_rate
FROM players
WHERE (wins + losses + draws) > 0
ORDER BY win_rate DESC, wins DESC
LIMIT 100;

-- ============================================
-- Functions and Triggers
-- ============================================

-- Update player stats when game completes
CREATE OR REPLACE FUNCTION update_player_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Update player X stats
        IF NEW.player_x_id IS NOT NULL THEN
            UPDATE players SET
                total_games = total_games + 1,
                wins = wins + CASE WHEN NEW.winner = 'X' THEN 1 ELSE 0 END,
                losses = losses + CASE WHEN NEW.winner = 'O' THEN 1 ELSE 0 END,
                draws = draws + CASE WHEN NEW.winner = 'D' THEN 1 ELSE 0 END,
                last_active = CURRENT_TIMESTAMP
            WHERE id = NEW.player_x_id;
        END IF;
        
        -- Update player O stats
        IF NEW.player_o_id IS NOT NULL THEN
            UPDATE players SET
                total_games = total_games + 1,
                wins = wins + CASE WHEN NEW.winner = 'O' THEN 1 ELSE 0 END,
                losses = losses + CASE WHEN NEW.winner = 'X' THEN 1 ELSE 0 END,
                draws = draws + CASE WHEN NEW.winner = 'D' THEN 1 ELSE 0 END,
                last_active = CURRENT_TIMESTAMP
            WHERE id = NEW.player_o_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_player_stats
    AFTER UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_player_stats();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_games_updated_at
    BEFORE UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Grant permissions to app user
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO auratictac_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO auratictac_user;
GRANT SELECT ON leaderboard TO auratictac_user;
