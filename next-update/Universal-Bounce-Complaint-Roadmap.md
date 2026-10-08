# Universal Bounce & Complaint Protection System — Technical Roadmap & Architecture Spec
**Product:** AI Marketing Expert (AIME) for WordPress  
**Target Release:** Next Major Update (Pro Feature with Free Upgrade Teaser)  
**Document Location:** `C:\laragon\www\tools\wp-content\plugins\ai-marketing-expert\next-update\Universal-Bounce-Complaint-Roadmap.md`  
**Author:** AI Marketing Expert Engineering Team  
**Status:** Approved Architectural Specification  

---

## 1. Executive Summary & Product Vision

### 1.1 The Problem
When users dispatch cold outreach, marketing newsletters, or automated onboarding funnels, a percentage of emails inevitably fail to reach destination mailboxes (invalid addresses, closed companies, employee turnover, typos) or trigger spam complaints. 
Currently, unless actively tracked:
- Failed sends return as asynchronous **Non-Delivery Reports (NDR)** to personal mailboxes or sit silently in Cloud ESP suppression databases.
- The plugin database remains unaware of these failures (`bounced = 0`, `complained = 0`).
- Subsequent campaigns repeatedly target these dead mailboxes, leading to soaring bounce rates (>5%), sender reputation destruction, domain blacklisting, and ESP account suspensions (Brevo, AWS SES, Google Workspace).

### 1.2 The Solution: The Universal Deliverability Engine
This update introduces an enterprise-grade, **4-Layer Deliverability & Bounce Shield** across **all 13 supported SMTP providers** in AI Marketing Expert. Whether a user sends via Brevo, Amazon SES, Gmail, Outlook, SendGrid, Mailgun, Postmark, Resend, or custom cPanel SMTP, the plugin will autonomously:
1. Validate syntax and DNS MX records **pre-flight** before attempting transmission.
2. Ingest real-time bounce and complaint notifications via secure **ESP Webhooks**.
3. Fallback to automated **Cloud API Polling** for localhost, staging, or firewall-restricted sites where webhooks cannot reach.
4. Scan incoming bounce reports using a **Pure-PHP Universal Bounce Mailbox (IMAP/POP3) Engine** for personal/traditional SMTPs (Gmail, Outlook, Webmail).
5. Quarantine invalid contacts immediately in the database (`status = 'bounced'` / `status = 'complained'`), permanently excluding them from all future campaigns and automated sequences.

### 1.3 Monetization & Pro Gating Strategy
- **Strictly Pro Feature:** Automatic bounce processing, IMAP bounce scanning, and cloud ESP synchronization are high-value enterprise features reserved exclusively for **Pro License** holders.
- **Free User Upgrade Teaser:** In the Free version, the `Deliverability & Bounce Shield` tab will feature an informative, locked preview card with an eye-catching notice:
  - *Headline:* "Enterprise Bounce & Spam Complaint Protection [PRO]"
  - *Value Proposition:* "Protect your domain reputation, achieve 99.8% inbox delivery, and prevent ESP account bans with automated bounce cleaning."
  - *Call to Action (CTA):* Direct 1-click button to `https://wpthemespace.com/product/ai-marketing-expert/` offering "Upgrade to Pro (20% Off)".

---

## 2. Complete Provider Matrix & Detection Methodology

The 13 SMTP providers natively supported in `class-smtp-provider.php` are mapped into three operational categories:

