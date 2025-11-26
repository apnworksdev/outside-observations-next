'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import styles from '@app/_assets/archive/archive-navigation.module.css';
import { useArchiveEntriesSafe } from '@/app/_components/Archive/ArchiveEntriesProvider';
import { InlineError } from '@/app/_components/ErrorDisplay';

export default function ArchiveNavigationSearchPanel() {
  const archiveEntriesContext = useArchiveEntriesSafe();
  const runSearch = archiveEntriesContext?.runSearch;
  const clearSearch = archiveEntriesContext?.clearSearch;
  const searchStatus = archiveEntriesContext?.searchStatus ?? {
    status: 'idle',
    query: null,
    summary: null,
    error: null,
  };
  const [queryInput, setQueryInput] = useState('');

  const summary = searchStatus.summary;
  const isLoading = searchStatus.status === 'loading';
  const hasError = searchStatus.status === 'error';
  const errorMessage = searchStatus.error;
  const hasZeroMatches = summary && summary.matches === 0;

  /**
   * The panel reflects whatever is happening in the provider:
   *   - Zero results encourage the user to try something else by clearing the input.
   *   - Successful searches mirror the submitted query so the input always matches
   *     the active search.
   *   - Returning to the idle state resets the input entirely.
   */
  useEffect(() => {
    if (hasZeroMatches) {
      setQueryInput('');
    } else if (searchStatus.query && searchStatus.status !== 'loading') {
      setQueryInput(searchStatus.query);
    }

    if (!searchStatus.query && searchStatus.status === 'idle') {
      setQueryInput('');
    }
  }, [hasZeroMatches, searchStatus.query, searchStatus.status]);

  const inputPlaceholder = hasZeroMatches ? 'Type something else…' : 'Type here...';

  /**
   * Submitting the form feeds directly into the provider. Empty submissions clear the
   * search, while valid queries hand off to `runSearch`. Errors are handled upstream,
   * so the panel just ensures we never fire pointless requests.
   */
  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedQuery = queryInput.trim();

    if (!runSearch) {
      return;
    }

    if (!trimmedQuery) {
      if (clearSearch) {
        clearSearch();
      }
      return;
    }

    runSearch(trimmedQuery);
  };

  return (
    <div className={styles.archiveNavigationPanelContent}>
      <div className={`${styles.archiveNavigationPanelSearch} ${styles.archivePanelWrapper}`}>
        <form className={styles.archiveNavigationSearchForm} onSubmit={handleSubmit}>
          <input
            type="text"
            className={styles.archiveNavigationSearchInput}
            placeholder={inputPlaceholder}
            value={queryInput}
            name="archive-search"
            onChange={(event) => setQueryInput(event.target.value)}
            aria-label="Search query"
            disabled={isLoading}
          />
          <button type="submit" className={styles.archiveNavigationSearchButton} disabled={isLoading}>
            {isLoading ? 'Searching…' : 'Submit'}
          </button>
        </form>
      </div>
      {hasError && errorMessage ? (
        <div className={`${styles.archivePanelWrapper}`} style={{ marginTop: '1rem' }}>
          <InlineError
            message={`Search failed: ${errorMessage}. Please try again.`}
          />
        </div>
      ) : null}
      {summary && summary.matches === 0 && summary.original && !hasError ? (
        <div className={`${styles.archiveNavigationPanelNoResults} ${styles.archivePanelWrapper}`}>
          <p>
            Your search for "{summary.original}" didn't find any files. But that doesn't mean they won't appear.
            Things worth finding take their time. In the meantime, you can keep exploring by <Link href="/">talking with us</Link>.
          </p>
        </div>
      ) : null}
    </div>
  );
}



