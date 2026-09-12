import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import svgr from 'vite-plugin-svgr';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const ROOT = path.resolve(__dirname);
const CONTENT_PATH = path.join(ROOT, 'content', 'current.json');

const readBody = (req: { on: (e: string, cb: (c?: Buffer) => void) => void }) =>
  new Promise<string>((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => c && chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });

/**
 * 어드민 전용 로컬 API.
 *
 * 혼자 쓰는 도구라 서버를 따로 세우지 않고 vite dev server에 붙인다.
 * localhost 바인딩이므로 인증이 필요 없고, AWS 리소스도 늘지 않는다.
 * 나중에 호스팅이 필요해지면 이 핸들러를 그대로 Lambda로 옮기면 된다.
 */
function adminApi(): Plugin {
  return {
    name: 'hhr-admin-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? '';
        if (!url.startsWith('/api/')) return next();

        const json = (status: number, payload: unknown) => {
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(payload));
        };

        try {
          /* ------------------------------ content ----------------------------- */
          if (url === '/api/content' && req.method === 'GET') {
            if (!fs.existsSync(CONTENT_PATH)) {
              return json(404, { error: 'content/current.json 이 없습니다. S3에서 먼저 받아오세요.' });
            }
            return json(200, JSON.parse(fs.readFileSync(CONTENT_PATH, 'utf8')));
          }

          if (url === '/api/content' && req.method === 'PUT') {
            const body = await readBody(req);
            const parsed = JSON.parse(body);

            /*
             * 파일과 스키마 버전이 다르면 덮어쓰지 않는다.
             * 브라우저에 낡은 어드민이 열려 있는 채로 파일만 새 스키마로 받아온 경우,
             * 그대로 저장하면 어드민이 모르는 항목이 통째로 사라진다.
             * 클라이언트에서도 막지만(admin/lib/schema.ts), 파일을 실제로 쓰는 쪽에서 한 번 더 본다.
             */
            if (fs.existsSync(CONTENT_PATH)) {
              const onDisk = JSON.parse(fs.readFileSync(CONTENT_PATH, 'utf8'));
              if (onDisk.schemaVersion !== parsed.schemaVersion) {
                return json(409, {
                  error:
                    `스키마 버전이 달라서 저장하지 않았습니다. ` +
                    `파일은 ${onDisk.schemaVersion}, 저장하려는 값은 ${parsed.schemaVersion}입니다. ` +
                    `어드민을 새로고침해서 파일을 다시 불러와주세요.`,
                });
              }
            }

            parsed.updatedAt = new Date().toISOString();
            fs.writeFileSync(CONTENT_PATH, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
            return json(200, { ok: true, updatedAt: parsed.updatedAt });
          }

          /* ------------------------------ 발행 -------------------------------- */
          if (url === '/api/publish/content' && req.method === 'POST') {
            const { stdout } = await run('bash', ['scripts/publish-content.sh'], {
              cwd: ROOT,
              env: { ...process.env, CONTENT_BUCKET: process.env.CONTENT_BUCKET ?? 'hhr-chatbot-content' },
            });
            return json(200, { ok: true, log: stdout });
          }

          if (url === '/api/publish/lex' && req.method === 'POST') {
            const { stdout: build } = await run('node', ['scripts/content-to-lex.mjs'], { cwd: ROOT });
            const { stdout: pub } = await run('bash', ['scripts/publish-lex.sh'], {
              cwd: ROOT,
              env: {
                ...process.env,
                LEX_BOT_ID: process.env.LEX_BOT_ID ?? 'QFUOZQHBTO',
                LEX_LOCALES: process.env.LEX_LOCALES ?? 'ko_KR',
              },
            });
            return json(200, { ok: true, log: `${build}\n${pub}` });
          }

          if (url === '/api/gen-ui' && req.method === 'POST') {
            const { stdout } = await run('node', ['scripts/gen-ui-content.mjs'], { cwd: ROOT });
            return json(200, { ok: true, log: stdout });
          }

          /* ------------------------- 미응답 질문 인박스 ------------------------ */
          if (url.startsWith('/api/unanswered') && req.method === 'GET') {
            const days = Number(new URL(url, 'http://x').searchParams.get('days') ?? 7);
            const start = Date.now() - days * 86_400_000;
            const { stdout } = await run(
              'aws',
              [
                '--region', process.env.AWS_REGION ?? 'ap-northeast-2',
                'logs', 'filter-log-events',
                '--log-group-name', '/aws/lambda/hhr-clone-lex-invoke',
                '--start-time', String(start),
                '--filter-pattern', '{ $.evt = "chat" && $.hit IS FALSE }',
                '--query', 'events[].message',
                '--output', 'json',
              ],
              { cwd: ROOT, maxBuffer: 20 * 1024 * 1024 }
            );

            const counts = new Map<string, { count: number; last: number; locale: string }>();
            for (const line of JSON.parse(stdout || '[]') as string[]) {
              const match = line.match(/\{.*\}/);
              if (!match) continue;
              try {
                const event = JSON.parse(match[0]);
                if (!event.q) continue;
                const prev = counts.get(event.q);
                counts.set(event.q, {
                  count: (prev?.count ?? 0) + 1,
                  last: Math.max(prev?.last ?? 0, event.ts ?? 0),
                  locale: event.locale ?? 'ko',
                });
              } catch {
                /* 형식이 다른 로그는 무시 */
              }
            }

            const items = [...counts.entries()]
              .map(([question, meta]) => ({ question, ...meta }))
              .sort((a, b) => b.count - a.count || b.last - a.last);

            return json(200, { items });
          }

          return json(404, { error: 'not found' });
        } catch (error) {
          return json(500, { error: error instanceof Error ? error.message : String(error) });
        }
      });
    },
  };
}

export default defineConfig({
  root: 'admin',
  // 챗봇 컴포넌트를 그대로 재사용하므로 public 자산도 동일한 것을 본다 (아바타 등)
  publicDir: path.resolve(__dirname, 'public'),
  plugins: [react(), tsconfigPaths(), svgr(), adminApi()],
  server: { port: 5174, host: '127.0.0.1' },
});
