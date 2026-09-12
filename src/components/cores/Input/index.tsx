import { twMerge as tw } from 'tailwind-merge';
import Flex from '../Flex';
import { IInputProps } from './types';

/**
 * React 19부터 ref는 일반 prop이라 forwardRef가 필요 없다.
 * IInputProps가 ComponentProps<'input'>을 확장하므로 ref도 rest에 담겨 그대로 내려간다.
 */
export default function TextInput({
  leftComponent,
  rightComponent,
  wrapperClassName,
  className,
  ...rest
}: IInputProps) {
  return (
    <Flex variants="horizontalCenter" className={tw(wrapperClassName)}>
      {leftComponent}
      <input
        autoComplete="off"
        type="text"
        autoFocus
        className={tw('outline-none w-full bg-inherit text-inherit', className)}
        {...rest}
      />
      {rightComponent}
    </Flex>
  );
}
