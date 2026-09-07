# How Coding Agents Separate Code from Thinking

## Your Question
"All coding agents like GitHub Copilot, Cursor, Claude Code, OpenCode know what is code and what is thinking. How do they separate it? Why can't our plugin do the same?"

## The Answer: They Use **Structured Output**

### What Coding Agents Actually Use

**GitHub Copilot / Cursor / Claude Code / OpenCode:**
```json
// Request to API:
{
  "model": "gpt-4",
  "messages": [...],
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "code_response",
      "schema": {
        "type": "object",
        "properties": {
          "thinking": {"type": "string"},
          "code": {"type": "string"},
          "explanation": {"type": "string"}
        },
        "required": ["code"]
      }
    }
  }
}

// Response from API (guaranteed structure):
{
  "thinking": "User wants a WordPress function...",
  "code": "<?php\nfunction my_function() {...}\n?>",
  "explanation": "This function does..."
}
```

**Key Point:** The MODEL itself separates thinking from code. No parsing needed.

### What We're Doing Wrong

**Current approach:**
```php
// ❌ We're asking for "JSON" but not defining WHAT JSON
$options = array('json_mode' => true);
$result = AiProvider::generate($prompt, 'text', 1200, $options);

// Then we GUESS where the JSON is in mixed text
$text = strip_thinking_text($result['content']); // Heuristics!
$json = parse_ai_json($text); // Hope it works!
```

**Problem:** `json_mode: true` just tells the model "respond with JSON" but doesn't specify the structure. So the model might:
- Put thinking text BEFORE the JSON
- Wrap JSON in markdown fences
- Add explanations AFTER the JSON

Then we're stuck parsing mixed text with regex heuristics.

## The Better Solution

### Option 1: Structured Output (OpenAI-style)

**Use `json_schema` instead of `json_object`:**
```php
// ✅ BETTER: Define the exact structure
$options = array(
  'response_format' => array(
    'type' => 'json_schema',
    'json_schema' => array(
      'name' => 'ai_brain_response',
      'schema' => array(
        'type' => 'object',
        'properties' => array(
          'topic' => array('type' => 'string'),
          'angle' => array('type' => 'string'),
          'key_points' => array('type' => 'array', 'items' => array('type' => 'string')),
          'target_reader' => array('type' => 'string'),
          'keywords' => array('type' => 'array', 'items' => array('type' => 'string'))
        ),
        'required' => array('topic', 'angle', 'key_points'),
        'additionalProperties' => false
      )
    )
  )
);

$result = AiProvider::generate($prompt, 'text', 1200, $options);

// Result is GUARANTEED to be valid JSON in this exact shape
$data = json_decode($result['content'], true);
// No stripping needed! No parsing fallbacks! No heuristics!
```

**Supported by:**
- OpenAI (GPT-4, GPT-4 Turbo, GPT-3.5 Turbo)
- Azure OpenAI
- OpenRouter (forwards to OpenAI-compatible providers)

### Option 2: Tool Calling (Universal)

**Even more reliable - works on ALL providers:**
```php
// Define the response as a "function" the AI must call
$tools = array(
  array(
    'type' => 'function',
    'function' => array(
      'name' => 'return_ai_brain_result',
      'description' => 'Return the content strategy result',
      'parameters' => array(
        'type' => 'object',
        'properties' => array(
          'topic' => array('type' => 'string', 'description' => 'The selected topic'),
          'angle' => array('type' => 'string', 'description' => 'Content angle or hook'),
          'key_points' => array('type' => 'array', 'items' => array('type' => 'string')),
          'target_reader' => array('type' => 'string'),
          'keywords' => array('type' => 'array', 'items' => array('type' => 'string'))
        ),
        'required' => array('topic', 'angle', 'key_points')
      )
    )
  )
);

$options = array(
  'tools' => $tools,
  'tool_choice' => array('type' => 'function', 'function' => array('name' => 'return_ai_brain_result'))
);

$result = AiProvider::generate($prompt, 'text', 1200, $options);

// Extract from tool_calls (guaranteed structured)
$data = json_decode($result['tool_calls'][0]['function']['arguments'], true);
```

**Supported by:**
- OpenAI
- Anthropic (Claude)
- OpenRouter
- Google (Gemini)
- Cohere
- **Every major provider**

## Why This Is Better

### Current Approach (Heuristics)
❌ Breaks on unknown reasoning model formats  
❌ Requires maintenance for new models  
❌ False positives/negatives  
❌ Complex fallback chains  
❌ Still fails sometimes  

### Structured Output Approach
✅ Model does the separation (no parsing)  
✅ Works for ALL models (present and future)  
✅ 100% reliable (guaranteed valid JSON)  
✅ No maintenance (no model-specific code)  
✅ How professional tools actually work  

## Implementation Plan

### Phase 1: Add Structured Output to AI Provider
```php
// includes/class-ai-provider.php

private static function build_openai_chat_body( $model, $prompt, $max_tokens, $options ) {
  $body = array(...);
  
  // NEW: Support json_schema (structured output)
  if ( !empty($options['json_schema']) ) {
    $body['response_format'] = array(
      'type' => 'json_schema',
      'json_schema' => $options['json_schema']
    );
  } 
  // OLD: Fallback to basic json_object mode
  elseif ( !empty($options['json_mode']) ) {
    $body['response_format'] = array('type' => 'json_object');
  }
  
  return $body;
}
```

### Phase 2: Update AI Brain Action
```php
// modules/workflow-automation/actions/class-ai-brain-action.php

$options = array(
  'json_schema' => array(
    'name' => 'ai_brain_response',
    'schema' => array(
      'type' => 'object',
      'properties' => array(
        'topic' => array('type' => 'string'),
        'angle' => array('type' => 'string'),
        'key_points' => array('type' => 'array', 'items' => array('type' => 'string')),
        'target_reader' => array('type' => 'string'),
        'keywords' => array('type' => 'array', 'items' => array('type' => 'string'))
      ),
      'required' => array('topic', 'angle', 'key_points'),
      'additionalProperties' => false
    )
  )
);

$result = AiProvider::generate($system_instructions, 'text', 1200, $options);

// Direct decode - no stripping, no fallbacks!
$data = json_decode($result['content'], true);
```

### Phase 3: Keep Fallbacks for Legacy/Unsupported Providers
```php
// For providers that don't support structured output yet
if ( json_last_error() !== JSON_ERROR_NONE ) {
  // Fall back to our heuristic parsing
  $data = aime_parse_ai_json($result['content']);
}
```

## Bottom Line

**You're absolutely right.** We should do what professional coding agents do:

1. **Use structured output** (json_schema or tool calling)
2. **Let the model separate thinking from data**
3. **No parsing, no heuristics, 100% reliable**

The fallback heuristics we just built are good insurance, but **structured output should be the primary path** going forward.

---

**Next Step:** Implement `json_schema` support in AI Provider and migrate AI Brain to use it. 🎯
