import { useWindowSize } from '@/hooks/useWindowSize';
import { ComponentProps } from 'react';
import { twMerge } from 'tailwind-merge';

interface IImageProps extends ComponentProps<'img'> {
  src: string | undefined;
  alt: string | undefined;
  className?: string;
  noDistortion?: boolean;
}

export default function Image({ src, alt, className, noDistortion, ...rest }: IImageProps) {
  const { isVertical } = useWindowSize();
  let style = {};
  if (noDistortion) style = isVertical ? { width: '100%', height: 'auto' } : { width: 'auto', height: '100%' };
  return <img style={style} src={src} alt={alt} className={twMerge(className)} {...rest}></img>;
}
