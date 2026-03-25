# Self-Hosting Guide

## Docker Compose (recommended)

The fastest way to get running:

```sh
git clone https://github.com/your-username/OpenPentacle.git
cd OpenPentacle
docker compose up -d
```

The app is available at [http://localhost:3000](http://localhost:3000). Database tables and auth secret are created automatically on first start.

### Changing the port

```sh
PORT=8080 docker compose up -d
```

Or add `PORT=8080` to a `.env` file in the project root.

### Checking health

```sh
curl http://localhost:3000/api/health
# {"status":"ok","database":"connected","contentPacks":1,"timestamp":"..."}
```

Docker also runs this check automatically — view container health with `docker ps`.

---

## Enabling OAuth

The app works without OAuth (characters are stored locally in the browser). OAuth adds persistent cloud storage, syncing across devices, and character sharing.

### Google

1. Go to [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add authorized redirect URI: `https://your-domain.com/auth/callback/google`
   (or `http://localhost:3000/auth/callback/google` for local testing)
4. Add the credentials to your `.env` file or docker-compose environment:

```sh
AUTH_GOOGLE_ID=your-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-client-secret
```

### Discord

1. Go to [Discord Developer Portal > Applications](https://discord.com/developers/applications)
2. Create a new application, go to **OAuth2**
3. Add redirect: `https://your-domain.com/auth/callback/discord`
4. Add credentials:

```sh
AUTH_DISCORD_ID=your-application-id
AUTH_DISCORD_SECRET=your-client-secret
```

After adding credentials, restart the container:

```sh
docker compose up -d
```

---

## Reverse Proxy

### Caddy (simplest — automatic HTTPS)

```
your-domain.com {
    reverse_proxy localhost:3000
}
```

### nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

`AUTH_TRUST_HOST=true` is baked into the Docker image, so Auth.js will trust the `X-Forwarded-*` headers automatically.

---

## Backups

The SQLite database lives in a Docker volume. To back it up:

```sh
# Using sqlite3 .backup (safe for running databases)
docker compose exec app sqlite3 /data/openpentacle.db ".backup /data/backup.db"
docker compose cp app:/data/backup.db ./backup.db
```

Or back up the entire volume:

```sh
docker compose stop
docker compose cp app:/data ./data-backup
docker compose start
```

---

## Updates

```sh
git pull
docker compose up -d --build
```

The `--build` flag rebuilds the image with the latest code. Database migrations run automatically on startup.

---

## Bare Metal (no Docker)

Requirements: Node.js 20+ and npm.

```sh
git clone https://github.com/your-username/OpenPentacle.git
cd OpenPentacle
npm ci
npm run build

# Set environment variables
export AUTH_SECRET=$(openssl rand -base64 33)
export DATABASE_URL=./data/openpentacle.db
export AUTH_TRUST_HOST=true  # if behind a reverse proxy

# Start the server
node build
```

The server listens on port 3000 by default. Set `PORT` to change it.

For production, use a process manager like `pm2`:

```sh
npm install -g pm2
pm2 start build/index.js --name openpentacle
pm2 save
pm2 startup
```

---

## Troubleshooting

### Port already in use

Change the host port:

```sh
PORT=8080 docker compose up -d
```

### Permission errors on /data

The container runs as a non-root user. Ensure the volume or bind mount is writable:

```sh
# If using a bind mount instead of a volume:
mkdir -p ./data && chown 1000:1000 ./data
```

### OAuth redirect URI mismatch

The redirect URI in your OAuth provider settings must match exactly:
- Google: `https://your-domain.com/auth/callback/google`
- Discord: `https://your-domain.com/auth/callback/discord`

Common mistakes:
- Using `http://` instead of `https://` (or vice versa)
- Missing or extra trailing slash
- Wrong domain/port

### Container shows "unhealthy"

Check the logs:

```sh
docker compose logs app
```

The health check hits `/api/health` every 30 seconds. If it fails, the logs will show why (database connection error, missing content packs, etc.).

### Sessions lost after restart

This happens if `AUTH_SECRET` changes between restarts. The entrypoint script persists the auto-generated secret to `/data/.auth_secret`. If you're providing `AUTH_SECRET` via environment, make sure it stays the same.

---

## Security Notes

### Cookie security

Auth.js sets `SameSite=Lax` on session cookies by default. This prevents CSRF attacks from third-party sites while still allowing normal navigation links. The cookies are also `HttpOnly` (not accessible to JavaScript) and `Secure` (HTTPS-only in production).

### Port binding

The Docker Compose file binds to `127.0.0.1` (localhost only) by default. If you need the app accessible from other machines on your network, use a reverse proxy (see above) rather than changing the port binding.

### HSTS

The app sends a `Strict-Transport-Security` header. If you're running behind a reverse proxy that handles TLS, this tells browsers to always use HTTPS for your domain after the first visit.
