# Workflow Automation — Deep Audit & Improvement Plan (v2, merged)

> **Scope:** Full review of the Workflow Automation module (engine, all 10 action steps,
> triggers, templates, REST API, and the React visual builder) with a concrete roadmap to
> make every step as strong as AI Brain + Blog Post, more user-friendly, and competitive
> with the current (2026) AI automation landscape.
>
> **No code was changed for this document.** This is analysis + ideas only.
>
> **v2 note:** This revision merges the companion audit
> `WORKFLOW-AI-UPGRADE-IDEAS.md`. Every merged claim was **independently re-verified
> against the code** before inclusion; two of the companion's claims needed correction
> (see §3.4), and one of my own v1 suggestions was wrong and is fixed (§6.4 — minimap
> already exists). Cross-references like `(E5)` point at the companion doc's issue IDs.

---

## 1. Executive Summary

The module's core is genuinely solid: the engine (locks, retries, branch skipping, loop
guards, stale-run rescue) and the two flagship steps — **AI Brain** and **Generate Blog
Post** — are well designed and deeply integrated with each other. The visual builder is a
real React Flow canvas with palette, drag-and-drop, minimap, zoom, and live run overlays.

But the module stops short in three distinct ways:

1. **The other eight steps never received the same wiring as the flagships.** AI Brain
   produces a rich structured brief (`selected_topic`, `angle`, `key_points`,
   `target_reader`, `keywords`, `full_output`), but **only Blog Post consumes it**.
   Social Post, Email Campaign, and Ad Copy each re-implement a weaker version of topic
   resolution, ignore the brief, ignore brand voice, and cannot read trigger-event data.
   Two flagship Pro templates (**Full Marketing Autopilot**, **Publish + Promote**) ship
   in a state where their social/email steps fail with *"No topic provided"*.
2. **The engine has reliability races and platform limits** (WP-Cron-only execution,
   non-atomic locks, two-query schedule updates, no server-side cycle rejection, blocking
   sleep retries, no per-step timeout, quota burned by failed/test runs) — detailed in §5.
3. **Advanced capability that already exists in the codebase is unwired.**
   `ContentGeneratorService` ships `generate_outline()`, `generate_section()`, and
   `generate_meta()` — none used by the workflow Blog Post step. `AiProvider` supports
   `json_mode` for four providers — no caller passes it. The SEO audit grades internal
   links (≥2 = pass) while the blog generator never inserts any. Detailed in §6.

Section 3 lists the confirmed step-wiring bugs; §5 the engine findings; §6 the unwired
AI capabilities; §7–§10 the improvement roadmap (fixes → UX → new steps → modern AI).

---

## 2. What Already Works Well (keep as the pattern)

These are the module's strengths and should be treated as the reference standard every
other step is brought up to:

| Area | Where | Why it's good |
|---|---|---|
| Execution engine | `class-workflow-engine.php` | Branch execution with skipped-subtree accounting (counts always sum to `steps_total`), loop guard so a workflow publishing a post can't re-fire `post_published`, stale queued/running rescue, labeled error summaries |
| Visual builder | `WorkflowCanvas.jsx`, `graph.js` | Real React Flow canvas: palette drag-drop, minimap, zoom controls, fit-view, auto-layout, free-step meter |
| AI Brain v2 | `class-ai-brain-action.php` | Strategy prompt, recent-topic avoidance via `recent_topics()`, multi-URL cached context, structured brief output |
| Blog Post | `class-blog-post-action.php` | Inherits Brain's topic/keywords, injects the full brief + brand voice as system instructions, rotation, categories/tags/author resolution, fail-soft featured images (stock + AI), draft-or-publish |
| Smart keyword cascade | `class-seo-audit-action.php` | config → Brain topic → Brain keywords → Yoast → RankMath → own meta → title words |
| Rotation without repeats | `class-base-action.php::rotate_topic()` | Random-without-repeat with cycle reset and list-fingerprint state keys |
| URL knowledge cache | `class-context-knowledge-store.php` | Fetch-once transients, tag-stripping, char cap, fail-soft |
| AI provider layer | `includes/class-ai-provider.php` | Multi-provider, circuit breaker, cross-provider truncation stitching, Retry-After parsing |
| Social caption prompts | `class-ai-social-service.php` | Injection defense, delimiters, anti-preamble retry — best prompt hygiene in the repo |
| Decoupled registry | `aime_workflow_actions` filter | Third parties can add steps; inactive modules degrade to "skipped with notice" instead of fatal |
| Event dispatch | `class-trigger-dispatcher.php` | Lazy listeners, per-payload debounce, async one-shot cron execution |
| History, error log & analytics | repository, `ErrorLog.jsx`, `WorkflowAnalytics.jsx` | Per-run/per-step history, outcome totals, failure aggregation with remediation hints, 90-day prune |

