import { useMemo, useState } from 'react';
import {
  Button,
  ButtonGroup,
  Callout,
  Classes,
  Code,
  EditableText,
  NonIdealState,
  SegmentedControl,
  Switch,
  Tag,
  TagInput,
  Tooltip,
} from '@blueprintjs/core';
import type { Block, ContentFile, Entry, Locale } from '@/types';
import { BLOCK_TYPES, EMPTY_BLOCK, TYPE_ICON, TYPE_LABEL } from '../blockFactory';
import { LOCALES, LOCALE_LABEL, blocksOf, utterancesOf } from '../lib/entries';
import { clone, uidOf } from '../lib/uid';
import { useDragList } from '../lib/useDragList';
import type { Issue } from '../validate';
import BlockCard from './BlockCard';

type Props = {
  content: ContentFile;
  entry: Entry;
  locale: Locale;
  issues: Issue[];
  onLocale: (locale: Locale) => void;
  /** `coalesce`는 연속 입력을 되돌리기 한 단계로 묶기 위한 필드 이름. */
  onPatch: (patch: Partial<Entry>, coalesce?: string) => void;
  onBlocks: (blocks: Block[], coalesce?: string) => void;
  onUtterances: (values: string[]) => void;
};

export default function EntryEditor({
  content,
  entry,
  locale,
  issues,
  onLocale,
  onPatch,
  onBlocks,
  onUtterances,
}: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const blocks = blocksOf(entry, locale);

  const drag = useDragList((from, to) => {
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onBlocks(next);
  });

  /** 이 로케일에서 어떤 발화가 어느 인텐트 것인지. 버튼 검증에 쓴다. */
  const ownerByUtterance = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of content.entries) {
      if (!item.enabled) continue;
      for (const utterance of utterancesOf(item, locale)) map.set(utterance, item.id);
    }
    return map;
  }, [content.entries, locale]);

  const suggestions = useMemo(() => [...ownerByUtterance.keys()].sort(), [ownerByUtterance]);

  const toggleCollapse = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const patchBlock = (index: number, next: Block, coalesce?: string) =>
    onBlocks(
      blocks.map((block, i) => (i === index ? next : block)),
      coalesce && `block${index}:${coalesce}`
    );

  const errors = issues.filter((issue) => issue.level === 'error');
  const warns = issues.filter((issue) => issue.level === 'warn');

  return (
    <div style={{ padding: 16, maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ------------------------------- 헤더 ------------------------------- */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, flex: '1 1 220px', minWidth: 0, fontSize: 18 }}>
          <EditableText
            placeholder="제목을 입력하세요"
            value={entry.title}
            onChange={(title) => onPatch({ title }, 'title')}
            selectAllOnFocus
          />
        </h2>

        <Tooltip content={entry.kind === 'system' ? '프론트가 직접 쓰는 화면' : 'Lex 인텐트 이름'} compact>
          <Code>{entry.id}</Code>
        </Tooltip>

        <SegmentedControl
          small
          value={locale}
          onValueChange={(value) => onLocale(value as Locale)}
          options={LOCALES.map((item) => ({
            value: item,
            label: item.toUpperCase(),
            icon: blocksOf(entry, item).length === 0 ? 'warning-sign' : undefined,
          }))}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <Switch
          checked={entry.enabled}
          label="활성"
          inline
          style={{ margin: 0 }}
          onChange={(event) => onPatch({ enabled: event.currentTarget.checked })}
        />
        {entry.kind === 'intent' && (
          <Switch
            checked={entry.showInFaq}
            label="FAQ 노출"
            inline
            style={{ margin: 0 }}
            onChange={(event) => onPatch({ showInFaq: event.currentTarget.checked })}
          />
        )}
        <span className={Classes.TEXT_MUTED} style={{ fontSize: 12 }}>
          {LOCALE_LABEL[locale]} 편집 중
          {locale !== content.defaultLocale && blocks.length === 0 && ` · 비어 있으면 ${content.defaultLocale} 답변이 나갑니다`}
        </span>
      </div>

      {/* ------------------------------- 문제 ------------------------------- */}
      {errors.map((issue, index) => (
        <Callout key={`e${index}`} intent="danger" compact icon="error">
          {issue.message}
          {issue.hint && <div className={Classes.TEXT_MUTED} style={{ fontSize: 11, marginTop: 2 }}>{issue.hint}</div>}
        </Callout>
      ))}
      {warns.map((issue, index) => (
        <Callout key={`w${index}`} intent="warning" compact icon="warning-sign">
          {issue.message}
          {issue.hint && <div className={Classes.TEXT_MUTED} style={{ fontSize: 11, marginTop: 2 }}>{issue.hint}</div>}
        </Callout>
      ))}

      {/* ------------------------------- 발화 ------------------------------- */}
      {entry.kind === 'intent' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
            <strong style={{ fontSize: 12 }}>발화 ({locale})</strong>
            <span className={Classes.TEXT_MUTED} style={{ fontSize: 11 }}>
              Enter로 추가 · 바꾸면 <strong>Lex 발행</strong>이 필요합니다
            </span>
          </div>
          <TagInput
            fill
            addOnBlur
            addOnPaste
            separator={/[\n,]/}
            placeholder="이 인텐트를 부를 말들…"
            leftIcon="chat"
            values={utterancesOf(entry, locale)}
            tagProps={{ minimal: true }}
            onChange={(values) =>
              onUtterances(
                values
                  .map((value) => String(value).trim())
                  .filter((value, index, list) => value && list.indexOf(value) === index)
              )
            }
          />
        </div>
      )}

      {/* ------------------------------- 블록 ------------------------------- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {blocks.length === 0 && (
          <div style={{ padding: '24px 0' }}>
            <NonIdealState
            icon="new-text-box"
            title={`${LOCALE_LABEL[locale]} 답변이 비어 있어요`}
            description={
            locale === content.defaultLocale
            ? '아래에서 블록을 추가해 답변을 만들어 주세요.'
            : `비워두면 ${content.defaultLocale} 답변이 대신 나갑니다.`
            }
            layout="vertical"
            action={
            locale !== content.defaultLocale && blocksOf(entry, content.defaultLocale).length > 0 ? (
            <Button
            icon="duplicate"
            text={`${content.defaultLocale.toUpperCase()}에서 복사해 번역 시작`}
            onClick={() => onBlocks(clone(blocksOf(entry, content.defaultLocale)))}
            />
            ) : undefined
            }
            />
          </div>
        )}

        {blocks.map((block, index) => {
          const key = uidOf(block);
          return (
            <div key={key} {...drag.zoneProps(index)} className={drag.classFor(index, 'admin-block')}>
              <BlockCard
                block={block}
                index={index}
                total={blocks.length}
                collapsed={collapsed.has(key)}
                ownerOf={(utterance) => ownerByUtterance.get(utterance) ?? null}
                utteranceSuggestions={suggestions}
                onToggleCollapse={() => toggleCollapse(key)}
                onChange={(next, coalesce) => patchBlock(index, next, coalesce)}
                onRemove={() => onBlocks(blocks.filter((_, i) => i !== index))}
                onDuplicate={() => {
                  const next = [...blocks];
                  next.splice(index + 1, 0, clone(block));
                  onBlocks(next);
                }}
                onMove={(delta) => {
                  const target = index + delta;
                  if (target < 0 || target >= blocks.length) return;
                  const next = [...blocks];
                  [next[index], next[target]] = [next[target], next[index]];
                  onBlocks(next);
                }}
                dragHandle={drag.handleProps(index)}
              />
            </div>
          );
        })}

        <ButtonGroup style={{ alignSelf: 'flex-start', marginTop: 4 }}>
          {BLOCK_TYPES.map((type) => (
            <Button
              key={type}
              icon={TYPE_ICON[type]}
              text={TYPE_LABEL[type]}
              onClick={() => onBlocks([...blocks, EMPTY_BLOCK[type]()])}
            />
          ))}
        </ButtonGroup>

        {blocks.length > 0 && (
          <Tag minimal style={{ alignSelf: 'flex-start' }}>
            블록 {blocks.length}개
          </Tag>
        )}
      </div>
    </div>
  );
}
