/**
 * Pre-made prompt catalog for the workflow editor's prompt library.
 *
 * Each entry is tagged with the action types whose prompt-ish textarea it
 * suits (`actions`). The library modal shows entries matching the current
 * step's action first ("Recommended"), then everything else. Purely static
 * data — no REST round-trip, so the modal opens instantly.
 *
 * Add an entry here + set `'prompt_library' => true` on any textarea field
 * schema (PHP) and the Browse-prompts button lights up automatically.
 */

export const PROMPT_LIBRARY = [
	// ── Generate Blog Post — writing brief ─────────────────────────────
	{
		id: 'blog-seo-structure',
		title: 'SEO-first structure',
		actions: [ 'generate_blog_post' ],
		text:
			'Structure the article for search intent first: answer the main question in the first 100 words, ' +
			'then expand. Use H2s phrased as the questions people actually search, include keyword variants naturally in ' +
			'headings, add a short FAQ section with 4 questions, and end with a concise key-takeaways summary.',
	},
	{
		id: 'blog-story-lead',
		title: 'Storytelling lead',
		actions: [ 'generate_blog_post' ],
		text:
			'Open with a short relatable story or scenario (3–5 sentences) that makes the problem vivid before any advice appears. ' +
			'Return to that story at the end to show the after-state. Keep paragraphs under 4 lines and use concrete details, not abstractions.',
	},
	{
		id: 'blog-data-driven',
		title: 'Data & statistics emphasis',
		actions: [ 'generate_blog_post' ],
		text:
			'Back every major claim with a statistic, study, or concrete example. Lead sections with numbers where possible ' +
			'(e.g. "73% of buyers…"). Name sources inline and note the year. Where data is unavailable, say what to measure instead of guessing.',
	},
	{
		id: 'blog-comparison',
		title: 'Comparison article format',
		actions: [ 'generate_blog_post' ],
		text:
			'Write the article as a structured comparison: quick verdict up top, then a side-by-side breakdown of options ' +
			'using identical criteria (price, effort, results, best-for). Include a comparison table and finish each option ' +
			'with one honest limitation. Close with a "choose X if / choose Y if" decision guide.',
	},
	{
		id: 'blog-beginner-explainer',
		title: 'Beginner-friendly explainer',
		actions: [ 'generate_blog_post' ],
		text:
			'Assume zero prior knowledge: define every term on first use with a one-line plain-language definition. ' +
			'One idea per section, short sentences, analogies from everyday life. End with a simple 5-step checklist ' +
			'the reader can act on today.',
	},
	{
		id: 'blog-listicle-rules',
		title: 'Listicle format rules',
		actions: [ 'generate_blog_post' ],
		text:
			'Format as a listicle: numbered H2 items, each with what it is, why it matters, and one actionable tip. ' +
			'Order items by increasing depth, not popularity. Write a 2-line intro that promises the outcome, ' +
			'and a closing paragraph that names the single best starting point.',
	},
	{
		id: 'blog-case-study',
		title: 'Case-study style',
		actions: [ 'generate_blog_post' ],
		text:
			'Frame the article as a case study: starting situation, the specific actions taken in order, measurable results, ' +
			'and lessons readers can reuse. Use realistic placeholder numbers marked clearly as examples. ' +
			'Keep the tone factual and let the process carry the persuasion.',
	},
	{
		id: 'blog-review-angle',
		title: 'Honest review angle',
		actions: [ 'generate_blog_post' ],
		text:
			'Review-style article: who this is for and who should skip it, strengths backed by specifics, ' +
			'weaknesses stated honestly (at least two), pricing context, and a clear verdict in the last paragraph. ' +
			'No hype words; credibility comes from naming flaws.',
	},
	{
		id: 'blog-eeat-authority',
		title: 'Experience & authority signals',
		actions: [ 'generate_blog_post' ],
		text:
			'Write with visible first-hand experience: reference practical trade-offs ("in practice you will notice…"), ' +
			'common mistakes to avoid, and what we would do differently. Avoid generic filler sentences. ' +
			'Every section must teach something only an experienced practitioner would know.',
	},

	// ── AI Brain — topic strategy ──────────────────────────────────────
	{
		id: 'brain-evergreen',
		title: 'Evergreen how-to finder',
		actions: [ 'ai_brain' ],
		text:
			'Pick a fresh, evergreen how-to topic our audience searches for year-round. ' +
			'Prefer practical step-by-step guides that solve one specific problem in our niche. ' +
			'Avoid anything we covered in the last 60 days and avoid news-dependent angles.',
	},
	{
		id: 'brain-listicle',
		title: 'Listicle & roundup angle',
		actions: [ 'ai_brain' ],
		text:
			'Pick a topic that works as a listicle or roundup (e.g. "X best tools for Y", "Z mistakes to avoid"). ' +
			'The list must be specific to our niche, with items our audience can act on today. ' +
			'Choose a number of items between 5 and 10 and a clear ordering logic.',
	},
	{
		id: 'brain-competitor-gap',
		title: 'Competitor gap topic',
		actions: [ 'ai_brain' ],
		text:
			'Pick a topic where the currently ranking articles are shallow, outdated, or miss a key sub-question. ' +
			'Describe in one sentence what the existing coverage gets wrong and how our article will be measurably better: ' +
			'deeper, newer, more practical, or backed by first-hand experience.',
	},
	{
		id: 'brain-product-led',
		title: 'Product-led topic',
		actions: [ 'ai_brain' ],
		text:
			'Pick a topic that naturally showcases one of our products or services without reading like an ad. ' +
			'Lead with the customer problem the product solves, teach something genuinely useful, ' +
			'and mention the product only where it is the honest best answer.',
	},
	{
		id: 'brain-seasonal',
		title: 'Seasonal / timely angle',
		actions: [ 'ai_brain' ],
		text:
			'Pick a topic tied to the current season, upcoming holiday, or an industry trend from the last 90 days. ' +
			'It must still be useful after the moment passes — pair the timely hook with evergreen advice ' +
			'so the article keeps earning traffic.',
	},
	{
		id: 'brain-beginner',
		title: 'Beginner vs. advanced split',
		actions: [ 'ai_brain' ],
		text:
			'Pick a foundational topic for beginners in our niche that we have not explained yet. ' +
			'Define every term on first use, use short sections, and end with a simple next-step checklist ' +
			'the reader can follow immediately.',
	},

	// ── Custom AI Prompt — general purpose ─────────────────────────────
	{
		id: 'cp-repurpose',
		title: 'Repurpose article into social posts',
		actions: [ 'custom_prompt' ],
		text:
			'Take the article provided below and extract 5 social media post ideas. ' +
			'For each idea give: a hook (first line), 2–3 supporting lines, and a call to action. ' +
			'Vary the formats: one statistic-led, one contrarian take, one how-to thread, one question to the audience, one quote.',
	},
	{
		id: 'cp-outline',
		title: 'Detailed article outline',
		actions: [ 'custom_prompt' ],
		text:
			'Create a detailed outline for an article about the topic below. ' +
			'Include: a working title, a one-sentence promise of what the reader will achieve, ' +
			'H2/H3 structure with a one-line summary per section, and suggested word counts per section.',
	},
	{
		id: 'cp-meta',
		title: 'SEO title & meta description pack',
		actions: [ 'custom_prompt' ],
		text:
			'For the content provided below, write 5 SEO title options (max 60 characters) ' +
			'and 3 meta descriptions (max 155 characters). ' +
			'Front-load the primary keyword naturally, and make each option a different angle: benefit, curiosity, or direct match.',
	},
	{
		id: 'cp-faq',
		title: 'FAQ section generator',
		actions: [ 'custom_prompt' ],
		text:
			'Based on the content below, write the 8 questions customers actually ask about this subject. ' +
			'Order them from most basic to most advanced. Answer each in 2–4 sentences, plain language, no jargon. ' +
			'Mark the two questions that deserve their own full article later.',
	},
	{
		id: 'cp-email',
		title: 'Newsletter issue draft',
		actions: [ 'custom_prompt' ],
		text:
			'Draft a newsletter issue about the topic below. Structure: subject line (max 50 characters), ' +
			'a personal opening paragraph, the main insight explained simply, one actionable tip, ' +
			'and a single clear call to action. Keep it under 300 words total.',
	},
	{
		id: 'cp-ad-copy',
		title: 'Ad copy variants (3 angles)',
		actions: [ 'custom_prompt' ],
		text:
			'Write 9 ad copy variants for the offer described below: 3 pain-point led, 3 aspiration-led, 3 urgency-led. ' +
			'Each variant needs a headline (max 40 characters) and body text (max 125 characters). ' +
			'No exclamation marks, no superlatives you cannot prove.',
	},
	{
		id: 'cp-calendar',
		title: 'Two-week content calendar',
		actions: [ 'custom_prompt' ],
		text:
			'Create a two-week content calendar for the niche described below. ' +
			'For each day give: channel (blog / email / social), working title, format, and the one takeaway for the audience. ' +
			'Balance educational, inspirational, and promotional content roughly 60/20/20.',
	},
	{
		id: 'cp-cta',
		title: 'Call-to-action rewrite',
		actions: [ 'custom_prompt' ],
		text:
			'Rewrite the call to action below in 6 ways: benefit-first, risk-reversal, curiosity, social proof, scarcity, and plain-direct. ' +
			'Max 12 words each. Then recommend the strongest option for a cold audience and explain why in one sentence.',
	},
];

/**
 * Split the catalog for a given action type.
 *
 * @param {string} actionType Current step action key (e.g. 'ai_brain').
 * @return {{recommended: Array, others: Array}} Matching entries first,
 *                                                everything else second.
 */
export const splitPromptsForAction = ( actionType ) => {
	const recommended = [];
	const others = [];
	for ( const entry of PROMPT_LIBRARY ) {
		if ( actionType && entry.actions.includes( actionType ) ) {
			recommended.push( entry );
		} else {
			others.push( entry );
		}
	}
	return { recommended, others };
};
