import ArchiveNavigationContainer from '@/app/_components/Archive/Navigation/ArchiveNavigationContainer';
import ArchiveEntriesProvider from '@/app/_components/Archive/ArchiveEntriesProvider';
import { ErrorBoundary } from '@/app/_components/ErrorBoundary';
import { getArchiveEntries } from '@app/_data/archive';

export default async function ArchiveLayout({ children }) {
  let entries = [];

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

  // Cookie reading is handled client-side by ArchiveEntriesProvider
  // This allows static generation while still reading view preference on the client
  return (
    <ErrorBoundary>
      <ArchiveEntriesProvider initialEntries={entries}>
        {children}
        <ArchiveNavigationContainer />
      </ArchiveEntriesProvider>
    </ErrorBoundary>
  );
}

