import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { createNewGame } from '@/features/game/gameSlice';
import { addToast } from '@/features/ui/uiSlice';
import Button from '@/components/common/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/common/Card';
import { Play, BookOpen, Settings, Info } from 'lucide-react';

const MenuPage = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleNewGame = async () => {
    try {
      const result = await dispatch(createNewGame()).unwrap();
      dispatch(addToast({
        title: 'New Game Started',
        description: 'Good luck, CTO!',
        variant: 'success',
      }));
      navigate(`/game/${result.game_id}`);
    } catch (error) {
      dispatch(addToast({
        title: 'Error',
        description: error.message || t('errors.generic'),
        variant: 'error',
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-aws-blue to-aws-dark-blue flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">
            {t('menu.title')}
          </h1>
          <p className="text-xl text-gray-300">
            {t('menu.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="hover:shadow-xl transition-shadow cursor-pointer bg-white/95">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-aws-orange rounded-lg">
                  <Play className="h-6 w-6 text-white" />
                </div>
                <CardTitle>{t('menu.newGame')}</CardTitle>
              </div>
              <CardDescription>
                Start a new campaign as a CTO building AWS infrastructure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleNewGame}
                variant="aws"
                className="w-full"
                size="lg"
              >
                {t('common.start')}
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-shadow cursor-pointer bg-white/95">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-blue-500 rounded-lg">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <CardTitle>{t('menu.tutorial')}</CardTitle>
              </div>
              <CardDescription>
                Learn the basics of cloud architecture and game mechanics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate('/tutorial')}
                variant="outline"
                className="w-full"
                size="lg"
              >
                {t('menu.tutorial')}
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-shadow cursor-pointer bg-white/95">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-green-500 rounded-lg">
                  <Settings className="h-6 w-6 text-white" />
                </div>
                <CardTitle>{t('menu.settings')}</CardTitle>
              </div>
              <CardDescription>
                Configure language, sound, and display preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate('/settings')}
                variant="outline"
                className="w-full"
                size="lg"
              >
                {t('common.settings')}
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl transition-shadow cursor-pointer bg-white/95">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-purple-500 rounded-lg">
                  <Info className="h-6 w-6 text-white" />
                </div>
                <CardTitle>{t('menu.about')}</CardTitle>
              </div>
              <CardDescription>
                Learn about the game and AWS Well-Architected Framework
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate('/about')}
                variant="outline"
                className="w-full"
                size="lg"
              >
                {t('menu.about')}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center text-gray-300 text-sm">
          <p>Built with React, TailwindCSS, and AWS Architecture Icons</p>
          <p className="mt-2">© 2025 AWS CTO Strategy Game</p>
        </div>
      </div>
    </div>
  );
};

export default MenuPage;