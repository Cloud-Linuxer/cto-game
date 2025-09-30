import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import GameState from '../models/GameState.js';
import FormulaEngine from './FormulaEngine.js';
import ActionProcessor from './ActionProcessor.js';
import TurnProcessor from './TurnProcessor.js';
import gameConfig from '../config/config.js';

/**
 * GameService: Business logic for game operations
 */
class GameService {
  constructor() {
    this.formulaEngine = new FormulaEngine();
    this.actionProcessor = new ActionProcessor();
    this.turnProcessor = new TurnProcessor();
  }

  /**
   * Create new game
   */
  async createGame(playerName = null) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const gameUuid = uuidv4();

      // Insert game metadata
      await client.query(
        `INSERT INTO games (game_uuid, player_name, status)
         VALUES ($1, $2, $3)`,
        [gameUuid, playerName, 'active']
      );

      // Create initial game state
      const initialState = new GameState({
        game_uuid: gameUuid,
        turn: 1,
        mau: gameConfig.game.starting.mau,
        latency_ms: gameConfig.game.starting.latency_ms,
        security: gameConfig.game.starting.security,
        cash: gameConfig.game.starting.cash,
        burn_monthly: gameConfig.game.starting.burn_monthly,
        action_cap: gameConfig.game.starting.action_cap,
        rng_seed: gameUuid
      });

      // Calculate initial metrics
      this.formulaEngine.updateMetrics(initialState);

      // Initialize history hash
      initialState.updateHistoryHash('genesis');