| # | Provider Identifier | Provider Display Name | Primary Ingestion Method | Fallback Ingestion Method | Supported Statuses |
|---|-------------------|------------------------|--------------------------|---------------------------|--------------------|
| 1 | `brevo` | Brevo (Sendinblue) | Real-time Webhook Push | Scheduled REST API Sync (`GET /v3/smtp/statistics/events`) | Hard Bounce, Soft Bounce, Spam Complaint, Blocked |
| 2 | `amazon_ses` | Amazon SES | AWS SNS Webhook Push | SES v2 API Suppression Polling (`GetSuppressionList`) | Permanent Bounce, Transient Bounce, Complaint |
| 3 | `sendgrid` | Twilio SendGrid | Event Webhook Push | SendGrid REST API Polling (`GET /v3/suppression/bounces`) | Bounce, Dropped, Spam Report |
| 4 | `mailgun` | Mailgun by Sinch | Event Webhook Push | Mailgun API Polling (`GET /v3/{domain}/bounces`) | Permanent Failure, Temporary Failure, Spam Complaint |
| 5 | `postmark` | Postmark | Webhook Push | Postmark API Polling (`GET /bounces`) | HardBounce, SoftBounce, SpamComplaint |
| 6 | `resend` | Resend | Webhook Push | Resend API Polling (`GET /emails`) | Bounced, Complained |
| 7 | `sparkpost` | SparkPost | Webhook Push | Message Events API Polling | Bounce, Spam Complaint |
| 8 | `sendlayer` | SendLayer | Webhook Push | SendLayer API Polling | Bounce, Complaint |
| 9 | `smtpcom` | SMTP.com | Webhook Push | Delivery Stats API Polling | Bounce, Abuse |
| 10 | `gmail` | Gmail / Google Workspace | Pure-PHP IMAP Mailbox Scanner | Pre-Flight DNS MX Guard | Hard Bounce (NDR 550) |
| 11 | `outlook` | Outlook / Microsoft 365 | Pure-PHP IMAP Mailbox Scanner | Pre-Flight DNS MX Guard | Hard Bounce (NDR 550) |
| 12 | `custom` | Custom SMTP / cPanel / Webmail | Pure-PHP IMAP Mailbox Scanner | Pre-Flight DNS MX Guard | Hard Bounce (NDR 550) |
| 13 | `wp_mail` | WordPress Default (PHP Mail) | Pre-Flight DNS MX Guard | Return-Path IMAP Scanner | Hard Bounce (NDR 550) |

---

## 3. The 4-Layer Deliverability Architecture

```
                    ┌────────────────────────────────────────────────────────┐
                    │      OUTGOING CAMPAIGN / FUNNEL SEQUENCE EMAIL         │
                    └───────────────────────────┬────────────────────────────┘
                                                │
                                                ▼
              ┌───────────────────────────────────────────────────────────────────┐
              │ LAYER 1: PRE-FLIGHT DNS & MX VALIDATION (Real-Time Pre-Send Guard)│
              │  - Validates email syntax (RFC 5322)                              │
              │  - Blocks disposable / temporary mailboxes                        │
              │  - Real-time DNS check: checkdnsrr($domain, 'MX')                 │
              └─────────────────┬───────────────────────────────┬─────────────────┘
                                │ Valid MX                      │ No MX Record / Invalid
                                ▼                               ▼
                   Proceed with Transmission        [Mark Immediately as Bounced]
                                │                   [Abort Send & Preserve Reputation]
                                │
    ┌───────────────────────────┴────────────────────────────┐
    ▼                                                        ▼
【CLOUD ESP TRANSMISSION】                      【TRADITIONAL SMTP TRANSMISSION】
(Brevo, SES, SendGrid, etc.)                    (Gmail, Outlook, Custom cPanel)
    │                                                        │
    ├─────────────────────────────┐                          ▼
    ▼                             ▼               Destination Rejection (NDR)
ESP Event Captured          No Webhook Reachable             │
    │                       (Localhost / Staging)            ▼
    ▼                             ▼               Delivery Failure Notice sent to
┌────────────────────────┐  ┌────────────────────────┐  Sender Mailbox (mailer-daemon)
│ LAYER 2A: ESP WEBHOOK  │  │ LAYER 2B: CLOUD API    │       │
│ Push notification to   │  │ Scheduled API polling  │       ▼
│ /email/webhook/bounce  │  │ retrieves suppression  │  ┌─────────────────────────────┐
└───────────┬────────────┘  └───────────┬────────────┘  │ LAYER 3: PURE-PHP IMAP SCAN │
            │                           │               │ Connects to bounce inbox    │
            │                           │               │ Parses RFC 3464 headers     │
            │                           │               │ Extracts dead email address │
            └─────────────────────┬─────┴───────────────┴──────────────┬──────────────┘
                                  │                                    │
                                  ▼                                    ▼
              ┌───────────────────────────────────────────────────────────────────┐
              │ LAYER 4: DATABASE SUPPRESSION & QUARANTINE ENGINE                 │
              │  - Updates dp_aime_subscribers SET status = 'bounced'|'complained'│
              │  - Advances / Completes subscriber funnel sequence                │
              │  - Records event in dp_aime_campaign_url_metrics                  │
              │  - Logs reason to dp_aime_activity_log                            │
              │  - Excludes contact from all future campaigns & funnels forever   │
              └───────────────────────────────────────────────────────────────────┘
```

