# KelbyOne Pages

## Summit photo admin downloader

Admin browser page: `/admin/summit-photos/`

Purpose: list `summit/` uploads from the `GRID_EDIT_UPLOADS` R2 bucket, download individual files, copy download links, or build one browser-side ZIP of all loaded photos.

Security: requires a Cloudflare Pages environment variable named `SUMMIT_ADMIN_TOKEN` (or fallback `ADMIN_TOKEN`). The admin page sends it as a Bearer token to:

- `/api/summit-admin-list`
- `/api/summit-admin-file`

Do not expose the token publicly. The existing public submitter flow is unchanged.


