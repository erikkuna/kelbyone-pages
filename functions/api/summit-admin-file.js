function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function isAuthorized(request, env) {
  const configuredToken = env.SUMMIT_ADMIN_TOKEN || env.ADMIN_TOKEN || '';
  if (!configuredToken) {
    return { ok: false, status: 500, error: 'Admin token is not configured. Add SUMMIT_ADMIN_TOKEN in Cloudflare Pages environment variables.' };
  }

  const header = request.headers.get('authorization') || '';
  const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token') || '';
  const suppliedToken = bearer || queryToken;

  if (!suppliedToken || suppliedToken !== configuredToken) {
    return { ok: false, status: 401, error: 'Unauthorized.' };
  }

  return { ok: true };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.GRID_EDIT_UPLOADS) {
    return json({ success: false, error: 'R2 bucket binding GRID_EDIT_UPLOADS is not configured.' }, 500);
  }

  const auth = isAuthorized(request, env);
  if (!auth.ok) return json({ success: false, error: auth.error }, auth.status);

  const url = new URL(request.url);
  const key = url.searchParams.get('key');

  if (!key || !key.startsWith('summit/')) {
    return json({ success: false, error: 'Missing or invalid file key.' }, 400);
  }

  const object = await env.GRID_EDIT_UPLOADS.get(key);
  if (!object) {
    return json({ success: false, error: 'File not found.' }, 404);
  }

  const filename = key.split('/').pop() || 'summit-photo';
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'private, no-store');
  headers.set('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);

  return new Response(object.body, { headers });
}
