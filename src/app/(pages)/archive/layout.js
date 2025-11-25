import ArchiveNavigationContainer from '@/app/_components/Archive/Navigation/ArchiveNavigationContainer';

export default function ArchiveLayout({ children }) {
  return (
    <>
      {children}
      <ArchiveNavigationContainer />
    </>
  );
}

