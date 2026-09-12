import { useCallback, useLayoutEffect, useRef } from 'react';
import { Button, ButtonGroup, Callout, Classes, Divider, Popover, TextArea, Tooltip } from '@blueprintjs/core';
import type { IconName } from '@blueprintjs/icons';
import { ALLOWED_TAGS, disallowedTags, hasUnbalancedTags } from '../../lib/html';

/**
 * 답변 본문(HTML)을 편집한다.
 *
 * 원문을 그대로 보여주는 textarea 위에 서식 버튼을 얹는 방식이다.
 * contentEditable 기반 에디터를 쓰면 브라우저가 제멋대로 만든 태그가 섞여 들어와
 * "허용 태그"를 지킬 수 없고, S3에 저장되는 원문을 눈으로 확인할 수도 없다.
 * 여기서는 버튼이 선택 영역을 태그로 감싸기만 하므로 결과가 항상 예측 가능하다.
 */

type Props = {
  value: string;
  /** `coalesce`를 넘기면 연속 입력이 되돌리기 한 단계로 묶인다. */
  onChange: (html: string, coalesce?: string) => void;
  coalesceKey: string;
  rows?: number;
};

type Format = {
  icon: IconName;
  label: string;
  shortcut?: string;
  /** 선택 영역을 감쌀 태그 */
  tag?: string;
  attrs?: string;
  /** 선택 영역을 줄 단위 목록으로 바꿀 때 */
  list?: 'ul' | 'ol';
  /** 그냥 끼워 넣을 조각 */
  insert?: string;
};

const GROUPS: Format[][] = [
  [
    { icon: 'bold', label: '굵게', shortcut: '⌘B', tag: 'strong' },
    { icon: 'italic', label: '기울임', shortcut: '⌘I', tag: 'em' },
    { icon: 'underline', label: '밑줄', shortcut: '⌘U', tag: 'u' },
    { icon: 'strikethrough', label: '취소선', tag: 's' },
  ],
  [
    { icon: 'highlight', label: '강조 (챗봇 시그니처 하이라이트)', shortcut: '⌘H', tag: 'mark' },
    { icon: 'code', label: '코드', tag: 'code' },
  ],
  [
    { icon: 'paragraph', label: '문단', tag: 'p' },
    { icon: 'list', label: '목록', list: 'ul' },
    { icon: 'numbered-list', label: '번호 목록', list: 'ol' },
  ],
  [
    { icon: 'link', label: '링크', tag: 'a', attrs: ' href="https://" target="_blank" rel="noreferrer"' },
    { icon: 'insert', label: '줄바꿈', insert: '<br>' },
  ],
];

/** 단축키 → 서식 */
const BY_KEY: Record<string, Format> = {
  b: GROUPS[0][0],
  i: GROUPS[0][1],
  u: GROUPS[0][2],
  h: GROUPS[1][0],
};

export default function HtmlEditor({ value, onChange, coalesceKey, rows }: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  /** 다음 렌더 뒤에 복원할 선택 영역. 제어 컴포넌트라 커밋 이후에 잡아야 한다. */
  const pending = useRef<[number, number] | null>(null);

  useLayoutEffect(() => {
    const range = pending.current;
    const el = ref.current;
    if (!range || !el) return;
    pending.current = null;
    el.focus();
    el.setSelectionRange(range[0], range[1]);
  });

  const apply = useCallback(
    (format: Format) => {
      const el = ref.current;
      if (!el) return;

      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = value.slice(start, end);

      let replacement: string;
      let selectFrom: number;
      let selectTo: number;

      if (format.insert) {
        replacement = format.insert;
        selectFrom = selectTo = start + replacement.length;
      } else if (format.list) {
        const lines = (selected || '항목')
          .split('\n')
          .map((line) => line.replace(/<\/?li>/g, '').trim())
          .filter(Boolean);
        const inner = lines.map((line) => `<li>${line}</li>`).join('');
        replacement = `<${format.list}>${inner}</${format.list}>`;
        // 첫 항목 내용을 잡아줘서 바로 고쳐 쓸 수 있게 한다
        selectFrom = start + `<${format.list}><li>`.length;
        selectTo = selectFrom + (lines[0]?.length ?? 0);
      } else {
        const open = `<${format.tag}${format.attrs ?? ''}>`;
        const close = `</${format.tag}>`;
        replacement = `${open}${selected}${close}`;
        if (format.attrs?.includes('href="https://"')) {
          // URL을 바로 타이핑할 수 있도록 자리표시자를 선택해 둔다
          selectFrom = start + open.indexOf('https://');
          selectTo = selectFrom + 'https://'.length;
        } else {
          selectFrom = start + open.length;
          selectTo = selectFrom + selected.length;
        }
      }

      onChange(`${value.slice(0, start)}${replacement}${value.slice(end)}`, `${coalesceKey}:format`);
      pending.current = [selectFrom, selectTo];
    },
    [value, onChange, coalesceKey]
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!event.metaKey && !event.ctrlKey) return;
    const format = BY_KEY[event.key.toLowerCase()];
    if (!format) return;
    event.preventDefault();
    apply(format);
  };

  const bad = disallowedTags(value);
  const unbalanced = hasUnbalancedTags(value);

  return (
    <div className="admin-stack-sm">
      <ButtonGroup variant="minimal" size="small" className="admin-toolbar">
        {GROUPS.map((group, index) => (
          <span key={index} style={{ display: 'contents' }}>
            {index > 0 && <Divider />}
            {group.map((format) => (
              <Tooltip
                key={format.label}
                compact
                content={format.shortcut ? `${format.label} ${format.shortcut}` : format.label}
              >
                <Button icon={format.icon} aria-label={format.label} onClick={() => apply(format)} />
              </Tooltip>
            ))}
          </span>
        ))}

        {/* 허용 태그 안내는 블록마다 두 줄씩 차지하던 것을 여기로 접어 넣었다 */}
        <Popover
          placement="bottom-end"
          content={
            <div className="admin-popover-note">
              <strong>답변 본문에서 쓸 수 있는 태그</strong>
              <p className={Classes.TEXT_MUTED}>
                목록에 없는 태그는 저장은 되지만 검증에서 오류로 잡힙니다. 말풍선 안에서 실제로 보이는 것만
                넣어뒀습니다.
              </p>
              <code>{ALLOWED_TAGS.map((tag) => `<${tag}>`).join(' ')}</code>
            </div>
          }
        >
          <Button icon="help" aria-label="허용 태그" style={{ marginLeft: 'auto' }} />
        </Popover>
      </ButtonGroup>

      <TextArea
        fill
        autoResize
        inputRef={ref}
        className="admin-mono"
        value={value}
        rows={rows}
        intent={bad.length || unbalanced ? 'danger' : 'none'}
        onKeyDown={onKeyDown}
        onChange={(event) => onChange(event.currentTarget.value, coalesceKey)}
        style={{ minHeight: 72 }}
      />

      {(bad.length > 0 || unbalanced) && (
        <Callout intent="danger" compact icon="error">
          {bad.length > 0 && <div>허용되지 않은 태그: {bad.map((tag) => `<${tag}>`).join(', ')}</div>}
          {unbalanced && <div>닫히지 않은 태그가 있어요.</div>}
        </Callout>
      )}
    </div>
  );
}
