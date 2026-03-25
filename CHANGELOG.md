# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.7.5] - 2026-03-25

### Added
- Version number in app footer linking to changelog on GitHub
- "Open source" footer link to GitHub repository

## [0.7.4] - 2026-03-25

### Fixed
- Ranger, Bard, Sorcerer, and Warlock now use SRD 5.2.1 prepared-spell model (was still using 2014 "spells known")
- Ranger L1 spellcasting fully functional — was missing spell slots and spell count entirely
- Paladin L1 now has spell slots (was missing `spellSlots: [2]`)
- Hunter subclass features updated to SRD 5.2.1: Hunter's Prey (L3) and Defensive Tactics (L7) now have interactive choice UI; L11/L15 updated to single-ability format
- Cantrips counter hidden on spell page for classes with no cantrips (Ranger, Paladin)
- Subclass feature choices now persist when navigating back to the subclass step
- Subclass step validates that all required feature choices are made before proceeding

## [0.7.3] - 2026-03-25

### Fixed
- Discord OAuth sign-in now creates user rows (previously skipped when email was missing)
- Character save endpoint ensures user row exists before insert (no longer relies on hook)
- Multi-provider sign-in with shared email no longer fails on unique constraint

## [0.7.2] - 2026-03-25

### Added
- Origin feat configuration on background page — Magic Initiate cantrips/spell/ability and Skilled proficiency choices now happen during background selection instead of being deferred to the ASI & Feats step
- Reusable `MagicInitiateConfig` and `SkilledConfig` wizard components for feat configuration
- Spell detail cards with description, casting time, range, duration, components, and expand/collapse — matching the spells wizard step pattern
- Engine functions `findFeatDef()` and `parseFeatIdHint()` for resolving suffixed feat IDs (e.g., `magic-initiate-cleric` → `magic-initiate`)
- `FeatSpellConfig` type exported from engine for shared use

### Fixed
- "Magic Initiate Wizard" phantom feat name — background page now properly resolves suffixed feat IDs via prefix matching instead of falling back to kebab-to-title conversion
- Origin feat choices now work for level 1 characters — previously the ASI & Feats step was conditional (level 4+) so level 1 characters could never configure Magic Initiate or Skilled choices
- Background-granted Magic Initiate locks spell list per SRD (Acolyte → Cleric, Sage → Wizard) with grayed-out but visible selection
- Spell school badge no longer overlaps checkmark on selected spell cards
- Feat config state properly preserved when navigating back to background step
- Review page and feats page now use consistent prefix-matching feat lookup

## [0.7.0] - 2026-03-24

### Added
- SRD 5.2.1 species: all 9 species (Dragonborn, Dwarf, Elf, Gnome, Goliath, Halfling, Human, Orc, Tiefling)
- Species sub-option choices: Draconic Ancestry, Elven Lineage, Gnomish Lineage, Giant Ancestry, Fiendish Legacy
- Spellcasting ability choice for lineage species (Elf, Gnome, Tiefling): Int/Wis/Cha
- Size choice for Human and Tiefling (Medium or Small)
- Skill proficiency choice on origin page (Elf Keen Senses, Human Skillful)
- Species spells displayed in detail panel grouped by character level
- Damage resistance display on sub-option cards and detail panel
- Search filter for class feature choices with 10+ options (Weapon Mastery, Invocations, Expertise)
- Compact pill layout for feature choices — descriptions expand only when selected
- Feat effect descriptions shown in ASI & Feats review section (Magic Initiate, Skilled, etc.)
- Engine: speed/darkvision sub-option overrides, Dwarven Toughness HP, size/darkvision/resistance tracking
- 11 new tests: 5 species schema + 6 engine tests for species-derived fields

### Changed
- Species data updated from 2014 subraces to 2024 SRD 5.2.1 lineage/ancestry/legacy system
- Ability score bonuses removed from all species (now backgrounds-only per 2024 rules)
- Origin wizard: 3-column grid, dynamic sub-option labels, responsive layout for 10+ sub-options
- Class detail panel scrolls independently on xl screens (no more wasted left-column space)

### Fixed
- "Start Over" button on create page now works (reactive store subscription fix)
- Feat lookup for background feats with suffixed IDs (e.g., magic-initiate-wizard)
- Character save error now shows actual API/database error details
- ensureUser hook no longer silently swallows database errors
- Save error improved with cause chain for FK constraint debugging

## [0.6.0] - 2026-03-23

