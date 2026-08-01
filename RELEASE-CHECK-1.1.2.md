# Pre-Release Bug Check — v1.1.2

Scope: uncommitted diff against `main` (PHP + JSX, `build/` excluded). Only issues with a
real behavioural or performance consequence are listed.

**Status:** all findings below are fixed except #8 and #9, which are deferred (see notes).
PHP 8.3 syntax lint passes on all changed files; `npm run build` re-run so `build/` matches
`src/`.

---

## Medium

### 1. Free-plan automation meter can lock a user out of both allowed toggles
`modules/seo/class-seo-module.php` — `get_active_automation_count()`
`modules/seo/controllers/class-automation-controller.php` — `save_settings()`

The meter counts **all four** toggles (`auto_audit_on_publish`, `auto_meta_on_publish`,
`auto_internal_links`, `auto_rank_check`), but enforcement counts only the two non-cron
ones. On an install where a cron toggle is already on (expired Pro, or a pre-1.1.2 free
install that could set them), `usage.tasks.used` is ≥ 1 with `limit = 1`, so
`SeoAutomation.jsx`'s `canEnableTask()` returns false for **both** publish-hook toggles and
the UI shows e.g. "2 of 1 used". The user cannot enable the feature they are entitled to,
and cannot turn the cron toggle off either (it is rendered behind `ProLock` + `disabled`).

Fix: count only the non-cron toggles in `get_active_automation_count()`, i.e. exclude
`AutomationController::CRON_TOGGLES`.

### 2. Two extra uncached option queries on every request
`includes/class-plugin.php:180` → `Activator::maybe_seed_email_defaults()`

Called unconditionally on `init`, so it runs on every front-end, admin, REST and cron
request. Its two guard flags are written with autoload = `false`:

```php
update_option( 'aime_double_optin_default_fixed', 1, false );
update_option( 'aime_email_defaults_seeded', 1, false );
```

A non-autoloaded option is a fresh `SELECT` on each `get_option()` when no persistent
object cache is present — two queries per request, forever, for a one-time migration.

Fix: autoload both flags (`true`), or gate the call behind `is_admin()`.

### 3. Failed date parse schedules the campaign to send immediately
`src/components/modules/EmailMarketing/CampaignEditor.jsx` — `handleScheduleConfirm`

```js
const dt = siteDateTimeToUtc( scheduleDate, scheduleTime );
setScheduleModalOpen( false );
handleSend( dt );
```

`siteDateTimeToUtc()` returns `''` when the value cannot be parsed, and `handleSend( '' )`
is the send-now path. A malformed value therefore blasts the campaign instead of failing.

Fix: `if ( ! dt ) { setNotice(...); return; }` before closing the modal.

### 4. In-flight runs briefly marked failed
`modules/workflow-automation/includes/class-workflow-engine.php:55`
`modules/workflow-automation/includes/class-workflow-repository.php` — `fail_stale_running()`

The cutoff is `LOCK_TTL / 60` = **10 minutes**, but the engine's own lock TTL is also 600s,
so a legitimately long run (multi-step AI workflow) that passes 10 minutes gets rewritten
to `status = 'failed'` with the "stopped unexpectedly" message while it is still running.
It later self-corrects when `finish_execution()` lands, but the Error Log shows a phantom
failure in the meantime.

Fix: use a cutoff comfortably above the worst-case run (e.g. 2 × `LOCK_TTL`, or exclude
executions whose workflow lock transient is still held).

---

## Low

### 5. Case-folded string compared against a mixed-case needle — branch is dead
`src/components/modules/WorkflowAutomation/ErrorLog.jsx` — `hintFor()`

```js
const t = ( text || '' ).toLowerCase();
...
if ( t.includes( 'timed out' ) || t.includes( 'timeout' ) || t.includes( 'cURL error 28' ) )
```

`'cURL error 28'` can never match a lowercased string. Harmless only because the two
preceding conditions usually catch the same errors. Use `'curl error 28'`.

### 6. Step-count totals can exceed `steps_total`
`modules/workflow-automation/includes/class-workflow-engine.php` — `execute()` catch block

