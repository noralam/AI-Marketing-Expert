# Product Requirements Document
## AI Marketing Expert — WordPress Plugin
### AI-Powered Marketing Suite with Workflow Automation

---

**Date:** June 2026
**Status:** Active Development (v1.0.3.10)

---

## 1. Executive Summary

AI Marketing Expert is a WordPress plugin that empowers marketers, bloggers, and business owners to automate their entire content marketing operation using AI. The plugin consolidates five core marketing disciplines — email marketing, content generation, SEO, social media, and AI chatbot — into a single unified dashboard inside WordPress admin, with a shared AI provider layer and a cross-module Workflow Automation engine.

The plugin is actively under development at version 1.0.3.10. Five functional modules are live: Email Marketing (v2.0), Content Generator (v1.0), SEO (v1.0), Social Media (v1.0), and Chatbot (v1.0). The Workflow Automation module is planned as the next major addition, enabling users to chain actions across modules on a visual calendar schedule.

---

## 2. Problem Statement

Marketing teams and solo website owners face a constant struggle with content consistency. Creating and publishing content across multiple channels — blog, email, social media, SEO, and customer support — requires significant time, coordination, and creative energy. The typical workflow involves multiple disconnected tools: a writing tool, a scheduling tool, an email platform, a social media manager, and a live chat system. Nothing is connected, nothing is automated, and nothing lives inside WordPress.

AI Marketing Expert consolidates all of these into one plugin. The remaining gap is cross-module automation: users can generate a blog post, but cannot yet wire that action to automatically repurpose it as a social post and notify subscribers — all triggered on a schedule. The Workflow Automation module will close this gap.

---

## 3. Goals and Objectives

- Allow any WordPress user, regardless of technical skill, to manage email marketing, content generation, SEO, social media, and customer chat from one dashboard.
- Eliminate the need for multiple third-party marketing tools by consolidating all channels into one plugin.
- Leverage AI to generate high-quality, on-brand content on demand or on a schedule set by the user.
- Support multiple AI providers (Claude, GPT, Gemini, OpenRouter) through a shared provider connection layer.
- Provide a cross-module Workflow Automation engine that lets users chain actions across modules and schedule them on a calendar.
- Provide a clear history and audit log of all AI-generated and published content.
- Offer a meaningful free tier with transparent Pro upgrade paths for power users and agencies.

---

## 4. Target Users

**Primary: Small Business Owners**
Non-technical users who run their own WordPress site and want to automate marketing without hiring a team or learning complex tools.

**Secondary: Marketing Managers**
Professionals managing content for a brand who need a reliable scheduling and automation system that keeps output consistent without manual effort every day.

**Tertiary: Freelancers and Agencies**
WordPress developers and consultants who build and manage client sites and want to offer AI-powered marketing automation as a value-added service.

---

## 5. Core Modules

The plugin is structured as a modular system. Each module is independently activatable. All modules share the AI Provider connection layer, a common activity log, and the plugin dashboard.

---

### 5.1 Email Marketing Module *(v2.0 — Live)*

A full-featured CRM and email automation system built inside WordPress.

**Subscriber & Contact Management**
- Add, edit, delete, and bulk-manage subscribers
- Custom fields, tags, and list segmentation
- Import from CSV, WordPress users, or WooCommerce customers
- Subscriber profile view with full activity history and notes
- Public subscribe form via REST API endpoint

**Campaign Management**
- Create and schedule email campaigns
- Choose recipients by list, tag, or segment
- Track open rates, click rates, unsubscribes, and per-URL click metrics
- Campaign progress monitoring during live sends

**Email Automation (Funnels)**
- Build multi-step drip/funnel sequences with triggers
- Enroll and unenroll subscribers per funnel
- Funnel performance metrics

**Templates**
- Reusable HTML email templates with variable placeholders
- Template preview renderer
- Default templates seeded on plugin activation

