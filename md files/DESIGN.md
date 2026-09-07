---
name: AI Marketing Expert
description: Six AI marketing modules sharing one WordPress admin workspace, each room lit its own color.
colors:
  forest-green: "#1B5E20"
  forest-green-hover: "#145218"
  forest-green-wash: "rgba(27, 94, 32, 0.07)"
  leaf-green: "#2E7D32"
  leaf-green-wash: "rgba(46, 125, 50, 0.10)"
  studio-indigo: "#4338CA"
  studio-indigo-light: "#6366F1"
  studio-teal: "#0E7490"
  studio-teal-light: "#06B6D4"
  studio-crimson: "#BE123C"
  studio-crimson-light: "#E11D48"
  studio-amber: "#B45309"
  studio-amber-light: "#D97706"
  studio-violet: "#7C3AED"
  studio-violet-light: "#8B5CF6"
  pro-ember: "#FF6B35"
  signal-success: "#2E7D32"
  signal-warning: "#F9A825"
  signal-error: "#D32F2F"
  signal-info: "#1565C0"
  ink: "#1a2e1a"
  ink-light: "#5f7562"
  ink-muted: "#8fa893"
  hairline: "#d5e2d5"
  hairline-faint: "#e8f0e8"
  page-wash: "#f4f8f4"
  page-wash-deep: "#eaf2ea"
  surface: "#ffffff"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell, 'Helvetica Neue', sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.02em"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  xxl: "32px"
components:
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  card-header:
    padding: "16px 20px"
    typography: "{typography.title}"
  card-body:
    padding: "{spacing.lg}"
  stat-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  stat-value:
    typography: "{typography.display}"
    textColor: "{colors.ink}"
  stat-label:
    typography: "{typography.body}"
    textColor: "{colors.ink-light}"
  button-primary:
    backgroundColor: "{colors.forest-green}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
  button-primary-hover:
    backgroundColor: "{colors.forest-green-hover}"
  button-pro:
    backgroundColor: "{colors.pro-ember}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
  empty-state:
    textColor: "{colors.ink-light}"
    typography: "{typography.body}"
    padding: "32px 16px"
  sidebar:
    backgroundColor: "{colors.surface}"
    width: "250px"
  sidebar-collapsed:
    width: "64px"
---

# Design System: AI Marketing Expert

## Overview

**Creative North Star: "The Six-Room Studio"**

One building, six rooms, each lit its own color. The building never changes: same page wash, same card geometry, same hairline borders, same type scale, same sidebar. What changes when you walk into a room is the light. Content Generator is lit indigo, Social Media teal, Email Marketing crimson, SEO amber, Chatbot violet. Overview and Settings are the lobby, and the lobby is forest green — the house color.

This is not decoration; it is the system's load-bearing mechanism. Redefining the primary and accent tokens on the module wrapper cascades automatically to buttons, input focus rings, active tabs, the active sidebar item, and gradients — and because the wrapper also reassigns `--wp-admin-theme-color` and `--wp-components-color-accent`, WordPress's own toggles, checkboxes, and range sliders follow the room's light too. A native WP control inside the Email room is crimson without anyone styling that control.

The material is quiet. Surfaces are flat white on a pale green wash, separated by a single hairline. Depth is tonal, not cast: the page recedes because it is `#f4f8f4` and the card advances because it is `#ffffff`, not because anything floats. The green-tinted shadows that exist are near-invisible by design and stay that way. Density is moderate at rest and earns depth on demand — the system serves a solo blogger and an agency operator from the same screen, so the default is legible and the detail is reachable, never the reverse.

**Key Characteristics:**
- Forest green house color; five module accents spanning indigo → teal → crimson → amber → violet
- Accent cascade reaches WordPress-native controls, not just plugin controls
- Flat surfaces, 1px hairline structure, tonal layering for depth
- Small type (13px body) on a compact 4px-based rhythm — this is admin instrumentation, not marketing copy
- 12px default corner radius; nothing is sharp, nothing is a pill
- Lives inside `wp-admin` chrome it does not control

## Colors

