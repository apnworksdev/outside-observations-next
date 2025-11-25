'use client';

import Image from 'next/image';
import { urlForImage, sanityImageLoader } from '@/sanity/lib/image';

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
  quality = 75,
  onLoad,
  ...props
}) {
  if (!image?.asset?._ref) {
    return null;
  }

  const imageUrl = urlForImage(image);

  if (!imageUrl) {
    return null;
  }

  // Determine placeholder: use provided placeholder, or 'blur' if blurDataURL exists, or undefined
  const placeholderValue = placeholder !== undefined 
    ? placeholder 
    : (blurDataURL ? 'blur' : undefined);

  // If priority is true, don't set loading prop (priority images are eager by default)
  const loadingValue = priority ? undefined : loading;

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
      {...props}
    />
  );
}

