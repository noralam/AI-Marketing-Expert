# AI Marketing Expert (AIME) — Architecture Improvements & Feature Roadmap

This document outlines key technical limitations, architecture bottlenecks, and high-impact feature opportunities identified during real-world automated cold outreach, subscriber synchronization, and funnel execution.

Use this roadmap for upcoming core updates to make **AI Marketing Expert** a robust, enterprise-grade competitor to platforms like FluentCRM, MailPoet, Lemlist, and Apollo.

---

## Table of Contents
1. [1. External Cron Webhook & Server-Level Triggering (Critical)](#1-external-cron-webhook--server-level-triggering-critical)
2. [2. Timezone Standardization (UTC Architecture) (High Priority)](#2-timezone-standardization-utc-architecture-high-priority)
3. [3. Automatic Funnel Enrollment on List/Tag Assignment (High Priority)](#3-automatic-funnel-enrollment-on-listtag-assignment-high-priority)
4. [4. Raw HTML Email Support & Template Flexibility (Medium Priority)](#4-raw-html-email-support--template-flexibility-medium-priority)
5. [5. SMTP Rate Limiting & Batch Throttling (Medium Priority)](#5-smtp-rate-limiting--batch-throttling-medium-priority)
6. [6. Built-in DNS MX Record Validation (Medium Priority)](#6-built-in-dns-mx-record-validation-medium-priority)
7. [7. Next-Gen Feature: Native B2B Lead Finder & Cold Outreach Module](#7-next-gen-feature-native-b2b-lead-finder--cold-outreach-module)
8. [8. Automated Email Bounce & Complaint Handling Engine (Critical / Bug Fix)](#8-automated-email-bounce--complaint-handling-engine-critical--bug-fix)
9. [9. Automation & Funnel In-Depth Statistics & Analytics (High Priority)](#9-automation--funnel-in-depth-statistics--analytics-high-priority)
10. [10. Chatbot Knowledge Base Auto-Sync & Incremental Ingestion (Pro Feature)](#10-chatbot-knowledge-base-auto-sync--incremental-ingestion-pro-feature)
11. [11. Social Media Module Overhaul & Platform Expansion (High Priority)](#11-social-media-module-overhaul--platform-expansion-high-priority)
12. [12. Workflow Automation Engine: Direct Actions & Error Handling (Medium Priority)](#12-workflow-automation-engine-direct-actions--error-handling-medium-priority)
13. [13. Database Hygiene & Auto-Pruning Engine (Maintenance)](#13-database-hygiene--auto-pruning-engine-maintenance)

---

## 1. External Cron Webhook & Server-Level Triggering (Critical)

### The Problem
Currently, AIME's scheduled email sequences and funnel step dispatchers rely solely on WordPress's virtual cron (`wp-cron.php`).
- `wp-cron.php` **only fires when an HTTP visitor loads a page** on the site.
- On backend-heavy setups, staging environments, internal business sites, or low-traffic websites, scheduled funnel emails get delayed by hours or fail to dispatch entirely.

### Proposed Solution
Provide a dedicated **External Server Cron / Webhook Endpoint** directly inside AIME Settings (similar to FluentCRM and MailPoet).

1. **Settings Field:** Generate a secure random token in `wp_options` (e.g. `aime_cron_secret_token`).
2. **Endpoint:** Expose a REST API or fast webhook URL:
   ```
   https://yourdomain.com/wp-json/aime/v1/cron-runner?token=YOUR_SECRET_TOKEN
   ```
   or:
   ```
   https://yourdomain.com/?aime_cron=1&token=YOUR_SECRET_TOKEN
   ```
3. **Execution Logic:**
   - Verify token.
   - Return instant HTTP 200 JSON: `{"status":"started"}` and detach using `fastcgi_finish_request()` (to prevent HTTP timeouts).
   - Execute `FunnelProcessor::followUpActions()` and email queue processing in the background.
4. **UI Benefit:** Users can copy this single URL and paste it into Hostinger hPanel, cPanel Cron Jobs, cron-job.org, or EasyCron to guarantee 100% precision execution regardless of website traffic.

---

## 2. Timezone Standardization (UTC Architecture) (High Priority)

### The Problem
In `wp_aime_funnel_subscribers`, the `next_execution_time` is sometimes computed using WordPress local time (`current_time('mysql')`), while server database queries or cron workers compare against MySQL `NOW()` or `current_time('mysql', true)` (UTC).
- If the WordPress site timezone is set to `Asia/Dhaka (UTC+6)` or `America/New_York (UTC-5)`, a 5 to 6-hour mismatch occurs.
- Emails are either triggered prematurely or delayed by several hours.

### Proposed Solution
Adopt strict **UTC Storage with Local UI Display**:
- **Database Level:** Always store timestamps in UTC:
  ```php
  $next_execution_time = gmdate('Y-m-d H:i:s', time() + $delay_seconds);
  ```
- **Query Level:** Always query against UTC:
  ```sql
  WHERE next_execution_time <= UTC_TIMESTAMP()
  ```
- **UI Level:** Convert UTC timestamps to the WordPress blog's local timezone only when displaying to the administrator in dashboard tables:
  ```php
  get_date_from_gmt($row->next_execution_time, 'Y-m-d H:i:s');
  ```

---

## 3. Automatic Funnel Enrollment on List/Tag Assignment (High Priority)

### The Problem
When contacts are inserted into a List (`wp_aime_subscriber_pivot` with `object_type = 'list'`) via external API, CSV import, or programmatic scripts, active funnels linked to that List do not automatically enroll the new contact unless an explicit manual trigger (`FunnelProcessor::trigger()`) or a frontend form submission occurs.

### Proposed Solution
Introduce core action hooks inside subscriber management services:
```php
do_action('aime_subscriber_added_to_list', $subscriber_id, $list_id);
do_action('aime_subscriber_added_to_tag', $subscriber_id, $tag_id);
```
Listen to these hooks in `FunnelProcessor`:
- Query all active funnels where `trigger_type = 'list_joined'` and `trigger_source = $list_id`.
- Automatically create the subscriber enrollment record in `wp_aime_funnel_subscribers`.
- Set `next_execution_time` to `gmdate('Y-m-d H:i:s')` for immediate step 1 execution.

---

## 4. Raw HTML Email Support & Template Flexibility (Medium Priority)

### The Problem
AIME currently wraps email content inside its standard header/footer layout template. 
- When users paste fully designed HTML emails (from Figma, Canva, Stripo, or cold email copywriters), AIME appends an extra default footer below the user's custom footer.
- This creates duplicate unsubscribe links, redundant company signatures, and broken table formatting.

### Proposed Solution
1. **Raw HTML Toggle in Email Editor:**
   Add a checkbox/switch in the email step settings:
   - `[ ] Raw HTML Mode (Disable Default Header & Footer Wrapper)`
2. **Merge Tags / Shortcodes for Compliance:**
   When Raw HTML mode is active, allow users to insert required compliance tags anywhere in their own markup:
   - `{{unsubscribe_url}}` — Direct unsubscribe link.
   - `{{company_name}}` & `{{company_address}}` — Postal address.
   - `{{view_in_browser_url}}` — Web view link.
3. If Raw HTML is selected and the user forgets to include `{{unsubscribe_url}}`, show a polite warning or append a minimal 1-line text footer at the very bottom.

---

## 5. SMTP Rate Limiting & Batch Throttling (Medium Priority)

### The Problem
Transactional SMTP providers (such as **Amazon SES, Mailgun, Postmark, and Google Workspace**) enforce strict sending rates:
- Amazon SES standard tier: **14 emails per second**.
- Shared SMTP relays: **30-50 emails per minute**.
When AIME processes an email batch of 100+ contacts in a rapid `foreach` loop without delay, SMTP servers reject messages with `429 Too Many Requests` or `Throttling - Maximum sending rate exceeded`.

### Proposed Solution
Add an **Email Delivery Pace / Throttling** section under AIME Email Settings:
- **Max Emails per Batch:** (e.g. 50, 100, 250).
- **Sleep Delay between Emails:** (e.g. 100ms, 250ms, 500ms).
  ```php
  // Inside dispatcher loop
  if ($throttle_ms > 0) {
      usleep($throttle_ms * 1000);
  }
  ```
- **Fallback Queueing:** If the SMTP server returns a `429` or throttling exception, pause the batch, mark the sequence item as `pending`, and reschedule the remaining queue for the next cycle.

---

## 6. Built-in DNS MX Record Validation (Medium Priority)

### The Problem
When leads are collected via public forms or imported via CSV, users often enter typos (`user@gmai.com`, `contact@nonexistent-domain.xyz`).
- Regular PHP `filter_var($email, FILTER_VALIDATE_EMAIL)` only verifies syntax, not domain validity.
- Sending to dead domains results in hard bounces, which damages the sender domain's reputation and can get Amazon SES or SendGrid accounts suspended.

### Proposed Solution
Add an optional **"Verify Email Domain (MX Check)"** toggle on import and subscriber creation:
```php
function aime_validate_email_mx($email) {
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return false;
    }
    $domain = substr(strrchr($email, "@"), 1);
    return checkdnsrr($domain, 'MX');
}
```
Include an **"Audit & Clean List"** action in the Contacts UI to highlight contacts with dead MX records before running a campaign.

---

## 7. Next-Gen Feature: Native B2B Lead Finder & Cold Outreach Module

### Strategic Opportunity
The market is shifting rapidly. Standalone email marketing plugins (FluentCRM, MailPoet, Mailchimp) only handle **inbound** subscribers. Meanwhile, tools like **Apollo, Instantly, Lemlist, and Smartlead** are dominating because they combine **Lead Prospecting + Cold Outreach**.

No WordPress plugin currently bridges this gap.

### Proposed Module: "AIME Outreach & Lead Discovery Engine"
1. **Target Search:** Users input an industry niche (e.g. "WordPress & WooCommerce Agencies", "Real Estate Brokers", "Digital Marketing Agencies") and target country/city.
2. **Automated Discovery:** Use Google Places API, web directory scrapers, or public company databases to extract verified business names, websites, and verified contact emails.
3. **Automatic Sync:** Scraped leads pass through the MX filter, get tagged with location/industry tags, and are automatically added to an AIME Contact List.
4. **Instant Nurture Funnel:** AIME triggers a cold outreach sequence (Step 1 introduction, Step 2 follow-up 3 days later, Step 3 closing inquiry).

### Why This is a Game Changer
- Solves the #1 question users ask after installing an email marketing plugin: *"Where do I get leads to email?"*
- Elevates AI Marketing Expert from a standard email autoresponder into an **End-to-End Business Growth Engine**.

---

## 8. Automated Email Bounce & Complaint Handling Engine (Critical / Bug Fix)

### The Problem
Currently, in AIME:
1. **Zero Bounced / Complained Records:** When campaigns are sent, bounce and complaint lists receive 0 contacts. Meanwhile, users receive bounce/complaint emails in their inbox and ESP dashboards.
2. **Synchronous SMTP Rejections Ignored:** When `PHPMailer` attempts `RCPT TO` and the SMTP server immediately rejects with a 5xx Hard Bounce code (e.g. `550 5.1.1 User unknown`), `SmtpProvider::send_with_fallback()` catches it as a generic exception, tries all other configured SMTP providers, retries 3 times, and permanently leaves the subscriber marked as `subscribed`! This burns all SMTP reputations.
3. **Webhook Incompatibility with Real ESPs:** Existing endpoints (`/email/webhook/bounce` and `/email/webhook/complaint`) require custom AIME API key authentication and expect a custom payload `{ "email": "..." }`. Real-world ESPs send completely different formats:
   - **Amazon SES via SNS:** Sends JSON with `Type: "Notification"`, nested `Message` containing `notificationType: "Bounce" | "Complaint"`, and requires handling `SubscriptionConfirmation` via `SubscribeURL`.
   - **SendGrid:** Sends an array of events: `[{"email":"...", "event":"bounce" | "spamreport"}]`.
   - **Mailgun:** Sends `{"event-data": {"event": "failed", "recipient": "..."}}` with HMAC signature.
   - **Postmark:** Sends `{"Type": "HardBounce", "Email": "..."}`.
   - **Brevo (Sendinblue):** Sends `{"event": "hard_bounce", "email": "..."}`.
   Because these native ESP payloads aren't parsed and require custom AIME API keys, no standard ESP webhook works out of the box.
4. **Standard SMTP Non-Delivery Reports (NDRs) Left Unprocessed:** For cPanel, Hostinger, Gmail, or private SMTP servers, bounces arrive as emails back to the sender inbox (`mailer-daemon@...`). AIME currently has **no IMAP/POP3 bounce mailbox reader**, so standard SMTP bounces can never be captured automatically.

### Proposed Solution
1. **Immediate Synchronous 5xx Hard Bounce Detection:**
   - In `SmtpProvider::send_single()`, catch `PHPMailer\PHPMailer\Exception`.
   - If error code or message contains permanent bounce patterns (e.g. `550`, `551`, `553`, `554`, `User unknown`, `Recipient address rejected`, `does not exist`), immediately mark subscriber status as `bounced` and do NOT retry across other SMTP connections or schedule future retries.
2. **Native Multi-Provider Webhook Adapters (Pro):**
   - Create unified webhook endpoints with provider parameter (e.g. `/email/webhook/esp/{provider}`).
   - Support Amazon SES (with automated SNS Subscription Confirmation), SendGrid, Mailgun, Postmark, and Brevo payload decoders.
   - Automatically move recipient to `bounced` or `complained` status, log to `aime_activity_log`, record in `aime_campaign_url_metrics`, and trigger `aime_subscriber_status_change`.
3. **IMAP Bounce Mailbox Reader (Pro):**
   - Allow users to enter a dedicated bounce inbox IMAP connection (`bounces@yourdomain.com`).
   - Run a scheduled cron job (`aime_process_bounce_mailbox`) every 15-30 minutes.
   - Inspect incoming bounce emails (RFC 3464 Delivery Status Notifications), extract failed email addresses, move them to the Bounced list, and mark/delete processed bounce emails.

---

## 9. Automation & Funnel In-Depth Statistics & Analytics (High Priority)

### The Problem
- In **Email Marketing → Campaigns**, users get comprehensive metrics (Total Sent, Opens, Clicks, Unsubscribes, Bounces, CTR, device stats, visual graphs).
- In **Email Marketing → Automations (Funnels)**, the list view only shows `Title`, `Trigger`, `Status`, `Steps`, and `Updated`.
- There are **no statistics** visible for automations:
  - How many contacts have enrolled?
  - How many emails were sent successfully vs failed vs pending?
  - How many users unsubscribed directly from this automation sequence?
  - What is the step-by-step drop-off and conversion rate?
- Inside **Workflow Automation**, stats are only limited to execution runs (Success / Failed) with no marketing intelligence or action-level output counts.

### Proposed Solution
1. **Automation List Columns:**
   - Add summary metrics to the table: `Enrolled`, `Sent`, `Completed`, `Unsubscribed`, `Success Rate`.
2. **Automation Step-by-Step Analytics Tab:**
   - Inside `AutomationEditor`, add an **"Analytics"** or **"Report"** tab (similar to FluentCRM and MailPoet).
   - Display a visual sequence funnel showing:
     - Step 1 (Welcome Email): 1,200 sent | 45% opened | 12% clicked | 2 unsubscribed
     - Step 2 (Wait 2 days): 1,150 passed
     - Step 3 (Sales Offer): 1,150 sent | 38% opened | 18% clicked | 5 unsubscribed
3. **Automation Performance Cards:**
   - Summary stat cards at the top of the automation builder: Total Enrolled, Active, Completed, Total Revenue/Conversions (if WooCommerce is active).

---

## 10. Chatbot Knowledge Base Auto-Sync & Incremental Ingestion (Pro Feature)

### The Problem
- The Chatbot knowledge base currently requires users to manually click **"Index All Website Data"**.
- For websites that publish daily blog posts, news, or new WooCommerce products, manual re-indexing is impractical and easily forgotten.
- **Underlying Code Bugs in Current Ingestion:**
  1. In `modules/chatbot/class-chatbot-module.php`, `add_action( 'aime_chatbot_index_post', ... )` was placed inside `on_post_save()` instead of during plugin boot. As a result, when WP-Cron executes 10 seconds later in an independent request, no callback is registered, and the cron event silently vanishes.
  2. In `KnowledgeIndexer::index_single_post()`, it queries `WHERE source_id = $post_id` in `aime_chatbot_knowledge`. For a newly published post, this row does not exist yet; the method only had `UPDATE` logic and zero `INSERT` logic! Thus, new posts were never ingested automatically even if cron ran.

### Proposed Solution (Pro Architecture)
1. **Free Tier:** Retain manual 1-click bulk index with clear progress indicator.
2. **Pro Tier — Real-Time Event-Driven Sync:**
   - Hook into `publish_post`, `post_updated`, and WooCommerce `woocommerce_new_product` / `woocommerce_update_product`.
   - On new publish: automatically insert knowledge chunks for all active bots configured with `wp_content` or `woocommerce` sources.
   - On update: automatically update existing chunks and sync timestamps.
   - On trash/delete: automatically deactivate or delete knowledge chunks.
3. **Pro Tier — Background Incremental Cron Sync:**
   - Add a scheduled daily/weekly cron job (`aime_chatbot_incremental_sync`).
   - Queries posts/products where `post_modified_gmt > last_indexed_at` and indexes only modified or missing content.
4. **Chatbot Settings UI Toggle:**
   - `[x] Enable Auto-Sync Knowledge Base (Pro)` — "Keep chatbot up to date automatically when new posts, pages, or products are published."

---

## 11. Social Media Module Overhaul & Platform Expansion (High Priority)

### The Problem
1. **Limited Platform Support:** Only Facebook Pages, Instagram Business, and X (Twitter) are supported.
   - Missing **LinkedIn** (critical for B2B, digital agencies, and professional bloggers).
   - Missing **Pinterest** (essential for e-commerce, recipe, and lifestyle niches).
   - Missing modern decentralized platforms like **Threads** and **Bluesky**.
2. **Instagram Image Requirement Failure in Automations:**
   - Instagram Graph API strictly requires a publicly accessible image/video URL.
   - In Workflow Automation, `SocialPostAction` generates AI captions but does not generate or attach images, causing Instagram posts to fail on publish.
3. **Missing Native "Auto-Share on Post Publish" Feature:**
   - Standard users expect a simple switch in Social Media settings: `[x] Automatically share new blog posts to connected social channels`.
   - Currently, users are forced to manually configure complex Workflow Automations to achieve basic blog post sharing.
4. **Meta Graph API Complexity:**
   - Meta App setup (App ID, Secret, Permissions review, Page Access Tokens) is overly complicated for non-technical users.

### Proposed Solution
1. **Add LinkedIn Integration (OAuth 2.0 + UGC Post API):**
   - Connect LinkedIn Personal Profiles and Company Pages.
   - Publish text, links, and image updates.
2. **Add Native "Auto-Social Share" Settings:**
   - Inside Social Media module, add a dedicated "Auto-Share" tab:
     - Select target accounts (Facebook, LinkedIn, X).
     - Customize AI prompt template for caption generation (e.g. `"Write an engaging tweet summarizing: {post_title} with link {post_permalink}"`).
3. **Visual Content Calendar & Queue View:**
   - Provide a monthly/weekly calendar view showing scheduled social posts with drag-and-drop rescheduling.
4. **Workflow Automation Image Support:**
   - Enhance `SocialPostAction` to accept or auto-fetch featured image URLs from upstream triggers (e.g. from the published blog post).

---

## 12. Workflow Automation Engine: Direct Actions & Error Handling (Medium Priority)

### The Problem
1. **Email Campaign Action is Draft-Only:** Currently, `EmailCampaignAction` only creates a draft campaign row in `aime_campaigns`. There is no direct "Send Instant Email / Notification" action to send emails right away.
2. **Lack of Step-Level Retries & Error Recovery:** If an upstream step encounters an AI API timeout (e.g. OpenRouter 504), the whole workflow execution fails immediately.
3. **No Aggregate Workflow Analytics:** Admins cannot see total output stats across all workflows (e.g., total blog posts created this month, total social posts published, total emails triggered).

### Proposed Solution
1. **Direct "Send Email" Action:**
   - Add a direct email action that formats and sends emails immediately using the SMTP rotation pool without requiring manual campaign approval.
2. **Step Fallback & Automatic Retry:**
   - Configurable retry attempts (1-3 retries) with fallback AI provider selection (e.g., if Gemini fails, fall back to OpenCode Zen or OpenRouter).
3. **Marketing Analytics Dashboard for Workflows:**
   - Summary widgets showing automated marketing productivity (Posts generated, social shares delivered, leads nurtured).

---

## 13. Database Hygiene & Auto-Pruning Engine (Maintenance)

### The Problem
- Tables like `aime_workflow_executions`, `aime_workflow_outputs`, `aime_campaign_emails`, and `aime_log` grow continuously.
- On high-volume sites, logs and execution outputs can bloat the database by hundreds of megabytes.

### Proposed Solution
- Add a retention policy setting in General Settings:
  - `Keep Execution Logs For: [30 Days | 60 Days | 90 Days | Indefinitely]`
- Automatically purge older logs and execution outputs during the daily cleanup cron (`aime_daily_cleanup`).
