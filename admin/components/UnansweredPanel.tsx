import {
  Button,
  ButtonGroup,
  Callout,
  Classes,
  HTMLSelect,
  Icon,
  NonIdealState,
  Spinner,
  Tag,
  Tooltip,
} from '@blueprintjs/core';
import type { UnansweredItem } from '../api';
import { timeAgo } from '../lib/format';

type Props = {
  items: UnansweredItem[] | null;
  error: string | null;
  loading: boolean;
  days: number;
  onDays: (days: number) => void;
  onRefresh: () => void;
  onAdd: (item: UnansweredItem) => void;
};

const DAY_OPTIONS = [
  { value: 1, label: '최근 1일' },
  { value: 7, label: '최근 7일' },
  { value: 30, label: '최근 30일' },
];

/**
 * 서버가 던진 문자열을 그대로 보여주면 "spawn aws ENOENT" 같은 게 뜼다.
 * 어드민을 여는 입장에선 원인보다 "뭐를 해야 하는지"가 먼저다.
 */
const explain = (error: string): { title: string; body: string } => {
  if (/ENOENT|not found|command not found/i.test(error)) {
    return {
      title: 'AWS CLI를 찾지 못했어요',
      body: '미응답 목록은 CloudWatch 로그를 읽어오므로 aws CLI가 설치돼 있어야 합니다. 설치 후 어드민을 다시 실행해주세요.',
    };
  }
  if (/credential|ExpiredToken|AccessDenied|UnrecognizedClient|not authorized/i.test(error)) {
    return {
      title: 'AWS 권한이 모자라요',
      body: 'AWS_PROFILE이 맞는지, 그리고 해당 프로필에 CloudWatch 로그 그룹 읽기 권한이 있는지 확인해주세요.',
    };
  }
  if (/ResourceNotFound|log group/i.test(error)) {
    return {
      title: '로그 그룹이 없어요',
      body: '챗봇 Lambda가 아직 한 번도 안 돌았거나 로그 그룹 이름이 바뀌었을 수 있습니다.',
    };
  }
  return {
    title: '불러오지 못했어요',
    body: '잠시 뒤에 다시 불러오거나, 아래 원문 오류를 확인해주세요.',
  };
};

/**
 * CloudWatch에서 `hit:false` 로그를 모아 빈도순으로 보여준다.
 * = 사람들이 물어봤는데 답을 못 한 질문 목록.
 *
 * 목록만 보여주면 아무것도 안 바뀐다. 각 항목에서 바로 인텐트에 발화를 꽂을 수 있어야
 * "질문을 보고 → 발화를 추가하고 → Lex 발행"이 한 화면에서 끝난다.
 */
export default function UnansweredPanel({ items, error, loading, days, onDays, onRefresh, onAdd }: Props) {
  return (
    <>
      <div className="admin-border-b admin-pad admin-row">
        <HTMLSelect
          fill
          value={days}
          options={DAY_OPTIONS}
          onChange={(event) => onDays(Number(event.currentTarget.value))}
        />
        <Tooltip content="다시 불러오기" compact>
          <Button icon="refresh" loading={loading} onClick={onRefresh} aria-label="다시 불러오기" />
        </Tooltip>
      </div>

      <div className="admin-scroll admin-pad admin-stack-sm" style={{ flex: 1 }}>
        <Callout compact icon="lightbulb">
          답을 못 한 질문이에요. 자주 나오는 건 인텐트에 발화로 추가한 뒤 <strong>Lex 발행</strong>을 누르세요.
        </Callout>

        {error && (
          <Callout intent="danger" compact icon="error" title={explain(error).title}>
            <div>{explain(error).body}</div>
            {/*
             * 원문은 접어둔다. "spawn aws ENOENT" 같은 걸 본문으로 깔아두면
             * 뭐를 해야 하는지는 안 보이고 화면만 시끄러워진다.
             */}
            <details className={`${Classes.TEXT_MUTED} admin-hint`} style={{ marginTop: 'var(--sp-1)' }}>
              <summary style={{ cursor: 'pointer' }}>원문 오류</summary>
              <code style={{ wordBreak: 'break-all' }}>{error}</code>
            </details>
          </Callout>
        )}

        {loading && !items && <Spinner size={24} style={{ marginTop: 'var(--sp-6)' }} />}

        {items?.length === 0 && (
          <div className="admin-empty">
            <NonIdealState
            icon="tick-circle"
            title="못 답한 질문이 없어요"
            description="이 기간 동안 모든 질문이 인텐트에 매칭됐습니다."
            layout="vertical"
            />
          </div>
        )}

        {items?.map((item) => (
          <div
            key={`${item.question}-${item.locale}`}
            className="admin-border-b admin-row admin-row--top"
            style={{ paddingBottom: 'var(--sp-2)' }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, wordBreak: 'break-all' }}>{item.question}</div>
              <div className={`${Classes.TEXT_MUTED} admin-hint admin-inline`}>
                <span>
                  <Icon icon="repeat" size={10} /> {item.count}회
                </span>
                <span>{item.locale}</span>
                {item.last > 0 && <span>{timeAgo(new Date(item.last).toISOString())}</span>}
              </div>
            </div>
            <ButtonGroup variant="minimal">
              <Tooltip content="이 질문을 인텐트의 발화로 추가" compact>
                <Button icon="add" onClick={() => onAdd(item)} aria-label="인텐트에 추가" />
              </Tooltip>
            </ButtonGroup>
          </div>
        ))}
      </div>

      {items && items.length > 0 && (
        <div className="admin-border-t admin-pad">
          <Tag minimal fill icon="inbox">
            {items.length}종류 · 총 {items.reduce((sum, item) => sum + item.count, 0)}회
          </Tag>
        </div>
      )}
    </>
  );
}
