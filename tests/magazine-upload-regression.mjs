import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const projectRoot = new URL('../', import.meta.url);
const source = await readFile(new URL('magazine/index.html', projectRoot), 'utf8');
const publicCopy = await readFile(new URL('public/magazine/index.html', projectRoot), 'utf8');
const workerSource = await readFile(new URL('functions/api/magazine-upload.js', projectRoot), 'utf8');

for (const [label, html] of [['source', source], ['public copy', publicCopy]]) {
  assert.doesNotMatch(html, /setRequestHeader\(['"]X-(?:File-Name|Email|Upload-Kind)['"]/, `${label} must not put Unicode metadata in HTTP headers`);
  assert.match(html, /new URLSearchParams\(\{ filename: uploadFilename, email: email, kind: kind \|\| 'image' \}\)/, `${label} must send metadata via URLSearchParams`);
}

assert.match(workerSource, /url\.searchParams\.get\('filename'\) \|\| request\.headers\.get\('x-file-name'\)/, 'worker must prefer the encoded query value while retaining backward compatibility');
assert.match(workerSource, /\.normalize\('NFC'\)/, 'worker must normalize Unicode filenames');
assert.match(workerSource, /\\u0000-\\u001f\\u007f-\\u009f/, 'worker must strip control characters from filenames');

const worker = await import(`data:text/javascript;base64,${Buffer.from(workerSource).toString('base64')}`);

const cases = [
  { filename: 'Milky Way_O\u2019Connor_Moab \u2014 Utah.jpg', email: 'member@example.com', kind: 'image' },
  { filename: '\u661f\u7a7a_\ud83c\udf0c_\u30c6\u30b9\u30c8.heic', email: 'member+magazine@example.com', kind: 'headshot' },
  { filename: 'Caf\u00e9_S\u00e3o Paulo.png', email: 'photo@example.com', kind: 'image' }
];

for (const expected of cases) {
  const params = new URLSearchParams(expected);
  const decoded = Object.fromEntries(new URL(`https://kelbyone.ai/api/magazine-upload?${params}`).searchParams);
  assert.deepEqual(decoded, expected, `query metadata must round-trip for ${expected.filename}`);
}

let storedUpload;
const uploadCase = cases[0];
const uploadUrl = new URL('https://kelbyone.ai/api/magazine-upload');
for (const [key, value] of Object.entries(uploadCase)) uploadUrl.searchParams.set(key, value);
const uploadResponse = await worker.onRequestPost({
  request: new Request(uploadUrl, {
    method: 'POST',
    headers: { 'content-type': 'image/jpeg', 'content-length': '4' },
    body: new Uint8Array([0xff, 0xd8, 0xff, 0xd9])
  }),
  env: {
    GRID_EDIT_UPLOADS: {
      async put(key, body, options) {
        storedUpload = { key, body, options };
      }
    }
  }
});
const uploadResult = await uploadResponse.json();
assert.equal(uploadResponse.status, 200);
assert.equal(uploadResult.success, true);
assert.equal(uploadResult.filename, uploadCase.filename);
assert.match(storedUpload.key, new RegExp(`${uploadCase.filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
assert.equal(storedUpload.options.customMetadata.originalFilename, uploadCase.filename);
assert.equal(storedUpload.options.customMetadata.email, uploadCase.email);
assert.equal(storedUpload.options.customMetadata.kind, uploadCase.kind);

console.log(`Magazine upload regression checks passed (${cases.length} Unicode cases).`);
