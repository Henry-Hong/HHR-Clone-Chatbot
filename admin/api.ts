import type { ContentFile } from '@/types';

const json = async <T>(res: Response): Promise<T> => {
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
  return data as T;
};

export const api = {
  getContent: () => fetch('/api/content').then((r) => json<ContentFile>(r)),

  saveContent: (content: ContentFile) =>
    fetch('/api/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content),
    }).then((r) => json<{ ok: true; updatedAt: string }>(r)),

  publishContent: () => fetch('/api/publish/content', { method: 'POST' }).then((r) => json<{ log: string }>(r)),
  publishLex: () => fetch('/api/publish/lex', { method: 'POST' }).then((r) => json<{ log: string }>(r)),
  genUi: () => fetch('/api/gen-ui', { method: 'POST' }).then((r) => json<{ log: string }>(r)),

  unanswered: (days = 7) =>
    fetch(`/api/unanswered?days=${days}`).then((r) =>
      json<{ items: { question: string; count: number; last: number; locale: string }[] }>(r)
    ),
};
