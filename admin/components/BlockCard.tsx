import {
  Button,
  ButtonGroup,
  Callout,
  Classes,
  HTMLSelect,
  Icon,
  InputGroup,
  Section,
  SectionCard,
  Tag,
  TextArea,
  Tooltip,
} from '@blueprintjs/core';
import type { Action, Block, GalleryBlock, ImageBlock, TextBlock } from '@/types/content';
import { TYPE_ICON, TYPE_LABEL, summarize } from '../blockFactory';
import { disallowedTags, hasUnbalancedTags } from '../lib/html';
import { uidOf } from '../lib/uid';
import { useDragList } from '../lib/useDragList';
import UtteranceInput from './blocks/UtteranceInput';

/** 블록을 바꾸면서, 연속 입력이면 되돌리기 단계를 묶을 키를 함께 넘긴다. */
type Change = (next: Block, coalesce?: string) => void;

const move = <T,>(list: T[], from: number, to: number): T[] => {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

type Props = {
  block: Block;
  index: number;
  total: number;
  collapsed: boolean;
  ownerOf: (utterance: string) => string | null;
  utteranceSuggestions: string[];
  onToggleCollapse: () => void;
  /** `coalesce`가 있으면 연속 입력이 되돌리기 한 단계로 묶인다. */
  onChange: (next: Block, coalesce?: string) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (delta: number) => void;
  dragHandle: React.HTMLAttributes<HTMLElement> & { draggable?: true };
};

export default function BlockCard({
  block,
  index,
  total,
  collapsed,
  ownerOf,
  utteranceSuggestions,
  onToggleCollapse,
  onChange,
  onRemove,
  onDuplicate,
  onMove,
  dragHandle,
}: Props) {
  return (
    <Section
      compact
      collapsible
      collapseProps={{ isOpen: !collapsed, onToggle: onToggleCollapse }}
      icon={TYPE_ICON[block.type]}
      title={`${index + 1}. ${TYPE_LABEL[block.type]}`}
      subtitle={collapsed ? summarize(block) : undefined}
      rightElement={
        <ButtonGroup variant="minimal" size="small" onClick={(event) => event.stopPropagation()}>
          <Tooltip content="위로" compact>
            <Button icon="chevron-up" disabled={index === 0} onClick={() => onMove(-1)} aria-label="위로" />
          </Tooltip>
          <Tooltip content="아래로" compact>
            <Button icon="chevron-down" disabled={index === total - 1} onClick={() => onMove(1)} aria-label="아래로" />
          </Tooltip>
          <Tooltip content="복제" compact>
            <Button icon="duplicate" onClick={onDuplicate} aria-label="복제" />
          </Tooltip>
          <Tooltip content="삭제" compact>
            <Button icon="trash" intent="danger" onClick={onRemove} aria-label="삭제" />
          </Tooltip>
          <span {...dragHandle} className="admin-block__grip" title="드래그해서 순서 변경">
            <Icon icon="drag-handle-vertical" size={12} style={{ opacity: 0.5, padding: '6px 4px' }} />
          </span>
        </ButtonGroup>
      }
    >
      <SectionCard padded>
        {block.type === 'text' && <TextBody block={block} onChange={onChange} />}
        {block.type === 'image' && <ImageBody block={block} onChange={onChange} />}
        {block.type === 'gallery' && <GalleryBody block={block} onChange={onChange} />}
        {block.type === 'actions' && (
          <ActionsBody
            items={block.items}
            ownerOf={ownerOf}
            suggestions={utteranceSuggestions}
            onChange={(items, coalesce) => onChange({ ...block, items }, coalesce)}
          />
        )}
      </SectionCard>
    </Section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    텍스트                                    */
/* -------------------------------------------------------------------------- */

function TextBody({ block, onChange }: { block: TextBlock; onChange: Change }) {
  const bad = disallowedTags(block.html);
  const unbalanced = hasUnbalancedTags(block.html);
  const variations = block.variations ?? [];

  const setVariations = (next: string[], coalesce?: string) =>
    onChange({ ...block, variations: next.length ? next : undefined }, coalesce);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <TextArea
        fill
        autoResize
        className="admin-mono"
        value={block.html}
        intent={bad.length || unbalanced ? 'danger' : 'none'}
        onChange={(event) => onChange({ ...block, html: event.currentTarget.value }, 'html')}
        style={{ minHeight: 72 }}
      />

      {(bad.length > 0 || unbalanced) && (
        <Callout intent="danger" compact icon="error">
          {bad.length > 0 && <div>허용되지 않은 태그: {bad.map((tag) => `<${tag}>`).join(', ')}</div>}
          {unbalanced && <div>닫히지 않은 태그가 있어요.</div>}
        </Callout>
      )}

      <div className={Classes.TEXT_MUTED} style={{ fontSize: 11 }}>
        허용 태그 {'<p> <br> <b> <strong> <em> <mark> <ul> <ol> <li> <a>'}
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: variations.length ? 6 : 0 }}>
          <Tag minimal icon="comparison">
            변형 {variations.length}
          </Tag>
          <span className={Classes.TEXT_MUTED} style={{ fontSize: 11, flex: 1 }}>
            같은 질문에 매번 다른 문장이 나가게 합니다. 렌더할 때 하나를 무작위로 고릅니다.
          </span>
          <Button
            size="small"
            variant="minimal"
            icon="add"
            text="변형"
            onClick={() => setVariations([...variations, '<p></p>'])}
          />
        </div>

        {variations.map((variation, index) => (
          <div key={index} className="admin-row" style={{ marginTop: 6, alignItems: 'flex-start' }}>
            <TextArea
              fill
              autoResize
              className="admin-mono"
              value={variation}
              onChange={(event) =>
                setVariations(
                  variations.map((item, i) => (i === index ? event.currentTarget.value : item)),
                  `variation${index}`
                )
              }
            />
            <Button
              size="small"
              variant="minimal"
              icon="cross"
              intent="danger"
              aria-label="변형 삭제"
              onClick={() => setVariations(variations.filter((_, i) => i !== index))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    이미지                                    */
/* -------------------------------------------------------------------------- */

const Thumb = ({ src }: { src: string }) =>
  /^https?:\/\//.test(src) ? (
    <img className="admin-thumb" src={src} alt="" loading="lazy" />
  ) : (
    <div className="admin-thumb" style={{ display: 'grid', placeItems: 'center' }}>
      <Icon icon="media" size={14} style={{ opacity: 0.4 }} />
    </div>
  );

function ImageBody({ block, onChange }: { block: ImageBlock; onChange: Change }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <Thumb src={block.src} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <InputGroup
          fill
          leftIcon="link"
          placeholder="이미지 URL (https://)"
          value={block.src}
          onValueChange={(src) => onChange({ ...block, src }, 'src')}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          <InputGroup
            fill
            placeholder="alt (대체 텍스트)"
            value={block.alt ?? ''}
            onValueChange={(alt) => onChange({ ...block, alt: alt || undefined }, 'alt')}
          />
          <InputGroup
            fill
            placeholder="캡션"
            value={block.caption ?? ''}
            onValueChange={(caption) => onChange({ ...block, caption: caption || undefined }, 'caption')}
          />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    갤러리                                    */
/* -------------------------------------------------------------------------- */

function GalleryBody({ block, onChange }: { block: GalleryBlock; onChange: Change }) {
  const images = block.images;
  const drag = useDragList((from, to) => onChange({ ...block, images: move(images, from, to) }));

  const patch = (index: number, next: Partial<GalleryBlock['images'][number]>, coalesce: string) =>
    onChange(
      { ...block, images: images.map((image, i) => (i === index ? { ...image, ...next } : image)) },
      `image${index}:${coalesce}`
    );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {images.map((image, index) => (
        <div key={uidOf(image)} {...drag.zoneProps(index)} className={drag.classFor(index, 'admin-row')}>
          <span {...drag.handleProps(index)} style={{ cursor: 'grab' }} title="드래그해서 순서 변경">
            <Icon icon="drag-handle-vertical" size={12} style={{ opacity: 0.4 }} />
          </span>
          <Thumb src={image.src} />
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <InputGroup
              fill
              placeholder="이미지 URL (https://)"
              value={image.src}
              onValueChange={(src) => patch(index, { src }, 'src')}
            />
          </div>
          <div style={{ flex: '0 1 130px', minWidth: 0 }}>
            <InputGroup
              fill
              placeholder="alt"
              value={image.alt ?? ''}
              onValueChange={(alt) => patch(index, { alt: alt || undefined }, 'alt')}
            />
          </div>
          <Button
            variant="minimal"
            icon="cross"
            intent="danger"
            aria-label="이미지 삭제"
            onClick={() => onChange({ ...block, images: images.filter((_, i) => i !== index) })}
          />
        </div>
      ))}

      <Button
        variant="minimal"
        icon="add"
        text="이미지"
        style={{ alignSelf: 'flex-start' }}
        onClick={() => onChange({ ...block, images: [...images, { src: '' }] })}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                     버튼                                     */
/* -------------------------------------------------------------------------- */

function ActionsBody({
  items,
  ownerOf,
  suggestions,
  onChange,
}: {
  items: Action[];
  ownerOf: (utterance: string) => string | null;
  suggestions: string[];
  onChange: (next: Action[], coalesce?: string) => void;
}) {
  const drag = useDragList((from, to) => onChange(move(items, from, to)));

  const patch = (index: number, next: Action, coalesce?: string) =>
    onChange(
      items.map((item, i) => (i === index ? next : item)),
      coalesce && `action${index}:${coalesce}`
    );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((action, index) => (
        <div key={uidOf(action)} {...drag.zoneProps(index)} className={drag.classFor(index, 'admin-row')}>
          <span {...drag.handleProps(index)} style={{ cursor: 'grab' }} title="드래그해서 순서 변경">
            <Icon icon="drag-handle-vertical" size={12} style={{ opacity: 0.4 }} />
          </span>

          <HTMLSelect
            style={{ width: 86 }}
            value={action.kind}
            onChange={(event) =>
              patch(
                index,
                event.currentTarget.value === 'link'
                  ? { kind: 'link', label: action.label, url: '' }
                  : { kind: 'ask', label: action.label, utterance: '' }
              )
            }
          >
            <option value="ask">질문</option>
            <option value="link">링크</option>
          </HTMLSelect>

          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <InputGroup
              fill
              placeholder="버튼에 보일 라벨"
              value={action.label}
              intent={action.label.trim() ? 'none' : 'danger'}
              onValueChange={(label) => patch(index, { ...action, label }, 'label')}
            />
          </div>

          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            {action.kind === 'ask' ? (
              <UtteranceInput
                value={action.utterance}
                ownerOf={ownerOf}
                suggestions={suggestions}
                onChange={(utterance) => patch(index, { ...action, utterance }, 'utterance')}
              />
            ) : (
              <InputGroup
                fill
                leftIcon="link"
                placeholder="https://"
                value={action.url}
                intent={/^https?:\/\/\S+$/.test(action.url) ? 'none' : 'danger'}
                onValueChange={(url) => patch(index, { ...action, url }, 'url')}
              />
            )}
          </div>

          <Button
            variant="minimal"
            icon="cross"
            intent="danger"
            aria-label="버튼 삭제"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          />
        </div>
      ))}

      <Button
        variant="minimal"
        icon="add"
        text="버튼"
        style={{ alignSelf: 'flex-start' }}
        onClick={() => onChange([...items, { kind: 'ask', label: '', utterance: '' }])}
      />
    </div>
  );
}
