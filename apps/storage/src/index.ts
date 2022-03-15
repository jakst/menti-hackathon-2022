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
  let id = env.PRESENTATION.idFromName('A');
  let obj = env.PRESENTATION.get(id);

  return obj.fetch(request.url, request);
}
