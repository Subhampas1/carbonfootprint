/**
 * Formatting utilities for the Carbon Footprint Awareness Platform.
 */

/**
 * Format kg CO2e value into a human-readable string.
 * Values >= 1000 are expressed in tonnes (t).
 */
export const formatKg = (kg: number): string => {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}t`;
  }
  return `${Math.round(kg)} kg`;
};

/**
 * Map internal category keys to human-readable display labels.
 */
export const formatCategory = (category: string): string => {
  const labels: Record<string, string> = {
    transport: 'Transport',
    home: 'Home Energy',
    diet: 'Diet',
    consumption: 'Shopping & Goods',
    general: 'General',
  };
  return labels[category] ?? category.charAt(0).toUpperCase() + category.slice(1);
};

/**
 * Get or create a persistent anonymous device ID stored in sessionStorage.
 * Format: dev-{timestamp}-{random} — satisfies 8–64 char, alphanumeric + hyphens pattern.
 */
export const getDeviceId = (): string => {
  const key = 'carbon_device_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    const ts = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 10);
    id = `dev-${ts}-${rand}`;
    sessionStorage.setItem(key, id);
  }
  return id;
};

/**
 * Return a label and colour class for a user's footprint relative to the global average.
 */
export const getFootprintLabel = (
  vs_global_pct: number
): { label: string; colorClass: string; bgClass: string } => {
  if (vs_global_pct <= 50) {
    return { label: 'Excellent', colorClass: 'text-green-700', bgClass: 'bg-green-100' };
  }
  if (vs_global_pct <= 100) {
    return { label: 'Below Average', colorClass: 'text-green-600', bgClass: 'bg-green-50' };
  }
  if (vs_global_pct <= 150) {
    return { label: 'Above Average', colorClass: 'text-amber-600', bgClass: 'bg-amber-50' };
  }
  return { label: 'High Impact', colorClass: 'text-red-600', bgClass: 'bg-red-50' };
};

/**
 * Return an emoji icon for a carbon category.
 */
export const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    transport: '🚗',
    home: '🏠',
    diet: '🥗',
    consumption: '🛍️',
    general: '🌍',
  };
  return icons[category] ?? '📊';
};

/**
 * Format an ISO timestamp string into a localised date string.
 */
export const formatDate = (timestamp: string): string => {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(timestamp));
  } catch {
    return timestamp;
  }
};
