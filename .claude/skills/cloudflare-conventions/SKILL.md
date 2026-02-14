---
name: cloudflare-conventions
description: "Cloudflare R2 presigned URLs and Stream signed token patterns. Use when implementing file storage, download endpoints, video streaming, or asset management with Cloudflare services."
user-invocable: false
---

# Cloudflare Conventions

## MANDATORY: Check Context7 First
Before using ANY Cloudflare R2 or Stream API, use the Context7 MCP tool to verify
the current documentation. API signatures and auth patterns change.

## Cloudflare R2 (File Storage)

### Presigned URLs (S3-compatible)
- R2 uses AWS S3-compatible API for presigned URLs
- Presigned URLs are generated client-side using AWS Signature Version 4
- They require R2 API credentials (Access Key ID + Secret Access Key)
- No communication with R2 is needed to generate a presigned URL
- Presigned URLs work with the S3 API domain ONLY (not custom domains)

### URL Generation (Java/Spring)
```java
// Use AWS SDK v2 S3Presigner (R2 is S3-compatible)
// TTL: 15 minutes for downloads
// Bind to requesting IP when possible
```

### R2 Key Structure
```
originals/<assetId>/<filename>           # Clean uploaded file
watermarked/<userId>/<assetId>.pdf       # User-specific watermarked PDF
thumbnails/<productId>/<size>.webp       # Product thumbnails
```

## Cloudflare Stream (Video)

### Signed Tokens (NOT API calls)
- For high-volume token generation, use a **signing key** locally
- Do NOT call the Stream API for each token — generate in your application
- Tokens are JWTs signed with your Stream signing key

### Token Claims
```json
{
  "sub": "<video-uid>",
  "kid": "<key-id>",
  "exp": "<video-duration + 30min buffer>",
  "accessRules": [
    { "type": "ip.src", "ip": ["<user-ip>"] }
  ]
}
```

### Playback
```html
<iframe src="https://customer-{code}.cloudflarestream.com/{uid}?token={token}" />
```

## Rules
- Always set expiration on presigned URLs (15 min for downloads)
- Always use signing keys for Stream tokens (not API calls)
- Log all downloads to `download_logs` table
- Rate limit downloads: max 5/hour/user (Redis counter)
