/**
 * CloudFront Function (viewer request) — 루트로 온 방문자를 언어에 맞춰 보낸다.
 *
 *   /      + Accept-Language 가 한국어 우선   → 그대로 (한국어 화면)
 *   /      + 그 외                            → 302 /en
 *   /en    + 무엇이든                         → 그대로
 *
 * ── 캐시를 건드리지 않는 이유 ──────────────────────────────────────────────
 * viewer request 함수는 캐시 조회 **전에** 돌고, 함수가 응답 객체를 돌려주면
 * CloudFront는 캐시도 오리진도 보지 않고 그대로 내보낸다.
 * 그래서 Accept-Language 를 캐시 키에 넣을 필요가 없다.
 *
 * 같은 URL에 헤더 따라 다른 **본문**을 서빙했다면 이야기가 달랐다.
 * 그때는 캐시 키에 헤더를 넣어야 하고, 안 넣으면 첫 방문자의 언어가 캐시돼
 * 모두에게 나간다. 여기서는 본문을 바꾸지 않고 리다이렉트만 하므로 그 문제가 없다.
 *
 * ── 검색 노출 ──────────────────────────────────────────────────────────────
 * `/en` 은 절대 리다이렉트하지 않는다. 그리고 Accept-Language 가 아예 없으면
 * 그대로 통과시킨다 — 크롤러는 대개 이 헤더를 보내지 않으므로 `/`(한국어)를 보고,
 * `/en` 은 hreflang 링크로 따로 찾아간다. 두 버전이 모두 색인된다.
 *
 * ── 되돌아가기 ─────────────────────────────────────────────────────────────
 * `/?lang=ko` 처럼 lang 쿼리가 붙어 있으면 판정하지 않고 통과시킨다.
 * 영어권 방문자도 한국어 화면을 볼 수 있어야 한다.
 *
 * 런타임 1.0(ES5.1)에서도 돌도록 var / function 만 쓴다.
 * 배포 방법은 같은 폴더의 README.md 참고.
 */

function parseAcceptLanguage(value) {
  var entries = [];
  var parts = String(value || '').split(',');

  for (var i = 0; i < parts.length; i++) {
    var part = parts[i].trim();
    if (!part) continue;

    var bits = part.split(';');
    var tag = bits[0].trim().toLowerCase();
    if (!tag || tag === '*') continue;

    var q = 1;
    for (var j = 1; j < bits.length; j++) {
      var kv = bits[j].split('=');
      if (kv[0] && kv[0].trim() === 'q') {
        var parsed = parseFloat(kv[1]);
        if (!isNaN(parsed)) q = parsed;
      }
    }

    entries.push({ lang: tag.split('-')[0], q: q });
  }

  return entries;
}

/**
 * 한국어를 (공동) 1순위로 원하는가.
 *
 * 헤더가 없거나 비어 있으면 true — 기본 화면은 한국어이고,
 * 헤더를 안 보내는 쪽은 대부분 크롤러다.
 * 한국어도 영어도 없는 경우(예: 일본어)는 false — 영어 화면이 더 읽기 쉽다.
 */
function prefersKorean(value) {
  var entries = parseAcceptLanguage(value);
  if (!entries.length) return true;

  var best = 0;
  var korean = -1;

  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    if (entry.q <= 0) continue; // q=0 은 "이 언어는 원하지 않음"
    if (entry.q > best) best = entry.q;
    if (entry.lang === 'ko' && entry.q > korean) korean = entry.q;
  }

  return korean >= best;
}

function handler(event) {
  var request = event.request;

  // 루트만 판정한다. /en 은 언제나 그대로 — 직접 접근과 색인이 가능해야 한다.
  if (request.uri !== '/' && request.uri !== '/index.html') return request;

  // 사용자가 언어를 직접 지정했으면 존중한다 (/?lang=ko)
  if (request.querystring && request.querystring.lang) return request;

  var header = request.headers['accept-language'];
  if (prefersKorean(header ? header.value : '')) return request;

  return {
    statusCode: 302,
    statusDescription: 'Found',
    headers: {
      location: { value: '/en' },
      // 이 URL의 응답이 요청 헤더에 따라 달라진다는 것을 중간 캐시에 알린다
      vary: { value: 'Accept-Language' },
      // 브라우저가 리다이렉트를 붙잡고 있으면 언어를 바꿔도 벗어나지 못한다
      'cache-control': { value: 'no-cache' },
    },
  };
}
