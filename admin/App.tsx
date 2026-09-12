import { useEffect, useMemo, useState } from 'react';
import type { Block, ContentFile, Entry, Locale } from '@/types';
import { api } from './api';
import BlockEditor from './BlockEditor';
import { EMPTY_BLOCK } from './blockFactory';
import Preview from './Preview';
import { validate, type Issue } from './validate';

const BTN = 'text-sm px-3 py-1.5 rounded-md border transition-colors disabled:opacity-40';
const BTN_PRIMARY = `${BTN} bg-blue-500 text-white border-blue-500 hover:bg-blue-600`;
const BTN_PLAIN = `${BTN} bg-white border-gray-200 hover:bg-gray-50`;

type Tab = 'entries' | 'unanswered';

export default function App() {
  const [content, setContent] = useState<ContentFile | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locale, setLocale] = useState<Locale>('ko');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<string>('');
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('entries');
  const [unanswered, setUnanswered] = useState<{ question: string; count: number }[] | null>(null);

  useEffect(() => {
    api.getContent().then(setContent).catch((e) => setLog(`❌ ${e.message}`));
  }, []);

  const issues: Issue[] = useMemo(() => (content ? validate(content) : []), [content]);
  const issuesById = useMemo(() => {
    const map = new Map<string, Issue[]>();
    for (const issue of issues) {
      if (!issue.entryId) continue;
      map.set(issue.entryId, [...(map.get(issue.entryId) ?? []), issue]);
    }
    return map;
  }, [issues]);

  const entries = content?.entries ?? [];
  const selected = entries.find((e) => e.id === selectedId) ?? null;

  const filtered = entries.filter((entry) => {
    if (!query) return true;
    const haystack = [entry.id, entry.title, ...(entry.utterances.ko ?? []), ...(entry.utterances.en ?? [])]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  /* ------------------------------ mutations ------------------------------ */

  const patchEntry = (id: string, patch: Partial<Entry>) => {
    setContent((prev) =>
      prev ? { ...prev, entries: prev.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) } : prev
    );
    setDirty(true);
  };

  const setBlocks = (id: string, next: Block[]) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    patchEntry(id, { blocks: { ...entry.blocks, [locale]: next } });
  };

  const setUtterances = (id: string, raw: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    const list = raw.split('\n').map((line) => line.trim()).filter(Boolean);
    patchEntry(id, { utterances: { ...entry.utterances, [locale]: list } });
  };

  /* -------------------------------- actions ------------------------------- */

  const withBusy = async (name: string, fn: () => Promise<unknown>) => {
    setBusy(name);
    setLog(`⏳ ${name}...`);
    try {
      const result = (await fn()) as { log?: string; updatedAt?: string };
      setLog(`✅ ${name} 완료\n${result?.log ?? ''}`.trim());
      return true;
    } catch (error) {
      setLog(`❌ ${name} 실패\n${error instanceof Error ? error.message : String(error)}`);
      return false;
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    if (!content) return;
    const ok = await withBusy('저장', () => api.saveContent(content));
    if (ok) setDirty(false);
  };

  const blocks = selected ? selected.blocks[locale] ?? [] : [];

  /* --------------------------------- render -------------------------------- */

  if (!content) {
    return (
      <div className="h-dvh flex items-center justify-center text-gray-400">
        {log || 'content 불러오는 중...'}
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col">
      {/* ------------------------------- header ------------------------------ */}
      <header className="shrink-0 bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3">
        <h1 className="font-bold text-gray-700">HHR Chatbot Admin</h1>
        <span className="text-xs text-gray-400">
          엔트리 {entries.length} · 수정 {new Date(content.updatedAt).toLocaleString('ko-KR')}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {dirty && <span className="text-xs text-orange-500 font-bold">저장 안 됨</span>}
          {issues.some((i) => i.level === 'error') && (
            <span className="text-xs text-red-500 font-bold">
              오류 {issues.filter((i) => i.level === 'error').length}
            </span>
          )}
          <button className={BTN_PRIMARY} disabled={!dirty || !!busy} onClick={save}>
            저장
          </button>
          <button
            className={BTN_PLAIN}
            disabled={dirty || !!busy}
            title="답변만 바뀐 경우 — Lex는 건드리지 않음"
            onClick={() => withBusy('콘텐츠 발행', api.publishContent)}
          >
            발행 (즉시)
          </button>
          <button
            className={BTN_PLAIN}
            disabled={dirty || !!busy}
            title="발화가 바뀐 경우에만 — import + build로 2~3분 소요"
            onClick={() => withBusy('Lex 발행', api.publishLex)}
          >
            Lex 발행
          </button>
          <button
            className={BTN_PLAIN}
            disabled={dirty || !!busy}
            title="최초 인사/홈/fallback 문구를 프론트 번들에 반영"
            onClick={() => withBusy('UI 문구 반영', api.genUi)}
          >
            UI 반영
          </button>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* ------------------------------ 좌: 목록 ----------------------------- */}
        <aside className="w-[290px] shrink-0 border-r border-gray-200 bg-white flex flex-col">
          <div className="p-2 border-b border-gray-200 flex gap-1">
            <button
              className={`flex-1 text-xs py-1.5 rounded ${tab === 'entries' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
              onClick={() => setTab('entries')}
            >
              엔트리
            </button>
            <button
              className={`flex-1 text-xs py-1.5 rounded ${tab === 'unanswered' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
              onClick={() => {
                setTab('unanswered');
                if (!unanswered) api.unanswered(7).then((r) => setUnanswered(r.items)).catch(() => setUnanswered([]));
              }}
            >
              미응답 질문
            </button>
          </div>

          {tab === 'entries' && (
            <>
              <div className="p-2 border-b border-gray-200">
                <input
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400"
                  placeholder="검색 (제목/발화)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="flex-1 overflow-y-auto admin-scroll">
                {filtered.map((entry) => {
                  const entryIssues = issuesById.get(entry.id) ?? [];
                  const hasError = entryIssues.some((i) => i.level === 'error');
                  return (
                    <button
                      key={entry.id}
                      onClick={() => setSelectedId(entry.id)}
                      className={`w-full text-left px-3 py-2 border-b border-gray-100 transition-colors ${
                        selectedId === entry.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm truncate ${entry.enabled ? 'text-gray-700' : 'text-gray-300 line-through'}`}>
                          {entry.title}
                        </span>
                        {entry.kind === 'system' && (
                          <span className="text-[10px] px-1 rounded bg-gray-100 text-gray-500 shrink-0">화면</span>
                        )}
                        {entry.showInFaq && <span className="text-[10px] text-amber-500 shrink-0">★</span>}
                        {hasError && <span className="text-[10px] text-red-500 shrink-0">●</span>}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        ko {entry.blocks.ko?.length ?? 0} · en {entry.blocks.en?.length ?? 0}
                        {entry.kind === 'intent' && ` · 발화 ${entry.utterances.ko?.length ?? 0}`}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {tab === 'unanswered' && (
            <div className="flex-1 overflow-y-auto admin-scroll p-2">
              <p className="text-[11px] text-gray-400 mb-2 px-1">
                최근 7일간 답을 못 한 질문이에요. 자주 나오는 건 인텐트로 만들면 좋아요.
              </p>
              {unanswered === null && <p className="text-xs text-gray-400 px-1">불러오는 중...</p>}
              {unanswered?.length === 0 && <p className="text-xs text-gray-400 px-1">없어요 🎉</p>}
              {unanswered?.map((item) => (
                <div key={item.question} className="px-2 py-1.5 border-b border-gray-100">
                  <div className="text-sm text-gray-700 break-all">{item.question}</div>
                  <div className="text-[11px] text-gray-400">{item.count}회</div>
                </div>
              ))}
            </div>
          )}
        </aside>

        {/* ------------------------------ 중: 편집 ----------------------------- */}
        <main className="flex-1 min-w-0 overflow-y-auto admin-scroll p-4">
          {!selected && <p className="text-sm text-gray-400 text-center mt-16">왼쪽에서 항목을 선택하세요.</p>}

          {selected && (
            <div className="flex flex-col gap-3 max-w-[720px]">
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  className="border border-gray-200 rounded px-2 py-1.5 text-sm font-bold flex-1 min-w-[180px]"
                  value={selected.title}
                  onChange={(e) => patchEntry(selected.id, { title: e.target.value })}
                />
                <code className="text-[11px] text-gray-400">{selected.id}</code>

                <label className="text-xs flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={selected.enabled}
                    onChange={(e) => patchEntry(selected.id, { enabled: e.target.checked })}
                  />
                  활성
                </label>
                {selected.kind === 'intent' && (
                  <label className="text-xs flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={selected.showInFaq}
                      onChange={(e) => patchEntry(selected.id, { showInFaq: e.target.checked })}
                    />
                    FAQ 노출
                  </label>
                )}

                <div className="flex rounded-md overflow-hidden border border-gray-200 ml-auto">
                  {(['ko', 'en'] as Locale[]).map((l) => (
                    <button
                      key={l}
                      className={`text-xs px-3 py-1.5 ${locale === l ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-50'}`}
                      onClick={() => setLocale(l)}
                    >
                      {l.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {(issuesById.get(selected.id) ?? []).map((issue, i) => (
                <div
                  key={i}
                  className={`text-xs rounded px-2 py-1.5 ${
                    issue.level === 'error' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  {issue.message}
                </div>
              ))}

              {selected.kind === 'intent' && (
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase">
                    발화 ({locale}) — 한 줄에 하나. 바꾸면 &quot;Lex 발행&quot; 필요
                  </span>
                  <textarea
                    className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm font-mono"
                    rows={4}
                    value={(selected.utterances[locale] ?? []).join('\n')}
                    onChange={(e) => setUtterances(selected.id, e.target.value)}
                  />
                </div>
              )}

              <div className="flex flex-col gap-2">
                {blocks.map((block, index) => (
                  <BlockEditor
                    key={`${selected.id}-${locale}-${index}`}
                    block={block}
                    index={index}
                    total={blocks.length}
                    onChange={(next) => setBlocks(selected.id, blocks.map((b, i) => (i === index ? next : b)))}
                    onRemove={() => setBlocks(selected.id, blocks.filter((_, i) => i !== index))}
                    onMove={(delta) => {
                      const next = [...blocks];
                      const target = index + delta;
                      [next[index], next[target]] = [next[target], next[index]];
                      setBlocks(selected.id, next);
                    }}
                  />
                ))}

                <div className="flex gap-1.5 flex-wrap">
                  {(Object.keys(EMPTY_BLOCK) as Block['type'][]).map((type) => (
                    <button
                      key={type}
                      className={BTN_PLAIN}
                      onClick={() => setBlocks(selected.id, [...blocks, EMPTY_BLOCK[type]()])}
                    >
                      + {type}
                    </button>
                  ))}
                  {locale === 'en' && blocks.length === 0 && (
                    <button
                      className={BTN_PLAIN}
                      title="한국어 블록 구조를 복사해서 번역 시작점으로 쓴다"
                      onClick={() =>
                        setBlocks(selected.id, JSON.parse(JSON.stringify(selected.blocks.ko ?? [])) as Block[])
                      }
                    >
                      ⧉ 한국어에서 복사
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ------------------------------ 우: 미리보기 -------------------------- */}
        <section className="w-[380px] shrink-0 border-l border-gray-200 bg-white flex flex-col">
          {selected ? (
            <Preview blocks={blocks} locale={locale} title={selected.title} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-300">미리보기</div>
          )}
          {log && (
            <pre className="shrink-0 max-h-[180px] overflow-y-auto admin-scroll text-[11px] bg-gray-900 text-gray-100 p-3 whitespace-pre-wrap">
              {log}
            </pre>
          )}
        </section>
      </div>
    </div>
  );
}
