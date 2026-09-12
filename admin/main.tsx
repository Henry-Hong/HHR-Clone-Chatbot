import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BlueprintProvider } from '@blueprintjs/core';
import App from './App';

/*
 * CSS 순서가 중요하다.
 *
 * 미리보기는 챗봇 컴포넌트를 그대로 재사용하므로 Tailwind가 필요한데,
 * Tailwind의 preflight는 button·ul·h1 같은 기본 요소를 전부 리셋한다.
 * Blueprint를 뒤에 실어야 .bp6-* 컴포넌트가 리셋에 먹히지 않는다.
 * (챗봇 쪽은 .bp6-* 클래스를 쓰지 않으므로 반대 방향 충돌은 없다.)
 */
import '@/index.css';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import '@blueprintjs/select/lib/css/blueprint-select.css';
import './admin.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BlueprintProvider>
      <App />
    </BlueprintProvider>
  </StrictMode>
);
