import {
  Alignment,
  Button,
  ButtonGroup,
  Callout,
  Classes,
  Menu,
  MenuDivider,
  MenuItem,
  Navbar,
  NavbarDivider,
  NavbarGroup,
  NavbarHeading,
  Popover,
  Tag,
  Tooltip,
} from '@blueprintjs/core';
import type { ContentFile } from '@/types';
import { fullTime, timeAgo } from '../lib/format';

export type PublishKind = 'content' | 'lex' | 'ui';

type Props = {
  content: ContentFile;
  dirty: boolean;
  busy: string | null;
  errorCount: number;
  warnCount: number;
  canUndo: boolean;
  canRedo: boolean;
  dark: boolean;
  hasLog: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onPublish: (kind: PublishKind) => void;
  onToggleDark: () => void;
  onOpenSearch: () => void;
  onOpenLog: () => void;
  onShowErrors: () => void;
};

const PUBLISH_ACTIONS: { kind: PublishKind; icon: 'cloud-upload' | 'build' | 'code'; text: string; note: string }[] = [
  { kind: 'content', icon: 'cloud-upload', text: '콘텐츠 발행 (즉시)', note: 'S3 업로드 → 챗봇에 바로 반영. Lex는 안 건드림' },
  { kind: 'lex', icon: 'build', text: 'Lex 발행', note: '발화를 고쳤을 때만. import + build로 2~3분' },
  { kind: 'ui', icon: 'code', text: 'UI 문구 반영', note: '인사말·홈·fallback을 프론트 번들에 주입. 재배포 필요' },
];

export default function AppNavbar({
  content,
  dirty,
  busy,
  errorCount,
  warnCount,
  canUndo,
  canRedo,
  dark,
  hasLog,
  onUndo,
  onRedo,
  onSave,
  onPublish,
  onToggleDark,
  onOpenSearch,
  onOpenLog,
  onShowErrors,
}: Props) {
  /** 발행을 막는 이유. 없으면 발행 가능. */
  const blocker = errorCount > 0 ? `오류 ${errorCount}개를 먼저 고쳐주세요.` : dirty ? '먼저 저장해주세요.' : null;

  return (
    <Navbar className="admin-border-b">
      <NavbarGroup align={Alignment.START}>
        <NavbarHeading style={{ fontWeight: 600 }}>HHR Chatbot Admin</NavbarHeading>
        <Tag minimal icon="layers">
          엔트리 {content.entries.length}
        </Tag>
        <NavbarDivider />
        <Tooltip content={`마지막 저장 ${fullTime(content.updatedAt)}`} compact>
          <span className={Classes.TEXT_MUTED} style={{ fontSize: 12 }}>
            {timeAgo(content.updatedAt)}
          </span>
        </Tooltip>
      </NavbarGroup>

      <NavbarGroup align={Alignment.END}>
        {dirty && (
          <Tag minimal intent="warning" icon="asterisk">
            저장 안 됨
          </Tag>
        )}
        {errorCount > 0 && (
          <Tag intent="danger" icon="error" interactive onClick={onShowErrors} style={{ marginLeft: 'var(--sp-2)' }}>
            오류 {errorCount}
          </Tag>
        )}
        {errorCount === 0 && warnCount > 0 && (
          <Tag minimal intent="warning" icon="warning-sign" interactive onClick={onShowErrors} style={{ marginLeft: 'var(--sp-2)' }}>
            경고 {warnCount}
          </Tag>
        )}
        {errorCount === 0 && warnCount === 0 && !dirty && (
          <Tag minimal intent="success" icon="tick-circle">
            이상 없음
          </Tag>
        )}

        <NavbarDivider />

        <ButtonGroup variant="minimal">
          <Tooltip content="되돌리기 ⌘Z" compact>
            <Button icon="undo" disabled={!canUndo} onClick={onUndo} aria-label="되돌리기" />
          </Tooltip>
          <Tooltip content="다시 실행 ⇧⌘Z" compact>
            <Button icon="redo" disabled={!canRedo} onClick={onRedo} aria-label="다시 실행" />
          </Tooltip>
          <Tooltip content="항목 찾기 ⌘K" compact>
            <Button icon="search" onClick={onOpenSearch} aria-label="항목 찾기" />
          </Tooltip>
        </ButtonGroup>

        <NavbarDivider />

        <Tooltip content={dirty ? '저장 ⌘S' : '바뀐 내용이 없어요'} compact>
          <Button
            intent="primary"
            icon="floppy-disk"
            text="저장"
            loading={busy === '저장'}
            disabled={!dirty || !!busy}
            onClick={onSave}
          />
        </Tooltip>

        <Popover
          placement="bottom-end"
          content={
            <Menu>
              <MenuDivider title="S3 · Lex · 프론트" />
              {PUBLISH_ACTIONS.map(({ kind, icon, text, note }) => (
                <MenuItem
                  key={kind}
                  icon={icon}
                  text={text}
                  label={kind === 'lex' ? '느림' : undefined}
                  disabled={!!blocker || !!busy}
                  onClick={() => onPublish(kind)}
                >
                  <MenuItem text={note} disabled />
                </MenuItem>
              ))}
              {blocker && (
                <Callout intent="warning" compact style={{ margin: 'var(--sp-1)', maxWidth: 240 }}>
                  {blocker}
                </Callout>
              )}
            </Menu>
          }
        >
          <Button
            icon="cloud-upload"
            endIcon="caret-down"
            text="발행"
            loading={!!busy && busy !== '저장'}
            disabled={!!busy}
            style={{ marginLeft: 'var(--sp-2)' }}
          />
        </Popover>

        <NavbarDivider />

        {/*
         * 네비게이션 오른쪽 끝 버튼들이라 기본 배치(왼쪽)로 두면 툴팁이 옆의 "발행" 버튼을 덮는다.
         * 아래로 내려서 다른 컨트롤을 가리지 않게 한다.
         */}
        <ButtonGroup variant="minimal">
          <Tooltip content="실행 로그" compact placement="bottom">
            <Button icon="console" disabled={!hasLog} onClick={onOpenLog} aria-label="실행 로그" />
          </Tooltip>
          <Tooltip content={dark ? '밝은 테마로' : '어두운 테마로'} compact placement="bottom-end">
            <Button icon={dark ? 'flash' : 'moon'} onClick={onToggleDark} aria-label="테마 전환" />
          </Tooltip>
        </ButtonGroup>
      </NavbarGroup>
    </Navbar>
  );
}
