/**
 * useInsights — hook for fetching AI-generated reduction insights.
 */
import { useCarbonStore } from '../store/carbonStore';

export const useInsights = () => {
  const fetchInsights = useCarbonStore(s => s.fetchInsights);
  const insights = useCarbonStore(s => s.insights);
  const isLoadingInsights = useCarbonStore(s => s.isLoadingInsights);

  return { fetchInsights, insights, isLoadingInsights };
};
