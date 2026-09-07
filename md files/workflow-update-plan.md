# Workflow Automation — AI Brain Update Plan

## Goal

Add an AI Brain system to the workflow automation module. Works for all users globally. AI picks smart topics, avoids repeats, reads product context from URLs (cached), passes structured briefs to downstream steps.

---

## Problem with current system

| Issue | Root cause |
|---|---|
| Custom Prompt step errors on URL prompts | `AiProvider::generate()` is a bare API call — no URL fetching |
| Topic rotation lacks context | `rotate_topic()` returns a label string only, no description |
| Steps are isolated | Blog Post ignores Custom Prompt output completely |
| No repeat-avoidance | No step queries past articles before picking a topic |

---

## Architecture

### Core principle
AI Brain is a **general-purpose preceding step** — any action that follows it inherits its structured output via the existing `parent_output` context mechanism. Zero breaking changes to existing steps.

### URL caching
Fetch once, cache in WordPress transients (7-day TTL, keyed `aime_urlcache_{md5(url)}`). No new DB tables. Auto-expires. Any workflow run hitting the same URL gets cached content instantly (~0ms).

### Step chaining
Engine already passes `$context['parent_output']` to every step. AI Brain stores its results in `reference[]` — downstream steps read from `$context['parent_output']['reference']`.

---

## Files: 6 changes, 2 new

| # | File | Type | Summary |
|---|---|---|---|
| 1 | `modules/workflow-automation/includes/class-context-knowledge-store.php` | **NEW** | URL fetch + transient cache service |
| 2 | `modules/workflow-automation/actions/class-ai-brain-action.php` | **NEW** | AI Brain step handler |
| 3 | `modules/workflow-automation/actions/class-base-action.php` | update | Add `recent_topics()` helper |
| 4 | `modules/workflow-automation/actions/class-custom-prompt-action.php` | update | URL auto-fetch + store `full_output` |
| 5 | `modules/workflow-automation/actions/class-blog-post-action.php` | update | Read AI Brain `parent_output` |
| 6 | `modules/workflow-automation/class-workflow-automation-module.php` | update | Register `ai_brain` action + import |

---

## 1. `ContextKnowledgeStore` (new)

**Path:** `modules/workflow-automation/includes/class-context-knowledge-store.php`

**Responsibilities:** Fetch a URL once, cache it, return plain text.

**Public API:**
```php
get(string $url, int $ttl = 604800): string  // 7-day default, returns '' on failure
refresh(string $url): string                  // force re-fetch, update cache
flush(string $url): void                      // delete one cached entry
flush_all(): void                             // delete all aime_urlcache_* transients
cache_key(string $url): string                // 'aime_urlcache_' . md5($url)
```

**Fetch logic:**
- `wp_remote_get()` with 15s timeout
- Strip `<script>`, `<style>`, `<noscript>`, `<nav>`, `<header>`, `<footer>`, `<aside>` blocks
- `wp_strip_all_tags()` → collapse whitespace → trim
- Cap at 4000 chars
- On any error (wp_error, non-2xx): log warning, return `''`

**Storage:** WordPress transients — no schema changes, auto-expires.

---

## 2. `AiBrainAction` (new)

**Path:** `modules/workflow-automation/actions/class-ai-brain-action.php`

**Config fields (shown in workflow builder):**

| Key | Type | Required | Description |
|---|---|---|---|
| `features` | textarea | yes | One feature/topic per line — the pool the AI picks from |
| `context_url` | text | no | Product URL, fetched once and cached 7 days |
| `lookback_days` | number | no | Default 60 — avoid topics covered in last N days |

**Execution flow:**
1. Parse `features` → array (split by newline, trim, filter empty)
2. Fail if features list is empty
3. Call `ContextKnowledgeStore::get($context_url)` — cache hit = instant
4. Call `BaseAction::recent_topics($lookback_days, 30)` — one DB query
5. Build structured AI prompt (see below)
6. Call `AiProvider::generate($prompt, 'text', 800)`
7. Parse response with named-field extractor
8. Return `ok()` with `reference[]` containing all parsed fields

**AI prompt structure:**
```
You are a content strategist.

Plugin/product features:
- [feature 1]
- [feature 2]
...

[If context_url provided:]
Product context:
[fetched page text, max 3000 chars]

Topics covered recently (avoid repeating):
[comma-separated list, or "none yet"]

Task: Select ONE feature not covered recently.
Respond in exactly this format:
TOPIC: [feature name]
ANGLE: [specific writing angle, 1-2 sentences]
KEY POINTS: [3-5 bullet points]
TARGET READER: [who this is for]
KEYWORDS: [3-5 SEO keywords, comma-separated]
```

**Return value (`reference[]`):**
```php
[
    'selected_topic' => 'AI Content Generator',
    'angle'          => 'How non-writers use it to publish 3x more...',
    'key_points'     => 'One-click generation, tone control, ...',
    'target_reader'  => 'Small business owners without copywriting skills',
    'keywords'       => 'AI content generator, WordPress AI, ...',
    'full_output'    => '[full raw AI response]',
]
```

