# 🔑 Key System

A self-hosted license key management system with HWID locking, expiration dates, and a clean dashboard.

## Architecture

- **API**: Hosted on Vercel (public validation endpoint + protected admin endpoints)
- **Dashboard**: Runs locally (localhost:3000) — no public exposure
- **Database**: Upstash Redis (free tier)

## Features

- **Multiple Software Products**: Organize keys by software in tabs
- **Key Generation**: Random XXXX-XXXX-XXXX-XXXX format
- **Expiration Dates**: Optional, keys can expire
- **HWID Locking**: Bind keys to a single device on first use
- **Enable/Disable**: Toggle keys without deleting
- **Reset HWID**: Allow key to rebind to a new device
- **Usage Tracking**: See how many times each key has been validated

## Setup

### 1. Create Upstash Redis Database

1. Go to [upstash.com](https://upstash.com) and create a free account
2. Create a new Redis database
3. Copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
UPSTASH_REDIS_REST_URL=https://your-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
ADMIN_SECRET=generate-a-strong-random-string
```

Generate a strong admin secret:
```bash
openssl rand -hex 32
```

### 3. Deploy API to Vercel

```bash
npm i -g vercel
vercel
```

Add environment variables in Vercel dashboard:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `ADMIN_SECRET`

### 4. Run Dashboard Locally

```bash
npm run dev
```

Open http://localhost:3000 and enter your `ADMIN_SECRET` to log in.

## API Usage

### Public: Validate Key

```bash
POST https://your-app.vercel.app/api/validate
Content-Type: application/json

{
  "key": "XXXX-XXXX-XXXX-XXXX",
  "hwid": "optional-hardware-id"
}
```

Response:
```json
{
  "valid": true,
  "expiresAt": 1735689600000,
  "software": "My App"
}
```

Or if invalid:
```json
{
  "valid": false,
  "error": "Key has expired"
}
```

### Integration Example (C#)

```csharp
public async Task<bool> ValidateLicense(string key)
{
    var hwid = GetHardwareId(); // Your HWID generation logic
    
    var response = await httpClient.PostAsJsonAsync(
        "https://your-app.vercel.app/api/validate",
        new { key, hwid }
    );
    
    var result = await response.Content.ReadFromJsonAsync<ValidateResponse>();
    return result?.Valid ?? false;
}
```

### Integration Example (Python)

```python
import requests
import hashlib
import uuid

def get_hwid():
    return hashlib.sha256(str(uuid.getnode()).encode()).hexdigest()

def validate_key(key: str) -> bool:
    response = requests.post(
        "https://your-app.vercel.app/api/validate",
        json={"key": key, "hwid": get_hwid()}
    )
    return response.json().get("valid", False)
```

## Admin API

All admin endpoints require `Authorization: Bearer YOUR_ADMIN_SECRET` header.

### Software
- `GET /api/admin/software` - List all software
- `POST /api/admin/software` - Create software `{ "name": "...", "description": "..." }`
- `DELETE /api/admin/software` - Delete software `{ "id": "..." }`

### Keys
- `GET /api/admin/keys?softwareId=xxx` - List keys for software
- `POST /api/admin/keys` - Create key
- `PATCH /api/admin/keys` - Update key
- `DELETE /api/admin/keys` - Delete key

## Security

- Dashboard runs locally — no public attack surface
- Admin API protected by bearer token
- Validation endpoint is public (your software needs to call it)
- HWID binding happens server-side, can't be bypassed

## License

MIT
