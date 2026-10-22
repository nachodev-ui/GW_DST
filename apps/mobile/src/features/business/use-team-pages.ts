import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/auth-provider';
import { fetchDriverTeam } from './team-data';

// Reuses the existing offset API; counts remain partial until every page is loaded.
export function useTeamPages(businessId: string, search = '') {
  const { session } = useAuth();
  return useInfiniteQuery({
    queryKey: ['driver-team', session?.user.id, businessId, 'infinite', search],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => fetchDriverTeam(businessId, pageParam, search),
    getNextPageParam: (lastPage, pages) => (lastPage.has_more ? pages.length * 20 : undefined),
    refetchInterval: 30_000,
  });
}
