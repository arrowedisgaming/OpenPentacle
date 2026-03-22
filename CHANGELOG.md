# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.4.1] - 2026-03-22

### Added
- Toast notifications (svelte-sonner) for share, unshare, copy link, and error feedback
- Expandable class features on character sheet — click any feature to see full description
- Expandable spell details on character sheet — click any spell to see casting time, range, components, duration, and full description
- Unsaved character recovery after login — characters created while logged out are auto-saved on sign-in
- Enhanced "Almost there!" sign-in prompt when redirected from wizard with an unsaved character

### Changed
- Share link now persists across page refreshes (initialized from server data on mount)
- Sharing auto-copies link to clipboard (single click to share + copy)
- Unshare preserves the share ID — resharing restores the same URL instead of generating a new one
- Share button shows "Sharing..."/"Unsharing..." text during loading state
- Collapsible chevron animations respect `prefers-reduced-motion`
- Spell C/R indicators have tooltips ("Requires concentration" / "Can be cast as a ritual")
- Long spell descriptions capped at 192px with scroll overflow
- Toast positioned top-right near action buttons

### Fixed
- Share link lost on page refresh — "Copy Link" button disappeared after reload for already-shared characters
- No clipboard feedback — copying share link was silent with no user confirmation
- No error handling on share/unshare — network failures were silently swallowed
- Unshare destroyed share ID — resharing generated a new URL, breaking previously distributed links
- Unsaved character data lost after login — localStorage recovery was written but never read back
- Character list not refreshing after auto-save of recovered character

## [0.4.0] - 2026-03-22

### Added
- Full SRD 5.2.1 spell list: 338 spells across levels 0–9 (was 48 spells up to level 3)
- Expandable feature descriptions in class selection step — click any feature name to see its full SRD description
- Compact "Next" navigation button at top of all wizard steps (abilities, background, details, review were missing it)

### Changed
- Starting equipment for all 12 classes rewritten to match 2024 SRD 5.2.1 format (single fixed item set per class, no more broken phantom IDs)
- Dwarf and Halfling movement speed corrected from 25 ft to 30 ft per 2024 SRD
- Class selection detail panel moves to the right side on wide viewports (xl breakpoint)
- Notebook theme font size increased to 17px to compensate for Patrick Hand readability
- Open5E spell sources no longer include SRD 2024 (built-in content pack now covers all SRD spells)

### Fixed
- Starting equipment auto-populate silently dropping items due to unresolvable phantom equipment IDs
- Spell selection wizard only showing spells up to level 3 due to missing content
- 11 spell descriptions had stray markdown header artifacts from Open5E source data

## [Unreleased]

### Added
- Open5E spell source integration: logged-in users can add third-party spell sources (Deep Magic, Tome of Heroes, A5E, etc.) from the Open5E API
- Per-character spell source selection via a side drawer in the spell wizard step
- Settings page (`/settings`) for managing default Open5E spell sources applied to new characters
- SQLite-backed spell cache with 7-day TTL for Open5E API responses
- API endpoints: `/api/open5e/spells`, `/api/open5e/sources`, `/api/settings/open5e-defaults`
- Settings link in user dropdown menu
- Wizard store auto-loads user's default Open5E sources when starting a new character
- GitHub source link on the Licensing page
- Comprehensive README with architecture docs, Open5E integration, and content pack structure

### Changed
- Extracted shared test fixtures (`makeFeature`, `makeProgression`, `makeClassDef`, `makeCharacter`, fighter/cleric/wizard class data) into `tests/fixtures/index.ts` to eliminate duplication across engine test files
- Spell consumers (wizard, review, sheet, level-up) now merge Open5E spells with built-in pack spells
- CharacterData type extended with optional `open5eSources` field

### Added
- Integration tests for `computeSheet` engine function (39 tests covering AC, HP, skills, saves, spells, speed, proficiency bonus, class summary, and ability score bonuses)
- CLAUDE.md for Claude Code guidance
- CHANGELOG.md
- Skip-to-content accessibility link in root layout
- System font stack (`system-ui`) for Light/Dark themes
- Sticky bottom WizardNav so Next button is always visible
- Focus-visible ring styles on all level-up toggle buttons
- Drizzle migration system replacing hand-written INIT_SQL
- Docker non-root user for improved container security
- Character data migration system (`schemaVersion` + `migrateCharacterData`) for safe schema evolution
- CSRF / Origin header verification on all state-changing endpoints
- Rate limiting (60 req/min per IP) on API endpoints
- Array size limits (`.max()`) on all Zod schema arrays to prevent abuse
- Global `handleError` hook with structured error logging
- Wizard localStorage state versioning (auto-discards stale state)
- "Continue your character" banner on system selection when wizard has in-progress state
- Confirmation dialog before leaving wizard via "Change system"
- Edit (pencil) links on review page for each section (class, abilities, background, skills, equipment, spells)
- Ability score method descriptions and "Recommended" badge on Standard Array
- Conditional Patrick Hand font loading — only fetched when Notebook theme is active
- `as="h1"` prop on PageHeader component; all wizard steps and standalone pages now have proper h1 headings
- Missing ARIA labels on origin sub-options listbox, equipment search results, level-up subclass/feat grids
- Equipment step category browsing (Weapons / Armor & Shields / Adventuring Gear / Tools) with tabs alongside search
- Spell step filter chips (school, concentration, ritual) within each level tab
- Character sheet: proficiencies section (armor, weapons, tools, languages)
- Character sheet: features & traits section with descriptions and level badges
- Character sheet: equipment inventory list
- Character sheet: spells known section grouped by level
- Character sheet: 2-column desktop layout (saves+skills / features+proficiencies+equipment)
- Character sheet: distinctive ability score display (modifier prominent, score in circle)
- Fantasy-warm light theme: richer blue-purple primary, subtle warm background tones
- Type scale CSS utilities (`text-page-title`, `text-section-title`, `text-card-title`, `text-body`, `text-caption`, `text-label`)
- Roving tabindex on selection grids (arrow key navigation between options)
- Shared test fixtures extracted to `tests/fixtures/`
- GPL-3.0 LICENSE file and `license` field in package.json
- `/licensing` page explaining dual-license model (GPL-3.0 for code, per-pack licenses for content)
- Licensing link in footer

### Fixed
- TOCTOU race condition: PUT/DELETE character now include `userId` in WHERE clause
- Equipment page back-navigation linked to "background" instead of "skills"
- Dev Credentials provider now only activates when `NODE_ENV === 'development'` (explicit allowlist)
- Svelte 5 memory leak: wizard layout `subscribe()` now properly cleaned up with `onDestroy`
- All character load paths now use safe JSON parsing with migration (no unhandled parse errors)

### Security
- Added security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- Added path traversal protection in content pack file resolver
- Validated `params.system` against known SystemId values (no more `as any`)

### Changed
- Consolidated duplicate `parseDice` (now canonical in `utils/dice.ts`, re-exported from engine)
- Consolidated duplicate `formatModifier` (now canonical in `utils/format.ts`, re-exported from engine)
