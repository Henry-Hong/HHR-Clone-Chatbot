/* eslint-disable @typescript-eslint/no-explicit-any */
import { TypeImageResponseCardMessage } from '@/components/customs/Main/Chat/types';
import { useMutation, useQuery } from '@tanstack/react-query';
import { preload } from 'react-dom';

const BASE_URL = 'https://2bs7x43h1j.execute-api.ap-northeast-2.amazonaws.com/v1';

const createOptions = (method: string): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
});

const fetchApi = (method: string, path: string, body?: any) => {
  const options = createOptions(method);
  if (body) {
    options.body = JSON.stringify(body);
  }
  return fetch(BASE_URL + path, options).then((res) => res.json());
};

const apis = {
  get: (path: string) => fetchApi('GET', path),
  delete: (path: string) => fetchApi('DELETE', path),
  post: (path: string, body: any) => fetchApi('POST', path, body),
  put: (path: string, body: any) => fetchApi('PUT', path, body),
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
      const response = await apis.post('', { text });
      if (response?.errorType) throw new Error(response.errorMessage);
      const imageUrls = response?.messages?.map(
        (message: TypeImageResponseCardMessage) => message?.imageResponseCard?.imageUrl
      );
      if (imageUrls) {
        imageUrls.forEach((url: string) => preload(url, { as: 'image' }));
      }
      return response;
    },
  });
};
