import React from 'react';
import ImageResponseCard from './ImageResponseCard';
import PlainText from './PlainText';

export default function FallbackIntent({ isLast }: { isLast: boolean }) {
  const uuidRef = React.useRef<string>(new Date().getTime().toString());
  return (
    <React.Fragment>
      <PlainText msg={'다른 질문이 있으신가요?'} isLast={false} />
      <ImageResponseCard
        isLast={isLast}
        msg={{
          buttons: [
            {
              text: '자주 묻는 질문 보기',
              value: `자주 묻는 질문 보기 ${uuidRef.current}`,
            },
          ],
        }}
      />
    </React.Fragment>
  );
}
