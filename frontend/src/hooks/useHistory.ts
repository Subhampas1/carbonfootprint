/**
 * useHistory — hook for fetching and displaying carbon history.
 */
import { useCarbonStore } from '../store/carbonStore';

export const useHistory = () => {
  const fetchHistory = useCarbonStore(s => s.fetchHistory);
  const history = useCarbonStore(s => s.history);
  const isLoadingHistory = useCarbonStore(s => s.isLoadingHistory);

  return { fetchHistory, history, isLoadingHistory };
};
