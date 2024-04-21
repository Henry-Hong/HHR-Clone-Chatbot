import { ComponentProps } from 'react';

export interface IInputProps extends ComponentProps<'input'> {
  type?: 'text' | 'textarea';
  leftComponent?: React.ReactNode;
  rightComponent?: React.ReactNode;
  wrapperClassName?: string;
}