**AI Tools**
- AI-generated subject lines, preview text, and copy improvement

**SMTP & Sending**
- Configure SMTP provider (host, port, auth)
- Test connection before saving
- Sends via WordPress `wp_mail` with SMTP override

**Free/Pro Limits**

| Feature | Free | Pro |
|---|---|---|
| Subscribers | 500 | Unlimited |
| Campaigns | 10/month | Unlimited |
| Automations | 1 funnel | Unlimited |
| Segmentation | Basic (lists/tags) | Advanced (custom fields, behavior) |
| A/B testing | — | ✓ |

---

### 5.2 Content Generator Module *(v1.0 — Live)*

AI-powered blog post creation with WordPress publishing integration.

**Article Generation**
- Generate full articles with title, introduction, body sections, and CTA
- SEO analysis per section (keyword density, readability)
- Configurable word count, tone, target keyword, categories, and tags
- AI image prompt generation (Pro)
- Multi-language generation (Pro)

**Presets & Brand Voices**
- Save generation presets for repeated use
- Define brand voice settings per preset

**Publishing**
- Save as WordPress draft or publish directly
- Scheduled publishing via WP cron

**Analytics**
- Article generation history and per-article stats
- Traffic trend integration (where available)

**Free/Pro Limits**

| Feature | Free | Pro |
|---|---|---|
| Articles | 10/month | Unlimited |
| Word count | Up to 1,500 | Up to 5,000 |
| Custom presets | — | ✓ |
| AI image prompts | — | ✓ |
| Multi-language | — | ✓ |

---

### 5.3 SEO Module *(v1.0 — Live)*

Comprehensive AI-powered SEO intelligence and on-page optimization.

**Keyword Research & Vault**
- Research keywords via AI analysis
- Save keywords to a persistent vault
- Tier-based keyword limits (free vs. Pro)

**On-Page SEO Audits**
- Audit any WordPress post or page
- Auto-audit triggered on post save
- Structured report saved as a private WordPress post
- Site-wide audit batch (Pro)

**Topical Authority Mapping** *(Pro)*
- Build pillar + cluster content maps
- Visualize topical coverage

**Content Calendar** *(Pro)*
- Plan content around keyword targets
- Integrate with the Content Generator module

**Rank Tracking** *(Pro)*
- Track keyword rankings daily (auto-check via cron)
- Historical rank trend charts

**Link Building Pipeline** *(Pro)*
- AI-powered outreach suggestions
- Link prospect management

**Advanced Features** *(Pro)*
- Entity SEO and schema suggestions
- Competitor gap analysis
- CSV and PDF export

**Free/Pro Limits**

| Feature | Free | Pro |
|---|---|---|
| Keywords/month | 10 | Unlimited |
| Keyword vault | 50 | Unlimited |
| Audits | 5/month | Unlimited |
| Rank tracking | — | Unlimited |
| Topical authority | — | ✓ |
| Competitor analysis | — | ✓ |

---

### 5.4 Social Media Module *(v1.0 — Live)*

Multi-platform social media scheduling and AI-powered content management.

**Account Management**
- Connect accounts via OAuth: Facebook, Instagram, X/Twitter
- Manual credential entry option
- Disconnect accounts at any time

**Post Creation & Scheduling**
- Compose posts for one or multiple accounts
- Publish immediately or schedule for later
- Scheduled posts processed via 5-minute WP cron interval
- Visual drag-and-drop calendar (Pro)

**AI Tools**
- AI caption generation per platform
- AI hashtag suggestion
- Repurpose blog articles as social posts (Pro)

**Bulk Scheduling** *(Pro)*
- Upload and schedule multiple posts at once
- Cross-posting across accounts in one action

**Analytics**
- Engagement metrics (likes, comments, shares)
- Reach and impressions per post

**Free/Pro Limits**

