import { Env } from './types';
// In order for the workers runtime to find the class that implements
// our Durable Object namespace, we must export it from the root module.
export { Presentation } from './presentation';

export default {
  async fetch(request: Request, env: Env) {
    try {
      return await handleRequest(request, env);
    } catch (e) {
      return new Response(e instanceof Error ? e.message : 'Unknown error');
    }
  },
};

async function handleRequest(request: Request, env: Env) {
  const id = env.PRESENTATION.idFromName('A');
  const obj = env.PRESENTATION.get(id);

  const url = new URL(request.url);

  if (url.pathname === '/user-region') {
    const { city, country } = request.cf!;
    return new Response(JSON.stringify({ city, country }, null, 2), {
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  return obj.fetch(request.url, request);
}
