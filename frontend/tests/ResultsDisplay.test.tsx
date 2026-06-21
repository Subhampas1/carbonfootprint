/**
 * ResultsDisplay unit tests.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ResultsDisplay } from '../src/components/Calculator/ResultsDisplay';
import type { CarbonResult } from '../src/types';

const mockFetchInsights = vi.fn();
let mockInsightsState: unknown = null;
let mockIsLoading = false;

vi.mock('../src/store/carbonStore', () => ({
  useCarbonStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      fetchInsights: mockFetchInsights,
      isLoadingInsights: mockIsLoading,
      insights: mockInsightsState,
    }),
}));

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

describe('ResultsDisplay', () => {
  beforeEach(() => {
    mockFetchInsights.mockClear();
    mockInsightsState = null;
    mockIsLoading = false;
  });

  it('renders the results heading', () => {
    render(<ResultsDisplay result={mockResult} />);
    expect(
      screen.getByRole('heading', { name: /your annual carbon footprint/i })
    ).toBeInTheDocument();
  });

  it('renders the total footprint value', () => {
    render(<ResultsDisplay result={mockResult} />);
    // 6800 kg → "6.8t" (formatKg function)
    expect(screen.getByText(/6\.8t/)).toBeInTheDocument();
  });

  it('renders comparison to global average', () => {
    render(<ResultsDisplay result={mockResult} />);
    expect(screen.getByText(/vs global average/i)).toBeInTheDocument();
  });

  it('renders comparison to Paris target', () => {
    render(<ResultsDisplay result={mockResult} />);
    expect(screen.getAllByText(/paris/i).length).toBeGreaterThan(0);
  });

  it('global average progressbar has correct aria-valuenow', () => {
    render(<ResultsDisplay result={mockResult} />);
    const bars = screen.getAllByRole('progressbar');
    const globalBar = bars.find(b => b.getAttribute('aria-label')?.includes('global average'));
    expect(globalBar).toBeTruthy();
    expect(globalBar!.getAttribute('aria-valuenow')).toBe('170');
  });

  it('renders CategoryChart section heading', () => {
    render(<ResultsDisplay result={mockResult} />);
    expect(screen.getByRole('heading', { name: /breakdown by category/i })).toBeInTheDocument();
  });

  it('renders Get Personalised Insights button when no insights loaded', () => {
    mockInsightsState = null;
    render(<ResultsDisplay result={mockResult} />);
    // Button shows when insights is null
    const btn = screen.getByRole('button');
    expect(btn).toBeInTheDocument();
    expect(btn.getAttribute('aria-label')).toMatch(/personalised/i);
  });

  it('clicking Get Insights calls fetchInsights', async () => {
    mockInsightsState = null;
    render(<ResultsDisplay result={mockResult} />);
    const btn = screen.getByRole('button');
    await userEvent.click(btn);
    expect(mockFetchInsights).toHaveBeenCalledTimes(1);
  });

  it('does not render Get Insights button when insights already loaded', () => {
    mockInsightsState = { insights: [], source: 'rules', total_potential_saving_kg: 0 };
    render(<ResultsDisplay result={mockResult} />);
    // No button when insights exist
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    // But the footprint value still renders
    expect(screen.getByText(/6\.8t/)).toBeInTheDocument();
  });

  it('section has aria-live="polite"', () => {
    render(<ResultsDisplay result={mockResult} />);
    const section = screen.getByRole('region', { name: /your annual carbon footprint/i });
    expect(section).toHaveAttribute('aria-live', 'polite');
  });
});