The new `catch ( \Throwable )` does `$counts['failed']++` without writing a matching step
output row. The unreached-step sweep then records the remaining steps as skipped, so
`succeeded + failed + skipped` can come to `steps_total + 1` on an engine-level crash.

Fix: don't increment `failed` in the catch; record the engine error in `$step_errors` only.

Applied — plus an `$engine_error` flag, because removing the increment alone would let an
engine crash with zero failed steps be recorded as `status = 'success'`. Status is now
`partial` (some steps succeeded) or `failed` (none did) whenever the catch block runs.

### 7. `-id` in ORDER BY on a `bigint unsigned` column
`modules/email-marketing/controllers/class-template-controller.php:53`

```sql
ORDER BY is_default DESC, (CASE WHEN is_default = 1 THEN id ELSE -id END) ASC
```

`id` is `bigint(20) unsigned`. Verified working on MySQL 8.4, but unary minus on an
unsigned BIGINT is the classic `ER_DATA_OUT_OF_RANGE (1690)` trigger and behaves
differently across MariaDB versions and `NO_UNSIGNED_SUBTRACTION` settings. If it does
error, `get_results()` returns empty and the Templates screen renders blank.

Safer, equivalent rewrite:

```sql
ORDER BY is_default DESC, CASE WHEN is_default = 1 THEN id END ASC, id DESC
```

### 8. Default templates re-seed under a changed site language
`modules/email-marketing/controllers/class-template-controller.php` — `seed_defaults()`,
`dedupe_default_templates()`

Both the "already exists" check and the dedupe key on `name`, which is stored translated
(`__( 'Simple Text', … )`). Switching the site language makes every default look missing,
so a second translated set is inserted and dedupe cannot merge them. Pre-existing, but the
new "insert only what's missing" logic now depends on it. A `slug` column (untranslated)
would settle it properly.

Deferred: needs a schema change (new `slug` column + migration), too large for a patch
release. Only bites installs that switch site language after seeding.

### 9. `SHOW TABLES LIKE` treats `_` as a wildcard
`modules/seo/class-seo-module.php` — `count_rows()`

`SHOW TABLES LIKE 'wp_aime_seo_topics'` also matches `wpXaime…`. No practical impact on a
normal install; escape with `$wpdb->esc_like()` if you want it exact.

Deferred: cosmetic correctness only. `_` matching a single character cannot produce a wrong
answer here — the only tables that could collide would have to be a real plugin table under
a one-character-different prefix.

---

## Cosmetic / lint (no runtime effect) — all fixed

- `src/components/modules/WorkflowAutomation/WorkflowBuilder.jsx:8` — two `import`
  statements collapsed onto one line by an edit. Valid JS, but reformat:
  ```js
  import { __, sprintf } from '@wordpress/i18n';import { useNodesState, … } from '@xyflow/react';
  ```
- Unused imports left by the ProGate → UsageNotice refactor: `Spinner` in
  `Seo/views/TopicMap.jsx` and `Seo/views/ContentCalendar.jsx`; `hasPro` in
  `Seo/views/SeoSettings.jsx`.

---

## Checked and clean

- Version/DB-version bumps in `ai-marketing-expert.php` are consistent.
- `build/index.asset.php` includes the new `wp-date` dependency — build is in sync with
  the `@wordpress/date` usage in `src/utils/datetime.js`.
- New REST routes (`/seo/*/usage`, `/workflow-automation/logs`, `/usage`) don't collide
  with the existing `(?P<id>\d+)` patterns; all use `admin_permission`.
- `ActionRegistry`, `SeoModule`, `ProLock`, `UsageNotice` imports all resolve.
- `has_pexels_key` / `has_pixabay_key` / `stock_provider` are all present in
  `/content/settings`, and `ContentSettings` has a tab named `images`, so the
  ArticleEditor "Go to Settings → Images" path works.
- `window.aimeData.freeLimits` is localized (`includes/class-admin.php:374`), so
  `WorkflowBuilder`'s step meter reads a real value.
- The `add_option()`-based seeding mutex releases correctly on all paths (`finally`).
