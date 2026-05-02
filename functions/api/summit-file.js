function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.GRID_EDIT_UPLOADS) {
    return json({ success: false, error: 'R2 bucket binding GRID_EDIT_UPLOADS is not configured.' }, 500);
  }

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
  headers.set('cache-control', 'private, max-age=3600');
  headers.set('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);

  return new Response(object.body, { headers });
}
