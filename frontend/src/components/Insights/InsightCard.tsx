/**
 * InsightCard — Single carbon reduction action card.
 *
 * Accessibility features:
 *   - <article> with descriptive aria-label
 *   - Priority badge is visually prominent and screen-reader legible
 *   - Category icon decorative (aria-hidden)
 */

import type { InsightItem } from '../../types';
import { formatKg, getCategoryIcon, formatCategory } from '../../utils/formatters';

interface InsightCardProps {
  insight: InsightItem;
  index: number;
}

const priorityColors = ['bg-primary-600', 'bg-primary-500', 'bg-primary-400'];

export const InsightCard = ({ insight, index }: InsightCardProps) => {
  const icon = getCategoryIcon(insight.category);
  const categoryLabel = formatCategory(insight.category);
  const saving = formatKg(insight.estimated_saving_kg);
  const badgeColor = priorityColors[index] ?? priorityColors[2];

  return (
    <article
      aria-label={`Insight ${index + 1}: ${categoryLabel} — ${insight.action}`}
      className="
        bg-white rounded-2xl border border-gray-100 shadow-sm p-5
        hover:shadow-md hover:border-primary-200 transition-all duration-200
        animate-fade-in
      "
    >
      <div className="flex items-start gap-4">
        {/* Priority Badge */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1">
          <span
            className={`
              ${badgeColor} text-white text-xs font-bold
              w-8 h-8 rounded-full flex items-center justify-center
              shadow-md
            `}
            aria-label={`Priority ${insight.priority}`}
          >
            {insight.priority}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Category header */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl" aria-hidden="true">
              {icon}
            </span>
            <span className="text-xs font-semibold text-primary-700 uppercase tracking-wide">
              {categoryLabel}
            </span>
          </div>

          {/* Action text */}
          <p className="text-sm text-gray-700 leading-relaxed mb-3">{insight.action}</p>

          {/* Metrics row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Saving */}
            <div className="flex items-center gap-1.5 bg-primary-50 text-primary-800 rounded-lg px-3 py-1.5">
              <span aria-hidden="true">💚</span>
              <span className="text-xs font-semibold">Save ~{saving} CO₂e/year</span>
            </div>

            {/* Timeframe */}
            <div className="flex items-center gap-1.5 bg-gray-50 text-gray-600 rounded-lg px-3 py-1.5">
              <span aria-hidden="true">⏱</span>
              <span className="text-xs">{insight.timeframe}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};
