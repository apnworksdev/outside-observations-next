import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { client } from '@/sanity/lib/client';
import { ARCHIVE_ENTRY_QUERY, ARCHIVE_ENTRY_SLUGS } from '@/sanity/lib/queries';
import { urlFor } from '@/sanity/lib/image';

export async function generateStaticParams() {
  const slugs = await client.fetch(ARCHIVE_ENTRY_SLUGS);
  
  return slugs.map((slug) => ({
    slug: slug,
  }));
}

export default async function ArchiveEntryPage({ params }) {
  const resolvedParams = await params;
  const entry = await client.fetch(ARCHIVE_ENTRY_QUERY, {
    slug: resolvedParams.slug,
  });

  if (!entry) {
    notFound()
  }

  return (
    <div>
      <div>
        <Link href="/archive">
          ← Back to Archive
        </Link>
        
        <article>
          <h1>{entry.artName}</h1>
          <p>{entry.year}</p>
          <p>{entry.source}</p>
          <p>{entry.fileName}</p>
          <p>{entry.tags.map((tag) => tag.name).join(', ')}</p>
          <Image src={urlFor(entry.poster).width(1200).height(630).url()} alt={entry.artName} width={1200} height={630} />
        </article>
      </div>
    </div>
  )
}
