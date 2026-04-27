import ArchiveNavigationContainer from '@/app/_components/Archive/features/navigation/ArchiveNavigationContainer';
import ArchiveEntriesProvider from '@/app/_components/Archive/providers/ArchiveEntriesProvider';
import ClosedArchiveRedirect from '@/app/_components/Archive/features/unexpected/ClosedArchiveRedirect';
import { ErrorBoundary } from '@/app/_components/shared/error/ErrorBoundary';
import { useTimezoneRedirect } from '@/lib/closedArchiveHours';

export default async function ArchiveLayout({ children }) {
  // View preference is read from localStorage client-side by ArchiveEntriesProvider
  // This allows static generation while still restoring view preference on the client
  const content = (
    <>
      {children}
      <ArchiveNavigationContainer />
    </>
  );

  return (
    <ErrorBoundary>
      <ArchiveEntriesProvider>
        {useTimezoneRedirect ? content : <ClosedArchiveRedirect>{content}</ClosedArchiveRedirect>}
      </ArchiveEntriesProvider>
    </ErrorBoundary>
  );
}