| Feature | Free | Pro |
|---|---|---|
| Accounts | 2 | Unlimited |
| Posts/month | 30 | Unlimited |
| Scheduled posts | 3 | Unlimited |
| Visual calendar | — | ✓ |
| AI repurposing | — | ✓ |
| Bulk scheduling | — | ✓ |

---

### 5.5 Chatbot Module *(v1.0 — Live)*

AI-powered customer service chatbot with knowledge base, lead capture, and public widget.

**Bot Management**
- Create multiple chatbot instances per site
- Configure system prompt, personality, and widget appearance
- Custom CSS theming (Pro)

**Conversations**
- Visitor-facing chat via embedded frontend widget
- Admin view of all conversations with full message history
- Human agent takeover (Pro)
- Business hours and offline message configuration (Pro)

**Knowledge Base**
- Index custom documents, URLs, and WooCommerce products
- Knowledge retrieval improves AI answer accuracy
- Document and URL indexing limited to Pro

**Lead Capture**
- Configurable lead capture forms inside the chat widget
- Captured leads stored as subscribers (integrates with Email Marketing module)

**Public Integration**
- `[aime_discussions]` shortcode for public discussions page
- Embeddable widget on any WordPress page

**Analytics**
- Conversation count and trends
- Visitor satisfaction rating
- Most discussed topics (Pro)

**Free/Pro Limits**

| Feature | Free | Pro |
|---|---|---|
| Chatbots | 1 | Unlimited |
| Conversations/month | 100 | Unlimited |
| Knowledge base | — | ✓ (docs, URLs, WooCommerce) |
| Human takeover | — | ✓ |
| Custom CSS | — | ✓ |
| Business hours | — | ✓ |

---

### 5.6 Workflow Automation Module *(Planned — Next Milestone)*

A cross-module automation engine that lets users chain actions from any module into scheduled workflows. This is the central orchestration layer that connects all five modules.

#### 5.6.1 Workflow Builder

Users create named workflows from a dedicated dashboard page. Each workflow is a sequence of one or more ordered action steps that execute automatically on a schedule.

A workflow contains:
- Name and optional description
- Status: active, paused, or draft
- One or more ordered action steps
- A trigger: scheduled time, or event-based (e.g., "when a new post is published")
- An optional topic/context prompt passed to all AI actions in the workflow

**Example workflows:**
- *Weekly Content Push*: Generate blog post → repurpose as social caption → send subscriber email
- *SEO Weekly Digest*: Run SEO audit on latest post → email results to admin
- *Daily Social*: Generate and publish a social caption every morning at 9am
- *New Subscriber Welcome*: On subscriber join → enroll in email funnel

#### 5.6.2 Calendar Scheduling Interface

A full calendar view inside the WordPress admin for managing workflow schedules.

- Click any date/time slot to schedule or reschedule a workflow
- Set one-time or recurring schedules (daily, weekly, monthly, custom)
- Drag and drop to reschedule tasks
- View all upcoming executions across all workflows in a single unified calendar
- Color-code workflows by type or module
- Month, week, and day calendar views

#### 5.6.3 Action Types

Each step in a workflow is assigned one action type:

| Action Type | Module | Description |
|---|---|---|
| **Generate Blog Post** | Content Generator | AI writes a full post; saved as draft or published |
| **Send Email Campaign** | Email Marketing | AI writes and sends an email to a defined list |
| **Publish Social Post** | Social Media | AI writes a caption and schedules it to connected accounts |
| **Run SEO Audit** | SEO | Audits a selected post/page; saves report |
| **Enroll in Funnel** | Email Marketing | Enrolls a list segment in an automation sequence |
| **Generate Ad Copy** | Content Generator | AI generates ad copy variations; saved as draft CPT |
| **Custom Prompt** | AI (any) | User writes a free-form prompt; output saved to a chosen destination |

#### 5.6.4 Action Step Configuration

Each action step has:
- Action type selector
- Module-specific settings (e.g., word count for blog post, recipient list for email)
- AI tone and writing style override (or inherit from workflow-level setting)
- Output destination (publish, draft, specific list, specific social account)
- Conditional logic: run step only if previous step succeeded (Pro)

#### 5.6.5 Execution Engine

Workflows are executed via WP cron background jobs.

- At scheduled time, the plugin fires the workflow execution job
- Each action step runs in sequence
- If a step fails, the workflow can be configured to: stop, skip to next step, or retry
- Retry logic: up to 3 attempts per failed step with exponential backoff
- Failed executions log the error and send an admin notification

#### 5.6.6 Workflow History & Logs

Every workflow execution is logged in a History view:

- Date and time of execution
- Workflow name and trigger
- Per-step status (success, failed, skipped)
- Content preview per step (generated text, email subject, social caption)
- Links to published posts, sent campaign records, or saved outputs
- Manual re-run button for failed executions

#### 5.6.7 Workflow Templates Library *(Pro)*

Pre-built workflow templates for common marketing use cases:
- Weekly Blog + Social Combo
- Monthly Newsletter
- New Product Launch Sequence
- Daily SEO Digest

#### 5.6.8 Free/Pro Limits

| Feature | Free | Pro |
|---|---|---|
| Active workflows | 1 | Unlimited |
| Action steps per workflow | 2 | Unlimited |
| Recurring schedules | Weekly only | Daily, weekly, monthly, custom |
| Conditional step logic | — | ✓ |
| Workflow templates | — | ✓ |
| Cross-module action chains | Basic (2 modules) | All modules |

---

### 5.7 AI Provider Layer *(Live)*

All modules share a single AI provider connection system.

**Supported providers:**
- Anthropic Claude
- OpenAI GPT
- Google Gemini
- OpenRouter (access to multiple models via one key)

**Connection management:**
- Add multiple named connections
- Test connection before saving
- Fetch available models from provider API
- Delete or replace connections at any time
- Modules select which connection to use in their settings

**API key security:**
- Keys encrypted at rest in the WordPress database
- Support for loading keys from PHP constants or environment variables in production

---

## 6. User Interface

### 6.1 Plugin Dashboard

The main plugin page shows:
- Summary stats from all active modules
- Upcoming scheduled tasks for the next 7 days (once Workflow module is live)
- Per-module activity trend charts (7–90 day range)
- Quick links to each module and to create a new workflow

### 6.2 Module Navigation

Each module has its own WordPress admin submenu page. The React frontend renders the correct module view based on the active submenu slug. All module views are full single-page applications consuming the REST API.

### 6.3 Workflow Creation Screen *(Planned)*

Step-by-step wizard:
1. Name the workflow and set an optional topic/context
2. Add action steps (choose type, configure settings for each step)
3. Set AI tone and writing style
4. Open the calendar to set the schedule and recurrence
5. Save and activate

### 6.4 Calendar View *(Planned)*

Full-page calendar showing all scheduled workflow executions. Clicking an event opens a summary panel with edit, pause, and delete options.

### 6.5 Settings Screen

- AI provider connections (add, test, delete)
- Default tone and brand voice
- Email SMTP configuration
- Social media OAuth connections
- Notification preferences (failure alerts, weekly summary)
- Global API key management (for external access)

---

## 7. Integrations

| Service | Purpose | Status |
|---|---|---|
| Anthropic Claude | AI content generation | Live |
| OpenAI GPT | AI content generation | Live |
| Google Gemini | AI content generation | Live |
| OpenRouter | Multi-model AI access | Live |
| SMTP | Email sending (universal) | Live |
| Mailchimp | Email sending | Planned (Phase 2) |
| SendGrid | Email sending | Planned (Phase 2) |
| Meta Graph API | Facebook & Instagram posting | Live |
| X (Twitter) API | X/Twitter posting | Live |
| LinkedIn API | LinkedIn posting | Planned (Phase 2) |
| WordPress REST API | Blog post publishing | Live |
| WordPress wp-cron | Scheduled task execution | Live |
| WooCommerce | Customer import, product knowledge base | Live |

---

## 8. Technical Requirements

### 8.1 WordPress Compatibility
- Minimum WordPress version: 6.2
- PHP minimum version: 8.0
- Recommended PHP version: 8.2 or higher
- Plugin version: 1.0.3.10

### 8.2 Data Storage

All plugin data is stored in custom WordPress database tables prefixed `wp_aime_*`.

**Core tables:**

| Table | Purpose |
|---|---|
| `aime_modules` | Module registry (id, status, settings, activation time) |
| `aime_log` | Plugin-wide activity log (level, module, message, context) |

**Email Marketing tables:**

| Table | Purpose |
|---|---|
| `aime_subscribers` | Contact records (email, name, status) |
| `aime_subscriber_meta` | Custom field values per subscriber |
| `aime_subscriber_pivot` | Junction: subscribers to lists/tags |
| `aime_subscriber_notes` | Notes on subscribers |
| `aime_lists` | Email list definitions |
| `aime_tags` | Tags for segmentation |
| `aime_custom_fields` | Custom field schema |
| `aime_campaigns` | Campaign metadata |
| `aime_campaign_emails` | Individual send records with open/click tracking |
| `aime_campaign_url_metrics` | Per-URL click counts |
| `aime_url_stores` | Tracking/shortened URLs |
| `aime_templates` | Email templates (HTML, text, variables) |
| `aime_funnels` | Automation sequence definitions |
| `aime_funnel_sequences` | Steps within a funnel |
| `aime_funnel_subscribers` | Subscriber enrollment per funnel |
| `aime_funnel_metrics` | Funnel performance data |
| `aime_companies` | CRM company records |
| `aime_activity_log` | Full audit trail |

**Chatbot tables:**

| Table | Purpose |
|---|---|
| `aime_chatbot_bots` | Bot instances (prompt, widget config) |
| `aime_chatbot_conversations` | Visitor conversations |
| `aime_chatbot_messages` | Individual messages |
| `aime_chatbot_knowledge` | Knowledge base items (docs, URLs, products) |
| `aime_chatbot_analytics` | Aggregated conversation metrics |

**Content Generator:** Content stored as WordPress posts with meta.

**SEO Module:** Keyword vault and audit data stored as WordPress post meta and custom option records.

**Social Media Module:** OAuth tokens and scheduled post state stored in WordPress options.

**Workflow Module (Planned):**

| Table | Purpose |
|---|---|
| `aime_workflows` | Workflow definitions (name, status, schedule, topic) |
| `aime_workflow_steps` | Ordered action steps per workflow |
| `aime_workflow_executions` | Execution history records |
| `aime_workflow_outputs` | Generated content previews and references per execution |

### 8.3 Security
- API keys encrypted at rest (AES-256 via the Encryption class)
- Support for loading keys from PHP constants or environment variables
- OAuth tokens stored securely with automatic refresh
- All admin REST endpoints require `manage_options` capability
- All plugin output sanitized before storage and display
- Input validated at REST API boundaries

### 8.4 Performance
- Workflow and email execution runs as WP cron background processes
- AI API calls are non-blocking (fire from cron, not from page requests)
- Failed executions do not block other scheduled tasks
- No plugin queries added to front-end page requests
- 5-minute cron interval for time-sensitive tasks (social publishing)
- Hourly and daily cron intervals for analytics and rank tracking

---

## 9. Workflow Automation — End-to-End Flow *(Planned Module)*

1. User installs the plugin and connects an AI provider via Settings — AI Providers.
2. User activates desired modules (Email, Content, Social, etc.) from the Modules screen.
3. User clicks "New Workflow" from the plugin dashboard or Workflow module page.
4. User names the workflow, adds action steps, and configures each step.
5. User opens the calendar, clicks a date/time, and sets recurrence.
6. User saves and activates the workflow.
7. At the scheduled time, WordPress cron fires the workflow execution job.
8. The plugin executes each step in order:
   - Builds the AI prompt using the workflow topic and any dynamic variables
   - Calls the configured AI provider
   - Delivers the output: publishes post, sends email, schedules social post, etc.
9. The full execution is logged in the Workflow History view with per-step status and content previews.
10. If a step fails, the plugin retries up to 3 times and sends the user an admin notification.

---

## 10. Development Phases

### Phase 1 — Completed (v1.0.x)
- Email Marketing module (v2.0) — subscriber CRM, campaigns, automations, templates
- Content Generator module — AI article generation, SEO analysis, WordPress publishing
- SEO module — keyword research, on-page audits, rank tracking (Pro)
- Social Media module — account connection, scheduling, AI captions
- Chatbot module — AI chatbot, knowledge base, lead capture, frontend widget
- AI Provider layer — multi-provider connections (Claude, GPT, Gemini, OpenRouter)
- Plugin dashboard with unified stats and activity trends
- Pro feature gating system
- Module enable/disable system

### Phase 2 — Current Sprint
- Workflow Automation module — cross-module workflow builder, calendar scheduling, execution engine, history log
- LinkedIn posting integration
- Mailchimp and SendGrid email sending integration
- SEO dedicated database tables (keyword vault, audit records)
- Social Media dedicated database tables (post history, account tokens)
- Workflow templates library (Pro)

### Phase 3 — Post-Phase 2
- Ad Copy action type in Workflow module
- A/B testing for AI-generated email content
- Team collaboration (assign workflows and tasks to users)
- Analytics dashboard — performance of AI-generated content across all modules
- WooCommerce product-specific marketing automation
- Workflow marketplace (share/sell workflow templates)
- AI learns from past performance to adjust content strategy

---

## 11. Success Metrics

| Metric | Target |
|---|---|
| Workflow creation rate | 80% of activated users create at least one workflow within 7 days of Workflow module launch |
| Workflow execution success rate | 95% of scheduled workflow executions complete without error |
| AI content acceptance rate | 70% of AI-generated posts published without manual edit |
| Time to first workflow | Under 10 minutes for average user |
| User retention (30-day) | 60% of users have at least one active module or workflow at day 30 |
| Email campaign open rate | Users average 25%+ open rate on AI-generated campaigns |
| Chatbot lead capture rate | 15%+ of chatbot conversations result in a captured lead |

---

## 12. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| AI provider API outage | Retry logic (up to 3 attempts); admin notification on failure; execution log with error detail |
| WordPress cron unreliability on low-traffic sites | Documentation recommends server-side cron; option to use Action Scheduler library |
| Social media API rate limits | Queue system spaces out posts; respects per-platform limits |
| OAuth token expiry | Tokens refreshed automatically; user alerted if re-auth needed |
| User data privacy (AI sending content to third-party APIs) | Clear privacy notice in onboarding; option to exclude sensitive data from AI prompts |
| Workflow steps from multiple modules failing independently | Per-step retry logic; conditional step execution (Pro); clear error reporting per step |
| Database table conflicts on multisite | Table prefix respects wpdb->prefix; tested on multisite configurations |

---

## 13. Future Vision

Beyond Phase 3, AI Marketing Expert has the potential to become a full marketing operating system inside WordPress:

- AI that learns from past performance metrics and automatically adjusts content strategy
- Native multilingual content generation
- Deep WooCommerce integration for product-specific marketing automation
- A workflow marketplace where users share and sell workflow templates
- Integration with WordPress's native AI infrastructure as it matures
- A/B testing of AI-generated content variations with automatic winner selection
- White-label mode for agencies managing multiple client sites

---

*Document reflects plugin state as of v1.0.3.10 (June 2026).*
*Maintained alongside active development — update this document when new features ship or scope changes.*
