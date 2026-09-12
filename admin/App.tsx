import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Classes,
  NonIdealState,
  OverlayToaster,
  Spinner,
  Tab,
  Tabs,
  type HotkeyConfig,
  type Toaster,
  useHotkeys,
} from '@blueprintjs/core';
import type { Block, Entry, Locale } from '@/types';
import { api, type UnansweredItem } from './api';
import type { PublishKind } from './components/AppNavbar';
import AppNavbar from './components/AppNavbar';
import EntryEditor from './components/EntryEditor';
import EntryListPanel, { type EntryFilter } from './components/EntryListPanel';
import IssuesPanel from './components/IssuesPanel';
import PreviewPanel from './components/PreviewPanel';
import UnansweredPanel from './components/UnansweredPanel';
import { AddUtteranceDialog, DeleteEntryAlert, EntryOmnibar, LogDrawer, NewEntryDialog } from './components/dialogs';
import {
  addEntry,
  blocksOf,
  duplicateEntry,
  emptyEntry,
  patchEntry as patchEntryIn,
  removeEntry,
  reorderEntries,
  setBlocks as setBlocksIn,
  setUtterances as setUtterancesIn,
  sorted,
  utterancesOf,
} from './lib/entries';
import { useContentStore } from './lib/store';
import { useLocalState } from './lib/useLocalState';
import { useSplit } from './lib/useSplit';
import { errorsOf, groupByEntry, validate } from './validate';

const PUBLISH: Record<PublishKind, { name: string; run: () => Promise<{ log: string }> }> = {
  content: { name: '콘텐츠 발행', run: api.publishContent },
  lex: { name: 'Lex 발행', run: api.publishLex },
  ui: { name: 'UI 문구 반영', run: api.genUi },
};