---

## 4. Detailed Component Specifications

### 4.1 Layer 1: Pre-Flight DNS & MX Validation
- **Location:** `includes/class-email-validator.php` & `modules/email-marketing/services/class-funnel-processor.php`
- **Execution Point:** Executed immediately before dispatching any email via `SmtpProvider::send_with_fallback()`.
- **Logic:**
  1. Extract root domain: `$domain = substr(strrchr($email, '@'), 1)`.
  2. Whitelist instant valid providers to bypass DNS overhead: `gmail.com`, `yahoo.com`, `hotmail.com`, `outlook.com`, `icloud.com`, etc.
  3. Query DNS MX records with fallback to A record: `checkdnsrr($domain, 'MX') || checkdnsrr($domain, 'A')`.
  4. Cache DNS query results in WordPress transient (`aime_mx_{hash}`) for 24 hours to ensure microsecond lookup performance.
  5. If domain has no mail exchangers:
     - Mark subscriber status = `'bounced'`.
     - Log activity: `"Pre-flight check: Domain {$domain} has no active MX records"`.
     - Skip sending.

### 4.2 Layer 2: Cloud ESP Dual Engine (Webhook + API Polling)

#### A. Inbound Webhook Endpoint
- **Route:** `POST /wp-json/aime/v1/email/webhook/{bounce|complaint}`
- **Security & Authorization:**
  - Authenticated via secure query token (`?token={secret}`) or custom header (`x-aime-webhook-token`).
  - Rate-limited to max 120 requests/minute per IP to guard against denial-of-service attempts.
  - Native signature verification for AWS SNS, SendGrid, and Mailgun.
- **Provider Payload Handlers:**
  - **Brevo:** Evaluates `$payload['event']` for `hard_bounce`, `soft_bounce`, `blocked`, `invalid_email`, `complaint`.
  - **Amazon SES:** Handles AWS SNS `SubscriptionConfirmation` automatically; parses `Notification` payload for `Bounce` (`bouncedRecipients`) and `Complaint` (`complainedRecipients`).
  - **SendGrid:** Iterates event array for `bounce`, `dropped`, `blocked`, `spamreport`.
  - **Mailgun:** Parses `event-data` for `failed` (severity: `permanent`) and `complained`.
  - **Postmark:** Evaluates `RecordType` for `HardBounce`, `SpamComplaint`.
  - **Resend:** Evaluates event type `email.bounced` and `email.complained`.

#### B. Autonomous Cloud API Polling (The Localhost & Firewall Savior)
- **Problem Solved:** Webhooks cannot reach websites running on localhost (`127.0.0.1`), staging servers, internal intranets, or sites behind aggressive Cloudflare Web Application Firewalls (WAF).
- **Class:** `WPSpace\AiMarketingExpert\Services\CloudEspSyncService`
- **Mechanism:**
  - Runs daily or hourly via scheduled task / WP-Cron.
  - Connects outbound from WordPress to the configured ESP REST API:
    - **Brevo:** `GET https://api.brevo.com/v3/smtp/statistics/events?event=bounces,complaints&limit=100`
    - **Amazon SES:** `POST https://email.{region}.amazonaws.com/v2/email/suppression-addresses`
    - **SendGrid:** `GET https://api.sendgrid.com/v3/suppression/bounces`
    - **Mailgun:** `GET https://api.mailgun.net/v3/{domain}/bounces`
  - Ingests returned rejected emails, checks if they exist in `dp_aime_subscribers`, and updates them to `bounced` or `complained`.

### 4.3 Layer 3: Pure-PHP Universal Bounce Mailbox Scanner (IMAP / POP3)

