# Workflow Automation + AI Brain — Deep Audit & Upgrade Ideas

> Full audit of the Workflow Automation module (`modules/workflow-automation/`), its AI actions, and the builder UI (`src/components/modules/WorkflowAutomation/`), with a prioritized roadmap to make it more reliable, user-friendly, and competitive in the current AI landscape.
>
> **Verdict up front:** The blog-post pipeline works end-to-end and the engine has solid bones (React Flow canvas, real branch execution, analytics, circuit-breaker AI provider). But most other steps are underpowered, the engine has reliability races, and several advanced capabilities that already exist in the codebase are **unwired**. This document maps every gap and proposes concrete upgrades.

---

## 1. What Works Today (Keep & Build On)

| Area | Strength | Where |
|---|---|---|
| Visual builder | Real React Flow canvas: palette, minimap, zoom controls, auto-layout | `WorkflowCanvas.jsx`, `graph.js` |
| Branching | Condition action executes **real** yes/no branches with skipped-subtree accounting | `class-workflow-engine.php:235–242`, `enqueue_children():339–347` |
| Templates | Builtin template registry + apply endpoint re-keys steps server-side | `class-builtin-templates.php`, REST `templates/{id}/apply` |
| History & analytics | Per-run/per-step history, outcome totals, failure aggregation, 90-day prune | `class-workflow-repository.php:483–673` |
| Error log UI | Module-wide failures with plain-language remediation hints + deep links | `ErrorLog.jsx` |
| AI provider layer | Multi-provider (Google/OpenAI/OpenRouter/Claude/custom), circuit breaker, cross-provider truncation stitching, Retry-After parsing | `includes/class-ai-provider.php` |
| Social captions prompt hygiene | Injection defense, delimiters, anti-preamble retry — best-in-repo pattern | `class-ai-social-service.php:79–107` |
| Blog post basics | AI-brain brief inheritance, topic rotation (Pro), stock/AI featured image fail-soft, cron-safe author/category fallbacks | `class-blog-post-action.php` |
| Zombie recovery | Stale queued rescue + running-execution sweep | `repository:338–345,405–418` |

---

## 2. Critical Issues Found (Must Fix)

### 2.1 Engine / Reliability

| # | Issue | Evidence | Impact |
|---|---|---|---|
| E1 | **No durable queue** — everything rides WP-Cron; low-traffic sites miss schedules | `module:96–98` | Delayed/lost runs on quiet sites |
| E2 | **Whole workflow = one synchronous PHP request**, `set_time_limit(0)` removes safety net; FPM/host kill = silent death recovered only by 20-min zombie sweep | `engine:124–126,57` | Multi-AI-step runs die mid-way |
| E3 | **Blocking `sleep()` retries** (2+4+8s) inside dispatch tick starve other due workflows | `run_step_with_retry()` `engine:392–398` | Head-of-line blocking |
| E4 | **Lock acquired AFTER row claim**, lock itself non-atomic get/set transient → duplicate/spurious failed rows on concurrent ticks | `engine:92` vs `112–120` | Duplicate executions |
| E5 | **`mark_ran()` two queries, no transaction** — crash between them leaves `next_run_at` in past → duplicate run | `repository:130–140` | Double posts |
| E6 | **Debounce check-then-set non-atomic** | `dispatcher:92–96` | Duplicate queued executions |
| E7 | **No cycle detection in main BFS** (`executed[]` guard missing in `enqueue_children`) — malformed cyclic graph loops until PHP kill; graph never validated on save | `engine:339–347` | Server hang |
| E8 | **Orphaned steps silently reported as "Skipped: branch not taken"** — config bug masked as normal skip | `engine:278–284` | Confusing diagnostics |
| E9 | **No resume/checkpoint** — failed run restarts from root only | `execute()` design | Wasted tokens/time |
| E10 | **No per-step timeout** — hung AI call bounded only by HTTP client | `engine:384–401` | Zombie runs |
| E11 | **Stored step outputs truncated**: `preview` capped at 2000 chars / `error` at 1000 in the DB row. *Correction:* runtime parent→child chaining passes the **full in-memory result** (`engine:224–228` builds `parent_output` from the action return, not the DB row) — same-run briefs are NOT truncated today. What suffers: history UI, error log, and any future resume/checkpoint feature reading from storage | `record_output()` `engine:449`, context build `engine:224–228` | Blocks resume + rich tokens; misleading diagnostics |
| E12 | **Token system minimal**: `{topic}`, `{workflow_name}`, `{previous_preview}`, `{event.*}` only — no `{step.key.output}` or reference fields | `send-notification-action.php:60–93` | Can't compose rich flows |
| E13 | Monthly free-cap counts **manual test runs AND failures** — debugging burns quota | `repository:226–233` | User frustration |
| E14 | `replace_steps()` DELETE-all-then-reinsert, non-transactional, no revision history | `repository:171–200` | Corrupt workflow on crash mid-save |
| E15 | **SSRF surface**: ContextKnowledgeStore fetches arbitrary admin URLs, no private-IP/scheme blocking | `context-knowledge-store:37–57,118–122` | Security (multisite/agency risk) |
| E16 | Scheduler drift: recurring next-run anchored at completion time; DST bug in weekly scan; custom interval unit ≠ hours silently treated as days | `engine:420–435`, `scheduler:139,192–196` | Schedule inaccuracy |
| E17 | Failure email always admin_email, one email PER failed step (spam on multi-step fails) | `notify_failure()` `engine:478–500` | Inbox spam |
| E18 | Topic-rotation option read-modify-write race + unbounded growth | `base-action.php:103–136` | Data loss under concurrency |

