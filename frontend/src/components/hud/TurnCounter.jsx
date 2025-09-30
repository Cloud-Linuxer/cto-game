import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';
import { GAME_CONSTANTS } from '@/utils/constants';

const TurnCounter = ({ currentTurn }) => {
  const { t } = useTranslation();
  const progress = (currentTurn / GAME_CONSTANTS.MAX_TURNS) * 100;

  return (
    <div className="flex flex-col gap-2 p-4 bg-card rounded-lg border min-w-[200px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">{t('game.turn')}</span>
        </div>
        <span className="text-lg font-bold">
          {currentTurn} {t('game.of')} {GAME_CONSTANTS.MAX_TURNS}
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default TurnCounter;