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
      <div className="admin-empty">
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
    <div className="admin-scroll admin-pad admin-stack-sm" style={{ flex: 1 }}>
      <div className="admin-row">
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
          /* 클릭하면 해당 항목으로 가는데, 마우스로만 될 이유가 없다 */
          role={issue.entryId ? 'button' : undefined}
          tabIndex={issue.entryId ? 0 : undefined}
          onKeyDown={(event: React.KeyboardEvent) => {
            if (!issue.entryId) return;
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            onSelect(issue.entryId);
          }}
          onClick={() => issue.entryId && onSelect(issue.entryId)}
        >
          <div style={{ fontSize: 12 }}>{issue.message}</div>
          <div className={`${Classes.TEXT_MUTED} admin-hint`}>
            {titleOf(issue.entryId)}
            {issue.locale && ` · ${issue.locale}`}
            {issue.hint && ` · ${issue.hint}`}
          </div>
        </Callout>
      ))}
    </div>
  );
}