      // Insert initial state
      const stateData = initialState.toDatabase();
      await client.query(
        `INSERT INTO game_state (
          game_uuid, turn, mau, latency_ms, security, cash, burn_monthly,
          action_cap, resources, modifiers, timers, queue_delayed, rng_seed, history_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          stateData.game_uuid,
          stateData.turn,
          stateData.mau,
          stateData.latency_ms,
          stateData.security,
          stateData.cash,
          stateData.burn_monthly,
          stateData.action_cap,
          stateData.resources,
          stateData.modifiers,
          stateData.timers,
          stateData.queue_delayed,
          stateData.rng_seed,
          stateData.history_hash
        ]
      );

      // Create initial snapshot
      await client.query(
        `INSERT INTO turn_snapshots (game_uuid, turn, snapshot)
         VALUES ($1, $2, $3)`,
        [gameUuid, 1, JSON.stringify(initialState.createSnapshot())]
      );

      await client.query('COMMIT');

      return {
        game_uuid: gameUuid,
        state: initialState
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get game state
   */
  async getGameState(gameUuid) {
    const result = await pool.query(
      'SELECT * FROM game_state WHERE game_uuid = $1',
      [gameUuid]
    );

    if (result.rows.length === 0) {
      throw new Error('Game not found');
    }

    return GameState.fromDatabase(result.rows[0]);
  }

  /**
   * Get game metadata
   */
  async getGameMetadata(gameUuid) {
    const result = await pool.query(
      'SELECT * FROM games WHERE game_uuid = $1',
      [gameUuid]
    );

    if (result.rows.length === 0) {
      throw new Error('Game not found');
    }

    return result.rows[0];
  }

  /**
   * Execute player action
   */
  async executeAction(gameUuid, actionType, params = {}) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get current state
      const stateResult = await client.query(
        'SELECT * FROM game_state WHERE game_uuid = $1',
        [gameUuid]
      );

      if (stateResult.rows.length === 0) {
        throw new Error('Game not found');
      }

      const state = GameState.fromDatabase(stateResult.rows[0]);

      // Check if game is active
      const gameResult = await client.query(
        'SELECT status FROM games WHERE game_uuid = $1',
        [gameUuid]
      );

      if (gameResult.rows[0].status !== 'active') {
        throw new Error('Game is not active');
      }

      // Check action cap
      if (state.action_cap <= 0) {
        throw new Error('No actions remaining this turn');
      }

      // Process action
      const result = this.actionProcessor.processAction(state, actionType, params);

      if (!result.success) {
        throw new Error(result.error);
      }

      const newState = result.state;

      // Decrement action cap
      newState.action_cap -= 1;

      // Update history hash
      newState.updateHistoryHash(state.history_hash);

      // Save updated state
      const stateData = newState.toDatabase();
      await client.query(
        `UPDATE game_state SET
          turn = $2, mau = $3, latency_ms = $4, security = $5, cash = $6,
          burn_monthly = $7, action_cap = $8, resources = $9, modifiers = $10,
          timers = $11, queue_delayed = $12, history_hash = $13, updated_at = NOW()
         WHERE game_uuid = $1`,
        [
          stateData.game_uuid,
          stateData.turn,
          stateData.mau,
          stateData.latency_ms,
          stateData.security,
          stateData.cash,
          stateData.burn_monthly,
          stateData.action_cap,
          stateData.resources,
          stateData.modifiers,
          stateData.timers,
          stateData.queue_delayed,
          stateData.history_hash
        ]
      );

      // Log action
      await client.query(
        `INSERT INTO action_logs (game_uuid, turn, action_type, params, result)
         VALUES ($1, $2, $3, $4, $5)`,
        [gameUuid, newState.turn, actionType, JSON.stringify(params), JSON.stringify(result.result)]
      );

      await client.query('COMMIT');

      return {
        state: newState,
        result: result.result
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * End turn and process turn cycle
   */
  async endTurn(gameUuid) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get current state
      const stateResult = await client.query(
        'SELECT * FROM game_state WHERE game_uuid = $1',
        [gameUuid]
      );

      if (stateResult.rows.length === 0) {
        throw new Error('Game not found');
      }

      const state = GameState.fromDatabase(stateResult.rows[0]);

      // Check if game is active
      const gameResult = await client.query(
        'SELECT status FROM games WHERE game_uuid = $1',
        [gameUuid]
      );

      if (gameResult.rows[0].status !== 'active') {
        throw new Error('Game is not active');
      }

      // Process turn
      const turnResult = this.turnProcessor.processTurn(state);

      // Update history hash
      state.updateHistoryHash(state.history_hash);

      // Save events
      for (const event of turnResult.events) {
        await client.query(
          `INSERT INTO events (game_uuid, turn, event_type, event_code, title, description, choices, auto_applied)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            gameUuid,
            turnResult.turn,
            event.type,
            event.code,
            event.title,
            event.description,
            event.choices ? JSON.stringify(event.choices) : null,
            event.auto_applied || false
          ]
        );
      }

      // Check if game ended
      if (turnResult.gameOver) {
        await client.query(
          `UPDATE games SET
            status = $2, final_score = $3, final_grade = $4, ended_at = NOW(), updated_at = NOW()
           WHERE game_uuid = $1`,
          [gameUuid, turnResult.gameStatus, turnResult.finalScore || 0, turnResult.finalGrade || 'F']
        );
      }

      // Save updated state
      const stateData = state.toDatabase();
      await client.query(
        `UPDATE game_state SET
          turn = $2, mau = $3, latency_ms = $4, security = $5, cash = $6,
          burn_monthly = $7, action_cap = $8, resources = $9, modifiers = $10,
          timers = $11, queue_delayed = $12, history_hash = $13, updated_at = NOW()
         WHERE game_uuid = $1`,
        [
          stateData.game_uuid,
          stateData.turn,
          stateData.mau,
          stateData.latency_ms,
          stateData.security,
          stateData.cash,
          stateData.burn_monthly,
          stateData.action_cap,
          stateData.resources,
          stateData.modifiers,
          stateData.timers,
          stateData.queue_delayed,
          stateData.history_hash
        ]
      );

      // Create snapshot for new turn
      await client.query(
        `INSERT INTO turn_snapshots (game_uuid, turn, snapshot)
         VALUES ($1, $2, $3)`,
        [gameUuid, state.turn, JSON.stringify(state.createSnapshot())]
      );

      await client.query('COMMIT');

      return {
        state,
        turnResult
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get game history
   */
  async getGameHistory(gameUuid) {
    const snapshots = await pool.query(
      'SELECT turn, snapshot, created_at FROM turn_snapshots WHERE game_uuid = $1 ORDER BY turn',
      [gameUuid]
    );

    const actions = await pool.query(
      'SELECT turn, action_type, params, result, created_at FROM action_logs WHERE game_uuid = $1 ORDER BY turn, created_at',
      [gameUuid]
    );

    const events = await pool.query(
      'SELECT turn, event_type, event_code, title, description, choices, created_at FROM events WHERE game_uuid = $1 ORDER BY turn, created_at',
      [gameUuid]
    );

    return {
      snapshots: snapshots.rows,
      actions: actions.rows,
      events: events.rows
    };
  }

  /**
   * Get available actions for current state
   */
  async getAvailableActions(gameUuid) {
    const state = await this.getGameState(gameUuid);
    return this.actionProcessor.getAvailableActions(state);
  }
}

export default GameService;