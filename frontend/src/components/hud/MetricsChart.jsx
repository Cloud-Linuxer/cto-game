import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const MetricsChart = ({ history = [] }) => {
  const { t } = useTranslation();

  const data = history.map((snapshot, index) => ({
    turn: index + 1,
    mau: snapshot.mau,
    latency: snapshot.latency_ms,
    security: snapshot.security,
    cash: snapshot.cash,
  }));

  return (
    <div className="flex flex-col gap-2 p-4 bg-card rounded-lg border">
      <h3 className="text-lg font-semibold">Performance Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="turn"
            label={{ value: 'Turn', position: 'insideBottom', offset: -5 }}
            className="text-xs"
          />
          <YAxis className="text-xs" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="mau"
            stroke="#3b82f6"
            name={t('metrics.mau')}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="latency"
            stroke="#f59e0b"
            name={t('metrics.latency')}
            strokeWidth={2}
          />
          <Line
            type="monotone"
            dataKey="security"
            stroke="#10b981"
            name={t('metrics.security')}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MetricsChart;