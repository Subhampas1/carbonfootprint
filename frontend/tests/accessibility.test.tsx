/**
 * Accessibility tests using jest-axe and @testing-library/react.
 * Every major component is tested for WCAG 2.1 AA violations.
 */

import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';
import { CarbonForm } from '../src/components/Calculator/CarbonForm';
import { CategoryChart } from '../src/components/Calculator/CategoryChart';
import { ResultsDisplay } from '../src/components/Calculator/ResultsDisplay';
import { InsightCard } from '../src/components/Insights/InsightCard';
import { InsightsList } from '../src/components/Insights/InsightsList';
import { HistoryChart } from '../src/components/History/HistoryChart';
import { HistoryTable } from '../src/components/History/HistoryTable';
import type { CarbonResult, HistoryEntry, InsightsResponse, InsightItem } from '../src/types';

// jest-axe matchers registered globally in setup.ts (expect.extend(toHaveNoViolations))

// --------------------------------------------------------------------------
// Shared mock data
// --------------------------------------------------------------------------
const mockResult: CarbonResult = {
  total_kg: 6800,
  breakdown: { transport: 3000, home: 1300, diet: 2500, consumption: 1000 },
  vs_global_average_pct: 170,
  vs_paris_target_pct: 340,
  ranked_categories: [
    { category: 'transport', kg: 3000, percentage: 44.1 },
    { category: 'diet', kg: 2500, percentage: 36.8 },
    { category: 'home', kg: 1300, percentage: 19.1 },
    { category: 'consumption', kg: 1000, percentage: 14.7 },
  ],
  device_id: 'test-device-001',
};

const mockInsights: InsightItem[] = [
  {
    category: 'transport',
    action: 'Switch to public transport for your daily commute.',
    estimated_saving_kg: 1200,
    timeframe: 'Achievable within 30 days',
    priority: 1,
  },
  {
    category: 'diet',
    action: 'Try 2 plant-based days per week.',
    estimated_saving_kg: 400,
    timeframe: 'Achievable within 30 days',
    priority: 2,
  },
  {
    category: 'home',
    action: 'Install a smart thermostat.',
    estimated_saving_kg: 260,
    timeframe: 'Achievable within 30 days',
    priority: 3,
  },
];

const mockInsightsResponse: InsightsResponse = {
  insights: mockInsights,
  source: 'gemini',
  total_potential_saving_kg: 1860,
};

const mockHistory: HistoryEntry[] = [
  {
    id: 'entry-001',
    timestamp: '2024-01-15T12:00:00Z',
    total_kg: 7200,
    breakdown: { transport: 3200, home: 1500, diet: 2500, consumption: 1000 },
    ranked_categories: [{ category: 'transport', kg: 3200, percentage: 44 }],
    insights: mockInsights,
    vs_global_average_pct: 180,
    vs_paris_target_pct: 360,
  },
  {
    id: 'entry-002',
    timestamp: '2024-03-10T14:30:00Z',
    total_kg: 6800,
    breakdown: { transport: 3000, home: 1300, diet: 2500, consumption: 1000 },
    ranked_categories: [{ category: 'transport', kg: 3000, percentage: 44 }],
    insights: mockInsights,
    vs_global_average_pct: 170,
    vs_paris_target_pct: 340,
  },
];

// --------------------------------------------------------------------------
// Mock Zustand store for components that need it
// --------------------------------------------------------------------------
vi.mock('../src/store/carbonStore', () => ({
  useCarbonStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      fetchInsights: vi.fn(),
      isLoadingInsights: false,
      insights: null,
      saveEntry: vi.fn(),
      error: null,
      clearError: vi.fn(),
      isCalculating: false,
      calculate: vi.fn(),
    }),
}));

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe('Accessibility — CarbonForm', () => {
  it('has no axe violations', async () => {
    const { container } = render(<CarbonForm />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Accessibility — CategoryChart', () => {
  it('has no axe violations', async () => {
    const { container } = render(
      <CategoryChart
        breakdown={mockResult.breakdown}
        ranked_categories={mockResult.ranked_categories}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Accessibility — ResultsDisplay', () => {
  it('has no axe violations', async () => {
    const { container } = render(<ResultsDisplay result={mockResult} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Accessibility — InsightCard', () => {
  it('has no axe violations', async () => {
    const { container } = render(<InsightCard insight={mockInsights[0]} index={0} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Accessibility — InsightsList', () => {
  it('has no axe violations', async () => {
    const { container } = render(<InsightsList insightsResponse={mockInsightsResponse} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Accessibility — HistoryChart (with data)', () => {
  it('has no axe violations', async () => {
    const { container } = render(<HistoryChart history={mockHistory} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no axe violations when empty', async () => {
    const { container } = render(<HistoryChart history={[]} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});

describe('Accessibility — HistoryTable', () => {
  it('has no axe violations', async () => {
    const { container } = render(<HistoryTable history={mockHistory} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
