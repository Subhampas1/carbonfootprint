/**
 * Shared TypeScript interfaces for the Carbon Footprint Awareness Platform.
 * These mirror the Pydantic v2 models on the backend exactly.
 */

export interface CarbonInput {
  transport_km_car_petrol: number;
  transport_km_car_diesel: number;
  transport_km_car_electric: number;
  transport_km_bus: number;
  transport_km_train: number;
  flights_short_haul: number;
  flights_long_haul: number;
  home_electricity_kwh: number;
  home_gas_kwh: number;
  household_size: number;
  diet_type: 'meat_heavy' | 'meat_medium' | 'vegetarian' | 'vegan';
  consumption_level: 'high' | 'medium' | 'low';
  device_id: string;
}

export interface RankedCategory {
  category: string;
  kg: number;
  percentage: number;
}

export interface CarbonResult {
  total_kg: number;
  breakdown: Record<string, number>;
  vs_global_average_pct: number;
  vs_paris_target_pct: number;
  ranked_categories: RankedCategory[];
  device_id: string;
}

export interface InsightItem {
  category: string;
  action: string;
  estimated_saving_kg: number;
  timeframe: string;
  priority: number;
}

export interface InsightsResponse {
  insights: InsightItem[];
  source: 'gemini' | 'rules';
  total_potential_saving_kg: number;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  total_kg: number;
  breakdown: Record<string, number>;
  ranked_categories: RankedCategory[];
  insights: InsightItem[];
  vs_global_average_pct: number;
  vs_paris_target_pct: number;
}

export type AppStep = 'form' | 'results' | 'history';
