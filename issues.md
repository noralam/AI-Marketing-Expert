# AI Marketing Expert — Code Review Issues

Plugin version reviewed: **1.0.3.11**
Date: 2026-06-17
Scope: PHP backend (`includes/`, `modules/`), Node `oauth-proxy/server.js`. React `src/` was not exhaustively reviewed.

Only **real, verified** issues are listed. Severity:
`🔴 HIGH` = security vulnerability, data exposure, or fatal/data-loss bug.
`🟠 MEDIUM` = logic bug causing wrong/broken behavior, or a lower-impact security weakness.

---

## Summary

| # | Sev | Area | Issue |
|---|-----|------|-------|
| 1 | 🔴 HIGH | Email tracking | Open redirect in public click-tracking endpoint — ✅ **FIXED** |
| 2 | 🔴 HIGH | Chatbot | Conversations are **public by default** (`is_public DEFAULT 1`) → transcripts leak — ✅ **FIXED** |
| 3 | 🔴 HIGH | OAuth proxy | OAuth `code` posted with `targetOrigin: '*'` fallback → auth-code leak — ✅ **FIXED** |
| 4 | 🟠 MEDIUM | Chatbot | `start` resumes another visitor's conversation with only a guessable client `visitor_id` (no token) |
| 5 | 🟠 MEDIUM | Chatbot | AI/agent message content stored unsanitized, rendered via `wp_kses_post` on public page (HTML injection) |
| 6 | 🟠 MEDIUM | Chatbot | No IP-independent global cap on AI generations → distributed cost abuse |
| 7 | 🟠 MEDIUM | Email | Automation emails ship a broken unsubscribe link (undefined `$row->hash`) |
| 8 | 🟠 MEDIUM | Email | Unsubscribe hash status-binding always uses literal `'subscribed'` (undefined `$email->subscriber_status`) |
| 9 | 🟠 MEDIUM | OAuth proxy | `/v1/refresh` has no state/origin/auth → open token-refresh oracle |
| 10 | 🟠 MEDIUM | OAuth proxy | Wildcard CORS (`app.use(cors())`) on token-bearing endpoints |
| 11 | 🟠 MEDIUM | OAuth proxy | Upstream error payloads (may contain tokens) written to logs |
| 12 | 🟠 MEDIUM | Social | `parse_token_response()` puts an array into a string message → "Array to string" + broken error |

---

## 🔴 HIGH

### 1. Open redirect in public click-tracking endpoint
**File:** `modules/email-marketing/class-email-marketing-module.php:563-632` (`front_track_click`)

Reachable unauthenticated via the `init` hook (`?aime_track=click&url=...`). The HMAC signature check that authorizes an off-site redirect is **inside `if ( $email )`**. If no `aime_campaign_emails` row matches the supplied `hash`/`token` (trivial — send a bogus `hash`), `$email` is `null`, the whole signature block is skipped, and execution falls through to an unconditional `wp_redirect()` (deliberately the unsafe variant, not `wp_safe_redirect`) using the attacker-supplied URL. `FILTER_VALIDATE_URL` happily accepts `https://evil.example`.

```php
if ( $email ) {
    $expected_signature = self::create_url_signature( ... );
    if ( ! $signature || ! hash_equals( $expected_signature, $signature ) ) {
        wp_safe_redirect( home_url() ); exit;
    }
    // ... record click ...
}
wp_redirect( esc_url_raw( $url ) ); // reached when $email is null — NO signature check
exit;
```

**Impact:** Classic phishing open redirect from a trusted site URL.
**Fix:** When `$email` is null or the signature is missing/invalid, `wp_safe_redirect( home_url() )` — never redirect to the unvalidated `$url`.
✅ **FIXED:** Added an explicit `if ( ! $email ) { wp_safe_redirect( home_url() ); exit; }` guard before the signature check, and moved the off-site `wp_redirect( esc_url_raw( $url ) )` to *after* a verified signature. Legitimate signed campaign links still redirect off-site and click metrics are recorded unchanged.

---

### 2. Chatbot conversations are public by default
**File:** `modules/chatbot/class-chatbot-module.php:173` (schema), `:304`, `:470` (discussions shortcode)

```sql
is_public tinyint(1) NOT NULL DEFAULT 1,
```

