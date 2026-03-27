# Self-hosting guide

## Docker Compose (recommended)

The fastest way to get running:

```sh
git clone https://github.com/arrowedisgaming/OpenPentacle.git
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

Docker also runs this check automatically. View container health with `docker ps`.

---

## Enabling OAuth

The app works without OAuth — characters are stored in the browser via localStorage. Adding OAuth gives you persistent cloud storage, cross-device sync, and shareable character links.

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

## Reverse proxy

If you're putting OpenPentacle behind a reverse proxy (which you should for any public deployment), set the `ORIGIN` environment variable to your public URL:

```sh
ORIGIN=https://openpentacle.example.com
```

This tells SvelteKit your real hostname so CSRF checks work. Without it, form submissions and auth callbacks will fail with origin mismatch errors.

`AUTH_TRUST_HOST=true` is baked into the Docker image, so Auth.js trusts `X-Forwarded-*` headers automatically.

### Caddy (simplest, automatic HTTPS)

```
your-domain.com {
    reverse_proxy localhost:3000
}
```

Caddy handles TLS certificates automatically via Let's Encrypt. This is the lowest-effort option.

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

For HTTPS (which you'll want for OAuth and general security), the easiest path is [certbot](https://certbot.eff.org/). Run `certbot --nginx` and it will modify the config above to handle TLS. Alternatively, [Caddy](https://caddyserver.com/) does this with zero config.

---

## Cloudflare Pages

OpenPentacle can deploy to Cloudflare Pages with a D1 database instead of SQLite. This is how [openpentacle.com](https://openpentacle.com) runs.

### Setup

1. Create a D1 database:

```sh
npx wrangler d1 create openpentacle-db
```

2. Update `wrangler.toml` with the `database_id` from the output. The repo has a `wrangler.toml` you can use as a starting point, but **replace the `database_id` with your own** — the one in the repo points to the production database:

```toml
name = "openpentacle"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".svelte-kit/cloudflare"

[[d1_databases]]
binding = "DB"
database_name = "openpentacle-db"
database_id = "your-database-id-here"
migrations_dir = "src/lib/server/db/migrations"
```

3. Run migrations against D1:

```sh
npx wrangler d1 migrations apply openpentacle-db
```

4. Deploy:

```sh
npm run build           # Uses Cloudflare adapter by default (no ADAPTER env var)
npx wrangler pages deploy
```

The SvelteKit adapter is selected by the `ADAPTER` environment variable. When it's not set (or anything other than `"node"`), the Cloudflare adapter is used. The Dockerfile sets `ADAPTER=node` for Docker builds.

### Environment variables on Cloudflare

Set these in the Cloudflare Pages dashboard under Settings > Environment variables:

- `AUTH_SECRET` (required, generate with `openssl rand -base64 33`)
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` (optional)
- `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` (optional)

`DATABASE_URL` is not needed. The D1 binding handles database access.

---

## Backups

The SQLite database lives in a Docker volume. To back it up:

```sh
# Using sqlite3 .backup (safe while the database is running)
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

### Migrating from `free5e.db`

If you set up OpenPentacle before v0.12.0, your database file is named `free5e.db`. The docker-compose file now defaults to `openpentacle.db`. You have two options:

1. **Rename the file** (recommended). Exec into the container and move it:

```sh
docker compose exec app mv /data/free5e.db /data/openpentacle.db
docker compose restart
```

2. **Keep the old name.** Override `DATABASE_URL` in your `.env`:

```sh
DATABASE_URL=/data/free5e.db
```

---

## Bare metal (no Docker)

Requirements: Node.js 22+ and npm.

```sh
git clone https://github.com/arrowedisgaming/OpenPentacle.git
cd OpenPentacle
npm ci
ADAPTER=node npm run build

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

The container runs as a non-root user. If you're using a bind mount instead of a volume, make sure it's writable:

```sh
mkdir -p ./data && chown 1000:1000 ./data
```

### OAuth redirect URI mismatch

The redirect URI in your OAuth provider must match exactly:
- Google: `https://your-domain.com/auth/callback/google`
- Discord: `https://your-domain.com/auth/callback/discord`

Common mistakes: using `http` instead of `https` (or vice versa), a trailing slash, or the wrong domain/port.

### Container shows "unhealthy"

Check the logs:

```sh
docker compose logs app
```

The health check hits `/api/health` every 30 seconds. If it fails, the logs will show why (database connection error, missing content packs, etc.).

### Sessions lost after restart

This happens if `AUTH_SECRET` changes between restarts. The entrypoint script persists the auto-generated secret to `/data/.auth_secret`. If you're providing your own `AUTH_SECRET`, make sure it stays the same across restarts.

---

## Security notes

**Cookies.** Auth.js session cookies are `HttpOnly` (no JavaScript access), `SameSite=Lax` (blocks cross-site requests), and `Secure` (HTTPS-only in production). This is the default and you don't need to configure it.

**Port binding.** Docker Compose binds to `127.0.0.1` (localhost only) by default. Don't change this to `0.0.0.0` to expose the app on your network. Use a reverse proxy instead.

**HSTS.** The app sends a `Strict-Transport-Security` header. Once a browser sees this, it will only connect over HTTPS for that domain. This is fine if you're using TLS (and you should be), but be aware it's sticky.
