import { Callout, Classes, NonIdealState, Tag } from '@blueprintjs/core';
import type { Entry } from '@/types';
import type { Issue } from '../validate';

type Props = {
  issues: Issue[];
  entries: Entry[];
  onSelect: (entryId: string) => void;
};

/** 콘텐츠 전체의 문제를 한 곳에서 본다. 클릭하면 해당 항목으로 이동. */
export default function IssuesPanel({ issues, entries, onSelect }: Props) {
  const titleOf = (id?: string) => entries.find((entry) => entry.id === id)?.title ?? id ?? '전체';

  if (issues.length === 0) {
    return (
      <div style={{ padding: 24 }}>
        <NonIdealState
        icon="tick-circle"
        title="문제 없음"
        description="발행해도 괜찮습니다."
        layout="vertical"
        />
      </div>
    );
  }

  const errors = issues.filter((issue) => issue.level === 'error');
  const warns = issues.filter((issue) => issue.level === 'warn');

  return (
    <div className="admin-scroll" style={{ flex: 1, padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <Tag intent="danger" minimal={errors.length === 0} icon="error">
          오류 {errors.length}
        </Tag>
        <Tag intent="warning" minimal icon="warning-sign">
          경고 {warns.length}
        </Tag>
      </div>

      {[...errors, ...warns].map((issue, index) => (
        <Callout
          key={index}
          compact
          intent={issue.level === 'error' ? 'danger' : 'warning'}
          icon={issue.level === 'error' ? 'error' : 'warning-sign'}
          style={{ cursor: issue.entryId ? 'pointer' : 'default' }}
          onClick={() => issue.entryId && onSelect(issue.entryId)}
        >
          <div style={{ fontSize: 12 }}>{issue.message}</div>
          <div className={Classes.TEXT_MUTED} style={{ fontSize: 11, marginTop: 2 }}>
            {titleOf(issue.entryId)}
            {issue.locale && ` · ${issue.locale}`}
            {issue.hint && ` · ${issue.hint}`}
          </div>
        </Callout>
      ))}
    </div>
  );
}
