const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB per image; avoids Apps Script/base64 upload limits.
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'heic', 'heif']);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function sanitizeFilename(name) {
  return (name || 'upload')
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140) || 'upload';
}

function sanitizeEmail(email) {
  return (email || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9@._-]/g, '_')
    .slice(0, 120) || 'unknown';
}

function extFor(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.GRID_EDIT_UPLOADS) {
    return json({ success: false, error: 'R2 bucket binding GRID_EDIT_UPLOADS is not configured.' }, 500);
  }

  const url = new URL(request.url);
  const originalFilename = sanitizeFilename(url.searchParams.get('filename') || request.headers.get('x-file-name') || 'summit-photo');
  const email = sanitizeEmail(url.searchParams.get('email') || request.headers.get('x-email') || 'unknown');
  const contentType = request.headers.get('content-type') || 'application/octet-stream';
  const contentLength = Number(request.headers.get('content-length') || 0);
  const ext = extFor(originalFilename);

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return json({ success: false, error: `Unsupported file type .${ext || 'unknown'}.` }, 400);
  }

  if (contentLength && contentLength > MAX_UPLOAD_BYTES) {
    return json({ success: false, error: 'File too large. Maximum size is 100 MB.' }, 413);
  }

  if (!request.body) {
    return json({ success: false, error: 'Missing upload body.' }, 400);
  }

  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const id = crypto.randomUUID();
  const key = `summit/${date}/${email}/${id}-${originalFilename}`;

  try {
    await env.GRID_EDIT_UPLOADS.put(key, request.body, {
      httpMetadata: { contentType },
      customMetadata: {
        originalFilename,
        email,
        uploadedAt: now.toISOString(),
        source: 'kelbyone-summit'
      }
    });

    const downloadUrl = `/api/summit-file?key=${encodeURIComponent(key)}`;
    return json({
      success: true,
      key,
      downloadUrl,
      filename: originalFilename,
      size: contentLength || null,
      mimeType: contentType
    });
  } catch (error) {
    return json({ success: false, error: error && error.message ? error.message : 'Upload failed.' }, 500);
  }
}
