'use client';

import { useCallback, useMemo } from 'react';
import { useArchiveSortController } from '../../providers/ArchiveEntriesProvider';
import { trackArchiveSort } from '@/app/_helpers/analytics/gtag';

export function useArchiveListSorting() {
  const yearSort = useArchiveSortController('year', {
    label: 'Year',
    ariaMessages: {
      desc: 'Year column, sorted newest to oldest. Activate to sort oldest to newest.',
      asc: 'Year column, sorted oldest to newest. Activate to clear sorting.',
      inactive: 'Year column, no sorting applied. Activate to sort newest to oldest.',
    },
  });
  const artNameSort = useArchiveSortController('artName', { label: 'Art Name' });
  const sourceSort = useArchiveSortController('source', { label: 'Source/Author' });
  const typeSort = useArchiveSortController('mediaType', { label: 'Type' });

  const handleSortClick = useCallback((sort) => {
    const order = ['desc', 'asc', null];
    const curr = sort.direction ?? null;
    const nextDir = order[(order.indexOf(curr) + 1) % order.length];
    if (nextDir) trackArchiveSort(sort.column, nextDir);
    sort.toggleSort();
  }, []);

  const sortableLegendColumns = useMemo(
    () => [
      { key: 'year', label: 'Year', sort: yearSort },
      { key: 'artName', label: 'Art Name', sort: artNameSort },
      { key: 'source', label: 'Source/Author', sort: sourceSort },
    ],
    [artNameSort, sourceSort, yearSort]
  );

  return {
    typeSort,
    handleSortClick,
    sortableLegendColumns,
  };
}
