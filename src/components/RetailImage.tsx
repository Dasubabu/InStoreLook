import React, { useState } from 'react';
import { retailImageRequest, type RetailImageSize } from './retailImageHelpers';

type RetailImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  imageSize?: RetailImageSize;
};

/** Callers own the aspect ratio. Key the request so changing products recovers
 * immediately, including when the previous product's image failed. */
export default function RetailImage(props: RetailImageProps) {
  return <ImageRequest key={`${props.src ?? ''}\n${props.srcSet ?? ''}\n${props.imageSize ?? ''}`} {...props} />;
}

function ImageRequest({ src, srcSet, sizes, imageSize, alt, onError, loading = 'lazy', ...props }: RetailImageProps) {
  const [failures, setFailures] = useState(0);
  const request = retailImageRequest(src, { size: imageSize, srcSet, sizes }, failures);
  return <img {...props} src={request.src} srcSet={request.srcSet} sizes={request.sizes}
    alt={request.unavailable && alt !== '' ? `${alt || 'Product'} — image unavailable` : alt}
    loading={loading} decoding="async" draggable={false} data-image-state={request.unavailable ? 'unavailable' : 'supplied'}
    onError={request.unavailable ? undefined : event => {
      setFailures(count => count + 1);
      if (!request.canRetryOriginal) onError?.(event);
    }} />;
}
