import { useEffect, useRef } from 'react';
import { twMerge as tw } from 'tailwind-merge';
import Flex from '../Flex';
import { IInputProps } from './types';

export default function TextInput({
  type = 'text',
  leftComponent,
  rightComponent,
  wrapperClassName,
  ...rest
}: IInputProps) {
  const Component = type === 'text' ? TextInput.Input : TextInput.Textarea;
  return (
    <Flex variants="horizontalCenter" className={tw(wrapperClassName)}>
      {leftComponent}
      <Component {...rest} />
      {rightComponent}
    </Flex>
  );
}

TextInput.Input = function Input({ className, ...rest }: { className?: string }) {
  return (
    <input type="text" autoFocus className={tw('outline-none w-full bg-inherit text-inherit', className)} {...rest} />
  );
};

TextInput.Textarea = function Textarea({ className, ...rest }: { className?: string }) {
  const MAX_LENGTH = 99999;
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.focus();
    ref.current.setSelectionRange(MAX_LENGTH, MAX_LENGTH);
  }, []);

  return (
    <textarea
      ref={ref}
      autoFocus
      className={tw('resize-none outline-none w-full bg-inherit text-inherit', className)}
      {...rest}
    />
  );
};
