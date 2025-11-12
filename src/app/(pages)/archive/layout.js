import ArchiveEntriesProvider from '@/app/_components/Archive/ArchiveEntriesProvider';
import ArchiveNavigationContainer from '@/app/_components/Archive/Navigation/ArchiveNavigationContainer';
import { getArchiveEntries } from '@app/_data/archive';
import { cookies } from 'next/headers';

const VIEW_COOKIE_NAME = 'outside-observations-archive-view';

export default async function ArchiveLayout({ children }) {
  const entries = await getArchiveEntries();
  const cookieStore = await cookies();
  const viewCookie = cookieStore.get(VIEW_COOKIE_NAME)?.value ?? null;

  return (
    <ArchiveEntriesProvider initialEntries={entries} initialView={viewCookie}>
      {children}
      <ArchiveNavigationContainer />
    </ArchiveEntriesProvider>
  );
}

