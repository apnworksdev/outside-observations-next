'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import {
  getReadingProgress,
  MIN_MEANINGFUL_PROGRESS,
  DONE_THRESHOLD,
} from '@/app/_helpers/storage/readingProgress';

export default function ArticleReadLink({ slug, title, className }) {
  const [label, setLabel] = useState('Read');

  useEffect(() => {
    const progress = getReadingProgress(slug);
    if (progress === null || progress < MIN_MEANINGFUL_PROGRESS) return;
    setLabel(progress >= DONE_THRESHOLD ? 'Read again' : `Continue - ${progress}%`);
  }, [slug]);

  return (
    <Link
      href={`/writings/${slug}`}
      className={className}
      data-transition="nav"
      aria-label={`${label === 'Read' ? 'Read' : label} - ${title}`}
    >
      {label}
    </Link>
  );
}
