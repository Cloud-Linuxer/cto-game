import { useSelector } from 'react-redux';

export const useGameState = () => {
  const gameState = useSelector((state) => state.game.state);
  const loading = useSelector((state) => state.game.loading);
  const error = useSelector((state) => state.game.error);
  const turnInProgress = useSelector((state) => state.game.turnInProgress);

  return {
    gameState,
    loading,
    error,
    turnInProgress,
    turn: gameState?.turn || 0,
    metrics: {
      mau: gameState?.mau || 0,
      latency: gameState?.latency_ms || 0,
      security: gameState?.security || 0,
      cash: gameState?.cash || 0,
      burn: gameState?.burn_monthly || 0,
    },
    resources: gameState?.resources || {},
    actionCap: gameState?.action_cap || 1,
  };
};

export default useGameState;