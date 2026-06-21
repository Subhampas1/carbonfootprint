import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CarbonForm } from '../src/components/Calculator/CarbonForm';
import { HistoryTable } from '../src/components/History/HistoryTable';
import { HistoryChart } from '../src/components/History/HistoryChart';
import { CategoryChart } from '../src/components/Calculator/CategoryChart';
import { InsightCard } from '../src/components/Insights/InsightCard';
import {
  formatKg,
  formatCategory,
  getFootprintLabel,
  getCategoryIcon,
  formatDate,
  getDeviceId,
} from '../src/utils/formatters';
import { validateCarbonInput } from '../src/utils/validators';
import type { HistoryEntry } from '../src/types';
import React from 'react';

// Mock Zustand store
const mockCalculate = vi.fn();
const mockClearError = vi.fn();
let mockIsCalculating = false;
let mockError: string | null = null;

vi.mock('../src/store/carbonStore', () => ({
  useCarbonStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      calculate: mockCalculate,
      isCalculating: mockIsCalculating,
      error: mockError,
      clearError: mockClearError,
    }),
}));

// Mock Recharts to force tooltip rendering and execute YAxis formatters in jsdom
vi.mock('recharts', () => {
  return {
    ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    BarChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    LineChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    Bar: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    Line: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
    Cell: () => null,
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: ({ tickFormatter }: { tickFormatter?: (value: number) => string | number }) => {
      if (tickFormatter) {
        tickFormatter(2500);
      }
      return null;
    },
    Tooltip: ({
      content,
    }: {
      content?:
        | React.ReactNode
        | ((props: {
            active?: boolean;
            payload?: Array<{ value: number; payload: { category: string } }>;
            label?: string;
          }) => React.ReactNode);
    }) => {
      if (content) {
        if (React.isValidElement(content)) {
          return React.cloneElement(
            content as React.ReactElement<{
              active?: boolean;
              payload?: Array<{ value: number; payload: { category: string } }>;
              label?: string;
            }>,
            {
              active: true,
              payload: [{ value: 1500, payload: { category: 'transport' } }],
              label: '1 Jun 2025',
            }
          );
        }
        if (typeof content === 'function') {
          return content({
            active: true,
            payload: [{ value: 1500, payload: { category: 'transport' } }],
            label: '1 Jun 2025',
          });
        }
      }
      return null;
    },
  };
});

