import Flex from '@/components/cores/Flex';
import Input from '@/components/cores/Input';
import { useEffect, useRef, useState } from 'react';
import SendButton from './SendButton';
import HomeButton from './HomeButton';
import { useFormStatus } from 'react-dom';
import { useAppContext } from '@/contexts';

const PLACEHOLDER = {
  ko: '궁금한점을 입력해주세요.',
  en: 'Ask me anything.',
};

export default function Footer() {
  const { pending } = useFormStatus();
  const { locale } = useAppContext();

  const [text, setText] = useState<string | undefined>('');
  const inputRef = useRef<HTMLInputElement>(null);

  /*
   * 제출이 시작되면 입력칸을 비우고(보낸 말은 이미 대화에 올라가 있다),
   * 끝나면 다시 포커스해서 바로 다음 질문을 칠 수 있게 한다.
   *
   * 예전에는 effect의 cleanup 자리에 이 동작을 넣어뒀는데, 결과적으로는 맞게
   * 돌았지만 "언제 실행되는지"가 코드에 드러나지 않았다.
   */
  useEffect(() => {
    if (pending) setText('');
    else inputRef.current?.focus();
  }, [pending]);

  return (
    <Flex className="fixed bottom-0 bg-white w-full h-[60px] pl-4 pr-2 py-2 gap-2">
      <HomeButton />
      <Input
        placeholder={PLACEHOLDER[locale]}
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
