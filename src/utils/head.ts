import type { Locale } from '@/types';
import { pathForLocale } from './locale';

/**
 * 경로에 맞게 <head>를 맞춘다.
 *
 * 같은 번들을 `/`(한국어)와 `/en`(영어) 두 경로로 서빙하므로,
 * 어느 쪽으로 들어왔는지에 따라 lang·canonical·hreflang이 달라야 한다.
 *
 * 정적 HTML에 박아두지 않고 여기서 넣는 이유는 도메인 때문이다.
 * 배포 도메인을 코드에 적어두면 프리뷰·로컬에서 엉뚱한 URL을 가리키게 된다.
 * `location.origin`을 쓰면 어디에 올려도 맞는다.
 */

const TITLE: Record<Locale, string> = {
  ko: '홍희림 | Frontend',
  en: 'Heerim Hong | Frontend',
};

const DESCRIPTION: Record<Locale, string> = {
  ko: '프론트엔드 엔지니어 홍희림입니다. 궁금한 점을 물어보세요.',
  en: "I'm Heerim Hong, a frontend engineer. Ask me anything.",
};

const LOCALES: Locale[] = ['ko', 'en'];

const upsertLink = (rel: string, hreflang: string | null, href: string) => {
  const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]:not([hreflang])`;
  const link = document.head.querySelector<HTMLLinkElement>(selector) ?? document.createElement('link');
  link.rel = rel;
  if (hreflang) link.hreflang = hreflang;
  link.href = href;
  if (!link.isConnected) document.head.appendChild(link);
};

const upsertMeta = (name: string, content: string) => {
  const meta =
    document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`) ?? document.createElement('meta');
  meta.name = name;
  meta.content = content;
  if (!meta.isConnected) document.head.appendChild(meta);
};

export const applyHead = (locale: Locale, origin: string = window.location.origin) => {
  document.documentElement.lang = locale;
  document.title = TITLE[locale];
  upsertMeta('description', DESCRIPTION[locale]);

  upsertLink('canonical', null, `${origin}${pathForLocale(locale)}`);
  for (const other of LOCALES) upsertLink('alternate', other, `${origin}${pathForLocale(other)}`);
  upsertLink('alternate', 'x-default', `${origin}${pathForLocale('ko')}`);
};