A pale, cool-green environment holding one saturated accent at a time, where the accent identifies which of six rooms you are standing in.

### Primary
- **Forest Green** (`#1B5E20`): The house color. Owns Overview and Settings, and is the accent any surface inherits when no module wrapper overrides it. Primary buttons, active sidebar item, focus rings, link color.
- **Forest Green Hover** (`#145218`): The pressed and hovered state of anything Forest Green.
- **Forest Green Wash** (`rgba(27, 94, 32, 0.07)`): Selected rows, active tab backgrounds, disabled-card fill. Never used for text.
- **Leaf Green** (`#2E7D32`): The lighter partner in the house gradient, and the send-action color. Doubles as the success signal — deliberate, since in this product a successful send *is* the success.

### Secondary — the five room lights
Each is installed by `.aime-app-layout[data-module="..."]` and replaces Primary wholesale for the duration of that room.

- **Studio Indigo** (`#4338CA` / light `#6366F1`): Content Generator. Writing and drafting.
- **Studio Teal** (`#0E7490` / light `#06B6D4`): Social Media. Scheduling and channels.
- **Studio Crimson** (`#BE123C` / light `#E11D48`): Email Marketing. Sending — the highest-consequence room.
- **Studio Amber** (`#B45309` / light `#D97706`): SEO Analyzer. Audit and diagnosis.
- **Studio Violet** (`#7C3AED` / light `#8B5CF6`): Chatbot. Conversation.

### Tertiary
- **Pro Ember** (`#FF6B35`): The only warm orange in the system, reserved exclusively for Pro-tier surfaces — upgrade buttons, Pro badges, Pro feature headings. It is never a module accent and never a status. Its job is to be instantly identifiable as "this costs money."

### Neutral
- **Ink** (`#1a2e1a`): Primary text. A green-shifted near-black, not pure `#000` — it sits in the same family as the wash so text never reads as pasted onto the page.
- **Ink Light** (`#5f7562`): Secondary text, stat labels, page descriptions, empty-state copy.
- **Ink Muted** (`#8fa893`): Placeholder text, disabled labels, timestamps. The floor of legibility — nothing smaller than 13px should use it.
- **Hairline** (`#d5e2d5`): Every card edge, table rule, and divider. This is the system's primary structural device.
- **Hairline Faint** (`#e8f0e8`): Internal subdivisions inside an already-bordered container, so nested structure does not read as double-walled.
- **Page Wash** (`#f4f8f4`): The dashboard background. The recessed plane.
- **Page Wash Deep** (`#eaf2ea`): Table headers, inset panels, collapsed regions — a third tonal step down when a card needs an interior floor.
- **Surface** (`#ffffff`): Every card, panel, sidebar, and modal. The advanced plane.

### Status
- **Success** (`#2E7D32`) · **Warning** (`#F9A825`) · **Error** (`#D32F2F`) · **Info** (`#1565C0`), each with an 8%-alpha wash for badge and notice backgrounds.

### Named Rules

**The One Light Rule.** A room has exactly one accent. Within any module surface, the module's primary is the only saturated non-status color permitted. If a second accent appears — a hardcoded hex, a borrowed module color, an off-system gradient stop — the room has two lights and the system has broken. Audit test: grep the surface for hex literals; a compliant surface has none outside the `:root` and module-wrapper blocks.

**The Ember Reserve Rule.** `#FF6B35` means Pro and nothing else. It is never a chart series, never a status, never an accent, never a decorative highlight. If a surface uses ember for anything other than a Pro boundary, the upsell has been diluted and the user can no longer tell what costs money.

**The Cascade Rule.** New accent-colored UI reads `var(--aime-primary)` / `var(--aime-accent)`. It never hardcodes a module hex, because doing so silently opts that element out of the room lighting and it will be wrong in five of six rooms.

## Typography

**Font:** None is declared, and that is the decision. The system inherits WordPress admin's system stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif`), so the plugin's text is the same text as the rest of the admin. This is also the only WordPress.org-safe answer: a webfont would mean bundling or remote-loading a font file.

