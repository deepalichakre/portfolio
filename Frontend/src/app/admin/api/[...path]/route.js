// Proxy all /admin/api/* to your Express backend with server-side Basic Auth
export async function handler(req, ctx) {
  const url = new URL(req.url);
  const backendBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

  // ⬇️ await params
  const { path = [] } = await ctx.params;
  const tail = Array.isArray(path) ? path.join('/') : String(path || '');

  const target = `${backendBase}/${tail}${url.search || ''}`;

  // Body only for non-GET/HEAD
  const hasBody = !['GET', 'HEAD'].includes(req.method);
  const bodyText = hasBody ? await req.text() : undefined;

  // Build headers (only set Content-Type if we have a body)
  const headers = new Headers();
  if (hasBody) {
    headers.set('Content-Type', req.headers.get('content-type') || 'application/json');
  }
  // Inject backend Basic Auth from env (server-side only)
  headers.set(
    'Authorization',
    'Basic ' + Buffer.from(`${process.env.BACKEND_ADMIN_USER}:${process.env.BACKEND_ADMIN_PASS}`).toString('base64')
  );

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: bodyText,
  });

  const respBody = await upstream.text();
  // Mirror content-type if available
  const ct = upstream.headers.get('content-type') || 'application/json';
  return new Response(respBody, { status: upstream.status, headers: { 'Content-Type': ct } });
}

// Map all methods
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
