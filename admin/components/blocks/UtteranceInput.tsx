import { useId } from 'react';
import { Icon, InputGroup, Tooltip } from '@blueprintjs/core';

type Props = {
  value: string;
  /** 어떤 인텐트에 등록된 발화인지. 없으면 Lex가 이 버튼을 받아줄 보장이 없다. */
  ownerOf: (utterance: string) => string | null;
  suggestions: string[];
  onChange: (value: string) => void;
};

/**
 * 버튼이 보낼 발화를 입력한다.
 *
 * 등록되지 않은 발화를 보내는 버튼은 실제로 프로덕션에 있던 버그다.
 * Lex 퍼지 매칭 덕에 겉보기엔 동작해서 눈치채기 어려웠다.
 * 그래서 입력 중에 바로 "이 발화가 어느 인텐트 것인지"를 보여준다.
 */
export default function UtteranceInput({ value, ownerOf, suggestions, onChange }: Props) {
  const listId = useId();
  const owner = value.trim() ? ownerOf(value) : null;
  const unknown = !!value.trim() && !owner;

  return (
    <>
      <InputGroup
        fill
        list={listId}
        intent={unknown ? 'danger' : 'none'}
        placeholder="보낼 발화"
        value={value}
        onValueChange={onChange}
        rightElement={
          value.trim() ? (
            <Tooltip
              compact
              content={owner ? `${owner}에 등록된 발화` : '어떤 인텐트에도 없는 발화 — Lex 퍼지 매칭에 의존하게 됩니다'}
            >
              <Icon
                icon={owner ? 'tick-circle' : 'warning-sign'}
                intent={owner ? 'success' : 'danger'}
                style={{ padding: '7px 7px 0 0' }}
              />
            </Tooltip>
          ) : undefined
        }
      />
      <datalist id={listId}>
        {suggestions.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
    </>
  );
}