**Character:** Neutral, small, and dense — the voice of instrumentation rather than authorship. Hierarchy is carried almost entirely by weight and size, never by family contrast, because there is only one family. Weight does the work: 400 for reading, 600 for structure, 700 reserved for numbers.

### Hierarchy
- **Display** (700, 32px, 1.2): Stat values only. The single largest thing on any screen is always a number, never a heading.
- **Headline** (600, 22px, 1.3): Page title in `.aime-page-header h2`. One per screen.
- **Title** (600, 15px, 1.4): Card titles and section headings.
- **Body** (400, 13px, 1.5): The default. All UI text, table cells, descriptions, empty-state copy.
- **Label** (600, 11px, 0.02em): Eyebrows, badge text, column headers, sidebar section dividers. Often uppercase.

### Named Rules

**The Number Is The Headline Rule.** Display weight belongs to data, not to prose. A stat value at 32px/700 outranks the page title at 22px/600 on purpose — the user came to read the number. Never promote a heading above a metric in the same viewport.

**The 13px Floor Rule.** Body text is 13px. Text below 13px is permitted only at Label weight (600) and only for non-essential labels — never for content, values, or anything a user must read to make a decision. `#8fa893` muted text never goes below 13px at any weight.

## Layout

The shell is a two-part frame inside WordPress admin chrome the plugin does not own. A sticky 250px sidebar (collapsing to 64px, icons only) sits left of a scrolling content column, both offset upward by negative margins to swallow WP's default admin padding, with height computed as `calc(100vh - 32px)` to sit under the admin bar.

Content is a single column of full-width cards stacked with 20px gutters. Grids are always `repeat(auto-fill, minmax(<floor>, 1fr))` with a 16px gap — stats at a 200px floor, quick actions at 180px, module cards at 250px. Nothing is a fixed column count; the grid decides how many fit and reflows without a media query. This is the correct default and should stay the default.

Rhythm is 4px-based: 4 / 8 / 12 / 16 / 20 / 24 / 32, with 48px reserved for hero padding. Card headers are `16px 20px`; card bodies are `20px`; stat card interiors are `24px 16px`. Density is uniform — there is no compact mode, and adding one would be a new system, not a tweak.

**Breakpoints are normative and closed:** `480px` (single-column phone), `782px` (WordPress pushes the admin menu off-canvas), `960px` (WordPress auto-collapses the admin menu), `1280px` (wide desktop, optional two-up). These four exist because WordPress's own admin uses 782 and 960; matching them means the plugin reflows at the same instant the admin around it does.

### Named Rules

**The Four Doors Rule.** 480, 782, 960, 1280. No other breakpoint may be introduced. The incumbent stylesheet currently contains 35 media queries at eight different widths (480, 600, 640, 768, 782, 900, 1100, 1200) — this is drift, not a system, and each of those non-conforming values is a bug to migrate to its nearest door, not a precedent to follow.

**The Auto-Fill First Rule.** Reach for `minmax()` auto-fill before reaching for a media query. A grid that reflows on its own needs no breakpoint; most of the 35 existing queries exist because a fixed column count was chosen first.

**The Borrowed Chrome Rule.** The admin bar, the admin menu, and the user's chosen admin color scheme are not ours. Never assume a viewport width equals available width, never position anything `fixed` where it can collide with the admin bar, and always verify at 782px where the menu goes off-canvas and the content column suddenly gains ~160px.

## Elevation & Depth

**This system is flat, and structure is carried by the hairline border.** A card is a card because it has a `1px solid #d5e2d5` edge and a white fill on a `#f4f8f4` wash — not because it floats. The three-step tonal ladder (`#eaf2ea` inset floor → `#f4f8f4` page → `#ffffff` surface) is the depth model.

Shadows exist but are deliberately near-invisible: the resting shadow is `0 1px 3px rgba(27,94,32,0.04)` — a 4%-alpha green tint, closer to a soft edge-darkening than a cast shadow. They are green-tinted rather than neutral black so they read as part of the environment. The heavier steps in the ramp are for genuinely floating layers only: modals, popovers, dropdowns.

