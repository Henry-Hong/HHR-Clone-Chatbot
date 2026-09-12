import type { Action, Block } from '@/types';
import { TYPE_LABEL } from './blockFactory';

const CARD = 'border border-gray-200 rounded-lg bg-white p-3';
const LABEL = 'text-[11px] font-semibold text-gray-400 uppercase tracking-wide';
const INPUT =
  'w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-400 transition-colors';
const MINI = 'text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 transition-colors';

/* -------------------------------------------------------------------------- */

function ActionRow({
  action,
  onChange,
  onRemove,
}: {
  action: Action;
  onChange: (next: Action) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex gap-1.5 items-center">
      <select
        className={`${INPUT} w-[76px] shrink-0`}
        value={action.kind}
        onChange={(e) =>
          onChange(
            e.target.value === 'link'
              ? { kind: 'link', label: action.label, url: '' }
              : { kind: 'ask', label: action.label, utterance: '' }
          )
        }
      >
        <option value="ask">질문</option>
        <option value="link">링크</option>
      </select>
      <input
        className={INPUT}
        placeholder="버튼에 표시할 라벨"
        value={action.label}
        onChange={(e) => onChange({ ...action, label: e.target.value })}
      />
      {action.kind === 'ask' ? (
        <input
          className={INPUT}
          placeholder="보낼 발화 (인텐트에 등록돼 있어야 함)"
          value={action.utterance}
          onChange={(e) => onChange({ ...action, utterance: e.target.value })}
        />
      ) : (
        <input
          className={INPUT}
          placeholder="https://"
          value={action.url}
          onChange={(e) => onChange({ ...action, url: e.target.value })}
        />
      )}
      <button type="button" className={`${MINI} shrink-0 text-red-500`} onClick={onRemove}>
        삭제
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export default function BlockEditor({
  block,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  block: Block;
  index: number;
  total: number;
  onChange: (next: Block) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className={CARD}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-blue-500">
          {index + 1}. {TYPE_LABEL[block.type]}
        </span>
        <div className="flex gap-1">
          <button type="button" className={MINI} disabled={index === 0} onClick={() => onMove(-1)}>
            ↑
          </button>
          <button type="button" className={MINI} disabled={index === total - 1} onClick={() => onMove(1)}>
            ↓
          </button>
          <button type="button" className={`${MINI} text-red-500`} onClick={onRemove}>
            삭제
          </button>
        </div>
      </div>

      {block.type === 'text' && (
        <div className="flex flex-col gap-1">
          <span className={LABEL}>HTML</span>
          <textarea
            className={`${INPUT} font-mono text-xs leading-relaxed`}
            rows={Math.min(12, Math.max(3, block.html.split('<p>').length + 1))}
            value={block.html}
            onChange={(e) => onChange({ ...block, html: e.target.value })}
          />
          <span className="text-[11px] text-gray-400">
            허용 태그: {'<p> <br> <b> <strong> <em> <mark> <ul> <li>'}
          </span>
        </div>
      )}

      {block.type === 'image' && (
        <div className="flex flex-col gap-2">
          <input
            className={INPUT}
            placeholder="이미지 URL"
            value={block.src}
            onChange={(e) => onChange({ ...block, src: e.target.value })}
          />
          <div className="flex gap-2">
            <input
              className={INPUT}
              placeholder="alt (대체 텍스트)"
              value={block.alt ?? ''}
              onChange={(e) => onChange({ ...block, alt: e.target.value || undefined })}
            />
            <input
              className={INPUT}
              placeholder="캡션"
              value={block.caption ?? ''}
              onChange={(e) => onChange({ ...block, caption: e.target.value || undefined })}
            />
          </div>
        </div>
      )}

      {block.type === 'gallery' && (
        <div className="flex flex-col gap-1.5">
          {block.images.map((image, i) => (
            <div key={i} className="flex gap-1.5">
              <input
                className={INPUT}
                placeholder="이미지 URL"
                value={image.src}
                onChange={(e) => {
                  const images = [...block.images];
                  images[i] = { ...images[i], src: e.target.value };
                  onChange({ ...block, images });
                }}
              />
              <input
                className={`${INPUT} w-[160px]`}
                placeholder="alt"
                value={image.alt ?? ''}
                onChange={(e) => {
                  const images = [...block.images];
                  images[i] = { ...images[i], alt: e.target.value || undefined };
                  onChange({ ...block, images });
                }}
              />
              <button
                type="button"
                className={`${MINI} shrink-0 text-red-500`}
                onClick={() => onChange({ ...block, images: block.images.filter((_, x) => x !== i) })}
              >
                삭제
              </button>
            </div>
          ))}
          <button
            type="button"
            className={`${MINI} self-start`}
            onClick={() => onChange({ ...block, images: [...block.images, { src: '' }] })}
          >
            + 이미지
          </button>
        </div>
      )}

      {block.type === 'actions' && (
        <div className="flex flex-col gap-1.5">
          {block.items.map((action, i) => (
            <ActionRow
              key={i}
              action={action}
              onChange={(next) => {
                const items = [...block.items];
                items[i] = next;
                onChange({ ...block, items });
              }}
              onRemove={() => onChange({ ...block, items: block.items.filter((_, x) => x !== i) })}
            />
          ))}
          <button
            type="button"
            className={`${MINI} self-start`}
            onClick={() =>
              onChange({ ...block, items: [...block.items, { kind: 'ask', label: '', utterance: '' }] })
            }
          >
            + 버튼
          </button>
        </div>
      )}
    </div>
  );
}