Every visitor conversation — `visitor_name` and the full message transcript — is `is_public = 1` by default. The `[aime_discussions]` shortcode lists all public conversations and `render_single_discussion()` renders any of them by **guessable sequential ID** (`?aime_conv=N`), with no per-conversation opt-in or visitor consent. Visitor messages routinely contain names, emails, order numbers, etc.

**Impact:** Mass leak of private chat transcripts to anyone who installs the shortcode or guesses IDs.
**Fix:** Default `is_public` to `0`; publishing must be an explicit admin action.
✅ **FIXED:** Schema changed to `is_public tinyint(1) NOT NULL DEFAULT 0`, `DB_VERSION` bumped `1.1.0 → 1.2.0`, and an explicit `ALTER TABLE … MODIFY is_public … DEFAULT 0` added to `create_tables()` so existing installs also get the corrected default (dbDelta does not reliably change a column default). The admin publish/unpublish bulk action and per-conversation toggle (`conversation-controller.php`) are unchanged, so admins can still explicitly publish. Existing rows are intentionally left untouched to avoid clobbering any conversation an admin already chose to publish.

---

### 3. OAuth authorization code leaked via `targetOrigin: '*'`
**File:** `oauth-proxy/server.js:208` (callback) and `:31` (CORS)

```js
res.send(renderCallbackPage({
    success: true, platform: stored.platform, code, state,
    targetOrigin: stored.site || '*',   // ← '*' delivers code to ANY origin
}));
```

When a stored state entry has no `site`, the callback page `postMessage`s the OAuth `code` + `state` with `targetOrigin: '*'`, so any window/origin that can read the popup captures the code — which is exchangeable for an access token via `/v1/token`. The validated-origin machinery is silently bypassed whenever `site` is absent.

**Impact:** Account-takeover-grade leak of the OAuth authorization code.
**Fix:** Refuse to emit a success `postMessage` when `stored.site` is empty; never fall back to `'*'`.
✅ **FIXED:** The callback now returns an error page when `stored.site` is empty and uses `targetOrigin: stored.site` (no `'*'` fallback). The WP plugin always sends `site => home_url()` to `/v1/authorize` (`class-oauth-service.php:115`), so the legitimate connect flow is unaffected.

---

## 🟠 MEDIUM

### 4. Chatbot `start` resumes another visitor's conversation with no token
**File:** `modules/chatbot/controllers/class-public-controller.php` (`start`, ~`:68-102`)

`start` accepts an attacker-chosen `visitor_id` + `bot_id` with **no `conversation_token`**, and returns the full existing conversation (incl. `messages[]`) when one matches:

```php
$existing = $wpdb->get_row( $wpdb->prepare(
  "SELECT id FROM %i WHERE bot_id = %d AND visitor_id = %s AND status IN ('active','human_takeover') ...",
  $conversations_table, $bot_id, $visitor_id ) );
```

`visitor_id` is the only secret protecting resume, and it is a client-generated value stored in a non-HttpOnly cookie and echoed into page JS — guessable/leakable. Every other endpoint requires the HMAC `conversation_token`; resume does not.
**Fix:** Require the HMAC `conversation_token` to resume/read a conversation.

### 5. Public chat content rendered via `wp_kses_post` (HTML injection)
**File:** `modules/chatbot/class-chatbot-module.php` (`render_single_discussion`, ~`:512`) + `services/class-chat-service.php` (stores raw `$ai_content`)

