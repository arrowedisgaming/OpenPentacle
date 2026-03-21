# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # Dev server (http://localhost:5173)
npm run build            # Production build (adapter-node → build/)
npm run check            # TypeScript + svelte-check
npm run test             # Vitest unit tests (122 tests)
npm run test:watch       # Vitest watch mode
npm run test:e2e         # Playwright E2E tests
npm run db:generate      # Generate Drizzle migrations from schema
npm run db:push          # Push schema changes to SQLite
npm run db:studio        # Drizzle Studio GUI
```

Run a single test file: `npx vitest run tests/unit/engine/skills.test.ts`
Run tests matching a name: `npx vitest run -t "overlap"`

## Architecture

### Content-Pack Driven Design
Zero game rules live in application code. All D&D mechanics come from JSON content packs in `static/content-packs/`. The loader (`src/lib/server/content/loader.ts`) resolves file references from `index.json`, validates with Zod, and caches via a lazy singleton (`getContentPackRegistry()`).

### Origin Layer Abstraction
A single `OriginLayer` type handles all three origin systems polymorphically:
- SRD 5.2.1: 1 layer (Species)
- Black Flag: 2 layers (Lineage + Heritage)
- A5E: 2 layers (Heritage + Culture)

The wizard UI and engine functions work with generic ordered layers, so multi-system support requires no code duplication.

### Engine Layer (`src/lib/engine/`)
Pure, stateless functions for all game math — ability scores, class progression, skills, level-up, spell slots, hit points. No side effects. This is the primary unit-test target (88+ engine tests).

### Auditable Bonuses
Every numeric bonus implements `SourcedBonus` (value + source string + sourceType enum). `AbilityBonus` extends this with an `ability` field. Ability scores track three separate bonus arrays (origin, levelUp, feat) so the source of every +1 is traceable.

### Wizard Flow
Client-side state lives in a Svelte writable store (`src/lib/stores/wizard.ts`) with localStorage persistence. The wizard layout (`src/routes/create/[system]/+layout.svelte`) computes active steps dynamically from character state + content pack data. Step visibility is conditional — subclass appears at level >= 3, spells only if class has spellcasting, ASI/feats only at ASI levels.

Navigation context is provided via `setContext('wizard-nav')` so child pages get `getNextStepPath()`/`getPrevStepPath()` without prop drilling.

### Data Storage
Characters are stored as full JSON blobs in SQLite (`data` column on `characters` table). No normalization — the CharacterData interface is the single source of truth, validated by Zod on save/load.

## Key Conventions

### Svelte 5 Patterns
- `$props()` with destructuring for component props; `class: className` for CSS class forwarding
- `$state()` / `$derived()` / `$derived.by()` for reactivity (no `$:` reactive declarations)
- `{@const}` must be an immediate child of `{#if}`, `{#each}`, etc. — NOT inside `<div>` elements
- `{@render children()}` with `Snippet` type for child content
- bits-ui components use `child` prop (not `children`) — use `WithoutChild` from `$lib/utils` when composing

### TypeScript
- `AbilityBonus` extends `SourcedBonus` as an interface — do NOT use intersection types (`&`), which cause TypeScript issues with empty arrays
- Zod v4: `z.record()` requires 2 args (key schema, value schema). Use `z.toJSONSchema()` instead of external packages.
- lucide-svelte icon types don't match `Component<{class?: string}>` — use `any` for icon prop types

### shadcn-svelte
- Namespace imports: `import * as Card from '$lib/components/ui/card'` → `<Card.Root>`, `<Card.Header>`, etc.
- `components.json` requires `tailwind.baseColor: "slate"`
- 20 components installed; custom components: SelectionCard, PageHeader, DetailPanel, LoadingState, EmptyState, WizardNav

### Styling
- Tailwind v4 with `cn()` utility (clsx + tailwind-merge) from `$lib/utils`
- Custom theme variants: `dark`, `notebook` via `@custom-variant`
- Theme files in `src/lib/themes/`

### Auth
- Auth.js v5 (`@auth/sveltekit`) with Google + Discord OAuth, conditionally added based on env vars
- Production build (adapter-node) does NOT auto-load `.env` — AUTH_SECRET must be in the environment
- Dev-only Credentials provider for local testing

### Content Pack SRD 5.2.1 Notes
- All subclasses trigger at level 3
- L19 is Epic Boon (not ASI) — `getASILevels()` excludes it
- Background `abilityScoreChanges.value` is 0 by design — wizard UI handles +2/+1/+1 distribution
- `BackgroundDefinition.feature` is optional; 5.2.1 backgrounds use `feat` field for Origin Feat
- Monk uses `focusPoints` (not `kiPoints`) in classSpecific
