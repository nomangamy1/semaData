export async function onRequest({ request, env }) {
  if (!env.API_ORIGIN) {
    return new Response('API_ORIGIN is not configured.', { status: 503 });
  }

  const apiOrigin = new URL(env.API_ORIGIN);
  if (
    apiOrigin.protocol !== 'https:' ||
    apiOrigin.pathname !== '/' ||
    apiOrigin.search ||
    apiOrigin.hash ||
    apiOrigin.username ||
    apiOrigin.password
  ) {
    return new Response('API_ORIGIN must be an HTTPS origin without a path.', {
      status: 500,
    });
  }

  const destination = new URL(request.url);
  destination.protocol = apiOrigin.protocol;
  destination.host = apiOrigin.host;

  return fetch(new Request(destination, request));
}
