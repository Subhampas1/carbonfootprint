/**
 * HistoryChart — Line chart showing carbon footprint trend over time.
 *
 * Accessibility features:
 *   - role="img" with aria-label on chart wrapper
 *   - Accessible data table below (sr-only)
 *   - Empty state with role="status"
 *   - Up/down arrows with aria-label for trend indicators in table
 */

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HistoryEntry } from '../../types';
import { formatDate, formatKg } from '../../utils/formatters';

interface HistoryChartProps {
  history: HistoryEntry[];
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className="font-bold text-gray-900">{formatKg(payload[0].value)} CO₂e</p>
    </div>
  );
};

export const HistoryChart = ({ history }: HistoryChartProps) => {
  if (history.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
        <div className="text-5xl mb-4" aria-hidden="true">
          📈
        </div>
        <p role="status" className="text-gray-500">
          No history yet. Calculate your footprint to start tracking your progress over time.
        </p>
      </div>
    );
  }

  // Display oldest → newest for the trend line
  const chartData = [...history].reverse().map(entry => ({
    date: formatDate(entry.timestamp),
    kg: entry.total_kg,
  }));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
      <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
        <span aria-hidden="true">📈</span> Footprint Trend
      </h3>

      {/* Recharts line chart */}
      <div
        role="img"
        aria-label="Line chart showing carbon footprint trend over time. A data table with the same information follows."
        className="w-full h-56"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
            aria-hidden="true"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => formatKg(v)}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="kg"
              stroke="#16a34a"
              strokeWidth={2.5}
              dot={{ fill: '#16a34a', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#15803d' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Screen reader accessible data table */}
      <table className="sr-only">
        <caption>Carbon footprint history — date and total CO₂e emissions</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Total CO₂e (kg)</th>
            <th scope="col">Change vs previous</th>
          </tr>
        </thead>
        <tbody>
          {chartData.map((entry, i) => {
            const prev = chartData[i - 1];
            const diff = prev ? entry.kg - prev.kg : null;
            const trendLabel =
              diff === null
                ? 'First entry'
                : diff > 0
                  ? `Up ${formatKg(Math.abs(diff))}`
                  : diff < 0
                    ? `Down ${formatKg(Math.abs(diff))}`
                    : 'No change';
            return (
              <tr key={i}>
                <th scope="row">{entry.date}</th>
                <td>{Math.round(entry.kg)}</td>
                <td>{trendLabel}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