describe('History and Chart Components', () => {
  beforeEach(() => {
    mockCalculate.mockClear();
    mockClearError.mockClear();
    mockIsCalculating = false;
    mockError = null;
    sessionStorage.clear();
  });

  // ---------------------------------------------------------------------------
  // Formatters & Validators Utility Tests
  // ---------------------------------------------------------------------------
  it('covers all formatters.ts and validators.ts helper conditions', () => {
    // formatKg
    expect(formatKg(500)).toBe('500 kg');
    expect(formatKg(1500)).toBe('1.5t');

    // formatCategory
    expect(formatCategory('transport')).toBe('Transport');
    expect(formatCategory('home')).toBe('Home Energy');
    expect(formatCategory('diet')).toBe('Diet');
    expect(formatCategory('consumption')).toBe('Shopping & Goods');
    expect(formatCategory('general')).toBe('General');
    expect(formatCategory('unknown_val')).toBe('Unknown_val');

    // getFootprintLabel
    expect(getFootprintLabel(40).label).toBe('Excellent');
    expect(getFootprintLabel(80).label).toBe('Below Average');
    expect(getFootprintLabel(120).label).toBe('Above Average');
    expect(getFootprintLabel(160).label).toBe('High Impact');

    // getCategoryIcon
    expect(getCategoryIcon('transport')).toBe('🚗');
    expect(getCategoryIcon('home')).toBe('🏠');
    expect(getCategoryIcon('diet')).toBe('🥗');
    expect(getCategoryIcon('consumption')).toBe('🛍️');
    expect(getCategoryIcon('general')).toBe('🌍');
    expect(getCategoryIcon('other')).toBe('📊');

    // formatDate
    expect(formatDate('2025-06-01T12:00:00Z')).toContain('2025');
    expect(formatDate('invalid-date')).toBe('invalid-date');

    // getDeviceId
    const id1 = getDeviceId();
    expect(id1.startsWith('dev-')).toBe(true);
    const id2 = getDeviceId();
    expect(id1).toBe(id2); // Retrieved from sessionStorage

    // validateCarbonInput (Zod wrapper)
    const validResult = validateCarbonInput({
      transport_km_car_petrol: 1000,
      transport_km_car_diesel: 0,
      transport_km_car_electric: 0,
      transport_km_bus: 0,
      transport_km_train: 0,
      flights_short_haul: 0,
      flights_long_haul: 0,
      home_electricity_kwh: 1000,
      home_gas_kwh: 0,
      household_size: 1,
      diet_type: 'vegan',
      consumption_level: 'low',
      device_id: 'test-device-id',
    });
    expect(validResult.success).toBe(true);

    const invalidResult = validateCarbonInput({ device_id: 'short' });
    expect(invalidResult.success).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // CarbonForm Callback & Validation Tests
  // ---------------------------------------------------------------------------
  it('interacts with all input fields in CarbonForm', async () => {
    render(<CarbonForm />);

    const inputs = [
      { label: /diesel car/i, value: '15000' },
      { label: /electric vehicle/i, value: '10000' },
      { label: /bus/i, value: '3000' },
      { label: /train/i, value: '5000' },
      { label: /short-haul flights/i, value: '4' },
      { label: /long-haul flights/i, value: '2' },
      { label: /natural gas/i, value: '9000' },
      { label: /household size/i, value: '3' },
    ];

    for (const item of inputs) {
      const input = screen.getByLabelText(item.label);
      fireEvent.change(input, { target: { value: item.value } });
      fireEvent.blur(input);
    }

    // Toggle diet radios
    const vegetarianRadio = screen.getByLabelText(/vegetarian/i);
    await userEvent.click(vegetarianRadio);

    // Change consumption dropdown
    const select = screen.getByLabelText(/shopping & consumption level/i);
    fireEvent.change(select, { target: { value: 'low' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /calculate/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCalculate).toHaveBeenCalled();
    });
  });

  it('triggers validation errors and error clears on CarbonForm input change', async () => {
    mockError = 'Store level failure';
    render(<CarbonForm />);

    const petrolInput = screen.getByLabelText(/petrol car/i);

    // Blur without changes
    fireEvent.blur(petrolInput);

    // Enter negative and blur to show error
    fireEvent.change(petrolInput, { target: { value: '-20' } });
    fireEvent.blur(petrolInput);

    await waitFor(() => {
      expect(screen.getByText(/must be greater than/i)).toBeInTheDocument();
    });

    // Change back to valid value to clear error and clear store error
    fireEvent.change(petrolInput, { target: { value: '100' } });
    expect(mockClearError).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // HistoryTable Tests
  // ---------------------------------------------------------------------------
  const mockHistory: HistoryEntry[] = [
    {
      id: 'entry-1',
      timestamp: '2025-06-01T12:00:00Z',
      total_kg: 4500.0,
      breakdown: { transport: 2000, home: 1500, diet: 500, consumption: 500 },
      ranked_categories: [
        { category: 'transport', kg: 2000, percentage: 44.4 },
        { category: 'home', kg: 1500, percentage: 33.3 },
      ],
      vs_global_average_pct: 112.5,
      vs_paris_target_pct: 225.0,
      insights: [
        {
          category: 'transport',
          action: 'Carpool.',
          estimated_saving_kg: 800,
          timeframe: '30 days',
          priority: 1,
        },
      ],
    },
    {
      id: 'entry-2',
      timestamp: '2025-05-01T12:00:00Z',
      total_kg: 3500.0,
      breakdown: { transport: 1500, home: 1000, diet: 500, consumption: 500 },
      ranked_categories: [],
      vs_global_average_pct: 87.5,
      vs_paris_target_pct: 175.0,
      insights: [],
    },
  ];

  it('renders and interacts with HistoryTable', async () => {
    const { rerender } = render(<HistoryTable history={mockHistory} />);

    // Toggle expand row
    const viewButton = screen.getAllByRole('button', { name: /view insights/i })[0];
    await userEvent.click(viewButton);

    expect(screen.getByText('Carpool.')).toBeInTheDocument();

    // Toggle collapse row
    const hideButton = screen.getByRole('button', { name: /collapse insights/i });
    await userEvent.click(hideButton);

    // Expand empty insights entry
    const viewButtonEmpty = screen.getAllByRole('button', { name: /view insights/i })[1];
    await userEvent.click(viewButtonEmpty);
    expect(screen.getByText(/no insights saved/i)).toBeInTheDocument();

    // Rerender with empty history returns null
    rerender(<HistoryTable history={[]} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Chart Rendering Mocks
  // ---------------------------------------------------------------------------
  it('renders CategoryChart and HistoryChart with mock data', () => {
    const categories = [
      { category: 'transport', kg: 2000, percentage: 50.0 },
      { category: 'home', kg: 1000, percentage: 25.0 },
      { category: 'diet', kg: 600, percentage: 15.0 },
      { category: 'consumption', kg: 400, percentage: 10.0 },
    ];
    render(<CategoryChart breakdown={{}} ranked_categories={categories} />);
    expect(
      screen.getByText('Carbon footprint breakdown by category (annual kg CO₂e)')
    ).toBeInTheDocument();

    render(<HistoryChart history={mockHistory} />);
    expect(screen.getByText('Footprint Trend')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // InsightCard Fallback Tests
  // ---------------------------------------------------------------------------
  it('renders InsightCard and triggers priority colors fallback branch', () => {
    const dummyInsight = {
      category: 'transport',
      action: 'Drive less.',
      estimated_saving_kg: 500,
      timeframe: '30 days',
      priority: 1,
    };
    render(<InsightCard insight={dummyInsight} index={3} />);
    expect(screen.getByText('Drive less.')).toBeInTheDocument();
  });
});
