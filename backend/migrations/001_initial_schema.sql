-- CTO Game Database Schema
-- Migration 001: Initial Schema Setup

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUMs
CREATE TYPE event_type AS ENUM (
  'major',
  'micro',
  'audit',
  'sla',
  'bankruptcy'
);

CREATE TYPE action_type AS ENUM (
  'ec2_add',
  'ec2_remove',
  'alb_enable',
  'alb_disable',
  'rds_enable',
  'rds_disable',
  'rds_multi_az_enable',
  'rds_multi_az_disable',
  'elasticache_enable',
  'elasticache_disable',
  'cloudfront_enable',
  'cloudfront_disable',
  'waf_enable',
  'waf_disable',
  'net_private_nat_enable',
  'net_private_nat_disable',
  'autoscaling_enable',
  'autoscaling_disable',
  'obs_enable',
  'obs_disable',
  'graviton_migration',
  'ri_purchase',
  'hire_engineer',
  'fundraising'
);

-- Games table: metadata only
CREATE TABLE games (
  game_uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  player_name VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  final_score INTEGER,
  final_grade VARCHAR(10),
  ended_at TIMESTAMP WITH TIME ZONE,
  CHECK (status IN ('active', 'victory', 'failure', 'abandoned'))
);

-- Game state table: single current state per game
CREATE TABLE game_state (
  game_uuid UUID PRIMARY KEY REFERENCES games(game_uuid) ON DELETE CASCADE,
  turn INTEGER NOT NULL DEFAULT 1,
  mau INTEGER NOT NULL DEFAULT 10000,
  latency_ms NUMERIC(10, 2) NOT NULL DEFAULT 280.0,
  security INTEGER NOT NULL DEFAULT 40,
  cash INTEGER NOT NULL DEFAULT 500,
  burn_monthly INTEGER NOT NULL DEFAULT 50,
  action_cap INTEGER NOT NULL DEFAULT 1,
  resources JSONB NOT NULL DEFAULT '{}',
  modifiers JSONB NOT NULL DEFAULT '{}',
  timers JSONB NOT NULL DEFAULT '{}',
  queue_delayed JSONB NOT NULL DEFAULT '[]',
  rng_seed TEXT NOT NULL,
  history_hash TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CHECK (turn >= 1 AND turn <= 36),
  CHECK (mau >= 0),
  CHECK (latency_ms >= 0),
  CHECK (security >= 0 AND security <= 100),
  CHECK (action_cap >= 0)
);

-- Turn snapshots: historical state per turn
CREATE TABLE turn_snapshots (
  id BIGSERIAL PRIMARY KEY,
  game_uuid UUID NOT NULL REFERENCES games(game_uuid) ON DELETE CASCADE,
  turn INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (game_uuid, turn)
);

-- Action logs: player actions
CREATE TABLE action_logs (
  id BIGSERIAL PRIMARY KEY,
  game_uuid UUID NOT NULL REFERENCES games(game_uuid) ON DELETE CASCADE,
  turn INTEGER NOT NULL,
  action_type action_type NOT NULL,
  params JSONB,
  result JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Events: major/micro/system events
CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  game_uuid UUID NOT NULL REFERENCES games(game_uuid) ON DELETE CASCADE,
  turn INTEGER NOT NULL,
  event_type event_type NOT NULL,
  event_code VARCHAR(100) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  choices JSONB,
  auto_applied BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_game_state_game_uuid ON game_state(game_uuid);
CREATE INDEX idx_turn_snapshots_game_uuid ON turn_snapshots(game_uuid);
CREATE INDEX idx_turn_snapshots_turn ON turn_snapshots(game_uuid, turn);
CREATE INDEX idx_action_logs_game_uuid ON action_logs(game_uuid);
CREATE INDEX idx_action_logs_turn ON action_logs(game_uuid, turn);
CREATE INDEX idx_events_game_uuid ON events(game_uuid);
CREATE INDEX idx_events_turn ON events(game_uuid, turn);

-- Update trigger for games.updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_state_updated_at
  BEFORE UPDATE ON game_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE games IS 'Game metadata and status';
COMMENT ON TABLE game_state IS 'Current game state (single row per game)';
COMMENT ON TABLE turn_snapshots IS 'Historical state snapshots per turn';
COMMENT ON TABLE action_logs IS 'Player action history';
COMMENT ON TABLE events IS 'Game events (major, micro, system)';

COMMENT ON COLUMN game_state.resources IS 'Resource counts: { ec2_count, alb_enabled, rds_enabled, ... }';
COMMENT ON COLUMN game_state.modifiers IS 'Active modifiers: { latency_mod, security_mod, burn_mod, ... }';
COMMENT ON COLUMN game_state.timers IS 'Grace period timers: { bankruptIn, slaFailIn }';
COMMENT ON COLUMN game_state.queue_delayed IS 'Delayed events: [{ turn, event_code, params }]';
COMMENT ON COLUMN game_state.history_hash IS 'SHA-256 chain hash for integrity verification';