import { TypeImageResponseCardMessage, TypeResponseChat } from '@/types';
import { useMutation, useQuery } from '@tanstack/react-query';
import { preload } from 'react-dom';

const BASE_URL = 'https://2bs7x43h1j.execute-api.ap-northeast-2.amazonaws.com/v1';

const createOptions = (method: string): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
});

const fetchApi = <T>(method: string, path: string, body?: unknown): Promise<T> => {
  const options = createOptions(method);
  if (body) {
    options.body = JSON.stringify(body);
  }
  return fetch(BASE_URL + path, options).then((res) => res.json());
};

const apis = {
  get: <T>(path: string) => fetchApi<T>('GET', path),
  delete: <T>(path: string) => fetchApi<T>('DELETE', path),
  post: <T>(path: string, body: unknown) => fetchApi<T>('POST', path, body),
  put: <T>(path: string, body: unknown) => fetchApi<T>('PUT', path, body),
};

export const useSampleQuery = () => {
  return useQuery({
    queryKey: ['sample'],
    queryFn: () => apis.get('/sample'),
  });
};

export const useChatMutation = () => {
  return useMutation({
    mutationFn: async (text: string) => {
      const response = await apis.post<TypeResponseChat>('', { text });
      if (response?.errorType) throw new Error(response.errorMessage);
      
      const imageUrls = response?.messages?.map((message) => message);

      if (imageUrls) {
        imageUrls.forEach((url: string) => preload(url, { as: 'image' }));
      }
      return response;
    },
  });
};
