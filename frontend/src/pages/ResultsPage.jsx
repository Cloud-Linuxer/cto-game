import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { gameService } from '@/api/gameService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
import Button from '@/components/common/Button';
import MetricsChart from '@/components/hud/MetricsChart';
import { Trophy, Home, RotateCcw, Medal } from 'lucide-react';
import { METRIC_THRESHOLDS } from '@/utils/constants';

const ResultsPage = () => {
  const { gameId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [gameData, setGameData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadResults = async () => {
      try {
        const [stateData, historyData] = await Promise.all([
          gameService.getGameState(gameId),
          gameService.getHistory(gameId),
        ]);
        setGameData(stateData.state);
        setHistory(historyData.snapshots || []);
      } catch (error) {
        console.error('Failed to load results:', error);
      } finally {
        setLoading(false);
      }
    };

    if (gameId) {
      loadResults();
    }
  }, [gameId]);

  const calculateGrade = () => {
    if (!gameData) return 'bronze';

    const { mau, latency_ms, security } = gameData;

    if (
      mau >= METRIC_THRESHOLDS.mau.gold &&
      latency_ms <= METRIC_THRESHOLDS.latency.excellent &&
      security >= METRIC_THRESHOLDS.security.excellent
    ) {
      return 'gold';
    }

    if (
      mau >= METRIC_THRESHOLDS.mau.silver &&
      latency_ms <= METRIC_THRESHOLDS.latency.good &&
      security >= METRIC_THRESHOLDS.security.good
    ) {
      return 'silver';
    }

    return 'bronze';
  };

  const grade = calculateGrade();
  const gradeColors = {
    gold: 'text-yellow-500',
    silver: 'text-gray-400',
    bronze: 'text-orange-700',
  };

  const gradeIcons = {
    gold: '🥇',
    silver: '🥈',
    bronze: '🥉',
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-aws-blue to-aws-dark-blue p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <Trophy className={`h-24 w-24 mx-auto mb-4 ${gradeColors[grade]}`} />
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            {t('results.title')}
          </h1>
          <div className="flex items-center justify-center gap-2">
            <span className="text-6xl">{gradeIcons[grade]}</span>
            <span className={`text-3xl font-bold ${gradeColors[grade]}`}>
              {t(`results.${grade}`)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-white/95">
            <CardHeader>
              <CardTitle>{t('results.summary')}</CardTitle>
            </CardHeader>
            <CardContent>
              {gameData && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="font-medium">Final MAU:</span>
                    <span className="text-2xl font-bold">{gameData.mau.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="font-medium">Average Latency:</span>
                    <span className="text-2xl font-bold">{Math.round(gameData.latency_ms)}ms</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="font-medium">Security Score:</span>
                    <span className="text-2xl font-bold">{gameData.security}/100</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="font-medium">Final Cash:</span>
                    <span className="text-2xl font-bold">${gameData.cash.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="font-medium">Turns Completed:</span>
                    <span className="text-2xl font-bold">{gameData.turn}/36</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/95">
            <CardHeader>
              <CardTitle>{t('results.achievements')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {gameData && gameData.security >= 70 && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                    <Medal className="h-6 w-6 text-green-500" />
                    <div>
                      <div className="font-semibold">Security Champion</div>
                      <div className="text-sm text-muted-foreground">Maintained high security</div>
                    </div>
                  </div>
                )}

                {gameData && gameData.latency_ms <= 200 && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <Medal className="h-6 w-6 text-blue-500" />
                    <div>
                      <div className="font-semibold">Performance Master</div>
                      <div className="text-sm text-muted-foreground">Excellent response times</div>
                    </div>
                  </div>
                )}

                {gameData && gameData.mau >= 500000 && (
                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <Medal className="h-6 w-6 text-purple-500" />
                    <div>
                      <div className="font-semibold">Growth Expert</div>
                      <div className="text-sm text-muted-foreground">Scaled to 500K+ users</div>
                    </div>
                  </div>
                )}

                {grade === 'gold' && (
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                    <Medal className="h-6 w-6 text-yellow-500" />
                    <div>
                      <div className="font-semibold">Well-Architected</div>
                      <div className="text-sm text-muted-foreground">Achieved gold tier</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {history.length > 0 && (
          <Card className="bg-white/95 mb-6">
            <CardHeader>
              <CardTitle>Performance Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <MetricsChart history={history} />
            </CardContent>
          </Card>
        )}

        <div className="flex justify-center gap-4">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            size="lg"
            className="bg-white"
          >
            <Home className="h-5 w-5 mr-2" />
            {t('results.mainMenu')}
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="aws"
            size="lg"
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            {t('results.playAgain')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;