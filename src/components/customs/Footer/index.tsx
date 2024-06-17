import Flex from '@/components/cores/Flex';
import Input from '@/components/cores/Input';
import { useEffect, useRef, useState } from 'react';
import SendButton from './SendButton';
import HomeButton from './HomeButton';
import { useFormStatus } from 'react-dom';

export default function Footer() {
  const { pending } = useFormStatus();

  const [text, setText] = useState<string | undefined>('');
  const clearText = () => setText('');

  const inputRef = useRef<HTMLInputElement>(null);
  const autoFocusOnInput = () => {
    inputRef.current?.focus();
  };

  const afterSubmit = () => {
    clearText();
    autoFocusOnInput();
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => afterSubmit, [pending]);

  return (
    <Flex className="fixed bottom-0 bg-white w-full h-[60px] pl-4 pr-2 py-2 gap-2">
      <HomeButton onClick={() => {}} />
      <Input
        autoFocus
        disabled={pending}
        ref={inputRef}
        wrapperClassName="w-full h-full p-0 bg-gray-100 focus:outline-blue-400 rounded-full"
        className="rounded-full py-2 px-4"
        value={text}
        name="inputMsg"
        onChange={(e) => setText(e.target.value)}
        rightComponent={<SendButton isPending={pending} />}
      />
    </Flex>
  );
}
