/**
 * EmptyState
 *
 * Every surface in this plugin is first seen with nothing in it — no
 * subscribers, no campaigns, no articles, no audits. That state is a design
 * deliverable, not an edge case, so it gets a component instead of a stray
 * paragraph.
 *
 * A complete empty state answers three questions in order:
 *   1. What will appear here?   → `title`
 *   2. Why should I care?       → `description`
 *   3. How do I start?          → `actionLabel` + `actionHref`
 *
 * Deliberately text-only: no icon, no illustration. Five of these sit side by
 * side inside the dashboard's chart grid, and five icon-plus-heading-plus-text
 * blocks would read as the page's structure rather than as gaps in it.
 *
 * The action is optional. Omit it when the surface has no single honest next
 * step — a prompt that routes nowhere useful is worse than no prompt.
 */
const EmptyState = ( { title, description, actionLabel, actionHref, className = '' } ) => (
	<div className={ `aime-empty-block ${ className }`.trim() }>
		<p className="aime-empty-block__title">{ title }</p>
		{ description && (
			<p className="aime-empty-block__desc">{ description }</p>
		) }
		{ actionLabel && actionHref && (
			<a className="aime-empty-block__action" href={ actionHref }>
				{ actionLabel }
			</a>
		) }
	</div>
);

export default EmptyState;
