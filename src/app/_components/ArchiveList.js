import Image from 'next/image';
import Link from 'next/link';

import { urlFor } from '@/sanity/lib/image';
import { client } from '@/sanity/lib/client';
import { ARCHIVE_ENTRIES_QUERY } from '@/sanity/lib/queries';

import styles from '@app/_assets/archive.module.css';
import ArchiveEntry from '@/app/_components/ArchiveEntryListRow';
import ScrollContainerWrapper from '@/app/_web-components/ScrollContainerWrapper';
import MaskScrollWrapper from '@/app/_web-components/MaskScrollWrapper';

export default async function ArchiveList({ view: incomingView }) {
  const view = incomingView === 'images' ? 'images' : 'list';
  const entries = await client.fetch(ARCHIVE_ENTRIES_QUERY);
  const additionalEntries = [];
  const posterWidth = 400;

  for (let i = 0; i < 20; i++) {
    for (let j = 0; j < entries.length; j++) {
      additionalEntries.push({
        ...entries[j],
        _id: `generated-${i}-${j}`,
        year: 2020 + i,
      });
    }
  }

  return (
    <div className={styles.container} data-view={view}>
      {
        view === 'images' ? (
          <MaskScrollWrapper className={styles.containerContent}>
            {additionalEntries.length > 0 ? (
              additionalEntries.map((entry) => (
                <Link key={entry._id} href={`/archive/entry/${entry.slug.current}`} className={styles.archiveEntryImageLink}>
                  <div className={styles.archiveEntryImageContainer}>
                    {entry?.poster?.asset?._ref ? (
                      <Image
                        src={urlFor(entry.poster).width(posterWidth).url()}
                        alt={entry.artName || 'Archive entry poster'}
                        className={styles.archiveEntryImage}
                        width={posterWidth}
                        height={entry?.poster?.dimensions?.aspectRatio ? Math.round(posterWidth / entry.poster.dimensions.aspectRatio) : posterWidth}
                        loading="lazy"
                        placeholder={entry?.poster?.lqip ? 'blur' : undefined}
                        blurDataURL={entry?.poster?.lqip || undefined}
                      />
                    ) : null}
                  </div>
                </Link>
              ))
            ) : (
              <p>No archive entries found. Create some entries in your Sanity Studio!</p>
            )}
          </MaskScrollWrapper>

        ) : (
          <ScrollContainerWrapper className={styles.containerContent}>
            {additionalEntries.length > 0 ? (
              additionalEntries.map((entry) => (
                <ArchiveEntry key={entry._id} entry={entry} />
              ))
            ) : (
              <p>No archive entries found. Create some entries in your Sanity Studio!</p>
            )}
          </ScrollContainerWrapper>
        )
      }
      <div className={styles.containerLegend}>
        <div className={styles.containerLegendColumn}>
          <div className={styles.containerLegendColumnItem}>
            <p>Year</p>
          </div>
        </div>
        <div className={styles.containerLegendColumn}>
          <div className={styles.containerLegendColumnItem}>
            <p>Art Name</p>
          </div>
        </div>
        <div className={styles.containerLegendColumn}>
          <div className={styles.containerLegendColumnItem}>
            <p>File Name</p>
          </div>
        </div>
        <div className={styles.containerLegendColumn}>
          <div className={styles.containerLegendColumnItem}>
            <p>Source/Author</p>
          </div>
        </div>
        <div className={styles.containerLegendColumn}>
          <div className={styles.containerLegendColumnItem}>
            <p>Tags</p>
          </div>
        </div>
        <div className={styles.containerLegendColumn}>
          <div className={styles.containerLegendColumnItem}>
            <p>Type</p>
          </div>
        </div>
      </div>
    </div>
  );
}


