import express from 'express';
import GameService from '../services/GameService.js';

const router = express.Router();
const gameService = new GameService();

/**
 * POST /api/games
 * Create new game
 */
router.post('/', async (req, res) => {
  try {
    const { player_name } = req.body;
    const result = await gameService.createGame(player_name);

    res.status(201).json({
      success: true,
      data: {
        game_uuid: result.game_uuid,
        state: result.state
      }
    });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create game'
    });
  }
});

/**
 * GET /api/games/:game_uuid
 * Get game state and metadata
 */
router.get('/:game_uuid', async (req, res) => {
  try {
    const { game_uuid } = req.params;

    const [metadata, state] = await Promise.all([
      gameService.getGameMetadata(game_uuid),
      gameService.getGameState(game_uuid)
    ]);

    res.json({
      success: true,
      data: {
        game: metadata,
        state
      }
    });
  } catch (error) {
    if (error.message === 'Game not found') {
      res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    } else {
      console.error('Error fetching game:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch game'
      });
    }
  }
});

/**
 * GET /api/games/:game_uuid/state
 * Get current game state only
 */
router.get('/:game_uuid/state', async (req, res) => {
  try {
    const { game_uuid } = req.params;
    const state = await gameService.getGameState(game_uuid);

    res.json({
      success: true,
      data: state
    });
  } catch (error) {
    if (error.message === 'Game not found') {
      res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    } else {
      console.error('Error fetching state:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch state'
      });
    }
  }
});

/**
 * POST /api/games/:game_uuid/actions
 * Execute player action
 */
router.post('/:game_uuid/actions', async (req, res) => {
  try {
    const { game_uuid } = req.params;
    const { action_type, params } = req.body;

    if (!action_type) {
      return res.status(400).json({
        success: false,
        error: 'action_type is required'
      });
    }

    const result = await gameService.executeAction(game_uuid, action_type, params);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.message === 'Game not found') {
      res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    } else if (error.message.includes('Game is not active') ||
               error.message.includes('No actions remaining')) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    } else {
      console.error('Error executing action:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to execute action'
      });
    }
  }
});

/**
 * POST /api/games/:game_uuid/end-turn
 * End turn and process turn cycle
 */
router.post('/:game_uuid/end-turn', async (req, res) => {
  try {
    const { game_uuid } = req.params;
    const result = await gameService.endTurn(game_uuid);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.message === 'Game not found') {
      res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    } else if (error.message.includes('Game is not active')) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    } else {
      console.error('Error ending turn:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to end turn'
      });
    }
  }
});

/**
 * GET /api/games/:game_uuid/history
 * Get complete game history
 */
router.get('/:game_uuid/history', async (req, res) => {
  try {
    const { game_uuid } = req.params;
    const history = await gameService.getGameHistory(game_uuid);

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch history'
    });
  }
});

/**
 * GET /api/games/:game_uuid/available-actions
 * Get list of available actions for current state
 */
router.get('/:game_uuid/available-actions', async (req, res) => {
  try {
    const { game_uuid } = req.params;
    const actions = await gameService.getAvailableActions(game_uuid);

    res.json({
      success: true,
      data: actions
    });
  } catch (error) {
    if (error.message === 'Game not found') {
      res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    } else {
      console.error('Error fetching available actions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch available actions'
      });
    }
  }
});

export default router;