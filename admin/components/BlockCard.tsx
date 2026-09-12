import {
  Button,
  ButtonGroup,
  Classes,
  HTMLSelect,
  Icon,
  InputGroup,
  Section,
  SectionCard,
  Tag,
  Tooltip,
} from '@blueprintjs/core';
import type { Action, Block, GalleryBlock, ImageBlock, TextBlock } from '@/types/content';
import { TYPE_ICON, TYPE_LABEL, summarize } from '../blockFactory';
import { uidOf } from '../lib/uid';
import { useDragList } from '../lib/useDragList';
import HtmlEditor from './blocks/HtmlEditor';
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
            <Icon icon="drag-handle-vertical" size={12} />
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
/*                                    변형                                      */
/* -------------------------------------------------------------------------- */

/**
 * 같은 질문에 매번 다른 답이 나가게 하는 후보 목록.
 * 렌더 시점에 원본 + 변형 중 하나를 무작위로 고른다 (lambda의 resolveBlock).
 */
function VariationHeader({ count, onAdd }: { count: number; onAdd: () => void }) {
  return (
    <div className="admin-inline">
      <Tag minimal icon="comparison">
        변형 {count}
      </Tag>
      <span className={`${Classes.TEXT_MUTED} admin-hint`} style={{ flex: 1 }}>
        같은 질문에 매번 다른 답이 나가게 합니다. 답할 때 원본 포함 하나를 무작위로 고릅니다.
      </span>
      <Button size="small" variant="minimal" icon="add" text="변형" onClick={onAdd} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                    텍스트                                    */
/* -------------------------------------------------------------------------- */

function TextBody({ block, onChange }: { block: TextBlock; onChange: Change }) {
  const variations = block.variations ?? [];

  const setVariations = (next: string[], coalesce?: string) =>
    onChange({ ...block, variations: next.length ? next : undefined }, coalesce);

  return (
    <div className="admin-stack-sm">
      <HtmlEditor
        value={block.html}
        coalesceKey="html"
        onChange={(html, coalesce) => onChange({ ...block, html }, coalesce)}
      />

      <VariationHeader count={variations.length} onAdd={() => setVariations([...variations, '<p></p>'])} />

      {variations.map((variation, index) => (
        <div key={index} className="admin-row admin-row--top">
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <HtmlEditor
              value={variation}
              coalesceKey={`variation${index}`}
              onChange={(html, coalesce) =>
                setVariations(
                  variations.map((item, i) => (i === index ? html : item)),
                  coalesce
                )
              }
            />
          </div>
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
  );
}

/* -------------------------------------------------------------------------- */
/*                                    이미지                                    */
/* -------------------------------------------------------------------------- */

const Thumb = ({ src }: { src: string }) =>
  /^https?:\/\//.test(src) ? (
    <img className="admin-thumb" src={src} alt="" loading="lazy" />
  ) : (
    <div className="admin-thumb admin-thumb--empty">
      <Icon icon="media" size={14} />
    </div>
  );

type ImageFieldValues = { src: string; alt?: string; caption?: string };

/** 원본 이미지와 변형 이미지가 같은 칸을 쓴다. */
function ImageFields({
  value,
  onChange,
}: {
  value: ImageFieldValues;
  onChange: (next: ImageFieldValues, coalesce: string) => void;
}) {
  return (
    <div className="admin-row admin-row--top">
      <Thumb src={value.src} />
      <div className="admin-stack-xs" style={{ flex: 1, minWidth: 0 }}>
        <InputGroup
          fill
          leftIcon="link"
          placeholder="이미지 URL (https://)"
          value={value.src}
          intent={/^https?:\/\/\S+$/.test(value.src) ? 'none' : 'danger'}
          onValueChange={(src) => onChange({ ...value, src }, 'src')}
        />
        <div className="admin-row">
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <InputGroup
              fill
              placeholder="alt (대체 텍스트)"
              value={value.alt ?? ''}
              onValueChange={(alt) => onChange({ ...value, alt: alt || undefined }, 'alt')}
            />
          </div>
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <InputGroup
              fill
              placeholder="캡션"
              value={value.caption ?? ''}
              onValueChange={(caption) => onChange({ ...value, caption: caption || undefined }, 'caption')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageBody({ block, onChange }: { block: ImageBlock; onChange: Change }) {
  const variations = block.variations ?? [];

  const setVariations = (next: ImageFieldValues[], coalesce?: string) =>
    onChange({ ...block, variations: next.length ? next : undefined }, coalesce);

  return (
    <div className="admin-stack-sm">
      <ImageFields
        value={{ src: block.src, alt: block.alt, caption: block.caption }}
        onChange={(next, coalesce) => onChange({ ...block, ...next }, coalesce)}
      />

      <VariationHeader count={variations.length} onAdd={() => setVariations([...variations, { src: '' }])} />

      {variations.map((variation, index) => (
        <div key={index} className="admin-row admin-row--top">
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <ImageFields
              value={variation}
              onChange={(next, coalesce) =>
                setVariations(
                  variations.map((item, i) => (i === index ? next : item)),
                  `variation${index}:${coalesce}`
                )
              }
            />
          </div>
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
    <div className="admin-stack-sm">
      {images.map((image, index) => (
        <div key={uidOf(image)} {...drag.zoneProps(index)} className={drag.classFor(index, 'admin-row')}>
          <span {...drag.handleProps(index)} className="admin-block__grip" title="드래그해서 순서 변경">
            <Icon icon="drag-handle-vertical" size={12} />
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
    <div className="admin-stack-sm">
      {items.map((action, index) => (
        <div key={uidOf(action)} {...drag.zoneProps(index)} className={drag.classFor(index, 'admin-row')}>
          <span {...drag.handleProps(index)} className="admin-block__grip" title="드래그해서 순서 변경">
            <Icon icon="drag-handle-vertical" size={12} />
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
