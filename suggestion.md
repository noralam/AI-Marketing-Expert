# Email Module & Campaign System — Comprehensive Review

> **Re-audit 2026-06-09** — Claims below were re-verified against the live code.
> Two previously-listed HIGH items are now **already fixed** and removed from the
> action list: public subscribe rate limiting (`public_subscribe()`, 5/IP/min) and
> webhook API-key auth (`webhook_subscribe()` → `RestApi::validate_api_key()`).

## ⭐ Short Fix List (verified, action-ready)

| # | Sev | Status | Fix | Location |
|---|-----|--------|-----|----------|
| 1 | 🔴 HIGH | Open | Subscriber is marked `bounced` on *any* `wp_mail` failure (even transient). Only mark `bounced` for permanent failures; keep `subscribed` otherwise. | `class-campaign-processor.php` `send_single()` ~L514 |
| 2 | 🔴 HIGH | Open | No retry cap / no backoff. SMTP-limit rows reschedule a flat +1h forever (infinite loop); `wp_mail` failures get no auto-retry. Add a `retry_count` column, exponential backoff (1h→2h→4h→cap 24h), and a max-attempt cutoff → permanent `failed`. | `class-campaign-processor.php` ~L485 & ~L495 |
| 3 | 🟠 MED | Open | First queue cron event scheduled at `time() + MINUTE_IN_SECONDS` → up to 60s delay before scheduled campaigns start. Schedule at `time()`. | `class-email-marketing-module.php` `ensure_cron_events()` L258 |
| 4 | 🟠 MED | Open | `aime_daily_cleanup` is only scheduled on activation, not re-ensured. Add it to `ensure_cron_events()`. | `class-email-marketing-module.php` L256–263 |
| 5 | 🟠 MED | Open | `release_smtp_limit_waits()` matches on a translatable note string — breaks under i18n. Use a dedicated flag/status column. | `class-campaign-controller.php` ~L426 |
| 6 | 🟡 LOW | Open | `count_expected_recipients()` skips `$wpdb->prepare()` when `$args` is empty. Always prepare. | `class-campaign-controller.php` ~L597 |
| 7 | 🟡 LOW | Open | Open-tracking pixel inserts a new metric row per request (no dedup). Dedup per campaign+subscriber or accept as standard. | `class-email-marketing-module.php` `front_track_open()` |
| 8 | 🟡 LOW | Backlog | Encryption keeps a static-IV legacy decryption fallback. Remove after a migration window. | `class-encryption.php` |

**Do first:** #1 and #2 — they cause real subscriber loss and a retry loop at scale. #3 + #4 are quick cron hardening. The full analysis and lower-priority items follow below.

---

