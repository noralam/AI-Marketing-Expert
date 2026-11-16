/**
 * Built-in skill catalog mirroring PHP SkillRegistry::builtins().
 *
 * IDs must stay in sync with `class-skill-registry.php`. Custom skills
 * arrive via REST (`/workflow-automation/skills`) and merge at runtime.
 */

export const SKILL_LIBRARY = [
	{
		id: 'aime-seo-strategist',
		title: 'SEO Strategist',
		description:
			'Focus keyword, SEO title, meta description, slug and heading plan meeting RankMath/Yoast standards.',
	},
	{
		id: 'aime-readability',
		title: 'Readability Coach',
		description: 'Short paragraphs, lists, TOC and FAQ for Content Readability green.',
	},
	{
		id: 'aime-image-director',
		title: 'Image Director',
		description: '3 distinct concrete stock-photo queries to avoid duplicate images.',
	},
	{
		id: 'aime-link-planner',
		title: 'Link Planner',
		description: 'Internal + external link plan so posts never ship with zero links.',
	},
	{
		id: 'aime-wordpress-expert',
		title: 'WordPress Expert',
		description: 'Practical WP angles: how-tos, listicles, product-led topics.',
	},
	{
		id: 'aime-social-hook',
		title: 'Social Hook Writer',
		description: 'Social hook + CTA for downstream social/email steps.',
	},
];