### 2.2 AI Actions — Quality Gaps vs 2026 Standards

| Action | Working? | Key Gaps |
|---|---|---|
| **AI Brain** (`ai_brain`) | Yes, but shallow | `output_format=json` UI field is **ignored by code** (fake Pro feature, `module:560–570` vs action L32); injection + SSRF via `context_urls`; single LLM pass — no research loop, no SERP grounding, no fact-checking; 4000-char URL-context cap silently truncates |
| **Blog Post** (`blog_post`) | **Yes — flagship works** | Single-shot `generate_article()` with `outline=''` and `TOC=false` (`blog-post-action.php:105`). Meanwhile `ContentGeneratorService` already ships **`generate_outline()`:356, `generate_section()`:387, `generate_meta()`:536 — all unwired**. No meta description persisted to WP post. **Zero internal linking even though SeoAuditAction grades internal links ≥2 as pass/fail.** No FAQ/schema markup, no readability scoring, no self-critique pass, no E-E-A-T signals, no alt-text for inline images |
| **Ad Copy** (`ad_copy`) | Partial | WooCommerce product context limited to product *name* (no price/benefits/description); no per-platform schemas (Google RSA headlines/descriptions, Meta primary-text lengths) |
| **Social Post** (`social_post`) | Yes (best prompts in repo) | Fixed `+300s` scheduling — no optimal-time posting; hashtags not generated on workflow path ("handled separately" but nothing adds them); no image for Instagram; no X threads; no LinkedIn/TikTok/Pinterest; no UTM builder |
| **Email Campaign** (`email_campaign`) | Draft-only by design | Requests JSON but **never enables json_mode** (dead plumbing, action L43); **no token substitution anywhere** — the title field help advertises `{event.*}` tokens the action never replaces (title sanitized raw, `action:31`), body likewise; no preheader/plain-text part/spam-word check/A-B subject variants/list-segment targeting; subject fallback weak (`wp_trim_words(topic,10)`) |
| **SEO Audit** (`seo_audit`) | Yes for WP posts | **URL-mode audit returns an empty shell** (title '', content '', word_count 0 → misleading score, `on-page-seo-service.php:154–164`); density counted via raw `substr_count` (matches inside words); suggestions stored but **never auto-applied** — no fix loop back into content; no Core Web Vitals/backlinks/canonical/SERP-gap analysis |
| **Funnel Enroll** (`funnel_enroll`) | Yes | Hard-fails if subscriber doesn't exist (no auto-provision option); reports success even when trigger internally no-ops (dupe enrollment indistinguishable) |
| **Condition** (`condition`) | Yes, real branching | **Substring-only matching** — cannot compare numbers or read structured references: "publish if SEO score > 80" is *impossible* even though audit puts `score` in `reference`. No equals/not-contains/regex/empty checks. Binary only (no elseif/switch) |
| **Custom Prompt** (`custom_prompt`) | Yes, best generic relay | Shares injection + SSRF issues; no `{event.*}` substitution (unlike notification); **no per-step model/max-tokens/temperature override anywhere in any action** |
| **Send Notification** (`send_notification`) | Yes, clean tokenizer | Plain-text only (no HTML/template); **cannot reach `reference` fields** — notification about new post can't include its edit URL unless producer stuffed it into preview text |

### 2.3 Cross-Cutting AI Layer Gaps

- **Structured outputs absent everywhere**: provider's `json_mode` parameter exists but is never passed; no JSON-schema validation; every action regex-parses-and-prays (`aime_parse_ai_json` mitigates but doesn't guarantee).
- **Temperature unconfigurable** (hardcoded 0.7 for Google, `AiProvider:2530`); no per-action model routing.
- No token/cost accounting per step or per run (usage tracker exists globally but isn't surfaced in workflow context).
- No streaming anywhere (acceptable for background runs, but blocks live test-run feedback).

### 2.4 Builder UX Gaps

| # | Gap | Detail |
|---|---|---|
| U1 | **No undo/redo** — zero history stack | Accidental Backspace deletes node instantly (`deleteKeyCode={['Backspace','Delete']}`, `WorkflowCanvas.jsx:60`); ConfigPanel Delete also instant (`ConfigPanel.jsx:239–246`) |
| U2 | **No copy/paste/duplicate node** — similar steps must be rebuilt by hand | Nothing reads clipboard; `addAction` fresh-only (`WorkflowBuilder.jsx:213–235`) |
| U3 | **Dirty-state leak** — Back button guards unsaved work but sidebar navigation bypasses confirm entirely | Unsaved graph lost silently via any other module link |
| U4 | **No variable/data picker between steps** — backend passes parent→child `reference` data but UI gives users zero way to see or insert prior-step output into config fields | Biggest power-tool gap vs n8n/Zapier |
| U5 | **No single-step test run** — TestRunModal runs whole workflow only | Can't iterate on one AI step without burning full-run quota |
| U6 | **Run progress blind** — 3s polling ×3 components, poll errors swallowed (`WorkflowBuilder.jsx:342`), no cancel button, no elapsed-time/per-step feed | Dying connection looks like eternal "Running…" |
| U7 | Validation shows only **first issue as toast**, no issue-list panel, badge tooltip generic, no jump-to-field | `WorkflowBuilder.jsx:297`, `ActionNode.jsx:28` |
| U8 | Template picker weak: no preview before apply, no search/filter/categories, no user-saved templates, no clone, no export/import JSON | `TemplatePicker.jsx` |
| U9 | Accessibility: emoji-only icons w/o aria-labels; weekday chips lack `aria-pressed`; clickable `<div>` history rows; modals lack focus-trap/Escape/`role="dialog"` | Various (details in §5) |
| U10 | i18n: all client validation strings hardcoded English while rest of module uses `__()` | `graph.js:132–192` |
| U11 | Weekly trigger summary shows time but omits selected days | `WorkflowBuilder.jsx:66–67` |

---

## 3. Upgrade Ideas — Ranked Roadmap

### Phase 1 — Reliability Foundations (fix before adding features)

*Effort: medium · Impact: critical · These make everything else trustworthy.*

1. **Adopt Action Scheduler** (or a custom DB queue) as execution backbone. Each step becomes a queue item → survives PHP kills, enables retries without `sleep()`, per-tick time budgets, and parallel workflows. Replaces E1/E2/E3/E10.
2. **Atomic locking + transactional bookkeeping**: acquire lock before row claim; wrap `mark_ran()` in `START TRANSACTION`; use atomic compare-and-set for debounce (E4/E5/E6).
3. **Validate graph on save**: reject cycles, warn orphaned parents, document/remove `default`-branch dead code (E7/E8).
4. **Persist full outputs** (not just 2000-char previews): store complete output per step so history, error log, resume-from-failed-step, and `{step.ref}` token resolution can read full artifacts (E11). Runtime parent→child chaining already passes untruncated in-memory results — keep DB previews for UI display only.
5. **Rich token system**: `{step_key.reference.field}`, e.g. `{ai_brain.keywords}`, `{seo_audit.score}` — engine resolves against stored outputs (E12).
6. **Resume-from-failed-step**: rerun button on failed execution starts from first failed step using persisted context (E9).
7. **Transactional step save + revision history** (workflow_versions table): diff view, restore revision (E14).
8. **SSRF guard** in ContextKnowledgeStore: scheme allowlist (http/https), block private/reserved IP ranges, resolve DNS before fetch, cap redirects (E15).
9. **Scheduler fixes**: anchor recurring next-run to intended cadence (not completion), DST-safe weekly scan, honor interval units (E16).
10. **Don't burn quota on failures/test-runs**: count only successful runs toward monthly cap; separate "test mode" flag on executions (E13).

### Phase 2 — Structured AI Outputs + Model Controls (cheap, huge quality lift)

*Effort: low-medium · Impact: high.*

1. **Wire json_mode through AiProvider** for every JSON-expecting action (AI Brain, Email, SEO suggestions). Add `response_format`/schema enforcement where providers support it (OpenAI structured outputs, Gemini responseSchema, Claude tool-use trick).
2. **Per-action model settings**: each AI action gets optional model/connection override + temperature + max_tokens (default = global connection). Power users route cheap models to outlines, premium models to final prose.
3. **Define output contracts as PHP arrays → auto-rendered as JSON schema** in prompts AND validated after response; invalid → one corrective retry ("your output failed schema: …").
4. **Fix the fake Pro feature**: either implement `output_format=json` in AI Brain (return parsed JSON object in `reference.json`) or remove the field (§2.2 AI Brain row).
5. **Cost transparency**: store prompt/completion tokens + estimated cost per step output; show per-execution cost rollup in history drawer.

### Phase 3 — Flagship: Blog Post 2026 Pipeline

*Effort: high · Impact: highest — this is the feature users judge the plugin by.*
*Key insight: the multi-stage building blocks already exist unwired in ContentGeneratorService.*

**Current:** one-shot generate → save → publish. 
**Target pipeline (each stage = engine step or internal sub-steps):**

```
[Keyword & SERP Research] → [Outline] → [Section-by-section draft]
    → [Self-critique & revise] → [Polish & humanize] → [SEO package]
    → [Internal links] → [Images + alt text] → [Publish/queue] → [Distribute]
```

1. **Research stage**
   - Optional SERP grounding via user-configured search API (SerpAPI/DataForSEO/ValueSERP) or Google CSE: pull top-N titles/headers/questions → competitor content gaps fed to outline.
   - People-Also-Ask / related questions → FAQ section candidates (also feeds FAQ schema).
2. **Outline stage** — call existing `generate_outline()`; render editable outline into the article record so users can tweak H2/H3 + word targets *before* generation (approval-lite).
3. **Section drafting** — loop existing `generate_section()` per section with running-summary context so sections cohere; enables long-form (3000+ words) without hitting max_tokens; parallelizable later.
4. **Critique loop** — second LLM pass scoring draft against rubric (accuracy hedging, depth vs competitors, tone match, redundancy); returns targeted revision instructions → one revise pass. Score-gated: below threshold → mark needs-review instead of publishing.
5. **Polish stage** — readability scoring (Flesch) + de-AI-flavor pass ("delve/tapestry/in today's fast-paced world" blocklist), transition smoothing, intro hook variants (A/B pick).
6. **SEO package** — wire `generate_meta()`: persist meta title/description to Yoast/RankMath meta (`_yoast_wpseo_title`, `_yoast_wpseo_metadesc`) or RankMath equivalents; generate slug from keyword; FAQ schema + Article schema JSON-LD injected; alt text for every image.
7. **Internal links** — query site's published posts (WP search/title-match, then optional embeddings similarity) → insert 2–4 contextual internal links with descriptive anchors; satisfies the very metric SeoAuditAction already grades.
8. **Images** — keep stock/AI featured image; add inline-image alt text generation; optionally hero-image style presets per brand voice.
9. **Distribution tail** — chain Social Post (per-platform variants) + Email Campaign draft automatically after publish (template does this today partially — make variants per platform, not one caption).
10. **Quality gates UI** — per-stage toggles in step config ("Research: on/off", "Critique: strict/balanced/off") so free tier stays single-shot while Pro unlocks depth. Show pipeline progress as sub-steps in run history.

### Phase 4 — AI Brain → Agentic Strategist

1. **Real JSON contract**: keywords[], selected_topic, angle, target_audience, outline_suggestion[], faq_questions[], internal_link_candidates[] — machine-readable for every downstream step.
2. **Site-aware context**: ingest top organic pages (from sitemap or Search Console hookup if connected) + recent posts as grounding instead of just 5 pasted URLs.
3. **Topic brainstorm modes**: keyword-gap mode (vs competitors), seasonal/calendar mode, decay-refresh mode (see Phase 6 #4).
4. **Memory**: persist what topics were already covered per workflow (rotation state exists — extend to semantic dedupe so rotated topics don't overlap).

### Phase 5 — New Step Types (breadth)

| Step | Purpose | Notes |
|---|---|---|
| **Delay / Wait** | Pause N minutes/hours mid-flow (drip sequences, "post morning of") | Queue-native once Phase 1 lands |
| **Webhook Trigger** | Inbound POST starts workflow (form plugins, Zapier/Make outbound) | Secret-token auth; payload becomes `event.*` |
| **RSS / Feed Trigger** | New feed item → summarize/comment workflow | Curate/comment bots |
| **HTTP Request** | Call arbitrary API, map response into context | Generic integration escape hatch |
| **Approval (Human-in-the-loop)** | Pause flow; email/inline approve-reject-edit; resume on decision | Killer feature for agencies; pairs with draft-only defaults |
| **Loop / Fan-out** | Iterate array (keywords[] → one social post per keyword; products[] → ad sets) | Requires array-typed context |
| **Translate** | Generate language variants of produced content (+ hreflang note) | Uses same provider layer |
| **Content Refresh** | Input: old WP post ID → AI updates/expands it, keeps URL, logs changelog | High-value SEO play |
| **Format Transform** | Blog→newsletter digest, blog→X thread, video script from article | Cheap: pure prompting over stored output |

### Phase 6 — Advanced / Frontier Features (differentiators)

1. **Embeddings-powered internal linking + brand voice learning** — index published posts' chunks (provider embedding APIs or local SQLite vector cache); brand-voice centroid learned from user's best-performing copy rather than static prompt.
2. **Performance feedback loop** — connect GA4/Search Console: monthly "decaying content" workflow auto-drafts refreshes for posts losing traffic; winning topics seed new outlines. Turns the plugin from generator → growth system.
3. **Optimal-time posting** — social scheduler picks slot per platform from historical engagement (starts with heuristics table per platform/timezone, learns later).
4. **A/B machinery** — email subject variants + social caption variants auto-split-test on send, log winners into rotation memory.
5. **Fact-check pass** — claims extraction → confidence marking → optional citation insertion when search API enabled; flag unverifiable stats instead of shipping them.
6. **Multi-language QA** — native-speaker-model review pass when `language != en`.
7. **Live run console (SSE)** — replace 3s polling with Server-Sent Events stream of step transitions + cancel button; doubles as the "watch it work" demo moment that sells the plugin.
8. **Workflow marketplace-ready export/import** — JSON schema versioning now enables community templates later.

### Phase 7 — Builder UX Polish

1. Undo/redo stack (command-pattern over nodes/edges ops) + confirm-on-delete.
2. Node duplicate (Ctrl+D / context menu) + copy/paste between workflows.
3. Autosave (debounced) + dirty-guard on sidebar navigation (U3).
4. **Variable picker**: in any config textarea, `{` opens dropdown of available upstream outputs (`{ai_brain.selected_topic}`, `{seo_audit.score}`…) — depends on Phase 1 #5.
5. Single-step test run: right-click node → "Test this step" with mock parent context (uses last successful execution's outputs when available).
6. Validation panel: list ALL issues, click-to-focus field; localized strings (i18n fix).
7. Run progress: elapsed timer, per-node status ring (exists), step-by-step live feed, cancel.
8. Template gallery: preview graph before apply, category filter, search, save-your-own-template, duplicate workflow.
9. A11y sweep: aria-labels on icon buttons, `aria-pressed` chips, dialog semantics + focus trap, keyboard-operable history rows.
10. Weekly summary includes selected days; UpcomingRuns gets horizontal-scroll wrapper like list view.

---

## 4. Priority Matrix (Top 15)

| Priority | Item | Effort | Why First |
|---|---|---|---|
| P0 | Cycle/orphan graph validation on save | S | Prevents hangs, silent misconfig |
| P0 | Atomic lock + transactional mark_ran/debounce | M | Duplicate posts = trust killer |
| P0 | SSRF guard on URL fetching | S | Security |
| P0 | Persist full step outputs + rich tokens `{step.ref}` | M | Unblocks conditions, notifications, variables |
| P1 | Wire json_mode + schema-validated outputs | M | Quality across ALL AI actions |
| P1 | Conditions read numeric/reference fields (score > 80) | S | Makes branching actually useful |
| P1 | Blog meta description → Yoast/RankMath + slug + schema | S | Obvious SEO win, method already exists |
| P1 | Internal-link inserter (title-match MVP) | M | Audit grades it today, generator ignores it |
| P1 | Outline→section pipeline using existing service methods | M | Long-form quality jump, code mostly written |
| P2 | Resume-from-failed-step | M | Saves quota + time |
| P2 | Action Scheduler queue migration | L | Reliability ceiling |
| P2 | Variable picker + single-step test (UI) | M | Power-user stickiness |
| P2 | Approval step (human-in-loop) | M | Agency market unlock |
| P3 | Webhook trigger + delay step | M | Integration breadth |
| P3 | SSE live run console + cancel | M | Demo magic, support load drop |

*S = small (≤1 day), M = medium (2–5 days), L = large (1–2 weeks+)*

## 5. Quick Wins (≤ half-day each)

1. Implement or remove AI Brain `output_format=json` (fake feature today).
2. Pass json_mode in EmailCampaignAction + AI-subject fallback improvement.
3. Notification action gains `{previous.link}`, `{previous.article_id}` tokens + HTML email option.
4. Weekly trigger summary lists days.
5. Don't count failed/test executions toward monthly cap.
6. Failure emails: one digest per execution, configurable recipient.
7. Confirm-before-delete on nodes + Backspace guard while typing in inputs.
8. Add LinkedIn to social platforms list (OpenRouter-class models handle it fine; publisher support can follow).
9. Ad copy pulls product price + short description alongside name.
10. i18n-wrap client validation strings.

## 6. Explicit Non-Goals / Guardrails

- Don't break free-tier simplicity: advanced stages default OFF, progressive disclosure.
- Keep draft-only defaults for email/publish paths; approval step makes "auto-publish" safe enough to promote later.
- All new AI calls must route through AiProvider (circuit breaker + stitching stay authoritative).
- Any external-data feature (SERP, GA4) must be BYO-API-key with clear setup UX — no bundled proxies.
