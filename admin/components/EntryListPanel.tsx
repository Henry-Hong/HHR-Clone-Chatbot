import { useMemo } from 'react';
import {
  Button,
  Classes,
  ContextMenu,
  Icon,
  InputGroup,
  Menu,
  MenuDivider,
  MenuItem,
  NonIdealState,
  PopoverNext,
  Tag,
  Tooltip,
} from '@blueprintjs/core';
import type { Entry } from '@/types';
import { blocksOf, utterancesOf } from '../lib/entries';
import { useDragList } from '../lib/useDragList';
import type { Issue } from '../validate';

export type EntryFilter = 'all' | 'intent' | 'system' | 'problems' | 'untranslated';

const FILTER_LABEL: Record<EntryFilter, string> = {
  all: '전체',
  intent: '인텐트만',
  system: '화면만',
  problems: '문제 있는 것만',
  untranslated: '영어 없는 것만',
};

const FILTER_ORDER = Object.keys(FILTER_LABEL) as EntryFilter[];

type Props = {
  entries: Entry[];
  selectedId: string | null;
  issuesById: Map<string, Issue[]>;
  query: string;
  filter: EntryFilter;
  onQuery: (value: string) => void;
  onFilter: (value: EntryFilter) => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (entry: Entry) => void;
  onToggleEnabled: (entry: Entry) => void;
  onMove: (from: number, to: number) => void;
};

const matches = (entry: Entry, query: string) => {
  if (!query) return true;
  const needle = query.toLowerCase();
  return [entry.id, entry.title, ...utterancesOf(entry, 'ko'), ...utterancesOf(entry, 'en')]
    .join(' ')
    .toLowerCase()
    .includes(needle);
};

export default function EntryListPanel({
  entries,
  selectedId,
  issuesById,
  query,
  filter,
  onQuery,
  onFilter,
  onSelect,
  onCreate,
  onDuplicate,
  onDelete,
  onToggleEnabled,
  onMove,
}: Props) {
  const drag = useDragList(onMove);

  const visible = useMemo(
    () =>
      entries
        .map((entry, index) => ({ entry, index }))
        .filter(({ entry }) => {
          if (!matches(entry, query)) return false;
          switch (filter) {
            case 'intent':
              return entry.kind === 'intent';
            case 'system':
              return entry.kind === 'system';
            case 'problems':
              return (issuesById.get(entry.id)?.length ?? 0) > 0;
            case 'untranslated':
              return blocksOf(entry, 'en').length === 0;
            default:
              return true;
          }
        }),
    [entries, query, filter, issuesById]
  );

  return (
    <>
      <div className="admin-border-b admin-pad admin-row">
        <InputGroup
          fill
          leftIcon="search"
          placeholder="제목 · id · 발화"
          value={query}
          onValueChange={onQuery}
          rightElement={
            query ? (
              <Button icon="small-cross" variant="minimal" onClick={() => onQuery('')} aria-label="검색어 지우기" />
            ) : undefined
          }
        />
        {/* 구버전 Popover는 React 19에서 위치 계산을 포기한다 (AppNavbar 주석 참고) */}
        <PopoverNext
          placement="bottom-end"
          content={
            <Menu>
              <MenuDivider title="보기" />
              {FILTER_ORDER.map((key) => (
                <MenuItem
                  key={key}
                  text={FILTER_LABEL[key]}
                  icon={filter === key ? 'tick' : 'blank'}
                  onClick={() => onFilter(key)}
                />
              ))}
            </Menu>
          }
        >
          <Tooltip content={`보기: ${FILTER_LABEL[filter]}`} compact>
            <Button icon="filter" variant={filter === 'all' ? 'minimal' : 'solid'} intent={filter === 'all' ? 'none' : 'primary'} aria-label="필터" />
          </Tooltip>
        </PopoverNext>
      </div>

      <div className="admin-scroll" style={{ flex: 1 }}>
        {visible.length === 0 && (
          <div className="admin-empty--tall">
            <NonIdealState
            icon="search"
            title="해당하는 항목이 없어요"
            description={query ? `"${query}"와 맞는 항목이 없습니다.` : FILTER_LABEL[filter]}
            layout="vertical"
            className={Classes.TEXT_MUTED}
            />
          </div>
        )}

        {visible.map(({ entry, index }) => {
          const entryIssues = issuesById.get(entry.id) ?? [];
          const errors = entryIssues.filter((issue) => issue.level === 'error').length;
          const warns = entryIssues.length - errors;

          return (
            <ContextMenu
              key={entry.id}
              content={
                <Menu>
                  <MenuDivider title={entry.id} />
                  <MenuItem
                    icon={entry.enabled ? 'eye-off' : 'eye-open'}
                    text={entry.enabled ? '비활성으로' : '활성으로'}
                    onClick={() => onToggleEnabled(entry)}
                  />
                  <MenuItem
                    icon="duplicate"
                    text="복제"
                    disabled={entry.kind === 'system'}
                    onClick={() => onDuplicate(entry.id)}
                  />
                  <MenuDivider />
                  <MenuItem
                    icon="trash"
                    intent="danger"
                    text="삭제"
                    disabled={entry.kind === 'system'}
                    onClick={() => onDelete(entry)}
                  />
                </Menu>
              }
            >
              <div
                role="button"
                tabIndex={0}
                /*
                 * aria-label이 없으면 손잡이의 title("드래그해서 순서 변경")이 행 전체의
                 * 이름으로 잡혀서, 스크린리더가 11개 항목을 전부 같은 이름으로 읽는다.
                 */
                aria-label={entry.title || entry.id}
                aria-pressed={selectedId === entry.id}
                onClick={() => onSelect(entry.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(entry.id);
                  }
                }}
                {...drag.zoneProps(index)}
                className={[
                  drag.classFor(index, 'admin-entry'),
                  selectedId === entry.id && 'admin-entry--selected',
                  !entry.enabled && 'admin-entry--disabled',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <Tooltip compact content="드래그해서 순서 변경" placement="right">
                  <span {...drag.handleProps(index)} className="admin-entry__grip" aria-hidden="true">
                    <Icon icon="drag-handle-vertical" size={12} />
                  </span>
                </Tooltip>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="admin-entry__line">
                    <span className="admin-entry__title" style={{ flex: 1 }}>
                      {entry.title || <em className={Classes.TEXT_MUTED}>(제목 없음)</em>}
                    </span>
                    {entry.kind === 'system' && (
                      <Tag minimal icon="application" htmlTitle="Lex가 아니라 프론트가 직접 쓰는 화면">
                        화면
                      </Tag>
                    )}
                    {entry.showInFaq && <Icon icon="star" size={11} intent="warning" title="FAQ 노출" />}
                    {errors > 0 && <Icon icon="error" size={11} intent="danger" title={`오류 ${errors}개`} />}
                    {errors === 0 && warns > 0 && (
                      <Icon icon="warning-sign" size={11} intent="warning" title={`경고 ${warns}개`} />
                    )}
                  </div>

                  <div className={`admin-entry__meta ${Classes.TEXT_MUTED}`}>
                    ko {blocksOf(entry, 'ko').length} · en {blocksOf(entry, 'en').length}
                    {entry.kind === 'intent' && ` · 발화 ${utterancesOf(entry, 'ko').length}`}
                  </div>
                </div>
              </div>
            </ContextMenu>
          );
        })}
      </div>

      <div className="admin-border-t admin-pad">
        <Button fill icon="add" text="새 인텐트" onClick={onCreate} />
      </div>
    </>
  );
}
