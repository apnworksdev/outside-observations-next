import { headers } from 'next/headers';
import {
  DEFAULT_ARCHIVE_PAGE_LIMIT,
  getPaginatedArchivePage,
} from '@/app/_data/getPaginatedArchivePage';
import MoodPanelHost from '@/app/_components/Archive/features/navigation/MoodPanelHost';
import ArchiveEntriesProvider from '@/app/_components/Archive/providers/ArchiveEntriesProvider';
import ClosedArchiveRedirect from '@/app/_components/Archive/features/unexpected/ClosedArchiveRedirect';
import { ErrorBoundary } from '@/app/_components/shared/error/ErrorBoundary';
import { useTimezoneRedirect } from '@/lib/closedArchiveHours';

export const revalidate = 60;

function isArchiveIndexPath(pathname) {
  return pathname === '/archive' || pathname === '/archive/';
}

export default async function ArchiveLayout({ children }) {
  const pathname = (await headers()).get('x-pathname') || '';
  const isArchiveIndex = isArchiveIndexPath(pathname);

  const initialPage = isArchiveIndex
    ? await getPaginatedArchivePage({
        cursor: null,
        limit: DEFAULT_ARCHIVE_PAGE_LIMIT,
        sortColumn: null,
        sortDirection: null,
        moodTags: [],
        searchIds: [],
      })
    : { items: [], nextCursor: null, hasMore: true };

  const content = (
    <>
      {children}
      <MoodPanelHost />
    </>
  );

  return (
    <ErrorBoundary>
      <ArchiveEntriesProvider
        initialEntries={initialPage.items}
        initialCursor={initialPage.nextCursor}
        initialHasMore={initialPage.hasMore}
        skipInitialFetch={isArchiveIndex && initialPage.items.length > 0}
      >
        {useTimezoneRedirect ? content : <ClosedArchiveRedirect>{content}</ClosedArchiveRedirect>}
      </ArchiveEntriesProvider>
    </ErrorBoundary>
  );
}