**Date:** 2026-06-09  
**Reviewed Files:**
- `modules/email-marketing/class-email-marketing-module.php`
- `modules/email-marketing/class-email-rest-controller.php`
- `modules/email-marketing/services/class-campaign-processor.php`
- `modules/email-marketing/services/class-funnel-processor.php`
- `modules/email-marketing/controllers/class-campaign-controller.php`
- `includes/class-smtp-provider.php`
- `includes/class-email-validator.php`
- `includes/class-encryption.php`
- `includes/class-deactivator.php`
- `includes/class-activator.php`

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Email Sending Workflow](#2-email-sending-workflow)
3. [Scheduled Email Processing](#3-scheduled-email-processing)
4. [Failed Email Handling & Retry](#4-failed-email-handling--retry)
5. [SMTP Configuration & Delivery](#5-smtp-configuration--delivery)
6. [Security Analysis](#6-security-analysis)
7. [Bugs & Logic Issues](#7-bugs--logic-issues)
8. [Performance Concerns](#8-performance-concerns)
9. [Recommendations Summary](#9-recommendations-summary)

---

## 1. Architecture Overview

The email system follows a WordPress plugin architecture with these core components:

| Component | File | Role |
|---|---|---|
| Module Bootstrap | `class-email-marketing-module.php` | Cron hooks, tracking, DB schema, automation triggers |
| REST Controller | `class-email-rest-controller.php` | Route registration, delegates to domain controllers |
| Campaign Controller | `class-campaign-controller.php` | CRUD, send, pause, resume, retry, A/B variants |
| Campaign Processor | `class-campaign-processor.php` | Time-boxed cron job: enqueue → parse → send → finalize |
| Funnel Processor | `class-funnel-processor.php` | Automation sequence execution |
| SMTP Provider | `class-smtp-provider.php` | Multi-connection SMTP with fallback, daily limits |
| Email Validator | `class-email-validator.php` | Disposable domain blocking, MX checks, spam patterns |
| Encryption | `class-encryption.php` | AES-256-CBC password encryption for SMTP credentials |

**Data Flow:**
```
Campaign Send Request
  → CampaignController::send() sets status='working'
  → CampaignProcessor::process() runs via WP-Cron every minute
    → activate_scheduled_campaigns() (scheduled → working)
    → enqueue_campaigns() (resolve recipients, create campaign_emails rows)
    → process_queue() (batch send with time box)
      → send_single() (lazy parse, inject tracking, SmtpProvider::send_with_fallback())
    → finalise_campaigns() (mark sent/failed/partial)
```

---

## 2. Email Sending Workflow

### What Works Well

- **Lazy body parsing:** Email bodies are parsed per-subscriber at send time, not at enqueue time. This is efficient for large campaigns.
- **Merge tag support:** `{{first_name}}`, `{{last_name}}`, `{{email}}`, `{{site_name}}`, `{{unsubscribe}}` etc.
- **Tracking injection:** Open pixel and click-wrap links are injected correctly with HMAC-signed URLs.
- **Unsubscribe compliance:** `List-Unsubscribe` header is included; footer unsubscribe link is auto-appended.
- **Duplicate prevention:** `array_diff()` filters already-enqueued subscribers before inserting.

### Issues Found

#### Issue 2.1: `send_single()` return value not checked for exceptions
**File:** `class-campaign-processor.php:480-518`  
**Severity:** Medium

When `SmtpProvider::send_with_fallback()` returns `false` (all connections failed), the subscriber is marked as `bounced`. This is overly aggressive — a temporary SMTP failure should not permanently bounce a subscriber.

```php
// Current: any false = bounced
$wpdb->update(
    $subscribers_table,
    array( 'status' => 'bounced', 'updated_at' => current_time( 'mysql', true ) ),
    array( 'id' => $email->subscriber_id )
);
```

**Recommendation:** Distinguish between permanent failures (invalid email, domain doesn't exist) and transient failures (SMTP timeout, rate limit). Only mark as `bounced` for permanent failures; for transient failures, mark the email as `failed` and retry later.

#### Issue 2.2: Missing `$email->hash` null coalescing in FunnelProcessor
**File:** `class-funnel-processor.php:253`  
**Severity:** Low

```php
$unsub_url = add_query_arg(
    array(
        'aime_track' => 'unsubscribe',
        'hash'       => $row->hash ?? '',  // $row->hash may not exist
    ),
    home_url()
);
```

The `$row` object comes from `aime_funnel_subscribers` joined with `aime_subscribers`. The `hash` column exists on `aime_subscribers`, so this works via the JOIN. However, if the JOIN fails or the hash column is empty, the unsubscribe link will be broken.

**Recommendation:** Use `EmailMarketingModule::create_tracking_hash()` for funnel unsubscribe URLs (consistent with CampaignProcessor).

#### Issue 2.3: Campaign finalization race condition
**File:** `class-campaign-processor.php:660-742`  
**Severity:** Low

`finalise_campaigns()` runs at the end of `process_queue()`. If the cron runs again before finalization completes (e.g., due to the chained `aime_run_email_queue` event), there's a small window where a campaign could be finalized twice. This is unlikely to cause data corruption due to idempotent UPDATE queries, but it's wasteful.

**Recommendation:** Add a transient lock or check campaign status before finalization.

---

## 3. Scheduled Email Processing

### What Works Well

- **Dual cron strategy:** `aime_process_email_queue` (recurring every minute) + `aime_run_email_queue` (chained single events) ensures continuous processing.
- **Transient-based locking:** `aime_email_queue_runner_lock` prevents concurrent queue runner execution.
- **Time-boxed processing:** 30-second limit per run prevents cron runaway on large campaigns.
- **Configurable batch size:** `batch_size` setting allows tuning (1-500).
- **Batch interval:** Optional delay between batches for SMTP rate limiting.

### Issues Found

#### Issue 3.1: `ensure_cron_events()` schedules with `time() + MINUTE_IN_SECONDS`
**File:** `class-email-marketing-module.php:257-263`  
**Severity:** Medium

```php
if ( ! wp_next_scheduled( 'aime_process_email_queue' ) ) {
    wp_schedule_event( time() + MINUTE_IN_SECONDS, 'every_minute', 'aime_process_email_queue' );
}
```

The first event is scheduled 60 seconds after plugin load. If the plugin loads during a request that also triggers a campaign send, there's a 60-second delay before the first cron processing. The `CampaignController::send()` mitigates this by calling `process(true)` immediately, but for scheduled campaigns activated by cron, this delay is real.

**Recommendation:** Schedule the first event at `time()` instead of `time() + MINUTE_IN_SECONDS`, consistent with `class-activator.php:91`.

#### Issue 3.2: `every_minute` cron schedule is defined but not cleaned up
**File:** `class-email-marketing-module.php:248-254`  
**Severity:** Low

The `add_cron_schedules` filter adds `every_minute` permanently. If the plugin is deactivated, this schedule persists in the cron system (though no events reference it). The deactivator correctly clears the hooks, but the schedule definition remains.

**Recommendation:** This is cosmetic and low priority. Could be addressed by checking if any aime events exist before adding the schedule.

#### Issue 3.3: No protection againstWP-Cron not running
**File:** Multiple  
**Severity:** Medium

WordPress WP-Cron depends on page visits to trigger. On low-traffic sites, cron events may be significantly delayed. The chained `aime_run_email_queue` events help, but if no one visits the site, emails won't be sent.

**Recommendation:** Document that a real server-side cron job (e.g., `wp-cron.php` via system crontab) is recommended for reliable email delivery. Consider adding an admin notice if cron appears stalled.

#### Issue 3.4: `daily_cleanup` cron event not scheduled in `ensure_cron_events()`
**File:** `class-email-marketing-module.php:256-263`  
**Severity:** Low

`ensure_cron_events()` only schedules `aime_process_email_queue` and `aime_process_automations`. The `aime_daily_cleanup` event is only scheduled during activation (`class-activator.php:98-99`). If the activation hook doesn't run (e.g., manual DB restoration), daily cleanup never runs.

**Recommendation:** Add `aime_daily_cleanup` to `ensure_cron_events()`.

---

## 4. Failed Email Handling & Retry

### What Works Well

- **Campaign-level failure detection:** `finalise_campaigns()` correctly detects all-failed, partial, and all-sent scenarios.
- **"Retry Failed" action:** Resets failed emails to pending and re-opens the campaign.
- **SMTP limit handling:** When daily limit is reached, emails are delayed 1 hour via `scheduled_at`.
- **Limit release on connection change:** `release_limit_waiting_emails()` clears stuck emails when SMTP connections change.

### Issues Found

#### Issue 4.1: No exponential backoff for retries
**File:** `class-campaign-processor.php:482-493`  
**Severity:** High

When `send_with_fallback()` returns `null` (all connections at daily limit), the email is rescheduled for exactly 1 hour later:

```php
'scheduled_at' => gmdate( 'Y-m-d H:i:s', time() + HOUR_IN_SECONDS ),
```

If all connections remain at their limit after 1 hour, this email will fail again and be rescheduled for another hour — creating an infinite loop of failed attempts.

**Recommendation:** Implement exponential backoff (1h → 2h → 4h → max 24h) or a maximum retry count. After N retries, mark the email as permanently failed.

#### Issue 4.2: No maximum retry count for `wp_mail` failures
**File:** `class-campaign-processor.php:495-518`  
**Severity:** High

When `wp_mail` returns `false` (SMTP connection failed but not at daily limit), the email is marked `failed` immediately. There's no automatic retry. The user must manually click "Retry Failed."

But when the "Retry Failed" action is used, ALL failed emails are reset to pending — including ones that failed for different reasons (e.g., one due to invalid email, another due to SMTP timeout).

**Recommendation:** 
1. Add automatic retry with backoff for transient failures (up to 3 attempts).
2. Categorize failure reasons (permanent vs. transient) and only auto-retry transient ones.
3. Allow per-email retry instead of bulk retry only.

#### Issue 4.3: Subscriber marked `bounced` on any send failure
**File:** `class-campaign-processor.php:512-518`  
**Severity:** High

```php
} else {
    $wpdb->update(
        $subscribers_table,
        array( 'status' => 'bounced', 'updated_at' => current_time( 'mysql', true ) ),
        array( 'id' => $email->subscriber_id )
    );
}
```

If a subscriber's email fails to send (even due to a temporary SMTP issue), they're immediately marked as `bounced`. This is incorrect — `bounced` should only be set for permanent delivery failures (5xx SMTP responses, invalid email). A subscriber marked `bounced` will be excluded from all future campaigns.

**Recommendation:** Mark as `bounced` only when the failure reason indicates a permanent bounce (e.g., "Invalid email", "Domain not found"). For transient failures, keep the subscriber as `subscribed` and only mark the email as `failed`.

#### Issue 4.4: `release_smtp_limit_waits()` only clears one specific note string
**File:** `class-campaign-controller.php:426-440`  
**Severity:** Low

```php
WHERE campaign_id = %d AND status = 'pending' AND note = %s
```

The note string `'SMTP daily sending limit reached. Waiting for fallback availability.'` must match exactly. If the string is ever changed (e.g., during i18n), this query silently fails to release waiting emails.

**Recommendation:** Use a dedicated flag column or status value instead of matching on a translatable string.

---

## 5. SMTP Configuration & Delivery

### What Works Well

- **12+ provider presets:** Gmail, Outlook, SES, SendGrid, Mailgun, SparkPost, Brevo, SendLayer, SMTP.com, Postmark, Resend, custom.
- **Multi-connection fallback:** Primary + ordered fallbacks with automatic failover.
- **Daily sending limits:** Per-connection limits tracked in `aime_smtp_connection_usage` option.
- **Password encryption:** AES-256-CBC with random IV, key derived from WordPress salts.
- **Site-wide SMTP option:** Can override all `wp_mail` calls site-wide.
- **Third-party plugin detection:** Warns when other SMTP plugins are active.
- **Test connection:** Sends a test email with diagnostic failure messages.
- **Connection reordering:** Drag-to-reorder fallback priority.

### Issues Found

#### Issue 5.1: Encryption uses static IV fallback
**File:** `class-encryption.php:36-38, 100-112`  
**Severity:** Medium

The `get_iv()` method derives a static IV from `SECURE_AUTH_KEY`. While the primary encryption path uses a random IV (line 71), the decryption fallback (lines 100-112) tries the static IV for legacy data. This means:
1. Legacy-encrypted passwords use a deterministic IV, which is cryptographically weak.
2. The fallback is always attempted, even for new encryptions.

**Recommendation:** After a migration period, remove the legacy decryption fallback. New encryptions should always use random IVs.

#### Issue 5.2: SMTP password stored in `aime_settings` option (legacy)
**File:** `class-smtp-provider.php:400-429`  
**Severity:** Medium

`sync_legacy_settings()` copies the primary connection's encrypted password to the `aime_settings` option for backward compatibility. This means the password exists in two places in the database.

**Recommendation:** Deprecate the legacy `aime_settings` password field. Ensure all code paths read from `aime_smtp_connections` only.

#### Issue 5.3: No SMTP connection health monitoring
**File:** `class-smtp-provider.php`  
**Severity:** Medium

There's no automatic health check for SMTP connections. If a connection's credentials are revoked or the SMTP server goes down, the system only discovers this when an email fails to send.

**Recommendation:** Add periodic health checks (e.g., every 6 hours) that attempt a lightweight SMTP connection test. Surface connection health status in the admin UI.

#### Issue 5.4: `send_with_fallback()` doesn't pass `$attachments` through `wp_mail` path
**File:** `class-smtp-provider.php:744-753`  
**Severity:** Low

When using the `wp_mail` provider, `send_with_fallback()` correctly passes `$attachments` to `wp_mail()`. However, the `remove_site_mail_hooks()` / `init()` cycle (lines 747-748) could cause issues if another concurrent request is also sending mail.

**Recommendation:** This is a minor concurrency issue in PHP's shared-nothing model. Document that the wp_mail fallback path temporarily removes site mail hooks.

#### Issue 5.5: `smtp.com` typo in provider preset
**File:** `class-smtp-provider.php:129-137`  
**Severity:** Low

The SMTP.com provider description says "SMTP.com relay service" but the docs_url points to `https://www.smtp.com/resources/`. The official SMTP.com documentation URL is `https://www.smtp.com/docs/`. Minor but could confuse users.

**Recommendation:** Verify and update the docs_url.

---

## 6. Security Analysis

### What Works Well

- **HMAC-signed tracking URLs:** Open/click/unsubscribe URLs use `hash_hmac('sha256', ...)` with `wp_salt('auth')`.
- **Click signature verification:** Each tracked link includes a signature that prevents URL tampering.
- **Nonce-based subscribe form:** Public subscribe form uses HMAC token with timestamp.
- **SQL injection protection:** All queries use `$wpdb->prepare()` with proper placeholders.
- **XSS protection:** Output is escaped with `esc_html()`, `esc_url()`, `wp_kses_post()`.
- **SMTP passwords encrypted:** AES-256-CBC with random IV.

### Issues Found

#### Issue 6.1: Public subscribe endpoint lacks rate limiting
**File:** `class-email-rest-controller.php:195-207`  
**Severity:** High

The `/email/subscribe` endpoint has `public_permission` (open to all) and only uses a honeypot field + HMAC token for protection. There's no rate limiting. An attacker could:
1. Flood the endpoint with fake subscriptions (database bloat).
2. Subscribe someone else's email address repeatedly (email harassment).

**Recommendation:** Add rate limiting (e.g., max 5 submissions per IP per minute) using transients. Consider adding CAPTCHA for high-traffic sites.

#### Issue 6.2: Webhook subscribe endpoint has no authentication
**File:** `class-email-rest-controller.php:210-222`  
**Severity:** High

The `/email/webhook/subscribe` endpoint has `public_permission` and no authentication check. The docblock says "API key auth" but no API key validation is implemented. Anyone can POST to this endpoint to add subscribers.

**Recommendation:** Implement API key authentication. Add an `X-API-Key` header check or query parameter validation.

#### Issue 6.3: Tracking hash uses base64 encoding
**File:** `class-email-marketing-module.php:318-322`  
**Severity:** Low

```php
return strtr( base64_encode( $raw ), '+/=', '-_~' );
```

The hash is URL-safe base64 encoded. The HMAC prevents forgery, but the base64 encoding makes the hash longer. Using raw binary → hex encoding would be shorter and equally secure.

**Recommendation:** Cosmetic. No action needed unless URL length becomes an issue.

#### Issue 6.4: `front_track_open()` doesn't validate token freshness
**File:** `class-email-marketing-module.php:383-423`  
**Severity:** Low

Open tracking pixels can be re-requested (e.g., by email clients that cache-check). Each request increments the metric. There's no deduplication — the same subscriber opening the same email 100 times creates 100 metric rows.

**Recommendation:** Consider deduplicating by checking if a metric row already exists for this campaign+subscriber+type before inserting. Or accept that multiple opens are valid (industry standard).

---

## 7. Bugs & Logic Issues

### Bug 7.1: `enqueue_campaign()` sets status to 'sending' even when no NEW subscribers are added
**File:** `class-campaign-processor.php:137-141`  
**Severity:** Medium

```php
if ( empty( $subscriber_ids ) ) {
    // All enqueued already – move to sending status.
    $wpdb->update( $campaigns_table, array( 'status' => 'sending' ), array( 'id' => $campaign->id ) );
    return;
}
```

If a campaign already has subscribers enqueued (from a previous run) but is still in `working` status, this changes it to `sending`. This is correct behavior, but the comment "All enqueued already" is misleading — it could also mean the subscriber resolution returned zero results.

### Bug 7.2: `count_expected_recipients()` builds raw SQL without `$wpdb->prepare()` for the base query
**File:** `class-campaign-controller.php:597-602`  
**Severity:** Medium

```php
$query = "SELECT COUNT(DISTINCT s.id) FROM {$p}aime_subscribers s {$joins} WHERE " . implode( ' AND ', $conditions );
if ( ! empty( $args ) ) {
    $query = $wpdb->prepare( $query, ...$args );
}
```

When `$args` is empty (e.g., `send_all` mode with no exclusions), the query runs without `$wpdb->prepare()`. While the query doesn't contain user input in this case, it's inconsistent with WordPress coding standards.

**Recommendation:** Always use `$wpdb->prepare()`, even with a dummy parameter.

### Bug 7.3: `resolve_engagement_segment()` has redundant CASE WHEN in ORDER BY
**File:** `class-campaign-processor.php:331-373`  
**Severity:** Low

The `top_openers` segment query orders by:
```sql
ORDER BY SUM(CASE WHEN m.type = 'open' THEN m.counter ELSE 0 END) DESC
```

But the WHERE clause already filters `m.type = 'open'`, making the CASE WHEN redundant. It should simply be `SUM(m.counter)`.

**Recommendation:** Simplify to `SUM(m.counter)` for clarity and minor performance improvement.

### Bug 7.4: `finalise_campaigns()` uses `prepare()` with `%i` but passes table name as parameter
**File:** `class-campaign-processor.php:667-671`  
**Severity:** Low

```php
$still_pending = $wpdb->get_col( $wpdb->prepare( 'SELECT DISTINCT campaign_id FROM %i WHERE status = %s', $campaign_emails_table, 'pending' ) );
$in_progress = $wpdb->get_col( $wpdb->prepare( 'SELECT id FROM %i WHERE status IN (%s, %s)', $campaigns_table, 'working', 'sending' ) );
```

The `%i` placeholder is for identifiers (table/column names). This is correct WordPress 6.2+ usage. No issue.

---

## 8. Performance Concerns

### Concern 8.1: Every-minute cron on high-traffic sites
**Severity:** Low-Medium

Running `aime_process_email_queue` every minute means `CampaignProcessor::process()` is called every 60 seconds. On sites with no active campaigns, this still runs the `activate_scheduled_campaigns()`, `enqueue_campaigns()`, and `process_queue()` queries — all of which return empty results quickly, but still execute 3-4 database queries per run.

**Recommendation:** Add an early-exit check: if no campaigns are in `working`/`sending`/`scheduled` status and no pending emails exist, skip processing entirely.

### Concern 8.2: `has_active_email_queue()` runs two COUNT queries
**File:** `class-email-marketing-module.php:226-242`  
**Severity:** Low

Two separate COUNT queries are run to check if the queue is active. These could be combined into a single query with UNION.

**Recommendation:** Optimize to a single query if performance becomes an issue.

### Concern 8.3: `daily_cleanup()` runs unconditionally
**File:** `class-email-marketing-module.php:266-284`  
**Severity:** Low

The cleanup runs UPDATE and DELETE queries even if there are no old records. On large databases, these queries could be slow if not properly indexed.

**Recommendation:** Add a COUNT check before running the cleanup queries, or rely on the existing indexes.

### Concern 8.4: `get_stats()` runs multiple independent COUNT queries
**File:** `class-email-marketing-module.php:288-303`  
**Severity:** Low

Seven separate COUNT queries are run for dashboard stats. These could be combined into fewer queries.

**Recommendation:** Consider caching stats with a short TTL (e.g., 5 minutes) or combining queries.

---

## 9. Recommendations Summary

### Priority: HIGH

| # | Issue | Recommendation |
|---|---|---|
| H1 | Subscriber marked `bounced` on any failure | Only mark `bounced` for permanent failures; keep `subscribed` for transient failures |
| H2 | No exponential backoff for retries | Implement backoff (1h→2h→4h→max 24h) and max retry count |
| H3 | Public subscribe endpoint has no rate limiting | Add IP-based rate limiting (5 req/min) |
| H4 | Webhook subscribe has no authentication | Implement API key validation |

### Priority: MEDIUM

| # | Issue | Recommendation |
|---|---|---|
| M1 | `ensure_cron_events()` first event delayed 60s | Schedule first event at `time()` not `time() + MINUTE_IN_SECONDS` |
| M2 | WP-Cron unreliability on low-traffic sites | Document system cron requirement; add admin notice |
| M3 | No SMTP connection health monitoring | Add periodic health checks with admin UI status |
| M4 | Legacy password in `aime_settings` | Deprecate legacy field; read from connections only |
| M5 | Static IV fallback in Encryption | Remove legacy decryption fallback after migration |
| M6 | `daily_cleanup` not in `ensure_cron_events()` | Add it to ensure daily cleanup runs |
| M7 | `release_smtp_limit_waits()` matches on translatable string | Use a dedicated flag/status instead |

### Priority: LOW

| # | Issue | Recommendation |
|---|---|---|
| L1 | `count_expected_recipients()` missing `$wpdb->prepare()` | Always use prepare() |
| L2 | Redundant CASE WHEN in segment queries | Simplify to SUM(m.counter) |
| L3 | Open tracking doesn't deduplicate | Consider deduplication or accept as standard |
| L4 | `every_minute` schedule persists after deactivation | Cosmetic; low priority |
| L5 | Dashboard stats run 7 COUNT queries | Cache or combine queries |
| L6 | SMTP.com docs_url may be incorrect | Verify and update |

---

## Appendix: File-by-File Findings

### `class-email-marketing-module.php`
- ✅ Well-structured module bootstrap with clear separation of concerns
- ✅ Comprehensive DB schema (22 tables) with proper indexing
- ✅ HMAC-based tracking with URL-safe base64
- ⚠️ `ensure_cron_events()` should schedule first event at `time()`
- ⚠️ `daily_cleanup` not included in `ensure_cron_events()`
- ⚠️ `front_track_open()` doesn't deduplicate opens

### `class-email-rest-controller.php`
- ✅ Clean route organization with domain-specific controllers
- ✅ Proper permission checks on all admin routes
- ❌ Public subscribe endpoint lacks rate limiting
- ❌ Webhook subscribe endpoint lacks authentication

### `class-campaign-processor.php`
- ✅ Time-boxed processing prevents cron runaway
- ✅ Lazy body parsing is efficient
- ✅ Correct campaign finalization logic
- ❌ No exponential backoff for retries
- ❌ Subscriber incorrectly marked `bounced` on transient failures
- ⚠️ Campaign finalization race condition (low risk)

### `class-funnel-processor.php`
- ✅ Clean automation sequence execution
- ✅ Supports multiple action types (email, tags, webhooks, conditions)
- ⚠️ Unsubscribe URL uses `$row->hash` instead of `create_tracking_hash()`

### `class-smtp-provider.php`
- ✅ Excellent multi-connection architecture with fallback
- ✅ 12+ provider presets
- ✅ Password encryption with AES-256-CBC
- ⚠️ Static IV fallback for legacy data
- ⚠️ No health monitoring for connections

### `class-email-validator.php`
- ✅ Comprehensive disposable domain list
- ✅ Multi-layer validation (format, fake, disposable, MX)
- ✅ Extensible via filters
- ✅ MX result caching

### `class-encryption.php`
- ✅ AES-256-CBC with random IV for new encryptions
- ✅ Key derived from WordPress salts
- ⚠️ Legacy static IV fallback should be removed eventually

### `class-campaign-controller.php`
- ✅ Clean CRUD with metrics attachment
- ✅ A/B variant support
- ⚠️ `count_expected_recipients()` missing `$wpdb->prepare()` for empty args case

### `class-deactivator.php`
- ✅ Properly clears all cron hooks
- ✅ Optional data deletion on deactivation
- ✅ Flushes rewrite rules

---

*Review complete. No code was modified during this analysis.*