**Fallback:** If structured parsing fails, use first line as `selected_topic`, full output as `full_output`.

---

## 3. `BaseAction` — add `recent_topics()`

**Add before `save_article()`:**

```php
/**
 * Return distinct topics covered in the last $days days.
 * Queries aime_content_articles. Fail-soft — returns [] if table missing.
 */
protected static function recent_topics(int $days = 60, int $limit = 30): array
```

- One `$wpdb->get_col()` query
- `SHOW TABLES LIKE` guard before querying
- Returns `string[]` of sanitized topic values

---

## 4. `CustomPromptAction` — URL fetching + full output

**Two additions to `run()`:**

**A. URL auto-fetch** (after building final prompt string, before AI call):
```php
// Detect up to 3 https?:// URLs in the prompt.
// For each: ContextKnowledgeStore::get($url) → append fetched text block.
// Format: "--- Content from {url} ---\n{text}\n---"
```

**B. Store full output** (in the `$reference` array before returning):
```php
$reference['full_output'] = $output; // full AI text, not truncated
```

This fixes the original user error — AI now receives page content, not a bare URL.

---

## 5. `BlogPostAction` — read AI Brain parent output

**Add at top of `run()`, before `rotated_topic()` call:**

```php
// Inherit AI Brain (or Custom Prompt) output when no step-level config is set.
$parent_ref = $context['parent_output']['reference'] ?? [];

// Topic: AI Brain's selected_topic overrides blank step config.
if ( empty($config['topic']) && !empty($parent_ref['selected_topic']) ) {
    $config['topic'] = $parent_ref['selected_topic'];
}

// Keywords: use AI Brain's suggestions when step has none.
if ( empty($config['keywords']) && !empty($parent_ref['keywords']) ) {
    $config['keywords'] = $parent_ref['keywords'];
}

// Brief: inject full AI Brain output as system instructions for richer generation.
// Appended to $preset->system_instructions (same path as brand voice).
$ai_brain_brief = (string)($parent_ref['full_output'] ?? '');
```

**Brief injection** (before `generate_article()` call):
```php
if ('' !== $ai_brain_brief) {
    $brief_instruction = "Content brief from AI strategist:\n" . $ai_brain_brief;
    if (null === $preset) {
        $preset = (object)['prompt_template' => '', 'system_instructions' => $brief_instruction];
    } else {
        $preset->system_instructions = ($preset->system_instructions ?? '') . "\n\n" . $brief_instruction;
    }
}
```

Uses the **existing `$preset->system_instructions` injection path** — same as brand voice. No changes to `ContentGeneratorService`.

---

## 6. Module registration

**Add import:**
```php
use WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Actions\AiBrainAction;
```

**Add to `register_builtin_actions()`** (before `custom_prompt`):
```php
$actions['ai_brain'] = [
    'label'       => __('AI Brain', 'ai-marketing-expert'),
    'module'      => 'ai',
    'description' => __('Picks the best topic from your list, avoids recent repeats, reads product context, and generates a content brief for the next step.', 'ai-marketing-expert'),
    'is_pro'      => false,
    'available'   => static fn(): bool => true,
    'fields'      => [
        ['key' => 'features',     'label' => 'Feature / topic list', 'type' => 'textarea', 'required' => true,
         'help' => 'One feature per line. AI picks a different one each run, avoiding recent repeats.'],
        ['key' => 'context_url',  'label' => 'Context URL (optional)', 'type' => 'text',
         'help' => 'A page about your product. Fetched once and cached 7 days for context.'],
        ['key' => 'lookback_days','label' => 'Avoid repeating within (days)', 'type' => 'number', 'default' => 60,
         'help' => 'Topics written in this many days are treated as recently used.'],
    ],
    'handler' => [AiBrainAction::class, 'run'],
];
```

---

## Example workflow (after implementation)

```
Trigger: Daily at 9am
│
├─ Step 1: AI Brain
│     Features: (plugin features, one per line)
│     Context URL: https://wpthemespace.com/ai-marketing-expert/
│     Lookback: 60 days
│
└─ Step 2: Blog Post
      Topic: (blank — inherited from AI Brain)
      Keywords: (blank — inherited from AI Brain)
      Word count: 1200
      Publish: draft
```

---

## What does NOT change

- No existing actions broken
- No DB schema changes — no new tables
- `rotate_topic` Pro feature works independently
- All other steps (Social Post, Email, Ad Copy) can also follow AI Brain and inherit its output
- Engine BFS execution unchanged

---

## Implementation order

1. `ContextKnowledgeStore` (dependency for steps 2 and 4)
2. `BaseAction` — `recent_topics()` (dependency for step 2)
3. `AiBrainAction` (uses both above)
4. `CustomPromptAction` (uses ContextKnowledgeStore)
5. `BlogPostAction` (reads parent_output)
6. Module registration (wires everything together)
