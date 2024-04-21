import React from 'react';
import ImageResponseCard from './ImageResponseCard';
import PlainText from './PlainText';

export default function Fallback() {
  return (
    <React.Fragment>
      <PlainText msg={'다른 질문이 있으신가요?'} />
      <ImageResponseCard
        msg={{
          buttons: [
            {
              text: '자주 묻는 질문 보기',
              value: 'FAQ',
            },
          ],
        }}
      />
    </React.Fragment>
  );
}
