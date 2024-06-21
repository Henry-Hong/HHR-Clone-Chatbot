import React, { ComponentRef, useRef } from 'react';
import { ModalContext, useModalContext } from './context';
import { twMerge } from 'tailwind-merge';

export default function Dialog({ children }: { children?: React.ReactNode }) {
  const dialogRef = useRef<ComponentRef<'dialog'>>(null);

  const open = () => dialogRef.current?.showModal();
  const close = () => dialogRef.current?.close();

  return <ModalContext.Provider value={{ dialogRef, open, close }}>{children}</ModalContext.Provider>;
}

Dialog.Content = function Content({ children, className }: { children: React.ReactNode; className?: string }) {
  const { dialogRef } = useModalContext();
  return (
    <dialog ref={dialogRef} className={twMerge('backdrop:bg-black/70 animate-fade  ', className)}>
      {children}
    </dialog>
  );
};

Dialog.Cancel = function Cancel({ children, className }: { children?: React.ReactNode; className?: string }) {
  const { close } = useModalContext();
  return (
    <button type="button" className={twMerge(className)} onClick={close}>
      {children}
    </button>
  );
};

Dialog.Trigger = function Trigger({ render }: { render: JSX.Element }) {
  const { open } = useModalContext();
  return React.cloneElement(render, { onClick: open });
};