---

## 3. Confirmed Step-Wiring Bugs — the "other steps are not properly set" list

All verified against the code (not guesses). File references included.

### 3.1 Broken / mis-wired step chaining

| # | Bug | Where | Impact |
|---|---|---|---|
| B1 | **Topic resolution only looks one level up.** `BaseAction::topic()` falls back to `parent_output.reference.selected_topic` — the *direct parent only*. Any step more than one hop from AI Brain (e.g. chained after the SEO audit) gets nothing. | `class-base-action.php:46-59` | **"Full Marketing Autopilot" template fails as shipped**: `social` and `campaign` hang off `audit`, whose reference has no `selected_topic`; workflow topic is empty in the template → both steps fail with "No topic provided". |
| B2 | **AI-generation steps are event-blind.** The `post_published` trigger delivers `post_title` / `post_url` in `context['event']`, but `SocialPostAction`, `EmailCampaignAction`, `AdCopyAction`, and `BlogPostAction` never read `context['event']`. Only FunnelEnroll, SendNotification, and Condition do. | `class-social-post-action.php:30`, `class-email-campaign-action.php:26` | **"Publish + Promote" template fails as shipped** — no topic anywhere → "No topic provided for the social post / email campaign". The most natural workflow ("post published → promote it") cannot work without manual topic entry. |
| B3 | **SEO Audit inherits the wrong ID type.** When inheriting, it prefers `article_id` (the `aime_content_articles` row ID) over `wp_post_id`. But `OnPageSeoService::run_audit()` → `gather_post_data()` calls `get_post()` — the **WordPress** ID space. | `class-seo-audit-action.php:26-33` vs `class-on-page-seo-service.php:129-135` | Audits the *wrong WP post* (whatever happens to share the numeric ID) or fails. Should prefer `wp_post_id` and only use `article_id` via an explicit content-module lookup. |
| B4 | **Email campaign title tokens are promised but never replaced — anywhere.** The field help advertises `{topic} {workflow_name} {event.email} {event.first_name} {event.post_title}`; the action just sanitizes the raw string. Token replacement exists only inside `SendNotificationAction`. | help at `class-workflow-automation-module.php:472`; missing in `class-email-campaign-action.php:31-35` | Users write `Re: {event.post_title}` and literally get that string as the campaign title. *(The companion doc's phrasing "substitution in body (title only)" is inaccurate — the title has no substitution either; verified.)* |
| B5 | **Social caption context reads the wrong step.** `AiSocialService::generate_caption()` receives `$context['previous'][0]['preview']` — the *first* step ever executed — while CustomPrompt uses the *last* and BlogPost uses the *parent*. Three different conventions. | `class-social-post-action.php:54` | In multi-step flows the caption's "context" is arbitrary; when chained after Blog Post it doesn't even see the article. |
| B6 | **AI Brain brief is consumed only by Blog Post.** Email, Ad Copy, and Social get none of `angle` / `key_points` / `target_reader` / `full_output`. | compare `class-blog-post-action.php:29-42,83-93` with the other actions | The "coordinated batch" promise of AI Brain isn't realized downstream — each AI step re-derives context from a bare topic string. |
| B7 | **Brand voice is applied only in Blog Post**, despite the UI promising "Applied to AI content steps in this workflow." | `class-blog-post-action.php:69-80` | Emails/ads/social generated in a workflow ignore the selected brand voice. |
| B8 | **Inserting any step between Brain and Blog loses the brief** (one-level `parent_output` again). A Condition or Notification between them silently breaks inheritance. | engine passes only direct-parent output | Fragile chaining; users don't understand why results got worse. |
| B9 | **Condition step cannot compare numbers or read structured references.** Checks offered: `previous_step_succeeded`, `previous_output_contains`, `event_field_contains` — substring ops only, even though the audit puts `score` into `reference`. | `class-condition-action.php:27-45` | The **SEO Gatekeeper** template claims "If audit passes → publish; if fails → notify", but an audit *step* always succeeds regardless of score, so the Yes branch is always taken. "Publish if score > 80" is impossible today. |

### 3.2 Dead code / config that lies to the user

| # | Bug | Where |
|---|---|---|
| B10 | **AI Brain `output_format` field is dead.** UI offers "Content Brief" vs "Custom JSON (Pro)" — `AiBrainAction::run()` never reads `output_format`. | registered `class-workflow-automation-module.php:560-570`; absent from `class-ai-brain-action.php` |
| B11 | **ConfigPanel notice never renders** — checks `step.action_type === 'blog_post'` but the real action type is `generate_blog_post`. | `ConfigPanel.jsx:256` |
| B12 | **`visible_rule` serialization hack collapses all visibility logic.** `ActionRegistry::resolve_fields()` converts *any* callable `visible` into the string `'not_parent_ai_brain'`. The `wc_products` field's real rule (`class_exists('WooCommerce')`) is silently replaced — the field can render on non-WooCommerce sites (with empty options), and any future visibility rule will silently become "hide under AI Brain". | `class-action-registry.php:119-123` |
| B13 | **Templates set a dead `publish => false` key** in Blog Post config; the real key is `post_status` (`draft`/`publish`). Harmless today (default is draft) but misleading to anyone editing templates. | `class-builtin-templates.php` (all 6 blog steps) |
| B14 | **Email campaign `created_by` is null on cron runs** (`get_current_user_id() ?: null`), while Blog Post falls back to the workflow creator. Inconsistent attribution. | `class-email-campaign-action.php:69` |
| B15 | **Templates ship `strategy_prompt: ''` while the field is required** — applying a template yields a workflow that can't be activated until the user discovers the hidden required field inside the Brain node. (Validation catches it, but the UX doesn't guide.) | `class-builtin-templates.php` + `graph.js` validate() |

---

## 4. Step-by-Step Health Check

| Step | Verdict | Notes |
|---|---|---|
| **AI Brain** | 🟢 Good, shallow | Solid mechanics. Gaps: single LLM pass (no research loop, no SERP grounding, no fact-check), `output_format=json` dead (B10), 4000-char URL-context cap silently truncates. |
| **Generate Blog Post** | 🟢 Works / 🔵 huge headroom | The gold standard for chaining — but it calls `generate_article()` **single-shot** while `ContentGeneratorService` already ships `generate_outline()` (:356), `generate_section()` (:387), `generate_meta()` (:536), all **unwired**. No meta description persisted to Yoast/RankMath, no FAQ/schema, no internal links (which the audit grades!), no readability/self-critique pass. See §6.1. |
| **Custom AI Prompt** | 🟡 OK | Works, auto-fetches URLs, stores `full_output`. Missing: token support (`{topic}`, `{event.*}`), model/output-size/temperature choice, save-target options, and a "test this prompt" button. |
| **Run SEO Audit** | 🔴 Broken inheritance (B3) + hollow URL mode | ID-space bug (B3); **URL-mode audit returns an empty shell** (`title ''`, `content ''`, `word_count 0` at `on-page-seo-service.php:154-164`) producing misleading scores; keyword density via raw `substr_count` (matches inside words); suggestions stored but never auto-applied — no fix loop back into content. |
| **Publish Social Post** | 🔴 Under-wired (B1/B2/B5/B6) | Best prompts in the repo, but: no link to the generated/published article, no image, no per-platform variants, no hashtags on the workflow path, hardcoded "+5 min" scheduling, no UTM builder. |
| **Create Email Campaign** | 🔴 Under-wired (B1/B2/B4/B6/B7) | Draft-only by design (fine), but: requests JSON while **never passing `json_mode`** to the provider (dead plumbing — see §6.2), no tokens (B4), no brief, no brand voice, no audience/list selection, no preheader/plain-text/spam-check/A-B subject variants. |
| **Generate Ad Copy** | 🟡 OK-ish | Rotation (manual + Woo) is nice. But: Woo context limited to product *name* (no price/benefits/description), no per-platform schemas (Google RSA 30/90, Meta 125), output dumped as a *blog draft article*. |
| **Enroll in Funnel** | 🟢 OK | Simple and correct. Hard-fails if subscriber doesn't exist (no auto-provision option); dupe enrollment indistinguishable from success (trigger no-ops internally). |
| **Send Notification** | 🟡 OK | Has the only token replacer in the module — but cannot reach `reference` fields (a notification about a new post can't include its edit URL unless stuffed into preview text). Plain text only. |
| **Condition (If/Else)** | 🔴 Too primitive (B9) | 3 substring checks. No numeric compare, no reference-field reads, no equals/regex/empty, no AND/OR, binary only. |

---

## 5. Engine & Platform Reliability Findings (merged from companion audit, independently verified)

Verified items marked ✅; companion-reported items I could not fully re-verify are marked
◇ with the reference.

| # | Finding | Status / Evidence |
|---|---|---|
| R1 | **No durable queue — everything rides WP-Cron.** Low-traffic sites miss the 5-minute tick entirely; one-shot event runs depend on `spawn_cron()`. | ✅ `class-workflow-automation-module.php:96-98`, dispatcher. |
| R2 | **Whole workflow = one synchronous PHP request** with `set_time_limit(0)`; an FPM/host kill mid-run is only recovered by the 20-minute stale sweep, and the run's work is lost (no resume). | ✅ `class-workflow-engine.php:124-126,57`. |
| R3 | **Blocking `sleep()` retries** (2+4+8s) inside the dispatch tick starve other due workflows (head-of-line blocking). | ✅ `class-workflow-engine.php:392-398`. |
| R4 | **Non-atomic concurrency guard.** `get_transient()` then `set_transient()` is check-then-set; two concurrent consumers (dispatch + stale rescue) can both pass for `execution_id = 0` paths → duplicate runs. (Nuance vs companion E4: a failed *claim* of a pre-created row returns cleanly — the real race is the lock itself, and it is taken *after* the claim.) | ✅ `class-workflow-engine.php:92` vs `:112-120`. |
| R5 | **`mark_ran()` is two queries with no transaction** — a crash between `last_run_at` update and `set_next_run()` leaves `next_run_at` in the past → duplicate run on the next tick. | ✅ `class-workflow-repository.php:130-140`. |
| R6 | **Debounce is check-then-set** (non-atomic) → duplicate queued executions possible on double-fired hooks. | ✅ `class-trigger-dispatcher.php:92-96`. |
| R7 | **The engine's BFS loop never checks `$executed` before running a dequeued step, and the REST save path does no graph validation** — the builder's client-side `validate()` is the only cycle guard. A cyclic graph saved via API (or a bug) loops until PHP death. | ✅ `class-workflow-engine.php:177-256,339-347`; REST `update()`/`save_steps` validate plan + required config only. |
| R8 | **No per-step timeout** — a hung AI call is bounded only by the provider HTTP timeout and the 10-min lock. | ✅ engine design. |
| R9 | **Preview truncation nuance (corrected from companion E11).** `record_output()` caps the *stored* preview at 2000 chars (`engine:449`) — but at **runtime**, children receive the full in-memory result via `parent_output` / `previous` (engine builds these from the action result, not the DB row). So same-run chaining is *not* truncated today; what suffers is anything reading from storage — history UI, error log, and any future **resume-from-checkpoint** feature, which is precisely §8's Phase 1 proposal. Persisting full outputs remains the right fix. | ✅ corrected. |
| R10 | **Free quota counts failed AND manual/test runs.** `count_runs_this_month()` counts everything with `status != 'skipped'` — a debugging session burns the user's 30 monthly runs. | ✅ `class-workflow-repository.php:226-233`. |
| R11 | **SSRF surface:** ContextKnowledgeStore fetches arbitrary admin-supplied URLs with no scheme allowlist, no private/reserved-IP blocking, no DNS-resolution check, no redirect cap. Admin-only today, but a real risk on multisite/agency installs. | ✅ `class-context-knowledge-store.php:37-57,118-122`. |
| R12 | **Failure emails spam:** one email per failed step, always to `admin_email`, recipient not configurable. | ✅ `class-workflow-engine.php:478-500`. |
| R13 | Token system minimal: `{topic}`, `{workflow_name}`, `{previous_preview}`, `{event.*}` only — no `{step.reference.field}` addressing. | ✅ `class-send-notification-action.php:60-93`. |
| R14 | `replace_steps()` is DELETE-then-reinsert, non-transactional; scheduler drift/DST issues; topic-rotation option read-modify-write race. | ◇ companion E14/E16/E18 (repository/scheduler internals; plausible, spot-checked only). |

---

## 6. Unwired Capability — the codebase already contains the upgrades

### 6.1 The Blog Post 2026 pipeline (highest-leverage finding)

`ContentGeneratorService` **already ships** the multi-stage building blocks — none used by
the workflow step, which calls `generate_article()` single-shot with `outline=''`:

| Method | Line | What it enables |
|---|---|---|
| `generate_outline()` | `class-content-generator-service.php:356` | Editable outline before drafting (approval-lite) |
| `generate_section()` | `:387` | Section-by-section drafting → coherent 3000+ word long-form without hitting max_tokens |
| `generate_meta()` | `:536` | Meta title/description — currently **never persisted** to Yoast (`_yoast_wpseo_title/_yoast_wpseo_metadesc`) or RankMath |

And the ironic gap: `OnPageSeoService` grades **internal links ≥ 2 as pass**
(`on-page-seo-service.php:309-322`) while the blog generator inserts **zero** internal
links — the workflow systematically produces content its own audit flags.

Target pipeline (each stage = engine step or internal sub-stages):

```
[Keyword/SERP research] → [Outline] → [Section drafting] → [Self-critique & revise]
  → [Polish & humanize] → [SEO package: meta/slug/FAQ schema/alt text]
  → [Internal links] → [Images] → [Publish/queue] → [Distribute per-platform]
```

### 6.2 AI layer gaps (verified)

- **`json_mode` is dead plumbing.** `AiProvider` implements it for four providers
  (`class-ai-provider.php:2534, 2606, 2678, 2729`) — **no module caller passes it**.
  Every JSON-expecting action (Email, Brain, SEO suggestions) regex-parses-and-prays via
  `aime_parse_ai_json` instead.
- **Temperature hardcoded 0.7** (`class-ai-provider.php:2530`); no per-action model,
  temperature, or max-tokens override anywhere.
- **No per-step token/cost accounting** — the usage tracker exists globally but nothing
  records tokens or estimated cost against a step/execution.

---

## 7. Phase 1 — Correctness Fixes (do first, small diffs, big trust win)

1. **Ancestor-aware topic/brief resolution.** Add `BaseAction::resolve_from_context()`:
   walk `$context['previous']` *newest→oldest* for the first `selected_topic` /
   `full_output` / `keywords` reference, before falling back to workflow topic. Fixes
   B1, B6, B8 in one place; every step benefits without touching each action.
2. **Event-aware topic fallback.** In the same resolver: if still empty and
   `context['event']` contains `post_title` (or `name`), use it. Fixes B2 and makes the
   two broken templates work as shipped.
3. **Fix SEO audit inheritance order** — prefer `wp_post_id`, then `article_id` (mapped
   through the content module to its WP post), then latest published. Fixes B3.
4. **Shared token engine.** Extract `SendNotificationAction::replace_tokens()` into a
   `WorkflowTokens` helper; use it in Email title/subject, Custom Prompt, Social topic,
   Ad product. Start with the current fixed tokens, then extend to
   `{step_key.reference.field}` addressing (`{seo_audit.score}`, `{ai_brain.keywords}`)
   resolved against persisted outputs — this also gives Condition v2 its data source.
   Fixes B4, R13; unlocks composition everywhere.
5. **Fix the ConfigPanel action-type check** (`generate_blog_post`). Fixes B11. (One line.)
6. **Fix `visible_rule` hack** — serialize real visibility rules (e.g.
   `visible_rule: {type: 'module_exists', module: 'woocommerce'}` and
   `{type: 'parent_not', action: 'ai_brain'}`) so the WooCommerce field gets its true
   rule back. Fixes B12.
7. **Implement or remove AI Brain `output_format`** (B10) — implementing it is better:
   JSON mode unlocks reliable downstream parsing (§9.1).
8. **Brand voice everywhere** — apply the same preset-injection Blog Post uses to Email,
   Ad Copy, Social caption, Custom Prompt. Fixes B7.
9. **Template hygiene** — replace `publish => false` with `post_status => 'draft'`;
   prefill a sensible default `strategy_prompt` per template (editable); make the
   "Publish + Promote" templates event-aware so they run out-of-the-box. Fixes B13, B15.
10. **Email `created_by` fallback** to workflow creator. Fixes B14.
11. **Social context fix** — pass the resolved parent/ancestor output (article title +
    URL when chained after Blog Post) instead of `previous[0]`. Fixes B5.
12. **Engine quick wins (from §5):** atomic lock via `wp_cache_add`/option-CAS; wrap
    `mark_ran()` in a transaction; atomic debounce; server-side cycle+orphan validation
    in `save_steps()`; don't count failed/test executions toward the monthly cap; one
    failure digest per execution with configurable recipient. (R4, R5, R6, R7, R10, R12)
13. **SSRF guard** in ContextKnowledgeStore: scheme allowlist, private/reserved IP
    blocking with DNS resolution, redirect cap. (R11)

---

## 8. Phase 1.5 — Reliability Foundations (before heavy features)

1. **Adopt Action Scheduler** (ships with WooCommerce; likely already present on most
   installs) as the execution backbone: each step becomes a queue item → survives PHP
   kills, removes blocking `sleep()` retries, per-tick time budgets, parallel workflows.
   Resolves R1, R2, R3, R8. *(Largest single upgrade; everything else gets easier after it.)*
2. **Persist full step outputs** (not just 2000-char previews) so history, error log, and
   future features can read complete artifacts — prerequisite for resume + rich tokens (R9).
3. **Resume-from-failed-step** — rerun button on a failed execution starts at the first
   failed step using persisted context; saves AI spend and user patience.
4. **Workflow revision history** — version table on save; diff + restore.

---

## 9. Phases 2–4 — User-Friendliness, New Steps, Modern AI

### 9.1 Structured AI outputs + model controls (cheap, huge lift)

1. **Wire `json_mode` through `AiProvider`** for every JSON-expecting action (Brain, Email,
   SEO suggestions); schema-validate the response; one corrective retry on failure
   ("output failed schema: …"). Provider support already exists (§6.2).
2. **Per-step model settings** — optional model/provider, temperature, max-tokens per AI
   action (default = global connection). Route cheap models to briefs/classification,
   frontier models to long-form.
3. **Output contracts as PHP arrays** → auto-rendered into prompts and used for validation.
4. **Cost transparency** — record tokens + estimated cost per step output; per-execution
   rollup in the history drawer.

### 9.2 Builder UX & user-friendliness

- **Variable/data picker (the biggest power-tool gap vs n8n/Zapier):** in any config
  textarea, `{` opens a dropdown of available upstream outputs
  (`{ai_brain.selected_topic}`, `{seo_audit.score}`…) — depends on the shared token engine.
- **Inheritance chips in the config panel**: when a field would inherit from an upstream
  step, show a read-only chip ("↳ inherited from AI Brain: *topic*") instead of a blank
  input. Blank-but-inheriting fields are the #1 confusion today.
- **Undo/redo stack + node copy/paste/duplicate (Ctrl+D) + confirm-on-delete.** Backspace
  currently deletes a node instantly with no undo (`WorkflowCanvas.jsx:60`). *(v1 of this
  doc suggested adding a minimap — wrong: minimap, zoom and fit-view already exist.)*
- **Per-step "Test step"** in the config panel: run one step with mock or last-success
  upstream context; extend `TestRunModal` to JSON fields. Today every prompt iteration
  costs a full run *and* monthly quota (R10).
- **Validation panel** listing ALL issues with click-to-focus (currently first-issue toast
  only); **i18n-wrap the hardcoded English strings in `graph.js` validate()**.
- **Run progress:** elapsed timer, per-step live feed, **cancel button** (engine flag);
  replace 3s polling with an SSE stream — doubles as the "watch it work" demo moment.
- **Dirty-guard on sidebar navigation** (currently only the Back button confirms).
- **Template gallery**: preview graph before apply, search/filter, save-your-own, clone;
  **duplicate workflow + export/import JSON** on the list screen.
- **Cron health notice**: warn on the workflows screen if `DISABLE_WP_CRON` is set or no
  cron tick in >10 min — the most common silent failure on real hosts (R1's UX face).
- **"Clear URL knowledge cache"** settings button — `flush_all()` exists with no UI.
- **A11y sweep**: aria-labels on icon buttons, `aria-pressed` on weekday chips, dialog
  semantics/focus-trap, keyboard-operable history rows.

### 9.3 New steps & triggers

**Control steps (highest leverage):**
1. **Wait / Delay** — pause N minutes/hours/days or until a clock time; queue-native once
   Action Scheduler lands. Unlocks real nurture sequences in one workflow.
2. **Approval (human-in-the-loop)** — pause, email one-click Approve/Reject (signed
   token), resume or skip subtree. THE trust feature for AI publishing; pairs with
   draft-only defaults.
3. **Condition v2** — numeric compare (`>=`, `<=`), equals, not-contains, regex, is-empty,
   AND/OR over 2–3 clauses; sources include reference fields. Fixes the B9 class of gap
   and makes SEO Gatekeeper honest.
4. **Branch: AI Decides (Pro)** — natural-language router; AI classifies into labeled
   branches. Modern replacement for brittle keyword conditions.

**Content/AI steps:**
5. **Content Repurposer** — article → X thread / LinkedIn / newsletter section / video
   script; reads the actual generated article, not just the topic.
6. **AI Review / QA** — proofread + fact-check + brand-voice alignment + similarity vs
   recent articles; score feeds Condition v2 (`review.score >= 80`) as a true quality gate.
7. **Content Refresh** — input an old WP post ID → AI updates/expands, keeps URL, logs a
   changelog. High-value SEO play; pairs with the decay-detection idea below.
8. **AI Translate**, **Summarizer/Extract** (named variables), **Image-for-social/OG**
   (stock or AI, per-platform sizes).
9. **HTTP Request step** (outbound) + **Webhook Send** — generic integration escape hatch
   to Zapier/Make/n8n/CRMs.

**Triggers:**
10. **Inbound Webhook** (`aime_workflow_webhook/<secret>`) — universal entry point;
    payload → `event.*`.
11. **WooCommerce: New Order** (post-purchase email, review funnel, social proof),
    **Abandoned Cart**, **product published / low stock**.
12. **Form plugins** (CF7/WPForms/Fluent/Gravity) — lead capture beyond the chatbot.
13. **New comment**, **user registration**, **RSS/feed item** (curate/comment bots).

### 9.4 Frontier / differentiators

1. **Performance feedback loop (generator → growth system):** connect GA4/Search Console
   (BYO key); monthly "decaying content" workflow auto-drafts refreshes for posts losing
   traffic; winning topics seed new outlines.
2. **AI self-review of workflows** — weekly meta-job reads recent run outputs + analytics
   and writes concrete suggestions ("3 of 5 topics near-duplicates; widen strategy
   prompt"). The workflow critiques itself — a genuine differentiator.
3. **Site-aware RAG + embeddings** — index the site's own posts/products as grounding for
   Brain (start lexical, add vector similarity as Pro); embeddings power semantic
   topic-dedupe, internal-link suggestions, and brand-voice learning from the user's
   best-performing copy.
4. **Optimal-time posting** — per-platform posting slots from heuristics, learned from
   engagement later.
5. **A/B machinery** — subject/caption variants with winner logging.
6. **Fact-check pass** — claims extraction + confidence marking; flag unverifiable stats
   instead of shipping them (search-API dependent).
7. **SERP-grounded research** — BYO SerpAPI/DataForSEO/Google CSE key; competitor gaps
   and People-Also-Ask feed the outline and FAQ schema.

### 9.5 Guardrails (explicit non-goals)

- Don't break free-tier simplicity: advanced pipeline stages default OFF, progressive
  disclosure; free tier stays single-shot.
- Keep draft-only defaults for email/publish paths; the Approval step is what makes
  auto-publish safe enough to promote later.
- All new AI calls route through `AiProvider` (circuit breaker + stitching stay
  authoritative).
- External-data features (SERP, GA4) are BYO-API-key with clear setup UX — no bundled
  proxies.

---

## 10. Merged Priority Matrix

| Priority | Item | Source | Effort | Why |
|---|---|---|---|---|
| **P0** | Phase 1 step-wiring fixes (B1–B15: resolver, event fallback, audit ID, tokens, type-check, visibility rules, template hygiene) | this doc | S–M | Shipped templates work; trust |
| **P0** | Server-side graph validation (cycles/orphans) + atomic lock/transactions + quota-failure fix | both (R4–R7, R10) | S–M | Hangs, duplicates, fairness |
| **P0** | SSRF guard | both (R11) | S | Security |
| **P0** | Condition v2 (numeric/reference fields) | both (B9) | S | Branching actually useful |
| **P1** | Persist full outputs + rich `{step.ref}` tokens + variable picker | both (R9, R13, U4) | M | Unlocks conditions, notifications, composition |
| **P1** | Wire `json_mode` + schema-validated outputs + per-step model/temp settings | both (§6.2, §9.1) | M | Quality across ALL AI actions |
| **P1** | Blog pipeline v1: outline → sections via existing service methods; meta → Yoast/RankMath; internal-link inserter (title-match MVP) | companion §Phase 3, verified §6.1 | M | Long-form quality; method code mostly exists |
| **P1** | Brand voice + Brain brief in Email/Ad/Social/CustomPrompt | this doc (B6/B7) | S | Consistency |
| **P2** | Action Scheduler migration + resume-from-failed-step | both (R1–R3, R8) | L | Reliability ceiling |
| **P2** | Wait/Delay + Approval steps | both | M | Nurture + trust; agency market |
| **P2** | Per-step test run + undo/redo/copy-paste + validation panel + i18n fix | both (§9.2) | M | Iteration speed |
| **P2** | Webhook trigger + HTTP request step; Woo order trigger | both | M | Integration breadth |
| **P2** | SSE live run console + cancel | companion | M | Demo magic; support-load drop |
| **P3** | Social: article link + images + per-platform variants + UTM; Ad copy platform schemas + Woo product details | both | M | Output quality where users look |
| **P3** | Repurposer, Translate, Content Refresh, Summarizer | both | M each | Content leverage |
| **P3** | Cost/token telemetry per step | both | M | Trust at scale |
| **P4** | Site-aware RAG + embeddings; GA4/SC feedback loop; AI self-review; optimal-time posting; A/B; fact-check | both | L | Differentiators |

*S = ≤1 day, M = 2–5 days, L = 1–2 weeks+*

**Quick wins (≤ half-day each):** B11 type-check fix · implement-or-remove Brain
`output_format` · pass `json_mode` in EmailCampaignAction · notification gains
`{previous.link}` / `{previous.article_id}` tokens + HTML option · weekly summary shows
selected days · don't count failed/test runs toward quota · failure-email digest ·
confirm-before-delete + Backspace guard while typing · i18n-wrap `graph.js` strings ·
Ad copy pulls Woo price/short description · "Clear URL cache" button · cron health notice.

---

## 11. Corrections & Reconciliation (v1 ↔ companion doc)

| Claim | Verdict |
|---|---|
| Companion E11: "preview truncation is the ONLY data crossing step boundaries" | **Overstated.** Runtime chaining passes full in-memory results; the 2000-char cap applies to *stored* rows only. Fix direction (persist full outputs) still correct — see R9. |
| Companion §2.2 Email row: "no `{event.*}` substitution in body (title only)" | **Inaccurate.** The title gets no substitution either — the field help promises tokens the action never implements (B4). Verified in `class-email-campaign-action.php:31-35`. |
| This doc v1 §6.4: "add minimap" | **Wrong.** Minimap, Controls, and fit-view already exist in `WorkflowCanvas.jsx:61,70-71`. The real gaps are undo/redo, copy/paste, and delete confirmation. |
| Companion U3 dirty-state leak via sidebar navigation | Reported, not independently verified — plausible from the builder structure; cheap to fix regardless. |
| Everything else merged from the companion (E1–E3, E5–E10, E13, E15, E17; pipeline methods; json_mode; temperature; URL-mode audit shell; internal-link grading) | **Independently verified during this merge** — file/line references confirmed. |

---

## 12. Quick Reference — Files Touched by the Fixes Above

| File | Fixes / changes |
|---|---|
| `actions/class-base-action.php` | Ancestor-aware `resolve_from_context()` (P1.1, P1.2), shared brand-voice helper (P1.8) |
| `actions/class-seo-audit-action.php` | ID precedence fix (B3) |
| `actions/class-email-campaign-action.php` | Tokens (B4), brief/brand voice (B6/B7), `json_mode` (§9.1), `created_by` (B14) |
| `actions/class-social-post-action.php` | Context fix (B5), event fallback (B2), article link/image/variants (§9.3) |
| `actions/class-ad-copy-action.php` | Brief/brand voice, platform-aware formats, Woo product details |
| `actions/class-custom-prompt-action.php` | Tokens, per-step model/output options |
| `actions/class-ai-brain-action.php` | Implement `output_format` JSON mode (B10 → §9.1) |
| `actions/class-condition-action.php` | Condition v2 operators + reference sources (B9) |
| `includes/class-workflow-engine.php` | Atomic lock, cancel flag, pause/resume (Wait/Approval), per-step duration/cost, failure digest |
| `includes/class-workflow-repository.php` | Transactional `mark_ran`, full-output persistence, quota counting fix |
| `includes/class-workflow-scheduler.php` | Drift/DST/interval-unit fixes (R14) |
| `includes/class-action-registry.php` | Real visibility-rule serialization (B12) |
| `includes/class-context-knowledge-store.php` | SSRF guard (R11) |
| `controllers/class-workflow-rest-controller.php` | Server-side graph validation (R7) |
| `templates/class-builtin-templates.php` | `post_status` key, prefilled strategy prompts, event-aware templates |
| `class-workflow-automation-module.php` | New fields (condition v2, social options, webhook trigger), token helper registration |
| `modules/content-generator/services/class-content-generator-service.php` | (No change needed — wire the existing `generate_outline/section/meta` from Blog Post action) |
| `src/.../ConfigPanel.jsx` | Type-check fix (B11), inheritance chips, variable picker, per-step Test button |
| `src/.../ConfigFields.jsx` | Visibility-rule evaluation for real rules (B12 frontend) |
| `src/.../WorkflowCanvas.jsx` | Delete confirmation / Backspace guard (undo & copy-paste live in builder state) |
| `src/.../utils/graph.js` | i18n-wrap validation strings |
| New: `includes/class-workflow-tokens.php`, `actions/class-wait-action.php`, `actions/class-approval-action.php`, `actions/class-webhook-*.php`, `actions/class-http-request-action.php`, `includes/class-site-knowledge.php` | Per §8–§9 |

---

*End of document. v2 — merged with `WORKFLOW-AI-UPGRADE-IDEAS.md`, all merged claims
independently verified against the code on 2026-08-22. No source files were modified.*
