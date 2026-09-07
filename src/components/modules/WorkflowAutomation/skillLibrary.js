/**
 * Built-in skill catalog mirroring PHP SkillRegistry::builtins().
 *
 * IDs must stay in sync with `class-skill-registry.php`. Custom skills
 * arrive via REST (`/workflow-automation/skills`) and merge at runtime.
 * `isPro` mirrors the server `is_pro` flag: SEO + Readability are free,
 * the rest require Pro (enforced server-side in SkillRegistry::resolve()).
 */

export const SKILL_LIBRARY = [
	{
		id: 'aime-seo-strategist',
		title: 'SEO Strategist',
		description:
			'Focus keyword, SEO title, meta description, slug and heading plan meeting RankMath/Yoast standards.',
		isPro: false,
	},
	{
		id: 'aime-readability',
		title: 'Readability Coach',
		description: 'Short paragraphs, lists, TOC and FAQ for Content Readability green.',
		isPro: false,
	},
	{
		id: 'aime-image-director',
		title: 'Image Director',
		description: '3 distinct concrete stock-photo queries to avoid duplicate images.',
		isPro: true,
	},
	{
		id: 'aime-link-planner',
		title: 'Link Planner',
		description: 'Internal + external link plan so posts never ship with zero links.',
		isPro: true,
	},
	{
		id: 'aime-wordpress-expert',
		title: 'WordPress Expert',
		description: 'Practical WP angles: how-tos, listicles, product-led topics.',
		isPro: true,
	},
	{
		id: 'aime-social-hook',
		title: 'Social Hook Writer',
		description: 'Social hook + CTA for downstream social/email steps.',
		isPro: true,
	},
];
