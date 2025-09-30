import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/common/Dialog';
import Button from '@/components/common/Button';
import { AlertCircle } from 'lucide-react';
import { closeModal, addToast } from '@/features/ui/uiSlice';
import { gameService } from '@/api/gameService';

const EventDialog = ({ event, gameId, open, onClose }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  if (!event) return null;

  const handleChoice = async (choiceCode) => {
    try {
      await gameService.handleEventChoice(gameId, event.id, choiceCode);
      dispatch(addToast({
        title: 'Choice Made',
        description: 'Event handled successfully',
        variant: 'success',
      }));
      onClose();
    } catch (error) {
      dispatch(addToast({
        title: 'Error',
        description: error.message || t('errors.generic'),
        variant: 'error',
      }));
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-6 w-6 text-aws-orange" />
            <DialogTitle>{event.title || t('events.majorEvent')}</DialogTitle>
          </div>
          <DialogDescription>{event.description}</DialogDescription>
        </DialogHeader>

        {event.choices && event.choices.length > 0 && (
          <div className="space-y-3 mt-4">
            <p className="text-sm font-medium">{t('events.choose')}</p>
            {event.choices.map((choice, index) => (
              <button
                key={choice.code || index}
                onClick={() => handleChoice(choice.code)}
                className="w-full text-left p-4 rounded-lg border hover:border-primary hover:bg-accent transition-all"
              >
                <div className="font-medium mb-1">{choice.label}</div>
                <div className="text-sm text-muted-foreground">{choice.description}</div>
                {choice.effects && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Effects: {choice.effects}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventDialog;