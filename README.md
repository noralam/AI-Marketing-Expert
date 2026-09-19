<div align="center">

# AI Marketing Expert

**All-in-One AI-Powered Marketing Suite for WordPress**

[![WordPress](https://img.shields.io/badge/WordPress-6.2%2B-blue?logo=wordpress)](https://wordpress.org)
[![PHP](https://img.shields.io/badge/PHP-8.0%2B-777BB4?logo=php)](https://php.net)
[![License](https://img.shields.io/badge/License-GPL%20v2%2B-green)](https://www.gnu.org/licenses/gpl-2.0.html)
[![Version](https://img.shields.io/badge/Version-1.2.6-purple)](https://github.com/noralam/AI-Marketing-Expert)
[![Live Demo](https://img.shields.io/badge/Live-Plugin_Site-brightgreen?logo=wordpress)](https://wpthemespace.com/ai-marketing-expert/)

**Email Marketing · B2B Lead Finder · Content Generation · SEO · Social Media · AI Chatbot · Workflow Automation · WooCommerce Cart Recovery — All from Your WordPress Dashboard.**

[Features](#-features) • [Modules](#-modules) • [Installation](#-installation) • [Usage](#-usage) • [AI Providers](#-ai-providers) • [Live Demo](https://wpthemespace.com/ai-marketing-expert/) • [Contributing](#-contributing) • [Changelog](#-changelog)

</div>

---

## Overview

**AI Marketing Expert** is a comprehensive, modular WordPress plugin that empowers marketers, bloggers, and business owners to automate their entire marketing operation using AI. Instead of juggling a dozen different SaaS tools, you get **email marketing, B2B lead generation, content generation, SEO intelligence, social media management, AI chatbot, workflow automation, and WooCommerce abandoned cart recovery** — all inside your WordPress admin, sharing a single AI provider layer.

Whether you're a solo blogger, an e-commerce merchant, a small business owner, or an agency managing multiple client sites, AI Marketing Expert gives you enterprise-grade marketing automation without the enterprise price tag.

[![▶️ Watch Video Tutorial](https://img.shields.io/badge/Watch-Video_Tutorial-red?logo=youtube&logoColor=white)](https://www.youtube.com/watch?v=BiYoVVesf1s)

### Why AI Marketing Expert?

- **All-in-One** — No more switching between Mailchimp, Jasper, Semrush, Hootsuite, and Intercom. Everything lives in one plugin.
- **AI-Native** — Every module is built around AI from the ground up. Generate content, optimize SEO, craft social posts, and answer customer questions — all powered by your choice of AI provider.
- **Modular Architecture** — Activate only the modules you need. Each module is independently toggleable with its own settings and REST API.
- **Generous Free Tier** — Get real value without spending a dime. Upgrade to Pro only when you need more scale or advanced features.
- **Privacy-First** — Your API keys are encrypted at rest (AES-256-GCM authenticated encryption). No third-party data sharing. Self-hosted OAuth proxy for social media connections.

---

## Features

### Email Marketing Module
Full-featured CRM and email automation built inside WordPress.

- **Subscriber Management** — Add, edit, bulk-manage subscribers with custom fields, tags, and list segmentation
- **CSV Import** — Import subscribers from CSV, WordPress users, or WooCommerce customers
- **Campaign Creation** — Create, schedule, and send beautiful email campaigns with open/click tracking
- **Email Automation (Funnels)** — Build multi-step drip sequences with enrollment triggers
- **Reusable Templates** — HTML email templates with variable placeholders and preview renderer
- **AI Writing Assistant** — AI-generated subject lines, preview text, and copy improvement
- **SMTP Integration** — Multi-connection SMTP with fallback support (Gmail, Outlook, SES, SendGrid, Mailgun, and more)
- **Unsubscribe Compliance** — List-Unsubscribe and one-click unsubscribe headers

| Feature | Free | Pro |
|---------|------|-----|
| Subscribers | Unlimited | Unlimited |
| Campaigns/month | 30 | Unlimited |
| Automations | 2 funnels | Unlimited |
| Segmentation | Basic (lists/tags) | Advanced (custom fields, behavior) |
| A/B Testing | — | Yes |

### Content Generator Module
AI-powered blog post creation with WordPress publishing integration.

- **Article Generation** — Generate full articles with title, introduction, body sections, and CTA
- **Deep Humanize (Enhanced in 1.2.6)** — Rewrite and polish text with strict structural preservation of Table of Contents, Quick Answer boxes, FAQs, intro paragraphs, and media
- **Contextual Internal Linking (NEW in 1.2.6)** — Automatically scans existing articles and contextually injects natural internal links on publish
- **SEO Multi-Plugin Sync (NEW in 1.2.6)** — Synchronizes Focus Keyword, Meta Title, and Meta Description directly into Yoast SEO, Rank Math, and All-in-One SEO
- **SEO Analysis** — Per-section keyword density and readability scoring
- **Brand Voices** — Save generation presets with custom brand voice settings
- **Flexible Publishing** — Save as draft or publish directly; schedule via WP-Cron
- **Multi-Language** — Generate content in multiple languages (Pro)
- **AI Image Prompts** — Auto-generate image prompts for AI image tools (Pro)

| Feature | Free | Pro |
|---------|------|-----|
| Articles/month | 20 | Unlimited |
| Word count | Up to 2,000 | Up to 5,000 |
| Custom presets | — | Yes |
| AI image prompts | — | Yes |
| Multi-language | — | Yes |

### SEO Analyzer Module
Comprehensive AI-powered SEO intelligence and on-page optimization.

- **Keyword Research** — AI-powered keyword analysis with a persistent keyword vault
- **On-Page Audits** — Audit any post or page; auto-audit on save; site-wide batch audits (Pro)
- **Topical Authority** — Pillar + cluster content maps with visual coverage (Pro)
- **Content Calendar** — Plan content around keyword targets (Pro)
- **Rank Tracking** — Daily rank checks with historical trend charts (Pro)
- **Link Building** — AI-powered outreach suggestions and prospect management (Pro)
- **Entity SEO** — Schema suggestions and competitor gap analysis (Pro)

| Feature | Free | Pro |
|---------|------|-----|
| Keywords/month | 10 | Unlimited |
| Keyword vault | 50 | Unlimited |
| Audits | 5/month | Unlimited |
| Rank tracking | — | Unlimited |
| Topical authority | — | Yes |
| Competitor analysis | — | Yes |

### Social Media Module
Multi-platform social media scheduling and AI-powered content management.

- **Account Management** — Connect Facebook, Instagram, and X/Twitter via OAuth
- **Post Creation** — Compose posts for one or multiple accounts; publish immediately or schedule
- **AI Caption Generation** — Platform-optimized captions and hashtag suggestions
- **Visual Calendar** — Drag-and-drop scheduling interface (Pro)
- **Bulk Scheduling** — Upload and schedule multiple posts at once (Pro)
- **AI Repurposing** — Turn blog articles into social posts (Pro)
- **Analytics** — Engagement metrics, reach, and impressions per post

| Feature | Free | Pro |
|---------|------|-----|
| Connected accounts | 2 | Unlimited |
| Posts/month | 30 | Unlimited |
| Scheduled posts | 3 | Unlimited |
| Visual calendar | — | Yes |
| AI repurposing | — | Yes |
| Bulk scheduling | — | Yes |

### Chatbot Module
AI-powered customer service chatbot with knowledge base and lead capture.

- **Multiple Bots** — Create different chatbots per use case (Pro: unlimited)
- **Custom Personality** — Configure system prompt, tone, and widget appearance
- **Knowledge Base** — Index documents, URLs, and WooCommerce products for accurate answers (Pro)
- **Lead Capture** — Configurable forms inside the chat widget; leads become subscribers
- **Conversation History** — Full admin view with message transcripts and search
- **Human Takeover** — Escalate to a human agent when needed (Pro)
- **Public Shortcode** — `[aime_discussions]` for a public discussions page
- **Business Hours** — Configure availability and offline messaging (Pro)

| Feature | Free | Pro |
|---------|------|-----|
| Chatbots | 1 | Unlimited |
| Conversations/month | 100 | Unlimited |
| Knowledge base | — | Yes (docs, URLs, WooCommerce) |
| Human takeover | — | Yes |
| Custom CSS theming | — | Yes |
| Business hours | — | Yes |

### 🛒 WooCommerce Cart Abandonment & Recovery Engine (NEW in 1.2.6)
Recover lost store sales automatically without paying for separate high-cost SaaS tools.

- **Real-Time Session Tracking** — Tracks both logged-in users and guest shoppers across browsing sessions using secure tokens (`aime_cart_token`).
- **Guest Checkout AJAX Capture** — Automatically captures guest email, name, and phone number in the background the moment they type into checkout fields.
- **Background Inactivity Detection** — Automated WP-Cron detects inactive sessions (configurable, default 30 mins) and marks them as abandoned.
- **1-Click Cart Restoration Deep Links** — Generates encrypted restoration links (`{event.recovery_url}`) that reload items, variations, and quantities in 1-click and direct shoppers straight to checkout.
- **Order Recovery Detection** — Automatically detects when a customer completes their order, marking carts as `recovered` and attributing recovered revenue.
- **Universal Workflow Integration** — Fires `WooCommerce Cart Abandoned` and `WooCommerce Order Completed` events into Workflow Automation for personalized email sequences.

| Feature | Free | Pro |
|---------|------|-----|
| Real-time cart tracking | Yes | Yes |
| Guest checkout AJAX capture | Yes | Yes |
| 1-Click recovery URLs | Yes | Yes |
| Recovery automation workflows | 1 active sequence | Unlimited multi-step sequences |
| Timed wait/delay intervals | Seconds, Minutes, Hours, Days | Seconds, Minutes, Hours, Days |
| Auto order recovery attribution | Yes | Yes |

### Workflow Automation (Free + Pro)

Chain actions from every module into scheduled, automated marketing workflows — like a built-in Zapier for your WordPress marketing stack.

- **Visual Workflow Builder** — Canvas-based visual step editor with drag-and-drop branching and real-time execution graphs
- **Text-to-Workflow AI Generator (NEW in 1.2.6)** — Describe your automation in plain natural language (English or Bengali) or pick from 8 high-converting recipes, and AI builds the entire canvas graph automatically
- **Wait / Delay Step (NEW in 1.2.6)** — Pause workflow execution between steps for seconds, minutes, hours, or days (e.g. Abandoned Cart -> Wait 1 Hour -> Send Email 1 -> Wait 24 Hours -> Send Email 2)
- **Direct Email Sending** — Dispatch instant emails using your configured multi-connection SMTP pool with dynamic token substitution
- **E-Commerce Triggers** — WooCommerce Cart Abandoned and WooCommerce Order Completed with minimum value filters and recovery URLs
- **Lead & Event Triggers** — Inbound Webhook, Contact Form 7 Submission, User Registered, Comment Posted, New Subscriber, and Post Published
- **Schedule Triggers** — Once, hourly, daily, weekly, monthly, or custom intervals
- **Conditional Logic** — Branch workflows with Yes/No paths based on upstream step results, text matches, or numeric score comparisons (Pro)
- **Pre-Built Blueprint Templates** — Instant starter blueprints including Cart Recovery, Post-Purchase Review Requests, CF7 Auto-Responders, and Content Repurposing engines

| Feature | Free | Pro |
|---------|------|-----|
| Active workflows | 2 | Unlimited |
| Steps per workflow | 3 | Unlimited |
| Runs/month | 30 | Unlimited |
| Schedule types | Weekly | Daily, weekly, monthly, custom interval, once |
| Event triggers | All core triggers | All core & webhook triggers |
| Conditional logic | — | Yes |
| Pre-built templates | Starter blueprints | Full template library |

---

## AI Providers

All modules share one AI provider system. Add multiple connections and assign them per module.

| Provider | Models | Status |
|----------|--------|--------|
| **OpenAI (ChatGPT)** | GPT-4o, GPT-4o mini, o3-mini, GPT Image and more | Live |
| **Anthropic Claude** | Claude 4 Sonnet, Claude 3.5 Haiku, Claude 3 Opus and more | Live |
| **Google AI Studio** | Gemini 2.5 Pro, Gemini 2.5 Flash, Gemma 3 and more | Live |
| **OpenRouter** | 200+ models through one API (Llama, Mistral, DeepSeek, and more) | Live |
| **Custom Provider** | Any OpenAI-compatible or Anthropic-compatible endpoint | Live |

API keys are encrypted at rest using **AES-256-GCM authenticated encryption** with WordPress salt-derived keys. Keys can also be loaded from PHP constants or environment variables for production security.

---

## Installation

### From WordPress Admin
1. Go to **Plugins → Add New**
2. Search for "AI Marketing Expert"
3. Click **Install Now** and then **Activate**
4. Go to **AI Marketing** in your WordPress admin menu

### Manual Installation
1. Download the plugin and upload the `ai-marketing-expert` folder to `/wp-content/plugins/`
2. Activate the plugin through the **Plugins** screen
3. Navigate to **AI Marketing** in the admin menu to configure

### Requirements
- **WordPress:** 6.2 or higher
- **PHP:** 8.0 or higher
- **MySQL:** 5.7+ or MariaDB 10.3+

---

## Usage

### Quick Start
1. **Activate** the plugin and go to **AI Marketing → Dashboard**
2. **Configure an AI Provider** (Settings → AI Providers) — Add at least one AI connection (Google AI Studio, OpenAI, Anthropic, or OpenRouter)
3. **Enable Modules** — Go to **Modules** and activate the ones you need
4. **Start Creating** — Each module has its own submenu with full documentation inline

### Dashboard
The main dashboard shows summary stats from all active modules, activity trend charts (7–90 day range), and quick links to each module.

### Settings
- **AI Provider Connections** — Add, test, and manage multiple AI provider connections with fallback ordering
- **SMTP Configuration** — Set up email sending with multi-connection fallback
- **Social Media OAuth** — Connect Facebook, Instagram, and X/Twitter accounts
- **Global API Keys** — Manage external API access
- **Notification Preferences** — Failure alerts and weekly summaries

---

## Architecture

```
ai-marketing-expert/
├── ai-marketing-expert.php      # Main plugin file (entry point)
├── includes/                    # Core framework
│   ├── autoload.php             # PSR-4 autoloader
│   ├── class-plugin.php         # Singleton main class
│   ├── class-module-manager.php # Module discovery & registration
│   ├── class-admin.php          # Admin menus & enqueuing
│   ├── class-rest-api.php       # REST API base controller
│   ├── class-database.php       # Migration manager (dbDelta)
│   ├── class-ai-provider.php    # Multi-provider AI connection layer
│   ├── class-smtp-provider.php  # Multi-connection SMTP with fallback
│   ├── class-encryption.php     # AES-256-GCM encryption for secrets
│   ├── class-email-validator.php# Email validation & disposable blocking
│   ├── class-activator.php      # Activation hooks
│   ├── class-deactivator.php    # Deactivation & cleanup
│   └── helpers.php              # Global helper functions
├── modules/                     # Plugin modules
│   ├── chatbot/                 # AI Chatbot module
│   ├── content-generator/       # Content Generation module
│   ├── email-marketing/         # Email Marketing module
│   ├── seo/                     # SEO Analyzer module
│   ├── social-media/            # Social Media module
│   └── workflow-automation/     # Workflow Automation module
├── src/                         # React frontend
│   ├── App.jsx                  # Main React app
│   ├── components/              # Shared UI components
│   ├── hooks/                   # Custom React hooks
│   ├── utils/                   # Utility functions
│   └── chatbot-widget/          # Public chatbot widget
├── build/                       # Compiled assets (Webpack)
├── assets/                      # Static assets (CSS, images)
├── oauth-proxy/                 # OAuth proxy server (Node.js)
└── languages/                   # Translation files
```

### Technology Stack
- **Backend:** PHP 8.0+, WordPress plugin API, MySQL custom tables
- **Frontend:** React 18, WordPress Scripts (`@wordpress/scripts`), Recharts, XYFlow
- **OAuth Proxy:** Node.js, Express, Helmet, Axios (separate deployment)
- **Build:** Webpack via `@wordpress/scripts`

---

## OAuth Proxy Deployment

The social media module requires an OAuth proxy server for Facebook, Instagram, and X/Twitter authentication.

```bash
cd oauth-proxy
cp env.example .env
# Edit .env with your app credentials
npm install
npm start  # Runs on port 3000
```

**Required environment variables:**
- `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET`
- `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET`
- `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET`
- `CALLBACK_URL` — Public URL where the proxy is hosted

---

## Development

### Prerequisites
- Node.js 18+
- Composer (for PHP dependencies, if any)
- Local WordPress environment (Laragon, LocalWP, or similar)

### Setup
```bash
# Install JavaScript dependencies
npm install

# Build for production
npm run build

# Development mode with hot-reload
npm run start

# Lint JavaScript and CSS
npm run lint:js
npm run lint:css
```

### Build Scripts
| Command | Description |
|---------|-------------|
| `npm run build` | Production build via `@wordpress/scripts` |
| `npm run start` | Development build with file watching |
| `npm run lint:js` | ESLint for JavaScript |
| `npm run lint:css` | Stylelint for CSS |
| `npm run plugin-zip` | Create a distributable zip file |

---

## Changelog

### 1.2.6
* **New: WooCommerce Abandoned Cart Recovery Engine** — Real-time cart session tracking, guest checkout email capture via background AJAX, automated 15-minute cron inactivity detection, and encrypted 1-click cart restoration deep links directly to checkout.
* **New: Workflow Delay / Wait Step** — Pause execution between automation nodes for seconds, minutes, hours, or days (e.g., Cart Abandoned -> Wait 1 Hour -> Send Recovery Email).
* **New: Direct Email Send Action** — Dispatch instant, personalized emails with SMTP multi-connection rotation and dynamic workflow tokens (`{event.recovery_url}`, `{event.customer_name}`, `{event.product_names}`).
* **New: E-Commerce & Event Triggers** — Added WooCommerce Cart Abandoned, WooCommerce Order Completed, User Registered, Approved Comment Posted, Contact Form 7 Submission, and Inbound Webhook triggers.
* **New: Text-to-Workflow AI Generator** — Natural language automation builder allowing users to describe their marketing workflows in plain text (English or Bengali) with 8 built-in high-converting recipes.
* **New: E-Commerce & Lead Workflow Templates** — Pre-built templates for Abandoned Cart Recovery, Post-Purchase Review Requests with timed delay, CF7 Lead Auto-Responders, and Inbound Webhook Ingestion.
* **New: Multi-Plugin SEO Postmeta Synchronization** — Automatic 1-click synchronization of generated SEO Title, Meta Description, and Focus Keyword into Yoast SEO, Rank Math, and All-in-One SEO (AIOSEO), plus lightweight frontend meta fallback.
* **New: Contextual Internal Link Engine** — Automatically discovers relevant published articles across your WordPress site and contextually injects natural internal links on publish.
* **New: B2B Lead Scraper & Verifier** — Enhanced lead prospecting with on-site contact extraction and live DNS MX deliverability verification.
* **Improved: Content Generator Deep Humanize** — Overhauled rewriter with strict structure protection to preserve Table of Contents (TOC), Quick Answer boxes, introductory paragraphs, and media elements without truncation or loss.
* **Improved: Settings Organization** — Consolidated Automation toggles (Auto SEO Optimize, Auto Generate Meta, Auto Generate Excerpt, Auto Internal Linking) into the Generation tab under Advanced settings for a smoother single-screen experience.
* **Improved: Workflow Blog Post & Ad Copy Actions** — Added Brand Voice selection, Content Presets, word count ceilings, multi-category taxonomy search, author assignment, and WooCommerce product rotation.
* **Improved: Facebook Publishing & Error #200 Hints** — Explicit actionable guidance for Facebook permissions (`pages_manage_posts`, `pages_read_engagement`), Page Access Token detection, and separated Instagram validation.
* **Improved: Unified Smart Usage & Quota Meter** — Real-time progress display for AI tokens, monthly runs, and feature quotas across module dashboards.

### 1.2.5
* **New: B2B Lead Finder & Autopilot Pipeline** — Discover, filter, and extract high-converting B2B prospects by role, industry, location, and company size with 1-click list collection and recurring autopilot sync.
* **New: LinkedIn Publishing & OAuth** — Connect LinkedIn personal and organization accounts to schedule and publish AI-generated business updates and articles directly.
* **New: Social Auto-Share on Publish** — Automatically generate tailored AI captions and schedule social posts across connected channels whenever a blog post or WooCommerce product is published.
* **New: 1-Click direct deep linking** from the WordPress dashboard widget into specific AI Chatbot conversation threads.
* **New: Interactive "Take Over" action link** directly inside the conversation view notice to immediately enable human agent takeover.
* **Improved: Chatbot conversation list table** now features clickable visitor links and full row cursor affordances.
* **Fixed: Sidebar navigation** now properly maintains the active state on "Conversations" when navigating into a single conversation.
* **New: Built-in IMAP bounce processing** service for automated email marketing deliverability and list hygiene.
* **Improved: Lead Finder UX** with responsive search filters, clean custom query layout, and direct Cold Outreach funnel integration.

### 1.2.4
* **Fixed: React crash** (Minified React Error #31) on the Subscribers page when tags or list objects contained non-string elements.
* **Fixed: Webhook subscriber rate limiting** now allows authenticated API key requests without hitting false 429 errors during bulk syncs or external integration imports.
* **Compatibility: Tested up to WordPress 7.1.**

### 1.2.3
* **New: AI Brain Skills** — Reusable rule blocks (SEO Strategist, Readability Coach, Image Director, Link Planner, WordPress Expert, Social Hook Writer) merged into strategist prompts.
* **New: Universal SEO Contract** — Enforces keyword placement, TOC, link minimums, and keyword image alts so RankMath/Yoast score green.
* **New: Global SEO Adapter** — Canonical SEO store synced to Yoast, Rank Math, All in One SEO, SEOPress, Slim SEO, and The SEO Framework.
* **New: Stock image controls** — Landscape orientation filter, automatic portrait skipping, duplicate avoidance within configurable reuse window.

### 1.2.2
* **New: Prompt Library** — Browse professionally written starting points for AI Brain, Custom AI Prompt, and blog Writing brief.
* **New: Multi-category blog generation** and token chips under token-capable fields.

### 1.2.1
* **Fixed: Chatbot widget** display and mobile layout fixes.
* **Fixed: Email A/B testing** and automation double email edge-case.

### 1.2.0
* **New: Workflow Automation module** for visual multi-step marketing orchestration.
* **New: Multi-provider AI continuation** and stock image support.

### 1.1.1
* Fixed: campaign recipient count could double mid-send under concurrent processing (duplicate emails). Added a unique constraint on the send queue and a one-time de-duplication migration.
* Fixed: paused campaigns that were still resolving their audience could not be paused reliably.
* New: "End Campaign" button to fully stop an in-progress campaign and view its final status.
* New (Pro): provider feedback-loop webhooks to auto-move spam complaints to the Complaint list and hard bounces to the Bounced list.
* Improved: added List-Unsubscribe-Post (one-click unsubscribe) header for better deliverability.

### 1.1.0
* Initial public release on WordPress.org
* Email Marketing module: unlimited subscribers, 30 campaigns/month on free tier
* Content Generator module: AI article generation with SEO analysis
* SEO Analyzer module: keyword research, vault, rank tracking, and on-page audits
* Social Media module: Facebook, Instagram, and X/Twitter scheduling
* Chatbot module: AI customer support with lead capture
* Workflow Automation module: visual builder, cross-module actions, schedule and event triggers
* Multi-provider AI layer: OpenAI, Anthropic Claude, Google Gemini, OpenRouter
* AES-256-GCM authenticated encryption for API keys and SMTP credentials
* Hardened security: SSRF protection, HMAC-signed tracking URLs, secure OAuth flow
* React-based unified admin dashboard

### 1.0.3.12
- Hardened security and reliability across tracking, OAuth proxy, encryption, and AI provider flows
- Improved consistency between free-tier limits and Pro marketing copy

---

## Contributing

Contributions are welcome! Here's how you can help:

1. **Fork** the repository
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Guidelines
- Follow [WordPress Coding Standards](https://developer.wordpress.org/coding-standards/wordpress-coding-standards/)
- Use PHPDoc and JSDoc for documentation
- Write tests for new features where applicable
- Ensure backward compatibility

---

## Reporting Issues

Found a bug? Please [open an issue](https://github.com/noralam/AI-Marketing-Expert/issues) with:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs. actual behavior
- Screenshots or error logs (if applicable)
- WordPress version, PHP version, and plugin version

---

## License

This project is licensed under the **GNU General Public License v2 or later** — see the [LICENSE](https://www.gnu.org/licenses/gpl-2.0.html) file for details.

```
AI Marketing Expert — All-in-One AI-Powered Marketing Suite for WordPress
Copyright (C) 2026 Noor Alam

This program is free software; you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation; either version 2 of the License, or
(at your option) any later version.
```

---

## Acknowledgments

- Built with [@wordpress/scripts](https://www.npmjs.com/package/@wordpress/scripts)
- AI integrations powered by Anthropic, OpenAI, Google, and OpenRouter
- Icons by [WordPress Dashicons](https://developer.wordpress.org/resource/dashicons/)

---

<div align="center">
  
**Made with heart by [Noor Alam](https://wpthemespace.com)** · [WordPress Plugin](https://wpthemespace.com/ai-marketing-expert) · [Report Bug](https://github.com/noralam/AI-Marketing-Expert/issues) · [Request Feature](https://github.com/noralam/AI-Marketing-Expert/issues)

**Star this repository if you find it useful!**

</div>
