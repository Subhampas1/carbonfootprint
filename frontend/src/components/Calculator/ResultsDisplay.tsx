/**
 * ResultsDisplay — Carbon calculation results with comparisons and chart.
 *
 * Accessibility features:
 *   - <section aria-labelledby="results-heading">
 *   - aria-live="polite" so screen readers announce new results
 *   - Progress bars have aria-label with percentage and comparison target
 *   - "Get Personalized Insights" button triggers AI insights flow
 */

import { useCarbonStore } from '../../store/carbonStore';
import type { CarbonResult } from '../../types';
import { formatKg, getFootprintLabel } from '../../utils/formatters';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { CategoryChart } from './CategoryChart';

interface ResultsDisplayProps {
  result: CarbonResult;
}

const ComparisonBar = ({
  id,
  label,
  pct,
  benchmark,
  benchmarkKg,
}: {
  id: string;
  label: string;
  pct: number;
  benchmark: string;
  benchmarkKg: number;
}) => {
  const clampedPct = Math.min(pct, 200);
  const barWidth = Math.min(clampedPct / 2, 100); // 200% maps to full bar width
  const color = pct <= 100 ? 'bg-primary-500' : pct <= 150 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="font-bold text-gray-900">
          {pct.toFixed(0)}%{' '}
          <span className="font-normal text-gray-500">of {formatKg(benchmarkKg)}</span>
        </span>
      </div>
      <div
        className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={200}
        aria-label={`${label}: your footprint is ${pct.toFixed(0)}% of the ${benchmark} (${formatKg(benchmarkKg)}/year)`}
        id={id}
      >
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${barWidth}%` }}
        />
        {/* 100% marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-gray-400 opacity-60"
          style={{ left: '50%' }}
          aria-hidden="true"
        />
      </div>
      <p className="text-xs text-gray-400">
        {pct <= 100
          ? `✅ You are below the ${benchmark}`
          : `⚠️ You are ${(pct - 100).toFixed(0)}% above the ${benchmark}`}
      </p>
    </div>
  );
};

export const ResultsDisplay = ({ result }: ResultsDisplayProps) => {
  const fetchInsights = useCarbonStore(s => s.fetchInsights);
  const isLoadingInsights = useCarbonStore(s => s.isLoadingInsights);
  const insights = useCarbonStore(s => s.insights);

  const { label, colorClass, bgClass } = getFootprintLabel(result.vs_global_average_pct);

  return (
    <section
      aria-labelledby="results-heading"
      aria-live="polite"
      aria-atomic="true"
      className="space-y-6 animate-slide-up"
    >
      {/* Total Footprint Hero */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <h2 id="results-heading" className="text-xl font-semibold text-gray-600 mb-2">
          Your Annual Carbon Footprint
        </h2>
        <div className="flex items-end justify-center gap-2 mb-3">
          <span className="text-6xl font-black text-gray-900 tabular-nums">
            {formatKg(result.total_kg)}
          </span>
          <span className="text-2xl text-gray-400 mb-2">CO₂e</span>
        </div>
        <span
          className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold ${colorClass} ${bgClass}`}
        >
          {label}
        </span>
      </div>

      {/* Benchmark Comparisons */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <span aria-hidden="true">📊</span> How You Compare
        </h3>
        <ComparisonBar
          id="global-average-bar"
          label="vs Global Average"
          pct={result.vs_global_average_pct}
          benchmark="global average"
          benchmarkKg={4000}
        />
        <ComparisonBar
          id="paris-target-bar"
          label="vs Paris 1.5°C Target"
          pct={result.vs_paris_target_pct}
          benchmark="Paris climate target"
          benchmarkKg={2000}
        />
        <p className="text-xs text-gray-400 pt-2 border-t border-gray-50">
          Sources: Our World in Data 2023 (global avg) · IPCC SR1.5 (Paris target)
        </p>
      </div>

      {/* Category Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span aria-hidden="true">🔍</span> Breakdown by Category
        </h3>
        <CategoryChart breakdown={result.breakdown} ranked_categories={result.ranked_categories} />
      </div>

      {/* Get Insights CTA */}
      {!insights && (
        <div className="flex justify-center">
          <button
            onClick={fetchInsights}
            disabled={isLoadingInsights}
            aria-busy={isLoadingInsights}
            aria-label={
              isLoadingInsights
                ? 'Loading your personalised reduction plan...'
                : 'Get personalised carbon reduction insights powered by Google Gemini AI'
            }
            className="
              flex items-center gap-3 bg-gradient-to-r from-primary-600 to-primary-500
              text-white px-8 py-4 rounded-2xl text-base font-semibold
              hover:from-primary-700 hover:to-primary-600 active:scale-95
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
              disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100
              transition-all duration-200 shadow-lg shadow-primary-600/25 min-w-[260px] justify-center
            "
          >
            {isLoadingInsights ? (
              <LoadingSpinner label="Generating insights..." size="sm" />
            ) : (
              <>
                <span aria-hidden="true">✨</span>
                Get Personalised Insights
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Gemini AI</span>
              </>
            )}
          </button>
        </div>
      )}
    </section>
  );
};
