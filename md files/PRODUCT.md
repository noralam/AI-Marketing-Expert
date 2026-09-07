# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

No single primary user — confirmed by the maintainer that all four audiences are served equally and none takes priority when trade-offs appear:

- **Solo bloggers and creators** — one site, non-technical, low volume. Need defaults and guidance more than knobs.
- **Small business owners** — one site, revenue-focused, semi-technical. Care about outcome numbers over feature depth.
- **Freelancers and agencies** — many client sites, technical, high volume. Need density, speed, and reporting they can show a client.
- **WooCommerce store owners** — store data drives campaigns and content; need product- and customer-aware output.

All four work inside the WordPress admin, alongside their normal site-management work, not in a dedicated marketing app.

**Open decision:** because no audience was made primary, any surface that cannot serve novice and agency simultaneously must resolve this by progressive disclosure (safe default visible, depth on demand) rather than by silently picking one audience. Do not invent a primary user to settle a design argument.

## Product Purpose

Replace a stack of separate marketing SaaS subscriptions (email, AI writing, SEO, social scheduling, chat, automation) with one modular WordPress plugin, so that a site owner runs their whole marketing operation from the WordPress admin they already use.

Success is the user completing real marketing work — sending a campaign, publishing a generated article, fixing an SEO issue, scheduling a post — without leaving WordPress and without a second subscription.

## Positioning

Six AI-native marketing modules sharing one provider layer, where the user brings their own AI keys.

The mechanism a neighboring product cannot truthfully copy: the modules are not integrations with external services — they are complete implementations living in the site's own database, sharing a single AI provider abstraction, so subscriber data, content, and SEO history stay on the user's host and the AI cost is the user's own account, not a per-seat markup.

Modules are independently toggleable; the user activates only what they need.

## Operating Context

- Runs entirely inside `wp-admin`, as a plugin admin page alongside Posts, Media, and every other plugin's UI.
- The user arrives from the WordPress admin menu, usually mid-session while doing other site work — not as a destination app they open deliberately.
- Six modules: Email Marketing, Content Generator, SEO Analyzer, Social Media, AI Chatbot, Workflow Automation. Each has its own settings, REST namespace, and internal navigation.
- The plugin depends on the user having configured at least one AI provider key before most features produce anything. A freshly activated install has no subscribers, no campaigns, no content, and no SEO history.

### Overview dashboard specifically

Confirmed job of the Overview surface — two things, both true at once:

1. **Status check** — glance at what is running across modules, confirm nothing is broken, leave.
2. **Launchpad** — decide which of the six modules to work in today, and enter it.

It is not a reporting/ROI surface and not a recommendation engine. Scan speed and correct routing outrank depth.

## Capabilities and Constraints

**Confirmed capabilities**

- Email Marketing: subscribers with custom fields/tags/lists, CSV and WP/WooCommerce import, campaigns with open/click tracking, drip automations, reusable templates, multi-connection SMTP with fallback, unsubscribe compliance.
- Content Generator: full article generation, per-section SEO/readability scoring, brand-voice presets, draft or scheduled publishing.
- SEO Analyzer: keyword research with a persistent vault, on-page audits, rank tracking, topical authority mapping, content calendar, backlink prospecting, automation tasks.
- Social Media: scheduling and AI post composition via a self-hosted OAuth proxy.
- AI Chatbot: front-end live chat answering from site content.
- Workflow Automation: multi-step workflows with triggers, an engine, and run history.
- AI providers are user-supplied and swappable: OpenAI/ChatGPT, Anthropic Claude, Google Gemini, OpenRouter. Provider fallback ordering is user-configurable.
- API keys encrypted at rest (AES-256-GCM).
- Free and Pro tiers. Free tier is metered by explicit per-feature limits (campaigns/month, articles/month, active workflows, SEO topics, and similar); Pro lifts them.

**Technical constraints**

- WordPress 6.2+, PHP 8.0+, GPLv2-or-later.
- Admin UI is React (`@wordpress/scripts` build) mounted on a plugin admin page; server side is PHP with REST controllers per module.
- The UI renders inside `wp-admin` chrome the plugin does not control: the admin bar, the collapsible admin menu (which collapses at 960px and goes off-canvas at 782px), and the user's chosen WordPress admin color scheme.

**Distribution constraint (binding)**

- Distributed through the WordPress.org plugin repository and already approved there. WordPress.org plugin guidelines therefore govern: no loading assets from external CDNs, no admin-wide nagging or interference outside the plugin's own pages, correct enqueueing, GPL-compatible bundled resources, no obfuscated code.

**Undecided / not established**

- Whether the dashboard should read as native WordPress admin or carry its own visual identity — not confirmed by the user; belongs to visual-world work, not product truth.
- No specific accessibility standard was committed to by the user. Absence of a stated target is not permission to ship inaccessible UI; it means no product-specific requirement beyond the baseline was established.

## Brand Commitments

- Product name: **AI Marketing Expert**. Author: Noor Alam (wpthemespace.com). Text domain `ai-marketing-expert`.
- Product site: https://wpthemespace.com/ai-marketing-expert/
- Free/Pro split is a permanent, factual part of the product; Pro gating appears in the UI and must be designed for honestly rather than concealed.

## Evidence on Hand

- `README.md` and `readme.txt` carry the real feature inventory and the real Free-vs-Pro limit tables. Use these numbers; do not invent new ones.
- `includes/helpers.php` → `aime_free_limits()` is the authoritative source for free-tier caps.
- Live demo site exists at the product URL above.
- **Absent — must not be fabricated:** no testimonials, no named customers, no user counts, no install counts, no benchmark or performance claims, no case studies, no award or press mentions. No screenshots of real customer data.

## Product Principles

1. **The WordPress admin is the host, not the canvas.** Whatever is built has to survive the admin bar, a collapsing admin menu, and a user-chosen color scheme without breaking.
2. **Serve the novice by default, the agency on demand.** With no primary audience, depth is earned through progressive disclosure, never through a denser default.
3. **Empty is the normal first state.** Every surface is first seen with zero subscribers, zero campaigns, zero content, and possibly no AI key configured. That state is a design deliverable, not an edge case.
4. **Six modules, one product.** Consistency across modules outranks any single module's local cleverness; a user moving from Email to SEO should not have to relearn the interface.
5. **Honest metering.** Free limits and Pro boundaries are stated plainly at the point of use. No dark patterns, no fake scarcity, no nagging outside the plugin's own pages.

## Accessibility & Inclusion

No product-specific standard was established by the user. Baseline expectations still apply: the UI must remain usable at WordPress admin breakpoints, respect the user's admin color scheme contrast, and stay keyboard-operable, since it is embedded in an admin many users navigate by keyboard.
