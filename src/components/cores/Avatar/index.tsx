import DefaultImg from '/img_space.jpeg';

export default function Avatar({ src, alt }: { src?: string; alt?: string }) {
  const _src = src || DefaultImg;
  const _alt = alt || 'avatar';
  return (
    <div className="w-[42px] flex-shrink-0 aspect-square rounded-full border-2 overflow-hidden hover:rotate-180 transition-all ">
      <img src={_src} alt={_alt} className="w-full h-full" />
    </div>
  );
}
