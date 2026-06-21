/**
 * CarbonForm unit tests.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CarbonForm } from '../src/components/Calculator/CarbonForm';

// Mock the store
const mockCalculate = vi.fn();
let mockIsCalculating = false;
let mockError: string | null = null;

vi.mock('../src/store/carbonStore', () => ({
  useCarbonStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      calculate: mockCalculate,
      isCalculating: mockIsCalculating,
      error: mockError,
      clearError: vi.fn(),
    }),
}));

// Mock getDeviceId to return a predictable value
vi.mock('../src/utils/formatters', async importOriginal => {
  const mod = await importOriginal<typeof import('../src/utils/formatters')>();
  return {
    ...mod,
    getDeviceId: () => 'test-device-001',
  };
});

describe('CarbonForm', () => {
  beforeEach(() => {
    mockCalculate.mockClear();
    mockIsCalculating = false;
    mockError = null;
  });

  it('renders the Transport section', () => {
    render(<CarbonForm />);
    expect(screen.getByText('Transport')).toBeInTheDocument();
  });

  it('renders the Home Energy section', () => {
    render(<CarbonForm />);
    expect(screen.getByText('Home Energy')).toBeInTheDocument();
  });

  it('renders the Diet & Lifestyle section', () => {
    render(<CarbonForm />);
    expect(screen.getByText('Diet & Lifestyle')).toBeInTheDocument();
  });

  it('renders all transport inputs with associated labels', () => {
    render(<CarbonForm />);
    const perolInput = screen.getByLabelText(/petrol car/i);
    expect(perolInput).toBeInTheDocument();
    expect(perolInput).toHaveAttribute('id', 'transport_km_car_petrol');
  });

  it('renders the electricity input with its label', () => {
    render(<CarbonForm />);
    const electricityInput = screen.getByLabelText(/electricity/i);
    expect(electricityInput).toBeInTheDocument();
  });

  it('renders diet radio group with fieldset and legend', () => {
    render(<CarbonForm />);
    expect(screen.getByRole('group')).toBeInTheDocument();
    expect(screen.getByText(/diet type/i)).toBeInTheDocument();
  });

  it('all diet options are rendered as radio inputs', () => {
    render(<CarbonForm />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
  });

  it('renders submit button', () => {
    render(<CarbonForm />);
    expect(screen.getByRole('button', { name: /calculate/i })).toBeInTheDocument();
  });

  it('submit button shows loading state when isCalculating is true', () => {
    mockIsCalculating = true;
    render(<CarbonForm />);
    const btn = screen.getByRole('button', { name: /calculating/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });

  it('shows validation error for negative petrol km on blur', async () => {
    render(<CarbonForm />);
    const input = screen.getByLabelText(/petrol car/i);
    // Directly fire change event with negative value, then blur to trigger validation
    fireEvent.change(input, { target: { value: '-100' } });
    fireEvent.blur(input);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  it('calls calculate when form is submitted with valid data', async () => {
    render(<CarbonForm />);
    const submitBtn = screen.getByRole('button', { name: /calculate/i });
    await userEvent.click(submitBtn);
    await waitFor(() => {
      expect(mockCalculate).toHaveBeenCalledTimes(1);
    });
  });

  it('displays store error when present', () => {
    mockError = 'Failed to calculate footprint';
    render(<CarbonForm />);
    expect(screen.getByRole('alert')).toHaveTextContent(/failed to calculate/i);
  });
});
