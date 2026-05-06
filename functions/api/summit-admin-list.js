function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
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

function publicFileUrl(request, key) {
  const url = new URL(request.url);
  url.pathname = '/api/summit-admin-file';
  url.search = '';
  url.searchParams.set('key', key);
  return url.pathname + '?' + url.searchParams.toString();
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
  const prefix = url.searchParams.get('prefix') || 'summit/';
  const cursor = url.searchParams.get('cursor') || undefined;
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 500), 1), 1000);

  if (!prefix.startsWith('summit/')) {
    return json({ success: false, error: 'Invalid prefix. Summit admin can only list summit/ objects.' }, 400);
  }

  try {
    const result = await env.GRID_EDIT_UPLOADS.list({ prefix, cursor, limit });
    const objects = (result.objects || []).map((object) => ({
      key: object.key,
      filename: object.key.split('/').pop() || object.key,
      size: object.size || 0,
      uploaded: object.uploaded ? object.uploaded.toISOString() : null,
      etag: object.etag || '',
      httpEtag: object.httpEtag || '',
      url: publicFileUrl(request, object.key)
    }));

    return json({
      success: true,
      prefix,
      objects,
      truncated: !!result.truncated,
      cursor: result.truncated ? result.cursor : null,
      count: objects.length
    });
  } catch (error) {
    return json({ success: false, error: error && error.message ? error.message : 'Failed to list Summit uploads.' }, 500);
  }
}
