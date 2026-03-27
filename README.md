# OpenPentacle

A free, open-source character creator for 5E tabletop RPGs. Build characters from level 1 to 20 with class features, subclasses, ASIs, feats, spells, skills, and equipment. Everything is powered by JSON content packs. No game rules are hardcoded in the app itself.

## Features

- Guided character creation wizard (species, class, background, ability scores, skills, equipment, spells, feats)
- Levels 1–20 with subclass selection, ASI/feat choices, spell progression, and all class features
- Post-creation level up directly from the character sheet
- PDF character sheet export with a D&D-style parchment layout
- Prepared spell editor for swapping spells between adventures
- Dark mode and notebook theme
- 1,900+ third-party spells from the [Open5E](https://open5e.com) library, added per-character
- Shareable character sheets via public links
- Character JSON export via API
- Google and Discord OAuth (or use without accounts)
- Self-hostable with a single Docker command
- Also deploys to Cloudflare Pages with D1

### Supported systems

| System | Status |
|--------|--------|
| D&D 5e SRD 5.2.1 (2024) | Available |
| Black Flag Roleplaying | Planned |
| Advanced 5th Edition (A5E) | Planned |

## Quick start

### Docker (recommended)

```sh
git clone https://github.com/arrowedisgaming/OpenPentacle.git
cd OpenPentacle
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000). The database and auth secret are created automatically.

See [SELF-HOSTING.md](SELF-HOSTING.md) for OAuth setup, reverse proxy config, Cloudflare deployment, backups, and more.

### Local development

```sh
git clone https://github.com/arrowedisgaming/OpenPentacle.git
cd OpenPentacle
npm install
npm run db:push    # Initialize the SQLite database
npm run dev        # Start dev server at http://localhost:5173
```

No auth setup needed for local dev. A credentials provider is available on the login page.

## Commands

```sh
npm run dev              # Dev server (http://localhost:5173)
npm run build            # Production build
npm run check            # TypeScript + Svelte type checking
npm run test             # Vitest unit tests (214 tests)
npm run test:watch       # Vitest watch mode
npm run test:e2e         # Playwright E2E tests
npm run db:generate      # Generate Drizzle migrations from schema
npm run db:push          # Push schema changes to SQLite
npm run db:studio        # Drizzle Studio GUI
```

Run a single test file:

```sh
npx vitest run tests/unit/engine/skills.test.ts
npx vitest run -t "overlap"   # Run tests matching name
```

## Configuration

All environment variables are optional for Docker deployments.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Host port |
| `DATABASE_URL` | `/data/openpentacle.db` | SQLite database path |
| `AUTH_SECRET` | Auto-generated | Session cookie signing key |
| `AUTH_GOOGLE_ID` | — | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | — | Google OAuth client secret |
| `AUTH_DISCORD_ID` | — | Discord OAuth client ID |
| `AUTH_DISCORD_SECRET` | — | Discord OAuth client secret |
| `ORIGIN` | — | Public URL for CSRF checks (e.g., `https://openpentacle.com`). Set this if you're behind a reverse proxy with a custom domain. |

Auth providers are added conditionally. If credentials aren't set, those login buttons won't appear.

## Architecture

### Project structure

```
src/
  lib/
    engine/         Pure game-math functions (ability scores, class progression,
                    spell slots, skills, level-up, hit points)
    types/          TypeScript interfaces (CharacterData, ContentPack, common types)
    schemas/        Zod validation schemas
    server/         Server-only code:
      db/             Drizzle ORM schema + migrations
      content/        Content pack loader + registry
      open5e/         Open5E API client, mapper, cache
      pdf/            PDF generation (pdfmake, embedded fonts)
    stores/         Client state (wizard store, theme)
    components/     Svelte components:
      ui/             20 shadcn components + SelectionCard, PageHeader, etc.
      wizard/         WizardShell, WizardNav
      sheet/          StatBlock, CharacterSheetView
      open5e/         SourceSelector
      layout/         AppHeader, AppFooter, MobileNav, ThemeToggle
  routes/           SvelteKit pages and API endpoints
static/
  content-packs/    SRD 5.2.1 content pack
tests/
  unit/             214 engine + schema tests
  fixtures/         Shared test helpers and data
```

### Design principles

**Content-pack driven.** All D&D mechanics (classes, species, spells, equipment) live in JSON content packs under `static/content-packs/`. The app is system-agnostic. Adding a new game system means adding a new content pack, not writing new code.

**Auditable bonuses.** Every numeric bonus carries a source string and source type. Ability scores track separate bonus arrays (origin, levelUp, feat) so you can trace where every +1 came from.

**Pure engine layer.** All game math lives in `src/lib/engine/` as pure, stateless functions with no side effects or database calls. This is the primary unit-test target.

**Origin layer abstraction.** A single `OriginLayer` type handles all three origin systems polymorphically (SRD Species, Black Flag Lineage+Heritage, A5E Heritage+Culture).

### Tech stack

- **Frontend:** SvelteKit 5, Svelte 5 (runes), TypeScript, Tailwind CSS v4
- **Components:** shadcn-svelte, lucide-svelte icons
- **Database:** Drizzle ORM + SQLite (better-sqlite3 locally, Cloudflare D1 in production)
- **Auth:** Auth.js v5 (@auth/sveltekit) with Google + Discord OAuth
- **Validation:** Zod v4
- **Testing:** Vitest (unit), Playwright (E2E)
- **PDF:** pdfmake with Cinzel/Crimson Text fonts (client-side generation)

## Content packs

Game content lives in `static/content-packs/`. Each pack has an `index.json` manifest that references separate JSON files:

```
static/content-packs/srd521/
├── index.json          # Pack manifest (id, name, version, system, license)
├── classes.json        # 12 classes with subclasses and progression tables
├── origins.json        # Species definitions
├── backgrounds.json    # 4 backgrounds
├── spells.json         # 48 SRD spells
├── equipment.json      # 111 equipment items
└── feats.json          # 8 feats
```

Packs are validated against Zod schemas at startup. Invalid packs are rejected with detailed error messages.

## Open5E integration

Logged-in users can expand their spell options by enabling sources from the [Open5E API](https://open5e.com):

- Each character can have different spell sources enabled
- Default sources can be set on the settings page and auto-apply to new characters
- Spells are fetched once and cached in SQLite for 7 days
- 1,900+ spells from Deep Magic, Tome of Heroes, A5E, and more
- If an Open5E spell shares a name with an SRD spell, the curated SRD version wins

## License

- **Application code** — [GPL-3.0](LICENSE)
- **SRD 5.2.1 content** — [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/) (Wizards of the Coast)
- **Open5E spell data** — per-source licensing (see [Open5E](https://open5e.com))

See the [licensing page](https://openpentacle.com/licensing) in the app for full details.
