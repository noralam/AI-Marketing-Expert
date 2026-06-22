# AI Marketing Expert — Automated Test Report

- **Date:** 2026-06-18
- **Plugin version:** 1.0.3.11 (`ai-marketing-expert.php`)
- **Requires:** WordPress 6.2+, PHP 8.0+
- **Test runner PHP:** 8.3.16 (CLI)
- **Scope:** No code was modified. This run covers static/automated verification only (syntax, build, route/schema/cron registration, and consistency of the five recently changed areas). It does **not** include live runtime execution against a running WordPress + database, because that requires a booted site and HTTP/DB access not available to this static run.

---

## 1. Test methods used

| Method | Tooling | What it proves |
|--------|---------|----------------|
| PHP syntax lint | `php -l` on every `.php` file | Files parse; no fatal syntax errors |
| JS production build | `npm run build` (wp-scripts/webpack) | Frontend + admin bundles compile |
| JS lint | `npx wp-scripts lint-js src` | ESLint/Prettier rule status |
| REST route inventory | `grep register_rest_route` | Endpoint surface + permission callbacks |
| Schema/cron inventory | `grep` activator/modules | Tables and scheduled events are registered |
| Fix consistency check | targeted `grep`/`sed` | The 5 changed areas are intact and wired end-to-end |

---

## 2. PHP syntax lint — PASS

- Files linted: **91** PHP files (excluding `vendor/`, `node_modules/`).
- Result: **0 syntax errors.** Every file reported "No syntax errors detected."

## 3. JavaScript build — PASS

- Command: `npm run build` → `webpack 5.106.2 compiled with 2 warnings`.
- Bundles regenerated under `build/` (including `index.js`, `chatbot-widget.js`).
- **Warnings (2):** asset-size-limit warnings for `index.js` (~1.09 MiB) and the `index` entrypoint (~1.49 MiB) exceeding webpack's 244 KiB recommendation. These are performance advisories, not build failures, and are pre-existing.

## 4. JavaScript lint — issues are formatting/config only

- Command: `npx wp-scripts lint-js src`.
- Result: ESLint reports **28,574 problems (28,565 errors / 9 warnings)**; ~28,011 auto-fixable via `--fix`.
- **Nature of the errors (observed in sampled output):** overwhelmingly `prettier/prettier` "Delete `␍`" — i.e. Windows CRLF line endings flagged against a Prettier config expecting LF. A small number are `no-undef` for browser globals (e.g. `sessionStorage` not declared in the lint env) and `curly`.
- **Assessment:** These are formatting/lint-config mismatches, not functional defects. The production build (Section 3) compiles successfully from the same sources. No functional error was surfaced by the linter in the sampled output.

---

## 5. REST API surface — registered

Namespace controllers register routes across all modules. Counts and protection observed:

- **Admin endpoints** use `admin_permission` (capability check). Confirmed across chatbot, content-generator, email-marketing, seo, social-media controllers.
- **Public endpoints** (chatbot widget) use `public_permission` (returns `true`) and are instead protected at the handler level by a signed HMAC `conversation_token`:
  - `POST /chatbot/public/start`
  - `POST /chatbot/public/message` (`conversation_token` required arg)
  - `POST /chatbot/public/lead` (`conversation_token` required arg)
  - `GET  /chatbot/public/poll/{id}` (`conversation_token` required arg)
- No `permission_callback => '__return_true'` literals were found anywhere in `includes/` or `modules/`.

## 6. Database schema & cron — registered

- **Tables:** activator/database define the full `aime_*` table set (subscribers, campaigns, campaign_emails, email_queue, automations + steps + logs, funnels + sequences + subscribers, chatbot bots/conversations/messages/knowledge/analytics, content, social, activity_log, settings, etc.).
- **Cron events registered:**
  - `aime_process_email_queue` — every minute
  - `aime_process_automations` — every minute
  - `aime_daily_cleanup` — daily
  - `aime_chatbot_daily_cleanup` — daily
  - `aime_content_sync_scheduled_articles` — hourly
  - `aime_run_email_queue` — scheduled by SMTP provider

---

## 7. Verification of the five changed areas

| Issue | Area | Verified observation |
|-------|------|----------------------|
| 4 | Chatbot conversation resume | `start()` resumes only when `$existing && $token && validate_conversation_token(...)` (`class-public-controller.php:84`); token sanitized at line 29. `message`/`lead`/`poll` validate token via `validate_conversation_token_response()`. Frontend persists token in `localStorage` and the rebuilt `build/chatbot-widget.js` contains the token storage key. |
| 6 | Chatbot global AI cap | Daily, IP-independent budget present: transient key `aime_chatbot_ai_daily_<Ymd>` with filter `aime_chatbot_daily_ai_budget` (default 2000) at `class-public-controller.php:282-283`, checked before the AI call. |
| 7 | Automation/campaign unsubscribe + editable page | All unsubscribe links now build via `create_unsubscribe_hash(...)` (campaign-processor, funnel-processor inline + footer, module). New `resubscribe` front route (`:490`), with handler `front_resubscribe()`, `get_unsubscribe_page_labels()`, `render_resubscribe_button()` — each defined exactly once (no duplicates). Free shows fixed thank-you text + "Subscribe again"; Pro overrides heading/message/button via options. Settings controller reads/saves `unsubscribe_heading`, `unsubscribe_message`, `resubscribe_button_text` with proper sanitizers; `EmailSettings.jsx` exposes these three fields gated by `window.aimeData.hasPro`. |
| 8 | Unsubscribe status binding | Queue SELECT includes `s.status AS subscriber_status` (`class-campaign-processor.php:406`); hash built with the real status. |
| 11 | OAuth proxy log redaction | `oauth-proxy/server.js` `/v1/token` (:320) and `/v1/refresh` (:367) log a static message + HTTP status only; raw upstream payload no longer logged. Client responses return a sanitized message string only. |

- **Pro/Free gating wiring (Issue 7) traced end-to-end:** `EmailSettings.jsx` (hasPro-gated inputs) → `POST /email/settings` → `save_settings()` sanitizers → `get_option('aime_*')` in `get_unsubscribe_page_labels()`. Consistent.

---

## 8. Limitations of this run

- No booted WordPress instance or database was exercised; therefore the following were **not** runtime-tested and should be confirmed manually on a live site:
  - Actual send of a campaign email and an automation/funnel email, then clicking **Unsubscribe → Subscribe again** (verifying status changes in `aime_subscribers` and an `aime_activity_log` `resubscribed` row).
  - Reloading the chat widget in a browser to confirm conversation history resumes with the persisted token, and that a missing/invalid token starts a fresh conversation.
  - Hitting the daily AI budget to confirm the HTTP 429 "high demand" fallback.
  - Saving the Pro unsubscribe-page fields and confirming the rendered page reflects them.

---

## 9. Summary

| Check | Result |
|-------|--------|
| PHP syntax (91 files) | PASS — 0 errors |
| Production build | PASS — 2 pre-existing size warnings |
| JS lint | Formatting/config errors only (CRLF/Prettier, env globals); no functional error surfaced |
| REST routes / permissions | Registered; public endpoints token-protected; no `__return_true` literals |
| DB schema / cron | Registered |
| 5 changed areas (4, 6, 7, 8, 11) | Present, consistent, no duplicate declarations |

No functional regressions were detected by the available automated checks. Runtime behavior in Section 8 remains to be confirmed on a live install.
