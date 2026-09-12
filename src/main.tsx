import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { applyHead } from './utils/head';
import { localeFromPath } from './utils/locale';

const queryClient = new QueryClient();

// 경로(/ 또는 /en)에 맞춰 lang·title·canonical·hreflang을 맞춘다
applyHead(localeFromPath(window.location.pathname));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools buttonPosition="top-right" position="top" initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
