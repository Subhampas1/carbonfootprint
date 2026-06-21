/**
 * App — Main application layout with ARIA landmarks.
 *
 * Accessibility features:
 *   - role="banner" on header
 *   - <nav aria-label="Main navigation">
 *   - id="main-content" tabIndex={-1} as skip-link target
 *   - role="contentinfo" on footer
 *   - Error boundary wraps the entire app
 */

import { useEffect } from 'react';
import { ErrorBoundary } from './components/shared/ErrorBoundary';
import { SkipLink } from './components/shared/SkipLink';
import { LoadingSpinner } from './components/shared/LoadingSpinner';
import { CarbonForm } from './components/Calculator/CarbonForm';
import { ResultsDisplay } from './components/Calculator/ResultsDisplay';
import { InsightsList } from './components/Insights/InsightsList';
import { HistoryChart } from './components/History/HistoryChart';
import { HistoryTable } from './components/History/HistoryTable';
import { useCarbonStore } from './store/carbonStore';

const NavLink = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    aria-current={active ? 'page' : undefined}
    className={`
      px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150
      focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
      ${
        active
          ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
          : 'text-gray-600 hover:text-primary-700 hover:bg-primary-50'
      }
    `}
  >
    {label}
  </button>
);

function AppContent() {
  const step = useCarbonStore(s => s.step);
  const setStep = useCarbonStore(s => s.setStep);
  const result = useCarbonStore(s => s.result);
  const insights = useCarbonStore(s => s.insights);
  const history = useCarbonStore(s => s.history);
  const isLoadingHistory = useCarbonStore(s => s.isLoadingHistory);
  const fetchHistory = useCarbonStore(s => s.fetchHistory);
  const reset = useCarbonStore(s => s.reset);

  const handleHistoryClick = () => {
    setStep('history');
    fetchHistory();
  };

  // Focus main content area on step change (for keyboard/screen reader users)
  useEffect(() => {
    const main = document.getElementById('main-content');
    if (main) main.focus();
  }, [step]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-primary-50/30 to-gray-50">
      {/* Skip Link */}
      <SkipLink />

      {/* ------------------------------------------------------------------ */}
      {/* Header / Navigation                                                  */}
      {/* ------------------------------------------------------------------ */}
      <header
        role="banner"
        className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-gray-100 shadow-sm"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={reset}
            aria-label="Carbon Footprint Platform — return to calculator"
            className="flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg p-1"
          >
            <span className="text-2xl" aria-hidden="true">
              🌍
            </span>
            <div className="text-left">
              <span className="block text-sm font-bold text-gray-900 leading-tight">
                Carbon Platform
              </span>
              <span className="block text-xs text-primary-600 leading-tight">
                Understand · Track · Reduce
              </span>
            </div>
          </button>

          {/* Navigation */}
          <nav aria-label="Main navigation">
            <ul className="flex items-center gap-2 list-none m-0 p-0">
              <li>
                <NavLink
                  label="Calculate"
                  active={step === 'form' || step === 'results'}
                  onClick={() => setStep(result ? 'results' : 'form')}
                />
              </li>
              <li>
                <NavLink label="History" active={step === 'history'} onClick={handleHistoryClick} />
              </li>
            </ul>
          </nav>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Hero Banner (only on form step)                                      */}
      {/* ------------------------------------------------------------------ */}
      {step === 'form' && (
        <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 text-white py-10 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl font-black mb-3 tracking-tight">
              What's Your Carbon Footprint?
            </h1>
            <p className="text-primary-100 text-base sm:text-lg max-w-2xl mx-auto">
              Enter your lifestyle data below to calculate your annual CO₂e emissions, compare to
              global benchmarks, and receive AI-powered personalised actions.
            </p>
            <div className="flex justify-center gap-6 mt-6 text-sm text-primary-200">
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true">📊</span> Science-backed factors
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true">✨</span> Gemini AI insights
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden="true">🔒</span> Anonymous & private
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Main Content                                                         */}
      {/* ------------------------------------------------------------------ */}
      <main
        id="main-content"
        tabIndex={-1}
        aria-label="Main content"
        className="max-w-4xl mx-auto px-4 sm:px-6 py-8 focus:outline-none"
      >
        {step === 'form' && <CarbonForm />}

        {step === 'results' && result && (
          <div className="space-y-8">
            {/* Back button */}
            <button
              onClick={() => setStep('form')}
              aria-label="Back to calculator form"
              className="
                flex items-center gap-2 text-sm text-gray-500 hover:text-primary-700
                focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg px-2 py-1
                transition-colors duration-150
              "
            >
              <span aria-hidden="true">←</span> Back to Calculator
            </button>
            <ResultsDisplay result={result} />
            {insights && <InsightsList insightsResponse={insights} />}
          </div>
        )}

        {step === 'history' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Your Carbon History</h1>
              <p className="text-gray-500 text-sm">
                Track your footprint over time to see the impact of your changes.
              </p>
            </div>
            {isLoadingHistory ? (
              <div className="flex justify-center py-16">
                <LoadingSpinner label="Loading your history..." size="lg" />
              </div>
            ) : (
              <>
                <HistoryChart history={history} />
                <HistoryTable history={history} />
              </>
            )}
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* Footer                                                               */}
      {/* ------------------------------------------------------------------ */}
      <footer role="contentinfo" className="border-t border-gray-100 bg-white mt-16 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Data Sources</h2>
              <ul className="text-xs text-gray-500 space-y-1 list-none">
                <li>UK DEFRA 2023 — Transport & Home Energy factors</li>
                <li>US EPA 2023 — Electricity grid emissions</li>
                <li>ICAO Carbon Calculator — Aviation emissions</li>
                <li>Our World in Data 2023 — Diet emissions & global average</li>
                <li>IPCC AR6 / SR1.5 — Consumption & Paris target</li>
              </ul>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">About</h2>
              <p className="text-xs text-gray-500">
                This tool provides estimates for educational purposes based on peer-reviewed
                emission factors. Individual results may vary based on local grid mix, vehicle
                efficiency, and personal circumstances.
              </p>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-400">
            <span>© 2024 Carbon Footprint Awareness Platform</span>
            <span className="flex items-center gap-1">
              Powered by{' '}
              <span aria-label="Google Gemini AI" className="font-medium text-gray-500">
                Google Gemini
              </span>{' '}
              ·{' '}
              <span aria-label="Google Cloud" className="font-medium text-gray-500">
                Google Cloud
              </span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
