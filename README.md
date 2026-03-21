# OpenPentacle

A free, open-source character creator for 5E-compatible tabletop RPG systems. Build characters levels 1-20 with class features, subclasses, ability score improvements, feats, spells, skills, and equipment — all driven by content packs with zero game rules hardcoded in the app.

## Features

- **Full character creation** — species, class, background, ability scores, skills, equipment, spells
- **Levels 1-20** — subclass selection, ASI/feat choices, spell progression, class features
- **Post-creation level-up** — level up saved characters from their character sheet
- **Content-pack driven** — all game data loaded from JSON packs, no rules in app code
- **Multi-system support** — designed for SRD 5.2.1, Black Flag, A5E, and homebrew
- **Shareable character sheets** — public share links for your characters
- **Optional OAuth** — Google and Discord login, or use without accounts
- **Self-hostable** — single Docker command, zero configuration required

## Quick Start

```sh
git clone https://github.com/your-username/OpenPentacle.git
cd OpenPentacle
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000) — that's it. The database and auth secret are created automatically.

See [SELF-HOSTING.md](SELF-HOSTING.md) for OAuth setup, reverse proxy configuration, backups, and more.

## Configuration

All environment variables are optional for Docker deployments.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Host port to expose |
| `DATABASE_URL` | `/data/openpentacle.db` | SQLite database path |
| `AUTH_SECRET` | Auto-generated | Session cookie signing key |
| `AUTH_GOOGLE_ID` | — | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | — | Google OAuth client secret |
| `AUTH_DISCORD_ID` | — | Discord OAuth client ID |
| `AUTH_DISCORD_SECRET` | — | Discord OAuth client secret |
| `CONTENT_PACKS_DIR` | `static/content-packs` | Custom content packs directory |

## Development

```sh
npm install
npm run dev          # Start dev server on http://localhost:5173
npm run test         # Run unit tests (Vitest)
npm run build        # Production build
npm run check        # TypeScript / Svelte checks
```

### Tech Stack

- **SvelteKit 5** + TypeScript + Tailwind v4 + shadcn-svelte
- **Drizzle ORM** + SQLite (better-sqlite3)
- **Auth.js v5** (@auth/sveltekit) — Google + Discord OAuth
- **Zod v4** for content pack and character data validation
- **Vitest** for unit tests, **Playwright** for E2E

### Project Structure

```
src/
  lib/
    engine/       Pure game-math functions (class progression, skills, level-up)
    types/        TypeScript interfaces
    schemas/      Zod validation schemas
    server/       Server-only: database, auth, content loader
    stores/       Client state (wizard, theme)
    components/   UI components (wizard, sheet, layout, ui)
  routes/         SvelteKit pages and API endpoints
static/
  content-packs/  SRD 5.2.1 content pack (12 classes, species, backgrounds, spells, equipment, feats)
tests/
  unit/           161 engine + schema tests
  fixtures/       Shared test helpers and data
```

## License

Application source code is licensed under [GPL-3.0](LICENSE). Game content in content packs is licensed under the terms of their respective publishers (CC-BY-4.0 for the D&D SRD, ORC for Black Flag, etc.). See the [licensing page](/licensing) in the app for full details.
