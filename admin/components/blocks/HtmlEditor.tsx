import { useCallback, useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { Button, ButtonGroup, Callout, Classes, Divider, Popover, TextArea, Tooltip } from '@blueprintjs/core';
import type { IconName } from '@blueprintjs/icons';
import { ALLOWED_TAGS, disallowedTags, hasUnbalancedTags, sanitizeHtml } from '../../lib/html';

/**
 * 답변 본문(HTML)을 편집한다. 모드가 둘이다.
 *
 * - **서식**: 보이는 대로 고친다. contentEditable이라 브라우저가 `<b>`·`<font>` 같은 걸
 *   제멋대로 섞지만, 입력이 끝날 때마다 `sanitizeHtml`로 허용 태그만 남기고 접어 넣는다.
 * - **HTML**: 원문 그대로. S3에 저장되는 문자열을 눈으로 확인하거나 손으로 고칠 때 쓴다.
 *
 * 원래는 HTML 모드 하나뿐이었는데, 서식 버튼이 줄줄이 있는데도 편집칸에는
 * `<p><mark>…</mark></p>`가 그대로 보여서 "에디터가 깨진 것처럼" 읽혔다.
 * 그렇다고 원문 모드를 없애면 저장되는 문자열을 눈으로 확인할 방법이 사라지므로 둘 다 남긴다.
 */

type Props = {
  value: string;
  /** `coalesce`를 넘기면 연속 입력이 되돌리기 한 단계로 묶인다. */
  onChange: (html: string, coalesce?: string) => void;
  coalesceKey: string;
  rows?: number;
};

type Mode = 'rich' | 'html';

/* -------------------------------------------------------------------------- */
/*                              모드는 전역 하나                                */
/* -------------------------------------------------------------------------- */

/*
 * 블록마다 모드가 따로 놀면 한 화면에 서식칸과 원문칸이 섞여서 더 어지럽다.
 * 편집기가 트리 여기저기에 흩어져 있어 props로 내리기도 마땅치 않아 작은 전역 store를 쓴다.
 */
const MODE_KEY = 'hhr-admin:editorMode';

const modeStore = {
  value: ((): Mode => {
    try {
      return localStorage.getItem(MODE_KEY) === 'html' ? 'html' : 'rich';
    } catch {
      return 'rich';
    }
  })(),
  listeners: new Set<() => void>(),
  subscribe(listener: () => void) {
    modeStore.listeners.add(listener);
    return () => {
      modeStore.listeners.delete(listener);
    };
  },
  get() {
    return modeStore.value;
  },
  set(next: Mode) {
    modeStore.value = next;
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      /* 사생활 보호 모드 등 */
    }
    for (const listener of modeStore.listeners) listener();
  },
};

const useEditorMode = () => useSyncExternalStore(modeStore.subscribe, modeStore.get, modeStore.get);

/* -------------------------------------------------------------------------- */
/*                                  서식 목록                                   */
/* -------------------------------------------------------------------------- */

type Format = {
  icon: IconName;
  label: string;
  shortcut?: string;
  /** 선택 영역을 감쌀 태그 (HTML 모드) */
  tag?: string;
  attrs?: string;
  /** 선택 영역을 줄 단위 목록으로 바꿀 때 (HTML 모드) */
  list?: 'ul' | 'ol';
  /** 그냥 끼워 넣을 조각 (HTML 모드) */
  insert?: string;
  /** 서식 모드에서 쓸 document.execCommand 이름 */
  cmd?: string;
  /** 서식 모드에서 직접 감쌀 태그 (execCommand로는 못 만드는 것) */
  wrap?: string;
};

const GROUPS: Format[][] = [
  [
    { icon: 'bold', label: '굵게', shortcut: '⌘B', tag: 'strong', cmd: 'bold' },
    { icon: 'italic', label: '기울임', shortcut: '⌘I', tag: 'em', cmd: 'italic' },
    { icon: 'underline', label: '밑줄', shortcut: '⌘U', tag: 'u', cmd: 'underline' },
    { icon: 'strikethrough', label: '취소선', tag: 's', cmd: 'strikeThrough' },
  ],
  [
    { icon: 'highlight', label: '강조 (챗봇 시그니처 하이라이트)', shortcut: '⌘H', tag: 'mark', wrap: 'mark' },
    { icon: 'code', label: '코드', tag: 'code', wrap: 'code' },
  ],
  [
    { icon: 'paragraph', label: '문단', tag: 'p', cmd: 'formatBlock' },
    { icon: 'list', label: '목록', list: 'ul', cmd: 'insertUnorderedList' },
    { icon: 'numbered-list', label: '번호 목록', list: 'ol', cmd: 'insertOrderedList' },
  ],
  [
    {
      icon: 'link',
      label: '링크',
      tag: 'a',
      attrs: ' href="https://" target="_blank" rel="noreferrer"',
      cmd: 'createLink',
    },
    { icon: 'insert', label: '줄바꿈', insert: '<br>', cmd: 'insertLineBreak' },
  ],
];

/** 단축키 → 서식 */
const BY_KEY: Record<string, Format> = {
  b: GROUPS[0][0],
  i: GROUPS[0][1],
  u: GROUPS[0][2],
  h: GROUPS[1][0],
};

/* -------------------------------------------------------------------------- */
/*                                 서식 모드                                    */
/* -------------------------------------------------------------------------- */

