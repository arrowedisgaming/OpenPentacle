# Theming Guide

This project uses a **registry-driven** theming system. Each theme is a set of CSS custom properties that override the light-mode defaults. The UI auto-populates from the registry — no component edits needed for color-only themes.

## Architecture

```
<html class="dark">          ← theme class set by JS
  └─ CSS custom properties    ← .dark { --color-background: ... }
     └─ Tailwind utilities    ← bg-background, text-foreground
        └─ shadcn components  ← use Tailwind classes
```

1. **`registry.ts`** — single source of truth for theme metadata (ID, label, icon, CSS class)
2. **`base.css`** — default (light) tokens, base layer, animations
3. **Per-theme CSS files** — override tokens inside a class selector (`.dark {}`, `.notebook {}`)
4. **`app.css`** — orchestrator that imports everything + declares custom variants
5. **`theme.ts` store** — reads registry, applies class to `<html>`, persists to localStorage
6. **`ThemeToggle.svelte`** — reads registry to build the dropdown

## Quick Start: Adding a Color-Only Theme

**You'll touch 3 files.** Total time: ~10 minutes.

### Step 1: Create Your CSS File

Copy `_template.css` to a new file:

```bash
cp src/lib/themes/_template.css src/lib/themes/mytheme.css
```

Edit it:
- Replace `.your-theme-class` with your CSS class name (e.g., `.high-contrast`)
- Fill in your color values (HSL format, no commas — Tailwind v4 syntax)
- Adjust `--radius` if desired

### Step 2: Import in `app.css`

Add one line to `src/app.css`:

```css
@import './lib/themes/mytheme.css';
```

### Step 3: Register in `registry.ts`

Add your theme to the `themes` array in `src/lib/themes/registry.ts`:

```typescript
import { Sun, Moon, Monitor, NotebookPen, Palette } from 'lucide-svelte';

export const themes: ThemeDefinition[] = [
  { id: 'light',         label: 'Light',         icon: Sun,         cssClass: null,            resolvesDark: false },
  { id: 'dark',          label: 'Dark',          icon: Moon,        cssClass: 'dark',          resolvesDark: true },
  { id: 'notebook',      label: 'Notebook',      icon: NotebookPen, cssClass: 'notebook',     resolvesDark: false },
  { id: 'high-contrast', label: 'High Contrast', icon: Palette,     cssClass: 'high-contrast', resolvesDark: false },
];
```

**That's it.** The ThemeToggle dropdown, theme store, and class management all read from the registry automatically.

### Key fields:
- **`id`** — unique string, used in localStorage and the store
- **`label`** — display name in the dropdown
- **`icon`** — any lucide-svelte icon component
- **`cssClass`** — class applied to `<html>` (must match your CSS selector); `null` = no class (light default)
- **`resolvesDark`** — `true` if this theme should be used when the OS reports dark mode and user has "System" selected

## Advanced: Themes with Effects

The **Notebook** theme shows what's possible beyond color tokens:

| File | What it adds |
|------|-------------|
| `notebook.css` | Color token overrides (parchment tones) |
| `notebook-effects.css` | Grid background, Patrick Hand font, SVG doodles, card wobble, sketchy borders |
| `app.html` | SVG filter definitions (`#sketch-border`, `#sketch-circle`) and Google Fonts `<link>` |

To add decorative effects to your theme:

1. Create a separate `mytheme-effects.css` file (keeps color-only portion simple)
2. Import it in `app.css` after your color file
3. If you need SVG filters, add `<svg>` definitions to `src/app.html` (inside `<body>`, hidden with `style="position:absolute;width:0;height:0"`)
4. If you need web fonts, add `<link>` tags to the `<head>` in `src/app.html`
5. For a custom Tailwind variant (e.g., `mytheme:` utilities), add to `app.css`:
   ```css
   @custom-variant mytheme (&:is(.mytheme *));
   ```

### Reduced-motion support

If your theme adds animations or transforms, include `prefers-reduced-motion` overrides:

```css
@media (prefers-reduced-motion: reduce) {
  .mytheme [data-slot="card"] {
    transform: none !important;
  }
}
```

## Token Reference

| Token | Used by |
|-------|---------|
| `--color-background` | Page body background |
| `--color-foreground` | Default text color |
| `--color-card` / `card-foreground` | Card, Dialog, Sheet surfaces |
| `--color-popover` / `popover-foreground` | Dropdown menus, tooltips |
| `--color-primary` / `primary-foreground` | CTA buttons, active nav links |
| `--color-secondary` / `secondary-foreground` | Secondary buttons, softer actions |
| `--color-muted` / `muted-foreground` | Disabled text, placeholder backgrounds |
| `--color-accent` / `accent-foreground` | Hover highlights, selected states |
| `--color-destructive` / `destructive-foreground` | Delete buttons, error states |
| `--color-success` / `success-foreground` | Save confirmations, valid inputs |
| `--color-warning` / `warning-foreground` | Caution alerts, limit warnings |
| `--color-info` / `info-foreground` | Informational badges, help text |
| `--color-border` | Default border on all elements (`@apply border-border`) |
| `--color-input` | Form input borders |
| `--color-ring` | Focus ring (keyboard navigation) |
| `--color-sidebar-*` | Sidebar component variants |
| `--radius` | Base border-radius for all rounded corners |

## Testing Checklist

After adding a theme, verify these pages render correctly:

- [ ] Home page (`/`)
- [ ] Character creation wizard (all steps)
- [ ] Character sheet (`/sheet/[id]`)
- [ ] Level-up page (`/sheet/[id]/level-up`)
- [ ] Theme persists after page reload
- [ ] `dark:` Tailwind utilities still work (check shadcn components)
- [ ] Mobile viewport (responsive layout, no overflow)
- [ ] `prefers-reduced-motion: reduce` (if theme has animations)

## Note About `app.html`

SVG filter definitions and the Google Fonts `<link>` for Patrick Hand live in `src/app.html`. These are inert when their theme isn't active (the CSS selectors don't match, so the filters/font are never used). Only modify `app.html` if your theme needs:
- SVG filters (for hand-drawn/distortion effects)
- External font loading
- Other DOM elements that must exist before CSS/JS loads
