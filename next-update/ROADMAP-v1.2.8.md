# AI Marketing Expert (AIME) — v1.2.8 Master Release Roadmap
**Target Version:** `v1.2.8` (Current Active Version: `v1.2.7`)  
**Target Release Date:** October 2026  
**Document Location:** `ai-marketing-expert/next-update/ROADMAP-v1.2.8.md`  
**Classification:** Core Engineering Roadmap & Architectural Specification  
**Status:** Approved for Implementation  

---

## 1. Executive Overview & Version Clarification

### 1.1 Current vs. Upcoming Version
* **Current Released Version:** `1.2.7` (Defined in `ai-marketing-expert.php` as `AIME_VERSION = '1.2.7'`)
* **Upcoming Release Version:** `1.2.8`
* **Target Schema Version:** `AIME_EMAIL_DB_VERSION` bumped from `1.2.5` to `1.2.6` (for optional tracking columns).

### 1.2 Core Purpose of v1.2.8
Version `1.2.8` is an **Enterprise Deliverability, Lead Generation & Security Compliance Milestone**. It consolidates three major strategic upgrades into a single cohesive release without disturbing any other module (Content Generator, SEO Analyzer, Social Media, AI Chatbot, Workflow Automation, or Abandoned Cart):

1. **B2B Lead Finder Free Tier & Engine Optimization:**
   - Introduces a generous permanent **Free Tier (5 leads/day, up to 50 leads/month)** with a live in-app usage quota bar.
   - Solves the AI hallucination and duplicate exhaustion loop via persistent master page pointers.
   - Fully complies with WordPress.org Guideline #5 (functional freemium, no time-bomb expirations).