export default function App() {
  const store = useContentStore();
  const { content, dirty } = store;

  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useLocalState<string | null>('selected', null);
  const [locale, setLocale] = useLocalState<Locale>('locale', 'ko');
  const [dark, setDark] = useLocalState('dark', false);
  const [leftTab, setLeftTab] = useState<'entries' | 'unanswered'>('entries');
  const [rightTab, setRightTab] = useLocalState<'preview' | 'issues'>('rightTab', 'preview');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<EntryFilter>('all');

  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState('');
  const [logOpen, setLogOpen] = useState(false);

  const [omnibarOpen, setOmnibarOpen] = useState(false);
  const [newEntryOpen, setNewEntryOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Entry | null>(null);
  const [pendingUtterance, setPendingUtterance] = useState<UnansweredItem | null>(null);

  const [days, setDays] = useLocalState('unansweredDays', 7);
  const [unanswered, setUnanswered] = useState<UnansweredItem[] | null>(null);
  const [unansweredError, setUnansweredError] = useState<string | null>(null);
  const [unansweredLoading, setUnansweredLoading] = useState(false);

  const left = useSplit('left', 300, 220, 460);
  const right = useSplit('right', 400, 300, 680);
  const toaster = useRef<Toaster | null>(null);

  /* ------------------------------- 부트스트랩 ------------------------------ */

  useEffect(() => {
    OverlayToaster.create({ position: 'top' }).then((instance) => {
      toaster.current = instance;
    });
  }, []);

  useEffect(() => {
    api.getContent().then(store.load).catch((error: Error) => setLoadError(error.message));
  }, [store.load]);

  useEffect(() => {
    document.body.classList.toggle(Classes.DARK, dark);
    document.body.classList.toggle('admin-sunken', true);
  }, [dark]);

  // 저장하지 않은 편집을 실수로 날리지 않게 한다.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const notify = useCallback((message: string, intent: 'success' | 'danger' | 'primary', icon?: 'tick-circle') => {
    toaster.current?.show({ message, intent, icon, timeout: intent === 'danger' ? 8000 : 3000 });
  }, []);

  /* -------------------------------- 파생 상태 ------------------------------- */

  const entries = useMemo(() => (content ? sorted(content.entries) : []), [content]);
  const issues = useMemo(() => (content ? validate(content) : []), [content]);
  const issuesById = useMemo(() => groupByEntry(issues), [issues]);
  const errors = useMemo(() => errorsOf(issues), [issues]);
  const selected = entries.find((entry) => entry.id === selectedId) ?? null;

  /* --------------------------------- 편집 --------------------------------- */

  const patchEntry = useCallback(
    (id: string, patch: Partial<Entry>, coalesce?: string) =>
      store.edit((current) => patchEntryIn(current, id, patch), coalesce && `${id}:${coalesce}`),
    [store]
  );

  const setBlocks = useCallback(
    (id: string, blocks: Block[], coalesce?: string) =>
      store.edit((current) => setBlocksIn(current, id, locale, blocks), coalesce && `${id}:${locale}:${coalesce}`),
    [store, locale]
  );

  const setUtterances = useCallback(
    (id: string, values: string[]) => store.edit((current) => setUtterancesIn(current, id, locale, values)),
    [store, locale]
  );

  const createEntry = useCallback(
    (id: string, title: string) => {
      store.edit((current) => addEntry(current, emptyEntry(id, title, 'intent', current.entries.length)));
      setSelectedId(id);
      setNewEntryOpen(false);
      notify(`${title} 항목을 만들었어요.`, 'success', 'tick-circle');
    },
    [store, setSelectedId, notify]
  );

  /*
   * 복제는 결과(새 id)를 밖으로 꺼내야 하므로 리듀서 안에서 계산하지 않는다.
   * 리듀서는 순수해야 하고 StrictMode에서 두 번 호출된다.
   * 타이핑처럼 연속으로 들어오는 편집과 달리 복제는 한 번의 클릭이라
   * 렌더 시점의 content로 계산해도 낡은 값을 잡을 일이 없다.
   */
  const duplicate = useCallback(
    (id: string) => {
      if (!content) return;
      const result = duplicateEntry(content, id);
      if (!result) return;
      store.edit(() => result.content);
      // 복제본은 발화가 비어 있어 바로 활성화하면 Lex가 절대 고를 수 없다. 사용자가 채우도록 선택만 옮긴다.
      setSelectedId(result.id);
    },
    [content, store, setSelectedId]
  );

  const confirmDelete = useCallback(
    (id: string) => {
      store.edit((current) => removeEntry(current, id));
      setPendingDelete(null);
      if (selectedId === id) setSelectedId(null);
      notify('삭제했어요. ⌘Z로 되돌릴 수 있습니다.', 'primary');
    },
    [store, selectedId, setSelectedId, notify]
  );

  const addUtteranceToEntry = useCallback(
    (entryId: string, utterance: string, target: Locale) => {
      store.edit((current) => {
        const entry = current.entries.find((item) => item.id === entryId);
        if (!entry) return null;
        const existing = utterancesOf(entry, target);
        if (existing.includes(utterance)) return null;
        return setUtterancesIn(current, entryId, target, [...existing, utterance]);
      });
      setPendingUtterance(null);
      setSelectedId(entryId);
      setLeftTab('entries');
      notify(`"${utterance}"를 추가했어요. Lex 발행을 해야 반영됩니다.`, 'success', 'tick-circle');
    },
    [store, setSelectedId, notify]
  );

  /* -------------------------------- 서버 작업 ------------------------------- */

  const save = useCallback(async () => {
    if (!content || !dirty) return;
    setBusy('저장');
    try {
      const { updatedAt } = await api.saveContent(content);
      store.markSaved(updatedAt);
      notify('저장했어요.', 'success', 'tick-circle');
    } catch (error) {
      notify(`저장 실패: ${error instanceof Error ? error.message : String(error)}`, 'danger');
    } finally {
      setBusy(null);
    }
  }, [content, dirty, store, notify]);

  const publish = useCallback(
    async (kind: PublishKind) => {
      const { name, run } = PUBLISH[kind];
      setBusy(name);
      setLog(`⏳ ${name} 실행 중...`);
      try {
        const result = await run();
        setLog(`✅ ${name} 완료\n\n${result.log ?? ''}`.trim());
        notify(`${name} 완료`, 'success', 'tick-circle');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setLog(`❌ ${name} 실패\n\n${message}`);
        setLogOpen(true);
        notify(`${name} 실패 — 로그를 확인하세요.`, 'danger');
      } finally {
        setBusy(null);
      }
    },
    [notify]
  );

  const loadUnanswered = useCallback(
    async (nextDays: number) => {
      setUnansweredLoading(true);
      setUnansweredError(null);
      try {
        const { items } = await api.unanswered(nextDays);
        setUnanswered(items);
      } catch (error) {
        setUnanswered(null);
        setUnansweredError(error instanceof Error ? error.message : String(error));
      } finally {
        setUnansweredLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (leftTab === 'unanswered') void loadUnanswered(days);
  }, [leftTab, days, loadUnanswered]);

  /* -------------------------------- 단축키 --------------------------------- */

  const hotkeys = useMemo<HotkeyConfig[]>(
    () => [
      // allowInInput: Blueprint는 기본적으로 입력란 안에서 단축키를 무시한다.
      // 어드민은 대부분의 시간을 입력란 안에서 보내므로 그러면 아무 데서도 안 먹는 것과 같다.
      // 되돌리기도 store가 진짜 상태이므로 브라우저 기본 실행취소보다 이쪽이 맞다.
      {
        combo: 'mod+s',
        global: true,
        allowInInput: true,
        label: '저장',
        preventDefault: true,
        onKeyDown: () => void save(),
      },
      {
        combo: 'mod+z',
        global: true,
        allowInInput: true,
        label: '되돌리기',
        preventDefault: true,
        onKeyDown: store.undo,
      },
      {
        combo: 'mod+shift+z',
        global: true,
        allowInInput: true,
        label: '다시 실행',
        preventDefault: true,
        onKeyDown: store.redo,
      },
      {
        combo: 'mod+k',
        global: true,
        allowInInput: true,
        label: '항목 찾기',
        preventDefault: true,
        onKeyDown: () => setOmnibarOpen(true),
      },
      {
        combo: 'mod+shift+l',
        global: true,
        allowInInput: true,
        label: '언어 전환',
        preventDefault: true,
        onKeyDown: () => setLocale(locale === 'ko' ? 'en' : 'ko'),
      },
    ],
    [save, store.undo, store.redo, locale, setLocale]
  );

  const { handleKeyDown, handleKeyUp } = useHotkeys(hotkeys);

  /* --------------------------------- 렌더 ---------------------------------- */

  if (loadError) {
    return (
      <div className="admin-sunken admin-empty" style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
        <NonIdealState
          icon="error"
          title="콘텐츠를 불러오지 못했어요"
          description={
            <>
              <p>{loadError}</p>
              <p className={`${Classes.TEXT_MUTED} admin-hint`}>
                S3에서 먼저 받아오세요:
                <br />
                <code>aws s3 cp s3://$CONTENT_BUCKET/content/current.json content/current.json</code>
                <br />
                로컬에서 구경만 해볼 거라면: <code>node scripts/seed-content.mjs</code>
              </p>
            </>
          }
          action={<button className={Classes.BUTTON} onClick={() => window.location.reload()}>다시 시도</button>}
        />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="admin-sunken" style={{ height: '100%', display: 'grid', placeItems: 'center' }}>
        <Spinner />
      </div>
    );
  }

  return (
    <div className="admin-shell admin-sunken" onKeyDown={handleKeyDown} onKeyUp={handleKeyUp} tabIndex={-1}>
      <AppNavbar
        content={content}
        dirty={dirty}
        busy={busy}
        errorCount={errors.length}
        warnCount={issues.length - errors.length}
        canUndo={store.canUndo}
        canRedo={store.canRedo}
        dark={dark}
        hasLog={!!log}
        onUndo={store.undo}
        onRedo={store.redo}
        onSave={() => void save()}
        onPublish={(kind) => void publish(kind)}
        onToggleDark={() => setDark(!dark)}
        onOpenSearch={() => setOmnibarOpen(true)}
        onOpenLog={() => setLogOpen(true)}
        onShowErrors={() => setRightTab('issues')}
      />

      <div className="admin-body">
        {/* ------------------------------ 좌 ------------------------------- */}
        <aside className="admin-pane admin-pane--side admin-surface admin-border-r" style={{ width: left.width }}>
          <Tabs
            id="left"
            selectedTabId={leftTab}
            onChange={(id) => setLeftTab(id as typeof leftTab)}
            className="admin-border-b"
            renderActiveTabPanelOnly
          >
            <Tab id="entries" title="엔트리" icon="layers" tagContent={entries.length} />
            <Tab
              id="unanswered"
              title="미응답"
              icon="inbox"
              tagContent={unanswered?.length || undefined}
            />
          </Tabs>

          {leftTab === 'entries' ? (
            <EntryListPanel
              entries={entries}
              selectedId={selectedId}
              issuesById={issuesById}
              query={query}
              filter={filter}
              onQuery={setQuery}
              onFilter={setFilter}
              onSelect={setSelectedId}
              onCreate={() => setNewEntryOpen(true)}
              onDuplicate={duplicate}
              onDelete={setPendingDelete}
              onToggleEnabled={(entry) => patchEntry(entry.id, { enabled: !entry.enabled })}
              onMove={(from, to) => store.edit((current) => reorderEntries(current, from, to))}
            />
          ) : (
            <UnansweredPanel
              items={unanswered}
              error={unansweredError}
              loading={unansweredLoading}
              days={days}
              onDays={setDays}
              onRefresh={() => void loadUnanswered(days)}
              onAdd={setPendingUtterance}
            />
          )}
        </aside>

        <div className="admin-gutter" onMouseDown={left.start('right')} role="separator" aria-orientation="vertical" />

        {/* ------------------------------ 중 ------------------------------- */}
        <main className="admin-pane admin-pane--center">
          {selected ? (
            <EntryEditor
              content={content}
              entry={selected}
              locale={locale}
              issues={issuesById.get(selected.id) ?? []}
              onLocale={setLocale}
              onPatch={(patch, coalesce) => patchEntry(selected.id, patch, coalesce)}
              onBlocks={(blocks, coalesce) => setBlocks(selected.id, blocks, coalesce)}
              onUtterances={(values) => setUtterances(selected.id, values)}
            />
          ) : (
            <div className="admin-empty--tall">
              <NonIdealState
              icon="select"
              title="편집할 항목을 고르세요"
              description="왼쪽 목록에서 항목을 선택하거나 ⌘K로 찾을 수 있어요."
              layout="vertical"
              />
            </div>
          )}
        </main>

        <div className="admin-gutter" onMouseDown={right.start('left')} role="separator" aria-orientation="vertical" />

        {/* ------------------------------ 우 ------------------------------- */}
        <section className="admin-pane admin-pane--side admin-surface admin-border-l" style={{ width: right.width }}>
          <Tabs
            id="right"
            selectedTabId={rightTab}
            onChange={(id) => setRightTab(id as typeof rightTab)}
            className="admin-border-b"
          >
            <Tab id="preview" title="미리보기" icon="eye-open" />
            <Tab id="issues" title="검증" icon={errors.length ? 'error' : 'tick-circle'} tagContent={issues.length || undefined} />
          </Tabs>

          {rightTab === 'preview' ? (
            selected ? (
              <PreviewPanel
                blocks={blocksOf(selected, locale)}
                locale={locale}
                fallbackBlocks={locale === content.defaultLocale ? [] : blocksOf(selected, content.defaultLocale)}
              />
            ) : (
              <div className="admin-empty--tall">
                <NonIdealState icon="eye-open" title="미리보기" layout="vertical" />
              </div>
            )
          ) : (
            <IssuesPanel issues={issues} entries={entries} onSelect={setSelectedId} />
          )}
        </section>
      </div>

      {/* ------------------------------ 오버레이 ------------------------------ */}
      <EntryOmnibar
        isOpen={omnibarOpen}
        entries={entries}
        onClose={() => setOmnibarOpen(false)}
        onSelect={setSelectedId}
      />
      <NewEntryDialog
        isOpen={newEntryOpen}
        takenIds={entries.map((entry) => entry.id)}
        onClose={() => setNewEntryOpen(false)}
        onCreate={createEntry}
      />
      <AddUtteranceDialog
        question={pendingUtterance?.question ?? null}
        locale={(pendingUtterance?.locale as Locale) ?? locale}
        entries={entries}
        onClose={() => setPendingUtterance(null)}
        onAdd={(entryId, utterance) =>
          addUtteranceToEntry(entryId, utterance, (pendingUtterance?.locale as Locale) ?? locale)
        }
      />
      <DeleteEntryAlert entry={pendingDelete} onCancel={() => setPendingDelete(null)} onConfirm={confirmDelete} />
      <LogDrawer log={log} isOpen={logOpen} onClose={() => setLogOpen(false)} />
    </div>
  );
}
