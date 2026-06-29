'use client';

import { useState } from 'react';
import Image from 'next/image';
import { urlForImage, sanityImageLoader } from '@/sanity/lib/image';
import FallbackImage from '@/sanity/components/FallbackImage';

/**
 * SanityImage - A wrapper around Next.js Image component with Sanity image loader built-in
 * This allows server components to use Sanity images without needing 'use client'
 */
export default function SanityImage({
  image,
  alt,
  width,
  height,
  className,
  priority = false,
  loading = 'lazy',
  placeholder,
  blurDataURL,
  quality = 82,
  onLoad,
  onError,
  fallback,
  ...props
}) {
  const [hasError, setHasError] = useState(false);

  if (!image?.asset?._ref) {
    if (fallback) {
      return fallback;
    }
    return null;
  }

  const imageUrl = urlForImage(image);

  if (!imageUrl) {
    if (fallback) {
      return fallback;
    }
    return null;
  }

  if (hasError) {
    if (fallback) {
      return fallback;
    }
    return (
      <FallbackImage
        alt={alt}
      />
    );
  }

  const placeholderValue = placeholder !== undefined
    ? placeholder
    : (blurDataURL ? 'blur' : undefined);

  const loadingValue = priority ? undefined : loading;

  const handleError = (e) => {
    setHasError(true);
    onError?.(e);
  };

  return (
    <Image
      loader={sanityImageLoader}
      src={imageUrl}
      alt={alt || ''}
      width={width}
      height={height}
      className={className}
      priority={priority}
      loading={loadingValue}
      placeholder={placeholderValue}
      blurDataURL={blurDataURL}
      quality={quality}
      onLoad={onLoad}
      onError={handleError}
      onContextMenu={(e) => e.preventDefault()}
      {...props}
      draggable={false}
      suppressHydrationWarning
    />
  );
}
