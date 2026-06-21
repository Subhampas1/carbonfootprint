/**
 * API client for the Carbon Footprint Awareness Platform.
 *
 * All functions throw Error on non-2xx responses.
 * Types match backend Pydantic models exactly.
 */

import type {
  CarbonInput,
  CarbonResult,
  HistoryEntry,
  InsightItem,
  InsightsResponse,
} from '../types';

const BASE_URL = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.detail ?? body.message ?? message;
    } catch {
      // Ignore JSON parse errors on error responses
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const apiClient = {
  /**
   * Calculate annual carbon footprint from lifestyle inputs.
   * POST /api/calculate
   */
  async calculateFootprint(inputs: CarbonInput): Promise<CarbonResult> {
    const res = await fetch(`${BASE_URL}/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputs),
    });
    return handleResponse<CarbonResult>(res);
  },

  /**
   * Generate personalised carbon reduction insights.
   * POST /api/insights
   */
  async getInsights(carbon_result: CarbonResult, device_id: string): Promise<InsightsResponse> {
    const res = await fetch(`${BASE_URL}/insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carbon_result, device_id }),
    });
    return handleResponse<InsightsResponse>(res);
  },

  /**
   * Save a carbon result and its insights to Firestore.
   * POST /api/entries
   */
  async saveEntry(
    carbon_result: CarbonResult,
    insights: InsightItem[]
  ): Promise<{ id: string; saved_at: string }> {
    const res = await fetch(`${BASE_URL}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ carbon_result, insights }),
    });
    return handleResponse<{ id: string; saved_at: string }>(res);
  },

  /**
   * Retrieve carbon footprint history for a device.
   * GET /api/entries/{device_id}
   */
  async getHistory(device_id: string): Promise<HistoryEntry[]> {
    const res = await fetch(`${BASE_URL}/entries/${encodeURIComponent(device_id)}`);
    return handleResponse<HistoryEntry[]>(res);
  },
};
