My Complete Recommendation:

AI Brain Step (v2):

1. Strategy prompt (textarea, required)
2. Context URLs (textarea, line-separated, max 5, optional)
3. Avoid repeating within X days (number, default 30)
4. Cache duration (select: 1/7/14/30 days, default 7)
5. Output format (select: Content Brief / Custom JSON)

Blog Post Step (improved):

1. Topic (text, optional - blank = inherit from AI Brain or workflow)
2. Topic rotation (tokens, Pro, hidden if AI Brain parent exists)
3. Target keywords:
   - Manual (tokens)
   - From keyword group (select, if vault enabled)
4. Word count (range)
5. Language (select)
6. Category (select)
7. Author (select)
8. AI-generated tags (checkbox)
9. Fixed tags (tokens)
10. Featured image (select)
11. In-body images (number)
12. Post status (select: draft/publish/scheduled)

REMOVE: "Use AI brain" checkbox (auto-detect)
REMOVE: Tone override (inherit from workflow)
REMOVE: Run condition (use Condition step instead)

SEO Audit Step (improved):

1. Post to audit:
   - Previous step (default)
   - Latest published
   - Specific ID
2. URL (optional - for competitor/external audits)
3. Focus keyword (optional - smart default from post meta/AI Brain/title)

REMOVE: Tone override
REMOVE: Run condition

Ad Copy Step (improved):

1. Product/offer (text, optional - blank = AI Brain topic)
2. Product rotation:
   - Manual list (tokens)
   - WooCommerce products (multi-select, if WC active)
3. Number of variations (number, 1-10)

REMOVE: Tone override
REMOVE: Run condition

