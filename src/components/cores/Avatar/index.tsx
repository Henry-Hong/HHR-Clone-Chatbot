// public/ 자산은 번들 대상이 아니므로 URL로 참조한다.
// (import로 쓰면 vite root가 다른 어드민 앱에서 해석이 깨진다)
const DefaultImg = '/img_hhr.jpeg';

export default function Avatar({ src, alt }: { src?: string; alt?: string }) {
  const _src = src || DefaultImg;
  const _alt = alt || 'avatar';
  return (
    <div className="w-[42px] flex-shrink-0 aspect-square rounded-full border-2 overflow-hidden ">
      <img src={_src} alt={_alt} className="w-full h-full" />
    </div>
  );
}
