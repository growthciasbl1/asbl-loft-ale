import { useSearchStore } from '@/lib/store/searchStore';
import { parseSearch, determinePrimaryPath } from '@/lib/utils/searchParser';
import { calculateModuleOrder } from '@/lib/utils/moduleOrder';

export function useSearch() {
  const setQuery = useSearchStore((s) => s.setQuery);
  const setExtracted = useSearchStore((s) => s.setExtracted);
  const setModuleOrder = useSearchStore((s) => s.setModuleOrder);

  const runSearch = (query: string) => {
    if (!query.trim()) return;

    setQuery(query);
    const { intent, confidence } = parseSearch(query);
    const primaryPath = determinePrimaryPath(intent);
    const moduleOrder = calculateModuleOrder(primaryPath, confidence);

    setExtracted(intent, confidence, primaryPath);
    setModuleOrder(moduleOrder);

    return { intent, confidence, primaryPath, moduleOrder };
  };

  return { runSearch };
}
