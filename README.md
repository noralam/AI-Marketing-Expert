<div align="center">

# AI Marketing Expert

**All-in-One AI-Powered Marketing Suite for WordPress**

[![WordPress](https://img.shields.io/badge/WordPress-6.2%2B-blue?logo=wordpress)](https://wordpress.org)
[![PHP](https://img.shields.io/badge/PHP-8.0%2B-777BB4?logo=php)](https://php.net)
[![License](https://img.shields.io/badge/License-GPL%20v2%2B-green)](https://www.gnu.org/licenses/gpl-2.0.html)
[![Version](https://img.shields.io/badge/Version-1.1.1-purple)](https://github.com/noralam/AI-Marketing-Expert)
[![Live Demo](https://img.shields.io/badge/Live-Plugin_Site-brightgreen?logo=wordpress)](https://wpthemespace.com/ai-marketing-expert/)

**Email Marketing · Content Generation · SEO · Social Media · AI Chatbot · Workflow Automation — All from Your WordPress Dashboard.**

[Features](#-features) • [Modules](#-modules) • [Installation](#-installation) • [Usage](#-usage) • [AI Providers](#-ai-providers) • [Live Demo](https://wpthemespace.com/ai-marketing-expert/) • [Contributing](#-contributing) • [Changelog](#-changelog)

</div>

---

## Overview

**AI Marketing Expert** is a comprehensive, modular WordPress plugin that empowers marketers, bloggers, and business owners to automate their entire marketing operation using AI. Instead of juggling a dozen different SaaS tools, you get **email marketing, content generation, SEO intelligence, social media management, AI chatbot, and workflow automation** — all inside your WordPress admin, sharing a single AI provider layer.

Whether you're a solo blogger, a small business owner, or an agency managing multiple client sites, AI Marketing Expert gives you enterprise-grade marketing automation without the enterprise price tag.

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

### Workflow Automation (Free + Pro)

Chain actions from every module into scheduled, automated marketing workflows — like a built-in Zapier for your marketing stack.

- **Visual Workflow Builder** — Canvas-based step editor with drag-and-drop branching
- **Cross-Module Actions** — Generate content, send campaigns, post to social media, run SEO audits, enroll funnels, send notifications, and more
- **Schedule Triggers** — Once, hourly, daily, weekly, monthly, or custom interval
- **Event Triggers** — Fire workflows on subscriber creation, post publication, chatbot lead capture, and more
- **Manual Run** — Execute any workflow on demand with per-step run history
- **Conditional Logic** — Branch workflows based on step success/failure (Pro)
- **Template Library** — Pre-built workflows for common marketing use cases (Pro)

| Feature | Free | Pro |
|---------|------|-----|
| Active workflows | 2 | Unlimited |
| Steps per workflow | 3 | Unlimited |
| Runs/month | 30 | Unlimited |
| Schedule types | Weekly | Daily, weekly, monthly, custom interval, once |
| Event triggers | Subscriber created | All event triggers |
| Conditional logic | — | Yes |
| Templates | — | Yes |

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