/** 선택 영역을 태그로 감싼다. execCommand에 없는 `<mark>`·`<code>`용. */
const wrapSelection = (tagName: string) => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  const element = document.createElement(tagName);
  try {
    range.surroundContents(element);
  } catch {
    // 선택이 여러 노드에 걸쳐 있으면 surroundContents가 던진다. 잘라서 다시 넣는다.
    element.appendChild(range.extractContents());
    range.insertNode(element);
  }
  selection.removeAllRanges();
  const next = document.createRange();
  next.selectNodeContents(element);
  selection.addRange(next);
};

function RichBody({
  value,
  onChange,
  coalesceKey,
  register,
}: Props & { register: (apply: (format: Format) => void) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);

  /*
   * contentEditable은 제어 컴포넌트로 만들 수 없다. 매 입력마다 innerHTML을 다시 쓰면
   * 커서가 맨 앞으로 튄다. 그래서 "포커스가 없을 때만" 바깥 값을 반영한다.
   */
  useEffect(() => {
    const element = ref.current;
    if (!element || document.activeElement === element) return;
    if (element.innerHTML !== value) element.innerHTML = value;
  }, [value]);

  const commit = useCallback(
    (coalesce?: string) => {
      const element = ref.current;
      if (!element) return;
      onChange(sanitizeHtml(element.innerHTML), coalesce);
    },
    [onChange]
  );

  const apply = useCallback(
    (format: Format) => {
      const element = ref.current;
      if (!element) return;
      element.focus();

      // 기본값이면 브라우저가 <span style>로 서식을 넣는다. 태그로 받도록 꺼둔다.
      document.execCommand('styleWithCSS', false, 'false');

      if (format.wrap) {
        wrapSelection(format.wrap);
      } else if (format.cmd === 'createLink') {
        const url = window.prompt('링크 주소', 'https://');
        if (url) document.execCommand('createLink', false, url);
      } else if (format.cmd === 'formatBlock') {
        document.execCommand('formatBlock', false, 'p');
      } else if (format.cmd) {
        document.execCommand(format.cmd);
      }

      commit(`${coalesceKey}:format`);
    },
    [commit, coalesceKey]
  );

  useLayoutEffect(() => register(apply), [register, apply]);

  return (
    <div
      ref={ref}
      className="admin-richtext chat-richtext"
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline
      aria-label="답변 본문"
      onInput={() => commit(coalesceKey)}
      onBlur={() => {
        // 편집이 끝나는 순간에만 DOM을 정리한다. 입력 중에 바꾸면 커서가 튄다.
        const element = ref.current;
        if (!element) return;
        const clean = sanitizeHtml(element.innerHTML);
        if (element.innerHTML !== clean) element.innerHTML = clean;
        onChange(clean);
      }}
      onPaste={(event) => {
        // 워드·노션에서 붙여넣으면 style 범벅인 HTML이 들어온다. 글자만 받는다.
        event.preventDefault();
        document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */

export default function HtmlEditor({ value, onChange, coalesceKey, rows }: Props) {
  const mode = useEditorMode();
  const ref = useRef<HTMLTextAreaElement | null>(null);
  /** 다음 렌더 뒤에 복원할 선택 영역. 제어 컴포넌트라 커밋 이후에 잡아야 한다. */
  const pending = useRef<[number, number] | null>(null);
  /** 서식 모드에서는 실제 동작이 contentEditable 쪽에 있다. */
  const richApply = useRef<((format: Format) => void) | null>(null);
  const registerRich = useCallback((apply: (format: Format) => void) => {
    richApply.current = apply;
  }, []);

  useLayoutEffect(() => {
    const range = pending.current;
    const element = ref.current;
    if (!range || !element) return;
    pending.current = null;
    element.focus();
    element.setSelectionRange(range[0], range[1]);
  });

  const applySource = useCallback(
    (format: Format) => {
      const element = ref.current;
      if (!element) return;

      const start = element.selectionStart;
      const end = element.selectionEnd;
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

  const apply = useCallback(
    (format: Format) => {
      if (mode === 'rich') richApply.current?.(format);
      else applySource(format);
    },
    [mode, applySource]
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

        <span className="admin-toolbar__end">
          <Tooltip compact content={mode === 'rich' ? 'HTML 원문 보기' : '서식 편집으로 돌아가기'}>
            <Button
              icon="code"
              aria-label={mode === 'rich' ? 'HTML 원문 보기' : '서식 편집으로 돌아가기'}
              active={mode === 'html'}
              onClick={() => modeStore.set(mode === 'rich' ? 'html' : 'rich')}
            />
          </Tooltip>

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
            <Button icon="help" aria-label="허용 태그" />
          </Popover>
        </span>
      </ButtonGroup>

      {mode === 'rich' ? (
        <RichBody value={value} onChange={onChange} coalesceKey={coalesceKey} register={registerRich} />
      ) : (
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
      )}

      {(bad.length > 0 || unbalanced) && (
        <Callout intent="danger" compact icon="error">
          {bad.length > 0 && <div>허용되지 않은 태그: {bad.map((tag) => `<${tag}>`).join(', ')}</div>}
          {unbalanced && <div>닫히지 않은 태그가 있어요.</div>}
        </Callout>
      )}
    </div>
  );
}
