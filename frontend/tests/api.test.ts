/**
 * API client unit tests — all fetch calls are mocked.
 */

import { describe, expect, it, vi, afterEach } from 'vitest';
import { apiClient } from '../src/api/client';
import type { CarbonInput, CarbonResult, InsightItem } from '../src/types';

// --------------------------------------------------------------------------
// Mock data
// --------------------------------------------------------------------------
const mockInput: CarbonInput = {
  transport_km_car_petrol: 10000,
  transport_km_car_diesel: 0,
  transport_km_car_electric: 0,
  transport_km_bus: 2000,
  transport_km_train: 1000,
  flights_short_haul: 2,
  flights_long_haul: 1,
  home_electricity_kwh: 3500,
  home_gas_kwh: 8000,
  household_size: 2,
  diet_type: 'meat_medium',
  consumption_level: 'medium',
  device_id: 'test-device-001',
};

const mockResult: CarbonResult = {
  total_kg: 6800,
  breakdown: { transport: 3000, home: 1300, diet: 2500, consumption: 1000 },
  vs_global_average_pct: 170,
  vs_paris_target_pct: 340,
  ranked_categories: [{ category: 'transport', kg: 3000, percentage: 44 }],
  device_id: 'test-device-001',
};

const mockInsights: InsightItem[] = [
  {
    category: 'transport',
    action: 'Take the train.',
    estimated_saving_kg: 800,
    timeframe: '30 days',
    priority: 1,
  },
];

// --------------------------------------------------------------------------
// Fetch mock helpers
// --------------------------------------------------------------------------
function mockFetchSuccess(data: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => data,
  } as Response);
}

function mockFetchError(status: number, detail = 'Internal Server Error') {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: false,
    status,
    json: async () => ({ detail }),
  } as Response);
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------
describe('apiClient.calculateFootprint', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the correct endpoint with POST', async () => {
    const spy = mockFetchSuccess(mockResult);
    await apiClient.calculateFootprint(mockInput);
    expect(spy).toHaveBeenCalledWith('/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockInput),
    });
  });

  it('returns parsed CarbonResult on success', async () => {
    mockFetchSuccess(mockResult);
    const result = await apiClient.calculateFootprint(mockInput);
    expect(result.total_kg).toBe(6800);
    expect(result.device_id).toBe('test-device-001');
  });

  it('throws Error on 422 response', async () => {
    mockFetchError(422, 'Validation error');
    await expect(apiClient.calculateFootprint(mockInput)).rejects.toThrow('Validation error');
  });

  it('throws Error on 500 response', async () => {
    mockFetchError(500, 'Internal Server Error');
    await expect(apiClient.calculateFootprint(mockInput)).rejects.toThrow('Internal Server Error');
  });
});

describe('apiClient.getInsights', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the correct endpoint with POST', async () => {
    const spy = mockFetchSuccess({
      insights: mockInsights,
      source: 'gemini',
      total_potential_saving_kg: 800,
    });
    await apiClient.getInsights(mockResult, 'test-device-001');
    expect(spy).toHaveBeenCalledWith('/api/insights', expect.objectContaining({ method: 'POST' }));
  });

  it('returns insights response on success', async () => {
    mockFetchSuccess({
      insights: mockInsights,
      source: 'gemini',
      total_potential_saving_kg: 800,
    });
    const response = await apiClient.getInsights(mockResult, 'test-device-001');
    expect(response.source).toBe('gemini');
    expect(response.insights).toHaveLength(1);
  });
});

describe('apiClient.getHistory', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the correct endpoint with GET', async () => {
    const spy = mockFetchSuccess([]);
    await apiClient.getHistory('test-device-001');
    expect(spy).toHaveBeenCalledWith('/api/entries/test-device-001');
  });

  it('returns an array on success', async () => {
    mockFetchSuccess([]);
    const history = await apiClient.getHistory('test-device-001');
    expect(Array.isArray(history)).toBe(true);
  });

  it('throws Error on 404', async () => {
    mockFetchError(404, 'Not found');
    await expect(apiClient.getHistory('unknown-device')).rejects.toThrow();
  });
});

describe('apiClient.saveEntry', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls the correct endpoint with POST', async () => {
    const spy = mockFetchSuccess({ id: 'new-doc-id', saved_at: '2024-01-15T12:00:00Z' });
    await apiClient.saveEntry(mockResult, mockInsights);
    expect(spy).toHaveBeenCalledWith('/api/entries', expect.objectContaining({ method: 'POST' }));
  });

  it('returns id on success', async () => {
    mockFetchSuccess({ id: 'new-doc-id', saved_at: '2024-01-15T12:00:00Z' });
    const resp = await apiClient.saveEntry(mockResult, mockInsights);
    expect(resp.id).toBe('new-doc-id');
  });
});
