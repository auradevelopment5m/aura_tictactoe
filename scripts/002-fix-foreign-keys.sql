-- ============================================
-- AuraTicTac Database Migration Script
-- Fix Foreign Key Constraints
-- ============================================

-- This script fixes the foreign key constraint issue that prevents
-- deleting players when they have associated game records.
-- Run this on your MySQL database to allow SET NULL on delete.

-- Step 1: Drop the existing foreign key constraints
ALTER TABLE games DROP FOREIGN KEY games_ibfk_1;
ALTER TABLE games DROP FOREIGN KEY games_ibfk_2;

-- Step 2: Re-add the foreign keys with ON DELETE SET NULL
ALTER TABLE games 
ADD CONSTRAINT games_player_x_fk 
FOREIGN KEY (player_x_id) 
REFERENCES players(id) 
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE games 
ADD CONSTRAINT games_player_o_fk 
FOREIGN KEY (player_o_id) 
REFERENCES players(id) 
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Step 3: (Optional) If game_moves table has similar issues
-- ALTER TABLE game_moves DROP FOREIGN KEY game_moves_ibfk_2;
-- ALTER TABLE game_moves 
-- ADD CONSTRAINT game_moves_player_fk 
-- FOREIGN KEY (player_id) 
-- REFERENCES players(id) 
-- ON DELETE SET NULL
-- ON UPDATE CASCADE;

-- Verify the changes
SHOW CREATE TABLE games;

-- ============================================
-- Alternative: If you want to completely remove a player and their games
-- you would need to:
-- 1. Delete all game_moves associated with games where the player participated
-- 2. Delete all games where the player was player_x or player_o
-- 3. Then delete the player
-- Example:
-- 
-- SET @player_id = (SELECT id FROM players WHERE username = 'username_to_delete');
-- 
-- DELETE FROM game_moves WHERE player_id = @player_id;
-- DELETE FROM game_moves WHERE game_id IN (
--     SELECT id FROM games WHERE player_x_id = @player_id OR player_o_id = @player_id
-- );
-- DELETE FROM games WHERE player_x_id = @player_id OR player_o_id = @player_id;
-- DELETE FROM players WHERE id = @player_id;
-- ============================================