### Shadow Vocabulary
- **Resting** (`0 1px 3px rgba(27,94,32,0.04), 0 1px 2px rgba(0,0,0,0.03)`): Cards at rest. Should be barely perceptible; if you can see it clearly, it is wrong.
- **Raised** (`0 4px 12px rgba(27,94,32,0.06), 0 2px 4px rgba(0,0,0,0.03)`): Hover on an interactive card, sticky headers once scrolled.
- **Floating** (`0 12px 24px rgba(27,94,32,0.08), 0 4px 8px rgba(0,0,0,0.04)`): Dropdowns, popovers, menus.
- **Overlay** (`0 20px 40px rgba(27,94,32,0.10), 0 8px 16px rgba(0,0,0,0.05)`): Modals only.

### Named Rules

**The Hairline Carries It Rule.** Remove every shadow from a screen and the layout must remain completely legible. If structure collapses without shadows, the borders were doing too little. Shadow is confirmation, never construction.

**The Green Shadow Rule.** Shadows are tinted with the house green (`rgba(27,94,32,α)`), not neutral black. A `rgba(0,0,0,0.1)` shadow reads as a foreign object dropped onto this palette.

**The Two Steps Maximum Rule.** No element moves more than one step up the ramp on interaction, and only floating layers may start above Resting. Cards do not translate upward on hover in a flat system; if a card needs to signal interactivity, it shifts its border to the module accent.

## Shapes

Uniformly, gently rounded. The default corner is 12px (`--aime-radius`), used on every card, panel, and hero. Smaller controls — buttons, inputs, badges, select fields — take 8px. Large containers that need to read as a surface rather than a component take 16px. Icon tiles are 48×48 at 12px radius, matching the card corner so an icon reads as a miniature panel.

There are no pills, no sharp 0px corners, and no circles except for genuine avatars and status dots. Borders are always exactly 1px; there is no 2px border anywhere, and emphasis is achieved by changing border *color* to the module accent, never border width. Nothing is clipped, skewed, or masked into a non-rectangular silhouette.

### Named Rules

**The One Radius Family Rule.** 8 / 12 / 16 and nothing else. A 4px, 6px, 20px, or 999px radius is drift. Radius communicates scale of container, not importance of content.

**The Border Color, Not Border Width Rule.** To emphasize a container, shift its 1px border from `#d5e2d5` to `var(--aime-primary)`. Never thicken it. This keeps layout geometry stable across states — no 1px reflow jitter on hover.

## Components

### Cards
The system's fundamental unit and near-universal container.

- **Corner:** 12px (`--aime-radius`)
- **Background:** Surface white (`#ffffff`) on the page wash
- **Border:** 1px `#d5e2d5` — the structural element
- **Shadow:** Resting only; `transition: box-shadow` on hover
- **Header:** `16px 20px`, hairline bottom border, flex row with title left and actions right
- **Body:** `20px` padding
- **Interactive variant:** border shifts to `var(--aime-primary)` with an 8%-alpha accent glow. Uses `--aime-primary-rgb` for the alpha composition, which is why that RGB triplet exists as a token alongside the hex.

### Stat Cards
**One stat card pattern, not two.** The incumbent code carries two competing implementations — `.aime-stat-card` (centered, 32px value, no icon) and `.aime-stat-card-modern` (flex row, 48px icon tile, 28px value). This is a documented defect. The canonical pattern going forward is the **icon-row form**: a 48×48 accent-filled icon tile at 12px radius, left of a stacked value (Display) and label (Body, Ink Light), inside a standard 12px card with 20px padding. The centered variant is legacy; do not build new surfaces on it and migrate it when touching a screen that uses it.

### Buttons
Built on `@wordpress/components` `Button`, restyled through the token layer rather than replaced — so keyboard behavior, focus handling, and disabled semantics come from WordPress for free.

