import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Callout,
  Classes,
  Dialog,
  DialogBody,
  DialogFooter,
  Drawer,
  FormGroup,
  InputGroup,
  MenuItem,
  Pre,
} from '@blueprintjs/core';
import { Omnibar, Select } from '@blueprintjs/select';
import type { Entry, Locale } from '@/types';
import { INTENT_ID, suggestIntentId, utterancesOf } from '../lib/entries';

/* -------------------------------------------------------------------------- */
/*                               항목 찾기 (⌘K)                                */
/* -------------------------------------------------------------------------- */

const EntryOmnibarBase = Omnibar<Entry>;

export function EntryOmnibar({
  isOpen,
  entries,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  entries: Entry[];
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <EntryOmnibarBase
      isOpen={isOpen}
      items={entries}
      resetOnSelect
      onClose={onClose}
      inputProps={{ placeholder: '항목 · id · 발화 검색…' }}
      itemPredicate={(query, entry) =>
        [entry.title, entry.id, ...utterancesOf(entry, 'ko'), ...utterancesOf(entry, 'en')]
          .join(' ')
          .toLowerCase()
          .includes(query.toLowerCase())
      }
      itemRenderer={(entry, { handleClick, handleFocus, modifiers }) =>
        modifiers.matchesPredicate ? (
          <MenuItem
            key={entry.id}
            roleStructure="listoption"
            active={modifiers.active}
            icon={entry.kind === 'system' ? 'application' : 'chat'}
            text={entry.title || entry.id}
            label={entry.id}
            onClick={handleClick}
            onFocus={handleFocus}
          />
        ) : null
      }
      noResults={<MenuItem disabled text="맞는 항목이 없어요." roleStructure="listoption" />}
      onItemSelect={(entry) => {
        onSelect(entry.id);
        onClose();
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*                                 새 인텐트                                    */
/* -------------------------------------------------------------------------- */

export function NewEntryDialog({
  isOpen,
  takenIds,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  takenIds: string[];
  onClose: () => void;
  onCreate: (id: string, title: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [id, setId] = useState('');
  const [touchedId, setTouchedId] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setId('');
      setTouchedId(false);
    }
  }, [isOpen]);

  const effectiveId = touchedId ? id : suggestIntentId(title);
  const duplicate = takenIds.includes(effectiveId);
  const validId = INTENT_ID.test(effectiveId);
  const error = !effectiveId
    ? 'id를 입력해주세요. 제목이 한글이면 자동으로 만들어지지 않습니다.'
    : !validId
      ? '영문자로 시작하고 영문·숫자·밑줄만 쓸 수 있어요.'
      : duplicate
        ? '이미 있는 id예요.'
        : null;

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="새 인텐트" icon="add">
      <DialogBody>
        <FormGroup label="제목" helperText="어드민 목록에 보일 이름입니다.">
          <InputGroup
            autoFocus
            value={title}
            placeholder="예: 자주 쓰는 기술"
            onValueChange={(next) => setTitle(next)}
          />
        </FormGroup>

        <FormGroup
          label="Lex 인텐트 이름"
          labelInfo="(id)"
          helperText="Lex에 그대로 등록됩니다. 나중에 바꾸면 기존 대화 로그와 연결이 끊깁니다."
          intent={error ? 'danger' : 'none'}
        >
          <InputGroup
            value={effectiveId}
            intent={error ? 'danger' : 'none'}
            placeholder="예: FavoriteStackIntent"
            onValueChange={(next) => {
              setTouchedId(true);
              setId(next);
            }}
          />
        </FormGroup>

        {error && (
          <Callout intent="danger" compact icon="error">
            {error}
          </Callout>
        )}
      </DialogBody>

      <DialogFooter
        actions={
          <>
            <Button text="취소" onClick={onClose} />
            <Button
              intent="primary"
              icon="add"
              text="만들기"
              disabled={!!error}
              onClick={() => onCreate(effectiveId, title.trim() || effectiveId)}
            />
          </>
        }
      />
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                      미응답 질문 → 인텐트에 발화 추가                         */
/* -------------------------------------------------------------------------- */

const EntrySelect = Select<Entry>;

export function AddUtteranceDialog({
  question,
  locale,
  entries,
  onClose,
  onAdd,
}: {
  question: string | null;
  locale: Locale;
  entries: Entry[];
  onClose: () => void;
  onAdd: (entryId: string, utterance: string) => void;
}) {
  const [target, setTarget] = useState<Entry | null>(null);

  useEffect(() => {
    if (question) setTarget(null);
  }, [question]);

  const intents = entries.filter((entry) => entry.kind === 'intent');

  return (
    <Dialog isOpen={!!question} onClose={onClose} title="인텐트에 발화 추가" icon="chat">
      <DialogBody>
        <Callout compact icon="inbox" style={{ marginBottom: 'var(--sp-3)' }}>
          <strong>{question}</strong>
          <div className={`${Classes.TEXT_MUTED} admin-hint`}>
            {locale} 발화로 추가됩니다. 추가 후 <strong>Lex 발행</strong>을 해야 실제로 반영됩니다.
          </div>
        </Callout>

        <FormGroup label="어느 인텐트가 답해야 하나요?">
          <EntrySelect
            items={intents}
            filterable
            popoverProps={{ matchTargetWidth: true, minimal: true }}
            itemPredicate={(query, entry) =>
              `${entry.title} ${entry.id}`.toLowerCase().includes(query.toLowerCase())
            }
            itemRenderer={(entry, { handleClick, handleFocus, modifiers }) =>
              modifiers.matchesPredicate ? (
                <MenuItem
                  key={entry.id}
                  roleStructure="listoption"
                  active={modifiers.active}
                  text={entry.title || entry.id}
                  label={`발화 ${utterancesOf(entry, locale).length}`}
                  onClick={handleClick}
                  onFocus={handleFocus}
                />
              ) : null
            }
            noResults={<MenuItem disabled text="인텐트가 없어요." roleStructure="listoption" />}
            onItemSelect={setTarget}
          >
            <Button
              fill
              alignText="start"
              endIcon="caret-down"
              text={target ? target.title || target.id : '인텐트 선택…'}
            />
          </EntrySelect>
        </FormGroup>
      </DialogBody>

      <DialogFooter
        actions={
          <>
            <Button text="취소" onClick={onClose} />
            <Button
              intent="primary"
              icon="add"
              text="발화 추가"
              disabled={!target || !question}
              onClick={() => target && question && onAdd(target.id, question)}
            />
          </>
        }
      />
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  삭제 확인                                   */
/* -------------------------------------------------------------------------- */

export function DeleteEntryAlert({
  entry,
  onCancel,
  onConfirm,
}: {
  entry: Entry | null;
  onCancel: () => void;
  onConfirm: (id: string) => void;
}) {
  return (
    <Alert
      isOpen={!!entry}
      intent="danger"
      icon="trash"
      cancelButtonText="취소"
      confirmButtonText="삭제"
      onCancel={onCancel}
      onConfirm={() => entry && onConfirm(entry.id)}
    >
      <p>
        <strong>{entry?.title}</strong> ({entry?.id})를 삭제할까요?
      </p>
      <p className={Classes.TEXT_MUTED} style={{ fontSize: 12 }}>
        되돌리기(⌘Z)로 취소할 수 있고, 저장하기 전까지는 S3에 반영되지 않습니다. 발행한 뒤에는 Lex에서도 해당
        인텐트가 사라집니다.
      </p>
    </Alert>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  실행 로그                                   */
/* -------------------------------------------------------------------------- */

export function LogDrawer({ log, isOpen, onClose }: { log: string; isOpen: boolean; onClose: () => void }) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="실행 로그" icon="console" size="60%" position="bottom">
      <DialogBody>
        <Pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, margin: 0 }}>{log || '아직 실행한 작업이 없어요.'}</Pre>
      </DialogBody>
    </Drawer>
  );
}