Visitor messages are tag-stripped (`sanitize_textarea_field`), but **AI/agent** messages are stored raw and rendered with `echo wp_kses_post( wpautop( $msg->content ) )`. `wp_kses_post` permits `<a href>`, `<img>`, etc., so a prompt-injected AI reply containing markup is rendered into the public discussion page (which is public-by-default, see #2).
**Fix:** Store/escape AI message content as plain text on the public page.

### 6. No IP-independent cap on AI generations (cost abuse)
**File:** `modules/chatbot/controllers/class-public-controller.php` (`message`, ~`:172-185`)

All AI-call rate limits are per-conversation (resettable by calling `start`) or IP-keyed (`message_global` 60/min, `message_daily` 200/day). There is no site-wide, IP-independent daily budget on paid AI calls, so distributed abuse across rotating IPs can run up unbounded AI-provider cost.
**Fix:** Add a global per-site AI-call budget independent of IP.

### 7. Automation emails ship a broken unsubscribe link
**File:** `modules/email-marketing/services/class-funnel-processor.php:264-268` (`action_send_email`); query at `:37-49`

The followups query selects `fs.*, s.email, s.first_name, s.last_name, s.status AS sub_status` and `aime_funnel_subscribers` has no `hash` column, yet:

```php
$unsub_url = add_query_arg(
    array( 'aime_track' => 'unsubscribe', 'hash' => $row->hash ?? '' ),
    home_url()
);
```

`$row->hash` is always undefined → empty `hash` → `decode_unsubscribe_hash('')` rejects it (`wp_die('Invalid unsubscribe link')`). Recipients of automation emails **cannot unsubscribe** (CAN-SPAM/GDPR compliance problem). Even when populated, this passes a raw value rather than the signed HMAC token the decoder expects.
**Fix:** Build the unsubscribe URL with `EmailMarketingModule::create_unsubscribe_hash(...)` like the campaign path.

### 8. Unsubscribe hash status-binding is always the literal `'subscribed'`
**File:** `modules/email-marketing/services/class-campaign-processor.php:692-700` (`get_unsubscribe_url`); query at `:406-407`

`process_queue()` never selects the subscriber status, so `$email->subscriber_status` is undefined and falls back to `'subscribed'`:

```php
$hash = EmailMarketingModule::create_unsubscribe_hash(
    (int) ( $email->campaign_id ?? 0 ),
    (int) ( $email->subscriber_id ?? 0 ),
    (string) ( $email->subscriber_status ?? 'subscribed' )  // always 'subscribed'
);
```

The intended binding of the unsubscribe token to the status-at-signing never functions (status component is a constant).
**Fix:** Add `s.status AS subscriber_status` to the queue SELECT.

### 9. `/v1/refresh` has no state/origin/auth control
**File:** `oauth-proxy/server.js:320-360`

Anyone who submits a `platform` + valid `refresh_token` gets a fresh access token minted with the proxy's own app secret — no state, no site binding, no auth. Combined with wildcard CORS (#10), it acts as an open token-refresh oracle for the shared app.
**Fix:** Require a signed/shared-secret request or bind refresh to a registered site.

### 10. Wildcard CORS on token-bearing endpoints
**File:** `oauth-proxy/server.js:31` — `app.use(cors());`

Reflects `Access-Control-Allow-Origin: *` on every route including `POST /v1/token` and `POST /v1/refresh`, which return live access/refresh tokens. These are server-to-server calls (`wp_remote_post`) and don't need browser CORS at all.
**Fix:** Restrict CORS to known origins, or drop it for the token endpoints.

### 11. Secrets written to logs
**File:** `oauth-proxy/server.js:308` and `:355`

```js
console.error('[/v1/token]', err.response?.data || err.message);
console.error('[/v1/refresh]', err.response?.data || err.message);
```

On a provider error, `err.response.data` frequently echoes the request (`access_token` / `fb_exchange_token`, and app-secret in debug fields). PM2 persists these to `logs/error.log`.
**Fix:** Log a static message or redacted error code, not the raw upstream response.

### 12. `parse_token_response()` array-to-string on error
**File:** `modules/social-media/services/class-oauth-service.php:239`

```php
return array( 'success' => false, 'message' => $body['error'] ?? __( 'Token exchange failed.', ... ) );
```

Facebook/Graph returns `error` as an **object** (`{message, type, code}`). Passing the array as `message` produces "Array to string conversion" notices downstream and an empty/broken error surfaced to the admin. (`parse_facebook_token_response()` correctly uses `$body['error']['message']`.)
**Fix:** Use `$body['error']['message'] ?? $body['error']`.

---

## Notes — checked and found NOT to be issues
- All admin REST routes across core, SEO, content, email, social, and chatbot use a `manage_options` permission callback; the only public endpoints (email subscribe/webhook/tracking, chatbot public controller) are intentional and mostly guarded (API key / HMAC token / honeypot / rate limit).
- SQL throughout uses `$wpdb->prepare()` with `%i`/`%d`/`%s` placeholders, including dynamically-built `IN (...)` clauses (built from placeholder counts, not values). No SQL injection found.
- AI provider keys are encrypted at rest (AES-256-CBC via WP salts) and masked in API responses.
- SEO module does not fetch arbitrary user-supplied URLs server-side (no SSRF surface there). The social X-media download path is protected by host/SSRF filtering with a size cap.
- OAuth `state` (PHP side) is generated per-user, stored in a transient, and verified by value + platform on callback.
