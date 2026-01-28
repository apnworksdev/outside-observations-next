'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import styles from '@app/_assets/archive/closed.module.css';

export default function BlurredImage({ src, alt, width, height, priority, fetchPriority, quality }) {
  const [blurApplied, setBlurApplied] = useState(false);

  useEffect(() => {
    // Add blur class after first render to prevent Safari rendering issues
    // Using requestAnimationFrame to ensure it happens after the initial paint
    requestAnimationFrame(() => {
      setBlurApplied(true);
    });
  }, []);

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={`${styles.closedArchiveImage} ${blurApplied ? styles.blurApplied : ''}`}
      priority={priority}
      fetchPriority={fetchPriority}
      quality={quality}
      onContextMenu={(e) => e.preventDefault()}
      draggable={false}
    />
  );
}

