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
 * CloudWatch에서 `hit:false` 로그를 모아 빈도순으로 보여준다.
 * = 사람들이 물어봤는데 답을 못 한 질문 목록.
 *
 * 목록만 보여주면 아무것도 안 바뀐다. 각 항목에서 바로 인텐트에 발화를 꽂을 수 있어야
 * "질문을 보고 → 발화를 추가하고 → Lex 발행"이 한 화면에서 끝난다.
 */
export default function UnansweredPanel({ items, error, loading, days, onDays, onRefresh, onAdd }: Props) {
  return (
    <>
      <div className="admin-border-b" style={{ padding: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
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

      <div className="admin-scroll" style={{ flex: 1, padding: 8 }}>
        <Callout compact icon="lightbulb" style={{ marginBottom: 8 }}>
          답을 못 한 질문이에요. 자주 나오는 건 인텐트에 발화로 추가한 뒤 <strong>Lex 발행</strong>을 누르세요.
        </Callout>

        {error && (
          <Callout intent="danger" compact icon="error" title="불러오지 못했어요">
            {error}
            <div className={Classes.TEXT_MUTED} style={{ marginTop: 4, fontSize: 11 }}>
              AWS 자격증명(`AWS_PROFILE`)과 CloudWatch 로그 그룹 권한을 확인하세요.
            </div>
          </Callout>
        )}

        {loading && !items && <Spinner size={24} style={{ marginTop: 24 }} />}

        {items?.length === 0 && (
          <div style={{ padding: '24px 0' }}>
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
            className="admin-border-b"
            style={{ padding: '7px 2px', display: 'flex', gap: 6, alignItems: 'flex-start' }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, wordBreak: 'break-all' }}>{item.question}</div>
              <div className={Classes.TEXT_MUTED} style={{ fontSize: 11, marginTop: 2, display: 'flex', gap: 6 }}>
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
        <div className="admin-border-t" style={{ padding: 8 }}>
          <Tag minimal fill icon="inbox">
            {items.length}종류 · 총 {items.reduce((sum, item) => sum + item.count, 0)}회
          </Tag>
        </div>
      )}
    </>
  );
}
