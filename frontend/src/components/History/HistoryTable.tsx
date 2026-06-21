/**
 * HistoryTable — Full accessible sortable table of carbon history entries.
 *
 * Accessibility features:
 *   - <table> with <caption>
 *   - <th scope="col"> for column headers
 *   - <th scope="row"> for date column
 *   - "View Details" button expands insights inline via aria-expanded
 *   - aria-controls links button to the expanded region
 */

import { Fragment, useState } from 'react';
import type { HistoryEntry } from '../../types';
import { formatCategory, formatDate, formatKg, getCategoryIcon } from '../../utils/formatters';

interface HistoryTableProps {
  history: HistoryEntry[];
}

const InsightExpandedRow = ({ entry, id }: { entry: HistoryEntry; id: string }) => (
  <div
    id={id}
    role="region"
    aria-label={`Insights for entry dated ${formatDate(entry.timestamp)}`}
    className="bg-primary-50 border border-primary-100 rounded-xl p-4 mt-2 space-y-2"
  >
    <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide mb-2">
      Reduction Insights
    </p>
    {entry.insights.length === 0 ? (
      <p className="text-sm text-gray-500">No insights saved for this entry.</p>
    ) : (
      <ol className="space-y-2 list-none">
        {entry.insights.map((insight, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span aria-hidden="true">{getCategoryIcon(insight.category)}</span>
            <span>{insight.action}</span>
            <span className="ml-auto text-xs text-primary-700 font-semibold whitespace-nowrap">
              ~{formatKg(insight.estimated_saving_kg)}/yr
            </span>
          </li>
        ))}
      </ol>
    )}
  </div>
);

export const HistoryTable = ({ history }: HistoryTableProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (history.length === 0) return null;

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <caption className="sr-only">
            Carbon footprint history entries, ordered newest first
          </caption>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Date
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Total CO₂e
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell"
              >
                Top Category
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider"
              >
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {history.map(entry => {
              const topCategory =
                entry.ranked_categories?.[0]?.category ?? Object.keys(entry.breakdown)[0] ?? '—';
              const isExpanded = expandedId === entry.id;
              const expandId = `expand-${entry.id}`;

              return (
                <Fragment key={entry.id}>
                  <tr className="hover:bg-gray-50 transition-colors duration-100">
                    <th scope="row" className="px-4 py-3 font-medium text-gray-800 text-left">
                      {formatDate(entry.timestamp)}
                    </th>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">
                      {formatKg(entry.total_kg)}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full">
                        <span aria-hidden="true">{getCategoryIcon(topCategory)}</span>
                        {formatCategory(topCategory)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleExpand(entry.id)}
                        aria-expanded={isExpanded}
                        aria-controls={expandId}
                        aria-label={`${isExpanded ? 'Collapse' : 'View'} insights for entry dated ${formatDate(entry.timestamp)}`}
                        className="
                          text-xs text-primary-600 font-semibold
                          hover:text-primary-800 focus:outline-none
                          focus:ring-2 focus:ring-primary-500 rounded px-2 py-1
                          transition-colors duration-150
                        "
                      >
                        {isExpanded ? '▲ Hide' : '▼ View'}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={4} className="px-4 pb-4">
                        <InsightExpandedRow entry={entry} id={expandId} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
