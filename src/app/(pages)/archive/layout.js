import ArchiveNavigationContainer from '@/app/_components/Archive/Navigation/ArchiveNavigationContainer';
import ArchiveEntriesProvider from '@/app/_components/Archive/ArchiveEntriesProvider';
import { ErrorBoundary } from '@/app/_components/ErrorBoundary';
import { getArchiveEntries } from '@app/_data/archive';
import { cookies } from 'next/headers';

const VIEW_COOKIE_NAME = 'outside-observations-archive-view';

export default async function ArchiveLayout({ children }) {
  let entries = [];
  let viewCookie = null;

  try {
    entries = await getArchiveEntries();
    // Ensure entries is an array
    if (!Array.isArray(entries)) {
      console.warn('getArchiveEntries returned non-array, using empty array');
      entries = [];
    }
  } catch (error) {
    console.error('Failed to fetch archive entries in archive layout:', error);
    // Continue with empty array - components should handle this gracefully
    entries = [];
  }

  try {
    const cookieStore = await cookies();
    viewCookie = cookieStore.get(VIEW_COOKIE_NAME)?.value ?? null;
  } catch (error) {
    console.error('Failed to read cookies:', error);
    // Continue with null - components should handle this gracefully
    viewCookie = null;
  }

  return (
    <ErrorBoundary>
      <ArchiveEntriesProvider initialEntries={entries} initialView={viewCookie}>
        {children}
        <ArchiveNavigationContainer />
      </ArchiveEntriesProvider>
    </ErrorBoundary>
  );
}