2. **Email Tracking Engine & Link Deliverability Overhaul:**
   - Fixes the aggressive `inject_tracking()` bug that corrupted `mailto:`, `tel:`, and anchor `#` links into broken HTTP redirects.
   - Introduces granular **per-campaign and per-funnel tracking toggles** (essential for cold outreach inbox placement).
   - Adds support for **Custom Tracking Domain (Branded CNAME)** to eliminate phishing/spamvertising alerts and hosting abuse suspensions.
   - Introduces an explicit, compliant **Onboarding Opt-In Consent Modal** (WordPress.org Guideline #7 & GDPR/CAN-SPAM compliance).
3. **Universal 4-Layer Deliverability & Bounce Shield:**
   - Real-time pre-flight DNS MX record validation (`checkdnsrr`) before dispatch with 24h transient caching.
   - Inbound webhook hardening with `hash_equals()` and rate limiting.
   - Autonomous Cloud ESP API Polling (for localhost and firewall-restricted sites).
   - Pure-PHP Socket IMAP/POP3 Mailbox Scanner (zero dependency on the removed/deprecated PHP `ext-imap`).
   - High-converting Free upgrade teaser card and comprehensive Pro deliverability controls.

---

## 2. Zero-Regression Architecture: Protecting Other Modules

To guarantee that version `1.2.8` has **zero negative impact** on existing features, the following architectural isolation rules are strictly enforced:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AI MARKETING EXPERT CORE                        │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│ Content Gen / SEO│       │ Chatbot / Social │       │ Email Marketing  │
│  (Isolated)      │       │  (Isolated)      │       │  (v1.2.8 Target) │
└──────────────────┘       └──────────────────┘       └─────────┬────────┘
                                                                │
                   ┌────────────────────────────────────────────┼───────────────────────────┐
                   ▼                                            ▼                           ▼
        [1. B2B Lead Finder]                        [2. Deliverability Shield]      [3. Tracking Engine]
        - Daily 5 Free Leads                        - Pre-Flight DNS MX Guard       - Skip non-HTTP links
        - Pro Autopilot Pipeline                    - Pure-PHP IMAP Scanner         - Per-campaign toggles
        - Domain Pre-Dedup                          - Cloud ESP Webhook/Poll        - Branded CNAME
```

### 2.1 Architectural Isolation Guarantees
1. **Module Independence:** All modifications are strictly encapsulated within `modules/email-marketing/` and email-specific services. `ModuleManager` ensures no cross-module variable leakage.
2. **Database Non-Destructive Migrations:**
   - Existing tables (`wp_aime_subscribers`, `wp_aime_campaigns`, `wp_aime_funnel_sequences`) are **never dropped or truncated**.
   - Any new column addition uses `dbDelta()` or guarded `ALTER TABLE` checks (`maybe_add_column`).
   - Existing subscriber statuses (`subscribed`, `unsubscribed`, `pending`) are strictly preserved. Only invalid contacts are updated to `'bounced'` or `'complained'`.
3. **Backward-Compatible REST APIs:**
   - Existing endpoints preserve all input signatures and return payloads.
   - New parameters (such as `page`, `per_page`, `track_clicks`, `track_opens`) default to sensible legacy values (`true` or `10`), ensuring older UI or third-party webhooks do not fail.
4. **Graceful Fallbacks:**
   - If an IMAP socket cannot connect, or an external DNS query times out, the system fails open or logs a warning without terminating email delivery.
   - If custom tracking domain is blank, the system automatically falls back to `home_url()`.

### 2.2 WordPress-First Native API Mandate (Strict Development Rule)
Whenever WordPress provides a native function, filter, class, or API, it **MUST be used first and foremost** before writing custom logic or importing third-party libraries:

1. **Database Schema & Migrations:**  
   Always use WordPress native `dbDelta()` from `wp-admin/includes/upgrade.php` and `maybe_add_column()` from `wp-admin/includes/upgrade.php`. Never execute raw destructive queries (`DROP`, `TRUNCATE`).
2. **HTTP Requests & External Integrations:**  
   Always use WordPress HTTP API (`wp_remote_get()`, `wp_remote_post()`, `wp_remote_retrieve_response_code()`, `wp_remote_retrieve_body()`). Never use raw `curl_exec` or `file_get_contents` for external HTTP communication.
3. **Data Storage & Transients:**  
   Always use WordPress Options API (`get_option()`, `update_option()`) and Transients API (`get_transient()`, `set_transient()`, `delete_transient()`) for caching DNS MX checks and usage quotas.
4. **Scheduled Events & Background Tasks:**  
   Always use WordPress Cron API (`wp_schedule_event()`, `wp_next_scheduled()`, `wp_clear_scheduled_hook()`).
5. **Hooks, Extensibility & Customization:**  
   Always expose actions and filters via `do_action()` and `apply_filters()` (e.g., `aime_free_lead_daily_limit`, `aime_track_clicks`, `aime_dns_mx_check`).
6. **Security & Capabilities:**  
   Always use WordPress capabilities (`current_user_can('manage_options')`), nonces (`wp_verify_nonce()`, `check_ajax_referer()`), and timing-safe string comparison (`hash_equals()`).
7. **Internationalization (i18n):**  
   Always wrap all user-facing strings in `__()`, `esc_html__()`, `esc_attr__()`, `_n()`, or `sprintf()` with text domain `'ai-marketing-expert'`.
8. **PHP Fallback Only When Unavoidable:**  
   Only when WordPress core does NOT provide a native mechanism (e.g. raw IMAP SSL socket protocol for RFC 3464 bounce parsing, or DNS MX checking `checkdnsrr`), use pure native PHP functions with robust error handlers and strict socket timeouts.

---

## 3. WordPress Security & Code Standards Checklist

Every line of code in v1.2.8 must pass strict WordPress Core Security & Coding Standards (WPCS):

| Security Principle | Implementation in v1.2.8 | Code Rule / Target |
| :--- | :--- | :--- |
| **Authentication & Authorization** | Every REST route enforces `permission_callback => [$this, 'admin_permission']` (`current_user_can('manage_options')`). | No unprotected admin endpoints. |
| **CSRF & Nonce Protection** | React admin views submit the standard `wpApiSettings.nonce` (`X-WP-Nonce`). Webhooks verify shared secret tokens via `hash_equals()`. | Immune to timing attacks and CSRF. |
| **SQL Injection Prevention** | 100% of database queries must use `$wpdb->prepare()` with exact type specifiers (`%s`, `%d`). | Never concatenate raw variables into SQL. |
| **Input Sanitization** | `sanitize_text_field()`, `sanitize_email()`, `esc_url_raw()`, `absint()`. | Enforced at REST controller boundary. |
| **Output Escaping** | `esc_html()`, `esc_attr()`, `esc_url()`, `wp_kses_post()`. | Enforced on all HTML renders and template tags. |
| **Credential Encryption at Rest** | IMAP passwords and SMTP API keys must be encrypted using `WPSpace\AiMarketingExpert\Encryption::encrypt()` before saving to `wp_options`. | Never store plaintext passwords in DB. |
| **Denial of Service / Timeout Guards** | Strict socket timeouts (`stream_set_timeout(15s)`) and HTTP request timeouts (`wp_remote_get` 4–8s). | Prevents worker starvation and CLI freezing. |
| **WordPress.org Guideline #5** | B2B Lead Finder provides a functional permanent free tier (5 leads/day, 50/month). No time-bomb expiry. | Fully compliant with Freemium rules. |
| **WordPress.org Guideline #6** | External AI models and ESP services explicitly declared in `readme.txt` with TOS/Privacy links. | Transparency on external data flows. |
| **WordPress.org Guideline #7** | Explicit Opt-In consent dialog before capturing admin email on activation. | Zero unauthorized telemetry/ingestion. |

---

## 4. Pillar 1: B2B Lead Finder Free Tier & Optimization

### 4.1 Functional Specification
* **Free Tier Quota:**
  - 5 verified B2B leads per calendar day (reset at midnight UTC).
  - Maximum 50 verified B2B leads per calendar month.
  - Quota is tracked in `wp_options`: `aime_free_leads_usage` `{ date: 'Y-m-d', daily_count: 3, month: 'Y-m', monthly_count: 24 }`.
* **Pro Features (Gated):**
  - Unlimited manual prospect searches.
  - Autonomous 24/7 **Autopilot Pipeline** (Daily automated background harvesting directly into nurture funnels).
  - Multi-page deep crawling.
* **Persistent Master Page Pointer:**
  - Prevents the Day 3 duplicate exhaustion loop by storing `aime_autopilot_page_pointer_{hash}` in `wp_options`.
* **Domain Pre-Deduplication:**
  - `B2bScraperService::is_domain_in_crm($domain)` checks database before scraping to save network overhead.

### 4.2 UI/UX Implementation (`LeadFinder.jsx`)
* Remove the full-page blocking `<ProGate>`.
* Instant Search Tab: Accessible to all users.
  - Shows an elegant **Usage Meter**: `Daily Free Quota: 2 / 5 Leads Used [Upgrade for Unlimited]`.
  - Once the 5-lead limit is reached, shows a non-intrusive modal: *"You have reached your daily free limit (5/5). Upgrade to Pro for unlimited searches & automated 24/7 autopilot."*
* Autopilot Tab: Displays an interactive preview with configuration controls disabled and a high-converting Pro lock overlay.

---

## 5. Pillar 2: Email Tracking & Deliverability Overhaul

### 5.1 Protocol Whitelisting & Bug Fix in `inject_tracking()`
* **Files:** `class-funnel-processor.php` & `class-campaign-processor.php`
* **Safety Logic:**
  - Strictly bypass non-HTTP schemes: `mailto:`, `tel:`, `sms:`, `javascript:`, and in-page anchor links (`#`).
  - Only rewrite URLs starting with `http://` or `https://`.
  - Reconstruct the `<a>` tag cleanly without mutating inner HTML text or duplicate attribute values.

### 5.2 Granular Per-Campaign & Per-Funnel Tracking Controls
* **Cold Outreach Mode:**
  - Toggle `track_clicks` (default: false for cold outreach, true for newsletters).
  - Toggle `track_opens` (default: false for cold outreach, true for newsletters).
  - When disabled, links remain 100% clean and direct (zero redirect domains), eliminating spam flags.
* **UI Controls:** Added to `CampaignBuilder.jsx` and `FunnelSequenceModal.jsx`.

### 5.3 Custom Tracking Domain (Branded CNAME)
* **Setting:** `aime_custom_tracking_domain` (under Email Marketing > Settings > Advanced).
* **Helper:** `get_tracking_base_url()` uses branded CNAME (e.g. `https://track.mybrand.com/`) with automatic fallback to `home_url()`.
* **Benefit:** Eliminates domain mismatch phishing flags when WordPress runs on internal/license subdomains.

### 5.4 Compliant Onboarding Opt-In Banner
* **Location:** `includes/class-admin.php`
* **Trigger:** First admin visit after plugin activation.
* **Dialog:** Dismissible notice with explicit "Allow & Connect" and "Skip" buttons.
* **Compliance:** Never ingests admin email or site data without user clicking "Allow & Connect".

---

## 6. Pillar 3: Universal 4-Layer Bounce & Complaint Shield

### 6.1 Layer 1: Real-Time Pre-Flight DNS MX Guard
* **Location:** `includes/class-email-validator.php`
* **Execution:** Runs milliseconds before email transmission.
* **Caching:** Caches MX resolution in transient `aime_mx_{domain_hash}` for 24 hours.
* **Action:** Skips send and marks contact as `bounced` if domain has no active MX/A mail exchangers.

### 6.2 Layer 2: Cloud ESP Dual Engine (Webhooks + API Polling)
* **Webhook Hardening:** Rate-limited REST endpoint (`POST /email/webhook/bounce`) using `hash_equals()` verification.
* **Cloud API Polling (`CloudEspSyncService`):**
  - Solves the Localhost/Firewall problem where webhooks cannot reach the site.
  - Periodically polls suppression endpoints for Brevo, Amazon SES, SendGrid, Mailgun, and Postmark.

### 6.3 Layer 3: Pure-PHP Universal Bounce Mailbox Scanner (IMAP/POP3)
* **Problem:** PHP 8.4 completely removed `ext-imap`, and it is disabled on modern stacks (Laragon, LocalWP).
* **Solution:** Create `includes/services/class-pure-imap-client.php` using native SSL stream sockets (`stream_socket_client('ssl://imap.gmail.com:933')`).
* **Capability:** Connects to bounce mailboxes (Gmail, Outlook, cPanel), parses RFC 3464 Delivery Status Notifications, extracts dead addresses, and suppresses them.

### 6.4 Layer 4: Database Suppression & Quarantine Engine
* Updates subscriber status: `status = 'bounced'` or `status = 'complained'`.
* Automatically excludes quarantined contacts from all current and future campaign batches.
* Terminates stalled funnel sequences for bounced contacts.

### 6.5 Free vs. Pro UI (`DeliverabilitySettings.jsx`)
* **Free Version:** Displays an attractive Deliverability Preview Card highlighting benefits with a direct 20% off upgrade button.
* **Pro Version:** Full interactive controls for Pre-Flight DNS Guard, Cloud ESP API Sync, and IMAP Mailbox Scanner with a live "Test Connection" diagnostic tool.

---

## 7. Step-by-Step Implementation Sprint Plan

```
Sprint 1: Core Foundation & Bug Fixes (Day 1)
├── Task 1.1: Fix inject_tracking() regex in FunnelProcessor and CampaignProcessor (EM-01, EM-02)
├── Task 1.2: Add Custom Tracking Domain helper & setting (EM-04)
└── Task 1.3: Add Onboarding Opt-In Consent Notice in class-admin.php (EM-05)

Sprint 2: B2B Lead Finder Free Quota & Pagination (Day 2)
├── Task 2.1: Add Daily/Monthly Free Quota tracking in SubscriberController & B2bScraperService
├── Task 2.2: Implement Persistent Master Page Pointer for Autopilot
├── Task 2.3: Update LeadFinder.jsx with Free Quota Meter & Pro Autopilot Lock
└── Task 2.4: Test Lead Finder search with 5-lead limit enforcement

Sprint 3: Deliverability Engine & Pure-PHP IMAP Reader (Day 3)
├── Task 3.1: Build class-pure-imap-client.php with native stream sockets (Zero ext-imap)
├── Task 3.2: Build CloudEspSyncService.php with Brevo, SES & SendGrid polling
├── Task 3.3: Implement Pre-Flight DNS MX verification in EmailValidator
└── Task 3.4: Harden webhook endpoints with hash_equals() and rate limiting

Sprint 4: UI Refinement, Frontend Build & QA (Day 4)
├── Task 4.1: Build DeliverabilitySettings.jsx (Free Teaser Card + Pro Controls)
├── Task 4.2: Add Campaign/Funnel-level tracking toggles in React modals
├── Task 4.3: Compile production JavaScript bundle (npm run build)
├── Task 4.4: Version bump to 1.2.8 across ai-marketing-expert.php and readme.txt
└── Task 4.5: End-to-end regression testing across all 7 plugin modules
```

---

## 8. Verification & Quality Assurance Protocols

1. **Isolation Check:** Verify Content Generator, SEO Analyzer, Chatbot, Social Media, and Abandoned Cart function identically before and after update.
2. **Deliverability Check:** Verify that a cold email sent with tracking disabled contains zero redirect links and preserves direct target URLs.
3. **Protocol Check:** Verify that `<a href="mailto:test@domain.com">` and `<a href="#section">` are never altered.
4. **Quota Check:** Verify that a free user can collect exactly 5 leads on Day 1, gets blocked on lead 6, and resets on Day 2.
5. **PHP Compatibility:** Test against PHP 8.0, 8.1, 8.2, 8.3, and 8.4 to guarantee zero `ext-imap` deprecation notices or fatal errors.

---
*Roadmap approved for development sprint execution.*  
*AI Marketing Expert Core Engineering Team*