### Added
- SRD 5.2.1 feat system: 16 feats across 4 categories (Origin, General, Fighting Style, Epic Boon)
- Magic Initiate spell configuration: spell list choice, cantrip picker, 1st-level spell picker
- Skilled proficiency configuration: 3 skill/tool pickers with exclusion logic
- Skilled picker shows existing proficiencies as read-only badges with live skill bonuses
- Review page: expandable class/subclass features with full descriptions
- Review page: rich ASI & Feats section with expandable feat cards showing choices
- Review page: full background details (description, ability bonuses, origin feat, skills, tools)
- Review page: skill proficiency cards with computed bonuses and flavor descriptions
- Review page: expandable equipment items with weapon/armor/cost details
- Review page: expandable spells grouped by level with full text, components, and tags
- Live ability score preview on ASI picker
- Spell known vs prepared distinction for prepared casters
- Wizard two-phase spell selection (spellbook + prepare)
- Expandable weapon/armor/equipment details on character sheet
- WizardNav `onBack` callback for in-page navigation
- Sticky spell counter bar on spell selection step
- Expandable feat descriptions on ASI/Feats step and level-up page
- Grappler feat added to SRD 5.2.1 content pack

### Changed
- Feat system overhauled to match SRD 5.2.1 — 16 official 2024 feats, filtered by category/level/prerequisites
- Epic Boon feats allow ability scores up to 30
- Repeatable feats (Magic Initiate, Skilled) can be taken multiple times
- Legacy feat fallback on character sheet for old 2014 feats
- Extracted SKILL_EXAMPLES to shared engine module (DRY across 4 consumers)
- 11 new engine tests for feat filtering, prerequisites, and repeatable logic (172 total)

### Fixed
- Skilled feat getUsedSkilledProficiencies() field path bug
- Magic Initiate spellcasting ability choice persistence
- Spell components display: materialDescription instead of boolean material field
- Feat expand buttons: added type="button" and aria-label for accessibility
- checkPrerequisite: added default case for unknown prerequisite types
- Subclass description on character sheet shows actual flavor text
- Character sheet spell section title matches caster type

## [0.5.0] - 2026-03-22

### Added
- Inline ability score preview in background ASI card — shows live totals + modifiers directly below the +2/+1 choices, updating instantly as bonuses are distributed
- Skill bonus preview on skills step — each skill card shows expected modifier, updates live as proficiencies are toggled
- SRD example uses for all 18 skills shown on skill selection cards
- Stats preview grid on skills page showing current ability scores
- Feats section on character sheet — displays all feats with source badges (Background, Lv 4, etc.) and collapsible descriptions with effects
- Weapons section on character sheet — shows attack bonus, damage dice + modifier, damage type, properties, and range for each weapon
- ASI/Feat distinction in Features & Traits — "Ability Score Improvement" and "Epic Boon" features now show what was actually chosen (e.g., "Feat: Alert" or "ASI: +2 STR")
- Subclass display enhancement — subclass selection features now show the chosen subclass name (e.g., "Fighter Subclass: Champion")
- Feature choice data in content pack — 18 features across 10 classes now have `choices` arrays: Fighting Style (Fighter/Paladin/Ranger), Weapon Mastery (Fighter/Barbarian/Paladin/Ranger/Rogue), Expertise (Bard/Ranger/Rogue), Metamagic (Sorcerer), Eldritch Invocations (Warlock)
- Feature choice UI in wizard class step — players can select Fighting Style, Weapon Mastery, Expertise, etc. during character creation
- Feature choice UI in level-up — new features with choices at the gained level prompt for selections
- Feature choice display on character sheet — selected choices shown next to features (e.g., "Fighting Style: Defense")
- Character edit page (`/sheet/[id]/edit`) — edit name, HP, equipment, currency, and flavor text (personality, ideals, bonds, flaws, appearance, backstory) without affecting mechanical choices
- Edit button on character sheet actions bar

### Fixed
- Features & Traits ordering — class and subclass features now sorted by level (was: all class features then all subclass features)
- Equipment section split — weapons shown in dedicated Weapons card with attack/damage details; non-weapon equipment in separate Equipment card
- Background detail panel shows proper names for tools ("Calligrapher Supplies" not "calligrapher-supplies"), skills, and origin feats ("Magic Initiate: Cleric" not "magic-initiate-cleric")
- Background feat is now auto-assigned (not a player choice) — backgrounds grant a specific feat per SRD 5.2.1
- ASI & Feats wizard step hidden at level 1 — no longer shown when there are no ASI levels to handle
- Removed confusing "overlap" badge from skills step — overlap handling still works correctly under the hood
- SelectionCard checkmark vertically centered with first content row

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