#### Why Pure-PHP?
The traditional PHP `imap` extension (`ext-imap`):
- Is **deprecated** in PHP 8.1.
- Was **completely removed from core** in PHP 8.4.
- Is disabled by default in most modern hosting environments and local stacks (Laragon, LocalWP).
- Relying on `imap_open()` creates server compatibility errors and crashes.

#### Architecture: Pure-PHP Socket Reader
- **Class:** `WPSpace\AiMarketingExpert\Services\BounceMailboxService`
- **Implementation:** Native PHP SSL stream socket client using `stream_socket_client('ssl://imap.gmail.com:933')` or standard lightweight protocol parser without third-party extension dependencies.
- **Protocol Support:** IMAP4rev1 (SSL/TLS port 993) with fallback to POP3 (SSL/TLS port 995).
- **Scanning Logic:**
  1. Authenticates securely using username & application-specific password (encrypted at rest via `Encryption::encrypt`).
  2. Searches unread messages (`SEARCH UNSEEN`).
  3. Examines headers from `mailer-daemon`, `postmaster`, `mail-delivery-system`.
  4. Parses Delivery Status Notification (RFC 3464):
     - Looks for header `Action: failed`.
     - Extracts `Final-Recipient: rfc822; {failed_email}`.
     - Parses human-readable bounce bodies (e.g. `550 5.1.1 The email account that you tried to reach does not exist`).
  5. Updates subscriber in database: `status = 'bounced'`.
  6. Flags or deletes processed email to maintain a clean mailbox.

### 4.4 Layer 4: Suppression & Database Isolation Guard
- **Database Operations:**
  ```sql
  UPDATE {$wpdb->prefix}aime_subscribers 
  SET status = 'bounced', updated_at = UTC_TIMESTAMP() 
  WHERE id = %d;
  ```
- **Campaign Quarantine Enforcement:**
  - Every campaign dispatch query in `CampaignProcessor` and `FunnelProcessor` strictly enforces:
    ```sql
    WHERE s.status = 'subscribed'
    ```
  - Contacts with status `'bounced'`, `'complained'`, or `'unsubscribed'` are structurally omitted from all future batches.
- **Funnel Advance / Termination:**
  - When an enrolled subscriber bounces mid-funnel, their funnel subscriber row is marked `completed` or `bounced` to prevent stalled execution queues.

---

## 5. Frontend UI & Pro Gating Specification

### 5.1 Navigation Hierarchy
Located under:  
**AI Marketing Expert > Settings > Delivery & Bounce Shield** (New dedicated tab)

### 5.2 Free Version UI: The Upgrade Teaser Card
When a Free user opens this tab, all settings are displayed in a beautifully styled, disabled/glassmorphism preview card with an active upgrade banner:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🛡️ Enterprise Deliverability & Bounce Shield                     [PRO ONLY] │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Protect your sender score, eliminate dead emails, and ensure your          │
│  emails land in the Primary Inbox — automatically.                         │
│                                                                             │
│  ✨ Feature Highlights included in Pro:                                     │
│  • Automated Cloud Bounce Sync for Brevo, Amazon SES, SendGrid & Mailgun    │
│  • Smart IMAP Inbox Scanner for Gmail, Outlook & cPanel SMTP                │
│  • Real-Time Pre-Flight MX DNS Verification                                 │
│  • Automatic Spam Complaint (FBL) Quarantine                                │
│  • Zero-Setup Localhost & Staging Support (Bypasses webhook firewalls)      │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  [ Upgrade to Pro (20% Off) — Unlock Bounce Shield ]                   │  │
│  │  https://wpthemespace.com/product/ai-marketing-expert/                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Pro Version UI: Full Interactive Controls
For Pro users, the tab dynamically renders provider-specific configuration panels:

1. **Global Pre-Flight DNS Guard:**
   - Toggle: `[x] Verify MX Records before dispatching each email (Recommended)`
2. **Cloud ESP Auto-Sync (Brevo / SES / SendGrid / Mailgun / Postmark):**
   - Toggle: `[x] Automatically sync bounces and spam complaints from Cloud ESP API`
   - Sync Frequency: Dropdown (`Every 6 hours`, `Daily during outreach run`, `Real-time webhook`)
   - Button: `[ Sync Now with Brevo / SES ]` (Manual on-demand sync)
   - Webhook Display: Copyable Webhook URL + Secret Token + Setup Guide Modal
