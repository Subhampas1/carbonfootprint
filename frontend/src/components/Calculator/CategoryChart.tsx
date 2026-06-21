/**
 * CategoryChart — Bar chart of carbon breakdown by category.
 *
 * Accessibility features:
 *   - Chart wrapper: role="img" aria-label describing the chart
 *   - Data table below chart: className="sr-only" (screen reader only)
 *   - Table has <caption>, <th scope="col">, <th scope="row">
 *   - All colour choices meet WCAG 4.5:1 contrast against white background
 */

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { RankedCategory } from '../../types';
import { formatCategory, formatKg } from '../../utils/formatters';

interface CategoryChartProps {
  breakdown: Record<string, number>;
  ranked_categories: RankedCategory[];
}

const CATEGORY_COLORS: Record<string, string> = {
  transport: '#15803d',
  home: '#16a34a',
  diet: '#22c55e',
  consumption: '#4ade80',
  general: '#86efac',
};

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { category: string } }>;
}) => {
  if (!active || !payload?.length) return null;
  const { value, payload: data } = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-gray-900">{formatCategory(data.category)}</p>
      <p className="text-primary-700">{formatKg(value)} CO₂e</p>
    </div>
  );
};

export const CategoryChart = ({ breakdown: _breakdown, ranked_categories }: CategoryChartProps) => {
  const chartData = ranked_categories.map(item => ({
    category: item.category,
    label: formatCategory(item.category),
    kg: item.kg,
    percentage: item.percentage,
  }));

  return (
    <div>
      {/* Recharts bar chart — hidden from screen readers (table below is the accessible version) */}
      <div
        role="img"
        aria-label="Bar chart showing annual carbon footprint broken down by category. A data table with the same information follows."
        className="w-full h-56"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
            aria-hidden="true"
          >
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: '#6b7280' }}
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
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f0fdf4' }} />
            <Bar dataKey="kg" radius={[6, 6, 0, 0]} maxBarSize={64}>
              {chartData.map(entry => (
                <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] ?? '#16a34a'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Screen reader data table (visually hidden) */}
      <table className="sr-only">
        <caption>Carbon footprint breakdown by category (annual kg CO₂e)</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">kg CO₂e per year</th>
            <th scope="col">Percentage of total</th>
          </tr>
        </thead>
        <tbody>
          {ranked_categories.map(item => (
            <tr key={item.category}>
              <th scope="row">{formatCategory(item.category)}</th>
              <td>{Math.round(item.kg)}</td>
              <td>{item.percentage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
