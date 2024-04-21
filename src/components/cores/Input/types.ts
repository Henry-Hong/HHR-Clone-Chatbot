import { ComponentProps } from 'react';

export interface IInputProps extends ComponentProps<'input'> {
  leftComponent?: React.ReactNode;
  rightComponent?: React.ReactNode;
  wrapperClassName?: string;
}
