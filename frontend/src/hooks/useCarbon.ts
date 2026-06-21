/**
 * useCarbon — hook for triggering carbon calculation.
 */

import { useCarbonStore } from '../store/carbonStore';

export const useCarbon = () => {
  const calculate = useCarbonStore(s => s.calculate);
  const result = useCarbonStore(s => s.result);
  const isCalculating = useCarbonStore(s => s.isCalculating);
  const error = useCarbonStore(s => s.error);

  return { calculate, result, isCalculating, error };
};
