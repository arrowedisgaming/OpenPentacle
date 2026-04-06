# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.15.0] - 2026-04-06

### Added
- Resource tracking on character sheet — track HP, hit dice, spell slots, and class resources (Rages, Focus Points, Sorcery Points)
- HP adjustment field — type +/- values (e.g., "-6") and press Enter for quick changes
- Temporary HP tracker with +/- buttons and direct input
- Hit dice usage tracker with per-die-type +/- controls
- Spell slot usage — click filled/empty circles to toggle individual slots
- Pact magic slot tracking (Warlock), restored on short rest
- Class resource tracking driven by content pack data — Barbarian (Rages), Monk (Focus Points), Sorcerer (Sorcery Points)
- Short Rest button — resets short-rest resources and pact slots, with confirmation dialog
- Long Rest button — full HP restore, hit dice recovery, all spell slots and resources reset, with confirmation dialog
- Origin language proficiencies now saved to character data during wizard
- Class language proficiency resolution from features with mechanicalEffect
- Background tool proficiency choices (e.g., Soldier's gaming set pick)

### Fixed
- Temp HP section always visible (was hidden behind debug condition)
- Rest confirmation toast now waits for save to complete before showing success

## [0.14.2] - 2026-04-01

### Added
- Tool category grouping in class wizard — Monk's 27-option tool picker now shows "Artisan's Tools" and "Musical Instruments" as separate sections
- Cross-reference validation test ensuring all tool IDs in backgrounds and classes match equipment definitions

### Fixed
- Acolyte and Sage backgrounds referenced wrong tool IDs (calligrapher-supplies → calligraphers-supplies, cartographer-tools → cartographers-tools), causing tool proficiencies to silently fail
- Monk missing 5 musical instruments (bagpipes, dulcimer, pan flute, shawm, viol) from tool proficiency choices — SRD requires all 10
- Duplicate tool proficiencies appearing on review page and character sheet when background and class grant the same tool (e.g., Criminal + Rogue both granting Thieves' Tools)

## [0.14.1] - 2026-03-29

### Changed
- Class descriptions rewritten with action-oriented language and subclass mention (e.g., "Storm with Rage, and wade into hand-to-hand combat. Then follow the Path of the Berserker to unleash raw violence.")
- Class selection cards now show only the first sentence; full description appears in the detail panel

## [0.14.0] - 2026-03-29

### Added
- Multi-level-up support — select a target level (e.g., L2 → L5) and step through each level's choices with a progress bar, back navigation, and level-by-level preview
- Target level picker with summary of decisions needed at each level (subclass, ASI/feat, spells, etc.)

## [0.13.1] - 2026-03-29

### Fixed
- Half-caster spell slots at level 1 — rangers and paladins now correctly receive 2 first-level spell slots at L1 per 2024 SRD (was showing 0 due to rounding formula)
- Prepared spell edits not appearing on character sheet or PDF — changing prepared spells on the edit page now correctly updates the displayed spell list for all non-wizard prepared casters
- Level-up spell sync — new spells gained during level-up are now added to the prepared spell list for non-wizard prepared casters

## [0.13.0] - 2026-03-29

### Added
- One-click "Use [Class] Suggested" button on the Standard Array ability score step — auto-fills all six ability scores based on the SRD 5.2.1 recommended array for each class
- Suggested ability score data for all 12 SRD classes (from SRD page 21 "Standard Array by Class" table)
- Visual feedback: button turns green with checkmark when suggested scores are active, reverts when manually changed

## [0.12.1] - 2026-03-27

### Added
- Wizard cantrip swapping on the character edit page — swap known cantrips from the full wizard cantrip list while keeping the total count fixed (SRD 5.2.1 Long Rest rule)

## [0.12.0] - 2026-03-27

### Added
- Unified spell filter bar with search, school, level, concentration, and ritual filters
- Spell filtering on the level-up page (previously had no filtering)
- Search-by-name filtering on the wizard spell step (previously missing)
- School, concentration, and ritual filters on the prepared spell editor (previously only had search and level)

### Changed
- Wizard spell step uses a flat spell list with level filter badges instead of level tabs
- Each spell card now shows a level badge for quick identification
- Filter badge buttons include proper accessibility attributes (aria-pressed, aria-label)
- "Clear" filter action styled as a badge for better discoverability
- Filter bar shows result count ("12 of 48") when filters are active

## [0.11.4] - 2026-03-27

### Fixed
- DATABASE_URL in docker-compose.yml now matches Dockerfile default (`openpentacle.db` instead of `free5e.db`)
- ORIGIN env var passed through docker-compose.yml so reverse proxy CSRF checks work
- .env.example referenced nonexistent `DEPLOY_TARGET` variable, now correctly documents `ADAPTER`
- Git clone URLs in SELF-HOSTING.md pointed to `your-username` placeholder instead of actual repo
- Node.js version in SELF-HOSTING.md updated from 20+ to 22+ to match Dockerfile
- Bare metal build command in SELF-HOSTING.md now includes `ADAPTER=node`

### Added
- Cloudflare Pages deployment section in SELF-HOSTING.md (D1 setup, wrangler.toml, migrations, env vars)
- ORIGIN env var guidance in SELF-HOSTING.md reverse proxy section
- nginx HTTPS note with certbot/Caddy recommendations
- Database migration note for existing Docker users (`free5e.db` → `openpentacle.db`)
- Missing features in README: PDF export, themes, prepared spell editor, JSON export

### Changed
- README and SELF-HOSTING.md prose cleaned up and humanized
- Test count updated from 161 to 214 across README and CLAUDE.md

## [0.11.3] - 2026-03-27

### Fixed
- PDF section divider line and diamonds now span full content width (540pt), properly centered
- PDF core stats row no longer overflows right margin — combat stats use fixed column widths and tighter padding
- Reduced combat stat font from 14pt to 12pt so "Medium" and other values fit within cells

## [0.11.2] - 2026-03-27

### Fixed
- PDF button no longer stuck in "Generating..." state after download completes
- Replaced unreliable pdfmake callback with fire-and-forget download pattern
- Moved doc definition build after dynamic imports for robustness

## [0.11.1] - 2026-03-27

### Fixed
- PDF export now works on Cloudflare Pages — moved from server-side (Node.js) to client-side generation
- Fonts embedded as base64 in virtual filesystem instead of reading from disk
- pdfmake + font data lazily loaded only when user clicks PDF button (keeps initial bundle small)

## [0.11.0] - 2026-03-27

### Added
- PDF character sheet export — downloadable D&D-style PDF with parchment theme, Cinzel/Crimson Text typography
- PDF button on character sheet actions bar (Download icon)
- PDF data resolver: pure functions porting CharacterSheetView display logic for server-side use
- PDF sections: ability scores, saving throws, skills, weapons, equipment, proficiencies, class features, feats, species traits, spells, flavor text
- Spellcasting page (page 2, conditional — only generated for caster characters)
- Open5E spells included in PDF export when character has external sources configured
- 13 new unit tests for PDF data resolver (214 total tests passing)
- API endpoint: `GET /api/export/[characterId]/pdf`
- Fonts: Cinzel (headers) and Crimson Text (body) embedded in PDF

## [0.10.0] - 2026-03-27

### Changed
- Character sheet layout: CSS Grid → CSS multi-column masonry (auto-balanced columns, no dead space)
- Container width widened (`max-w-5xl` → `max-w-6xl`) on sheet and share pages
- Card padding tightened across all character sheet cards (py-3 gap-2, px-4 headers/content)
- Inter-section spacing reduced (mt-4/gap-4 → mt-3/gap-3) for denser layout
- Spell Slots and Spells cards now flow inside the masonry columns instead of spanning full width
- Spell names and level headers bumped from `text-xs` to `text-sm` for consistency with other list items
- Proficiency Bonus and Passive Perception badges moved to full-width row above the two-column layout

### Fixed
- "Legacy" badge incorrectly shown on Magic Initiate feats — suffixed feat IDs (e.g., `magic-initiate-wizard`) now resolved via `findFeatDef()`
- Magic Initiate cantrips and spells missing from character sheet Spellbook section
- Magic Initiate spells missing from review page spell list
- ASI feature display silently failing to show feat name for suffixed feat IDs
- Review page spell section hidden for characters whose only spells come from Magic Initiate feat
- Level-up page not detecting prior Magic Initiate selections with suffixed feat IDs

## [0.9.0] - 2026-03-26

### Added
- Prepared spell editor on character edit page — change prepared spells between adventures without leveling up
- Engine functions: `computePreparedSpellContext()` and `getAvailableSpellsForPreparation()` in `$lib/engine/prepared-spells.ts`
- PreparedSpellEditor component with search, level toggle filters, and "Prepared" filter badge
- Open5E spell source integration on edit page (fetches and merges third-party spells)
- "Spellbook" card title on character sheet for Wizard (was misleadingly "Prepared Spells")
- "Prepared" badge on Wizard character sheet spells that are currently prepared
- 10 new engine unit tests for prepared spell logic

### Changed
- Equipment add on edit page: replaced dropdown with type-to-filter search input
- Character sheet spell card: Wizard sees "Spellbook" title; other prepared casters still see "Prepared Spells"

### Fixed
- Prepared spell counter showing inflated count (cantrips were counted as user-prepared spells)
- Equipment search dropdown appearing behind Prepared Spells card (z-index stacking)

## [0.8.0] - 2026-03-26

### Added
- Global root font-size bump (17px base) — 6% readability boost across all rem-based UI
- Body line-height 1.625 for improved text readability
- Responsive horizontal padding (sm:px-6 lg:px-8) on all page containers
- Responsive grid gaps (sm:gap-4) in wizard step selection grids
- Responsive SelectionCard padding (sm:p-5) for non-compact cards
- Updated custom typography scale utilities (text-page-title, text-section-title, text-card-title, text-body, text-caption, text-label)

### Changed
- Card descriptions promoted from text-sm to text-base
- Page header titles bumped from text-xl/2xl to text-2xl/3xl responsive
- Page header descriptions promoted from text-sm to text-base
- Notebook theme font-size bumped from 17px to 18px to maintain differentiation
- Container widths increased: wizard/header/footer 5xl→6xl, list pages 3xl→4xl, sheet/share 4xl→5xl
- Character sheet two-column layout triggers at sm (640px) instead of lg (1024px)

### Fixed
- Wizard stepper not updating completed/accessible steps — $derived was not reactive to Svelte 4 store's completedSteps (used non-reactive get() instead of $state bridge)

## [0.7.9] - 2026-03-26

### Added
- Structured `choices` arrays on class features: Cleric Divine Order, Druid Primal Order, Druid Elemental Fury, Ranger Deft Explorer
- `grants` field on feature choice options — proficiency grants are now content-pack driven (no hardcoded class IDs)
- `aria-pressed` on feature choice toggle buttons for screen reader accessibility
- Unit tests for `resolveFeatureChoiceProficiencies()` engine function (Protector, Warden, Thaumaturge, empty)

### Changed
- `resolveFeatureChoiceProficiencies()` extracted from Svelte component to engine layer (`class-progression.ts`) for testability and reuse

### Fixed
- Proficiency grants from feature choices (Protector, Warden) no longer hardcoded in UI component — now read from content-pack `grants` data
- Level-up page now resolves proficiency grants from new feature choices (was silently skipped)

## [0.7.8] - 2026-03-26

### Fixed
- Fix WizardShell step filter — was including all steps regardless of conditional flag
- Wizard step sidebar now reflects completion-based accessibility, not just current position
- Class step preserves subclass selection when returning via back-navigation
- Edit page form fields no longer reset on re-render (deferred initialization via $effect)
- Toggle-group reactivity — use getter functions for Svelte 5 context values
- Level-up skilled proficiency lookup path corrected (data.skills)
- Remove empty object args from Drizzle integer() calls
- Remove redundant type annotations from Auth.js callbacks
- Move app globals into proper `declare global` block in app.d.ts

### Added
- Playwright E2E test infrastructure with smoke test
- Unit tests for class-step wizard helpers (buildClassSelection, mergeFeatureChoices)
- `$lib/wizard/class-step.ts` — pure functions for class selection building with feature choice merging

## [0.7.7] - 2026-03-26

### Fixed
- Fix "Thunderwavea" typo in spell data (id and name corrected to "Thunderwave")
- Wizard Scholar feature (L2) now has selectable expertise choice UI with 6 skill options
- Expertise from feature choices (Rogue, Bard, Ranger, Scholar) now applied to skill computation — doubles proficiency bonus on character sheet
- Magic Initiate feat spells (cantrips + level 1 spell) now displayed on character sheet with "Magic Initiate" badge
- Species/origin spells (e.g., Drow, High Elf, Tiefling lineage) now displayed on character sheet with "Species" badge, level-gated by character level

## [0.7.6] - 2026-03-25

### Security
- Sanitize API error messages — internal details no longer leaked to clients
- Docker port binds to localhost only (127.0.0.1) by default
- Add HSTS header (Strict-Transport-Security) for HTTPS deployments
- Add `frame-ancestors 'none'` to CSP (belt-and-suspenders with X-Frame-Options)
- Stricter rate limiting on share endpoints (10 req/min vs 60 for general API)
- Whitelist export format parameter — rejects unknown formats
- Truncate export filename to 50 chars to prevent oversized headers
- Character GET endpoint returns only needed fields (DB-level field selection)
- Remove verbose console.log from Open5E production code paths
- Remove unused DrizzleAdapter import
- Add security documentation to SELF-HOSTING.md

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

