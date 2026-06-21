/**
 * InsightsList unit tests.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InsightsList } from '../src/components/Insights/InsightsList';
import type { InsightsResponse } from '../src/types';

const mockSaveEntry = vi.fn();

vi.mock('../src/store/carbonStore', () => ({
  useCarbonStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ saveEntry: mockSaveEntry }),
}));

const mockInsightsGemini: InsightsResponse = {
  insights: [
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
  ],
  source: 'gemini',
  total_potential_saving_kg: 1860,
};

const mockInsightsRules: InsightsResponse = {
  ...mockInsightsGemini,
  source: 'rules',
};

describe('InsightsList', () => {
  it('renders all 3 insights', () => {
    render(<InsightsList insightsResponse={mockInsightsGemini} />);
    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(3);
  });

  it('renders the section heading', () => {
    render(<InsightsList insightsResponse={mockInsightsGemini} />);
    expect(
      screen.getByRole('heading', { name: /your personalised reduction plan/i })
    ).toBeInTheDocument();
  });

  it('shows Gemini badge when source is gemini', () => {
    render(<InsightsList insightsResponse={mockInsightsGemini} />);
    expect(screen.getByText(/powered by google gemini ai/i)).toBeInTheDocument();
  });

  it('does not show Gemini badge when source is rules', () => {
    render(<InsightsList insightsResponse={mockInsightsRules} />);
    expect(screen.queryByText(/powered by google gemini ai/i)).not.toBeInTheDocument();
  });

  it('shows rule-based badge when source is rules', () => {
    render(<InsightsList insightsResponse={mockInsightsRules} />);
    expect(screen.getByText(/rule-based insights/i)).toBeInTheDocument();
  });

  it('displays total potential saving', () => {
    render(<InsightsList insightsResponse={mockInsightsGemini} />);
    expect(screen.getByText(/total potential annual saving/i)).toBeInTheDocument();
    // 1860 kg → "1.9t"
    expect(screen.getByText(/1\.9t/)).toBeInTheDocument();
  });

  it('each InsightCard has article role with aria-label', () => {
    render(<InsightsList insightsResponse={mockInsightsGemini} />);
    const articles = screen.getAllByRole('article');
    articles.forEach(article => {
      expect(article).toHaveAttribute('aria-label');
    });
  });

  it('renders an ordered list for insights', () => {
    render(<InsightsList insightsResponse={mockInsightsGemini} />);
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('section has aria-live="polite"', () => {
    render(<InsightsList insightsResponse={mockInsightsGemini} />);
    const section = screen.getByRole('region', { name: /your personalised reduction plan/i });
    expect(section).toHaveAttribute('aria-live', 'polite');
  });

  it('renders Save to History button', () => {
    render(<InsightsList insightsResponse={mockInsightsGemini} />);
    expect(screen.getByRole('button', { name: /save.*history/i })).toBeInTheDocument();
  });
});
