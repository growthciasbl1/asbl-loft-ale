import { useSearchStore } from '@/lib/store/searchStore';

export function useModuleOrder() {
  const moduleOrder = useSearchStore((s) => s.moduleOrder);
  const primaryPath = useSearchStore((s) => s.primaryPath);

  return { moduleOrder, primaryPath };
}