3. **Traditional SMTP Bounce Mailbox (Gmail / Outlook / Custom SMTP):**
   - Toggle: `[x] Enable Automated Bounce Mailbox Scanner`
   - Presets Dropdown: `Gmail`, `Outlook / Microsoft 365`, `Custom IMAP`
   - Fields:
     - IMAP Host (`imap.gmail.com`)
     - Port (`993`, SSL)
     - Username / Email Address
     - App Password (masked input)
     - Checkbox: `[x] Delete bounce notices from mailbox after processing`
   - Button: `[ Test Mailbox Connection & Scan ]` (Live diagnostic AJAX button)

---

## 6. Implementation Roadmap & Milestones

### Phase 1: Engine Foundation & Pure-PHP IMAP Reader
- [ ] Create `includes/services/class-pure-imap-client.php` — Native PHP SSL stream socket reader (zero `ext-imap` dependency).
- [ ] Update `includes/class-imap-bounce-service.php` to use the socket client.
- [ ] Add `test_connection()` method with detailed connection diagnostic responses.

### Phase 2: Cloud ESP API Sync Engine
- [ ] Create `modules/email-marketing/services/class-cloud-esp-sync-service.php`.
- [ ] Implement Brevo API Suppression Fetcher: `sync_brevo()`.
- [ ] Implement Amazon SES Suppression Fetcher: `sync_amazon_ses()`.
- [ ] Implement SendGrid Suppression Fetcher: `sync_sendgrid()`.
- [ ] Implement Mailgun / Postmark / Resend Fetchers.
- [ ] Register WP-Cron hook `aime_sync_esp_bounces`.

### Phase 3: Controller & Webhook Hardening
- [ ] Audit `modules/email-marketing/controllers/class-subscriber-controller.php`.
- [ ] Ensure `webhook_bounce` and `webhook_complaint` correctly parse JSON payloads across all 13 providers.
- [ ] Enforce `aime_has_pro()` check with friendly error messaging.

### Phase 4: Local Outreach Runner Integration
- [ ] Hook `CloudEspSyncService::sync_all()` into `run_local_outreach.php`.
- [ ] Ensure pre-flight MX checking runs before each slow-drip dispatch.
- [ ] Log all bounce sync events into `local_outreach.log`.

### Phase 5: React Admin Frontend UI
- [ ] Create `src/components/modules/EmailMarketing/Settings/DeliverabilitySettings.jsx`.
- [ ] Implement Free vs Pro conditional rendering (Teaser Card vs Live Config).
- [ ] Add AJAX testing endpoints in `class-email-rest-controller.php`.
- [ ] Compile React production bundle (`npm run build`).

### Phase 6: QA, Deliverability Testing & Regression Checks
- [ ] Test Gmail IMAP bounce parsing with real `mailer-daemon` notification emails.
- [ ] Test Brevo API sync with live Brevo account suppression lists.
- [ ] Verify that bounced/complained contacts are 100% excluded from subsequent sequence executions.
- [ ] Validate zero performance overhead on regular site page loads.

---

## 7. Security & Best Practice Guidelines

1. **Credential Encryption:** All SMTP passwords and IMAP credentials must be encrypted using `WPSpace\AiMarketingExpert\Encryption::encrypt()` before saving to `wp_options`. Plaintext credentials must never be written to database tables or exported in debug logs.
2. **Webhook Timing Attacks:** All token comparisons must use `hash_equals()` to prevent timing attack vulnerabilities.
3. **Memory & Socket Timeouts:** Socket operations must enforce strict 15-second connect/read timeouts (`stream_set_timeout`) to prevent blocking CLI runners or background cron workers.
4. **Soft Bounce Grace Logic:** 
   - **Hard Bounce (5xx / User Unknown):** Immediate permanent suppression.
   - **Soft Bounce (4xx / Mailbox Full / Rate Limited):** Allow up to 3 consecutive occurrences within 14 days before converting to permanent bounce.
5. **Data Export & Portability:** Provide a 1-click export of the Bounced / Complained list as a CSV file so users can audit or back up their suppression data at any time.

---

*Document finalized and approved for development.*  
*AI Marketing Expert Core Engineering Team*