- **Shape:** 8px radius
- **Primary:** `var(--aime-primary)` fill, white text. Recolors per room automatically.
- **Hover:** `var(--aime-primary-hover)`, 0.2s `cubic-bezier(0.4, 0, 0.2, 1)`
- **Send / confirm:** Leaf Green (`#2E7D32`) — a destructive-adjacent action gets its own color because sending email is irreversible
- **Pro:** Pro Ember (`#FF6B35`) fill. Large variant: `12px 32px`, 15px text.
- **Secondary / ghost:** WordPress's own `variant="secondary"` and `variant="tertiary"`, unmodified

### Inputs / Fields
WordPress `components-*` controls, retinted so their focus ring is the room accent (via `--wp-components-color-accent`). Select inputs are constrained to a 180px minimum width. Focus treatment is WordPress's native ring — deliberately not replaced, since admin users navigate by keyboard and a custom ring would break the expectation set by every other admin screen.

### Navigation
A 250px sticky sidebar on Surface white with a hairline right edge, collapsing to 64px icons-only. Items are 13px Body; the active item is filled with the accent wash and its label goes 600. The sidebar scrolls independently at `calc(100vh - 32px)` under the admin bar. A separate internal sidebar handles within-module sections.

### Badges
11px/600 label type in an 8%-alpha status wash with matching text color, 8px radius. Status vocabulary: scheduled, overdue, missing, plus the four signal colors. The Pro badge is the smallest type in the system (9px/700) and is the one permitted exception to the 13px floor, because it is a marker rather than text.

### Empty States
Centered, `32px 16px` padding, 14px Ink Light copy, links in the room accent. **Every module ships empty on install** — no subscribers, no campaigns, no content, no SEO history, possibly no AI key — so this is a primary state, not a fallback. An empty state that only says "no data yet" is incomplete; it names what is missing and offers the one action that fills it.

### Pro Gate (signature component)
The system's most distinctive pattern: real content rendered blurred behind an `aria-hidden` layer, with a legible overlay message and an ember upgrade button on top. It shows the shape of what Pro unlocks rather than describing it. Because the blurred layer is decorative, it must stay out of the accessibility tree, and the overlay message must be the only thing a screen reader encounters.

## Do's and Don'ts

### Do:
- **Do** read `var(--aime-primary)` / `var(--aime-accent)` for anything accent-colored, so it lights correctly in all six rooms.
- **Do** define new containers with a 1px `#d5e2d5` border and Surface white on the page wash. Structure first, shadow never.
- **Do** use `repeat(auto-fill, minmax(<floor>, 1fr))` with a 16px gap before considering a media query.
- **Do** restyle `@wordpress/components` through tokens instead of building replacements — keyboard, focus, and disabled behavior come free and match the surrounding admin.
- **Do** set both `--wp-admin-theme-color` and `--wp-components-color-accent` when introducing a new room, or WordPress's native toggles and sliders will stay green inside a non-green module.
- **Do** stay on the 4px rhythm: 4 / 8 / 12 / 16 / 20 / 24 / 32.
- **Do** keep the 8 / 12 / 16 radius family.
- **Do** treat the empty state as the first thing a real user sees, and name the action that fills it.
- **Do** verify every surface at 782px, where WordPress moves the admin menu off-canvas and the content column jumps width.

### Don't:
- **Don't** introduce a breakpoint outside 480 / 782 / 960 / 1280. The eight widths currently in `global.scss` are drift to be migrated, not precedent.
- **Don't** build new stat displays on the centered `.aime-stat-card`. The icon-row form is canonical; two patterns for one job is the defect this file exists to stop.
- **Don't** use Pro Ember (`#FF6B35`) for anything except a Pro boundary.
- **Don't** thicken a border to show emphasis — change its color to the accent and keep it at 1px.
- **Don't** add a cast shadow to convey that something is a container, or translate a card upward on hover. This system is flat.
- **Don't** put essential text below 13px, or muted `#8fa893` text below 13px at any weight.
- **Don't** load fonts, icons, or any asset from an external CDN — WordPress.org guidelines prohibit it and the system deliberately inherits the admin's font stack.
- **Don't** nag or render plugin UI outside the plugin's own admin pages.
- **Don't** fabricate testimonials, user counts, install counts, or benchmark numbers in any surface. Free-tier limits come from `aime_free_limits()`; feature claims come from `readme.txt`.
