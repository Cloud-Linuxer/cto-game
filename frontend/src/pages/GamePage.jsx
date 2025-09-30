import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { loadGameState, endGameTurn, loadAvailableActions } from '@/features/game/gameSlice';
import { openModal, addToast } from '@/features/ui/uiSlice';
import ResourceBar from '@/components/hud/ResourceBar';
import TurnCounter from '@/components/hud/TurnCounter';
import ActionPanel from '@/components/hud/ActionPanel';
import EventLog from '@/components/hud/EventLog';
import MetricsChart from '@/components/hud/MetricsChart';
import DiagramCanvas from '@/components/diagram/DiagramCanvas';
import NodePalette from '@/components/diagram/NodePalette';
import EventDialog from '@/components/game/EventDialog';
import TurnSummaryDialog from '@/components/game/TurnSummaryDialog';
import Button from '@/components/common/Button';
import { PlayCircle } from 'lucide-react';

const GamePage = () => {
  const { gameId } = useParams();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { state: gameState, loading, turnInProgress, availableActions } = useSelector((state) => state.game);
  const { modals } = useSelector((state) => state.ui);
  const [eventLog, setEventLog] = useState([]);

  useEffect(() => {
    if (gameId) {
      dispatch(loadGameState(gameId));
      dispatch(loadAvailableActions(gameId));
    }
  }, [gameId, dispatch]);

  const handleEndTurn = async () => {
    try {
      const result = await dispatch(endGameTurn(gameId)).unwrap();

      setEventLog((prev) => [
        ...prev,
        {
          turn: result.state.turn,
          type: 'info',
          message: `Turn ${result.state.turn} completed`,
        },
      ]);

      if (result.events && result.events.length > 0) {
        result.events.forEach((event) => {
          if (event.type === 'MAJOR') {
            dispatch(openModal({ modal: 'eventDialog', data: event }));
          }
        });
      }

      dispatch(addToast({
        title: 'Turn Complete',
        description: `Turn ${result.state.turn} has ended`,
        variant: 'success',
      }));
    } catch (error) {
      dispatch(addToast({
        title: 'Error',
        description: error.message || t('errors.generic'),
        variant: 'error',
      }));
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">{t('game.loading')}</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-muted-foreground">Game not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top HUD */}
      <div className="flex-shrink-0">
        <ResourceBar gameState={gameState} />
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Node Palette */}
        <div className="flex-shrink-0 hidden lg:block">
          <NodePalette />
        </div>

        {/* Center - Diagram */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1">
            <DiagramCanvas />
          </div>

          {/* Bottom Control Panel */}
          <div className="flex-shrink-0 p-4 border-t bg-card flex items-center justify-between">
            <TurnCounter currentTurn={gameState.turn} />

            <Button
              onClick={handleEndTurn}
              disabled={turnInProgress}
              variant="aws"
              size="lg"
              className="px-8"
            >
              {turnInProgress ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {t('game.calculating')}
                </>
              ) : (
                <>
                  <PlayCircle className="h-5 w-5 mr-2" />
                  {t('game.endTurn')} {t('game.endTurnShortcut')}
                </>
              )}
            </Button>

            <div className="text-sm text-muted-foreground">
              {t('game.actionsRemaining')}: <span className="font-bold">{gameState.action_cap || 1}</span>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Actions & Events */}
        <div className="flex-shrink-0 w-80 border-l bg-card overflow-y-auto">
          <div className="p-4 space-y-4">
            <ActionPanel
              gameId={gameId}
              availableActions={availableActions}
              actionsRemaining={gameState.action_cap || 1}
              disabled={turnInProgress}
            />
            <EventLog events={eventLog} />
          </div>
        </div>
      </div>

      {/* Modals */}
      <EventDialog
        event={modals.eventDialog}
        gameId={gameId}
        open={!!modals.eventDialog}
        onClose={() => dispatch(openModal({ modal: 'eventDialog', data: null }))}
      />

      <TurnSummaryDialog
        summary={modals.turnSummary}
        open={!!modals.turnSummary}
        onClose={() => dispatch(openModal({ modal: 'turnSummary', data: null }))}
      />
    </div>
  );
};

export default GamePage;