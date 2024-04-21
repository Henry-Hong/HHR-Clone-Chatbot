import { forwardRef } from 'react';
import { twMerge as tw } from 'tailwind-merge';
import Flex from '../Flex';
import { IInputProps } from './types';

const TextInput = forwardRef<HTMLInputElement, IInputProps>(function (
  { leftComponent, rightComponent, wrapperClassName, className, ...rest }: IInputProps,
  ref
) {
  return (
    <Flex variants="horizontalCenter" className={tw(wrapperClassName)}>
      {leftComponent}
      <input
        ref={ref}
        type="text"
        autoFocus
        className={tw('outline-none w-full bg-inherit text-inherit', className)}
        {...rest}
      />
      {rightComponent}
    </Flex>
  );
});

export default TextInput;
