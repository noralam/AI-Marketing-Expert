/**
 * App constants.
 */

export const PLUGIN_NAME = 'AI Marketing Expert';
export const REST_NAMESPACE = '/aime/v1';

// Campaign statuses.
export const CAMPAIGN_STATUS = {
	DRAFT: 'draft',
	SCHEDULED: 'scheduled',
	SENDING: 'sending',
	SENT: 'sent',
	PAUSED: 'paused',
	CANCELLED: 'cancelled',
};

// Subscriber statuses.
export const SUBSCRIBER_STATUS = {
	SUBSCRIBED: 'subscribed',
	UNSUBSCRIBED: 'unsubscribed',
	PENDING: 'pending',
	BOUNCED: 'bounced',
};

// Status labels.
export const CAMPAIGN_STATUS_LABELS = {
	[ CAMPAIGN_STATUS.DRAFT ]: 'Draft',
	[ CAMPAIGN_STATUS.SCHEDULED ]: 'Scheduled',
	[ CAMPAIGN_STATUS.SENDING ]: 'Sending',
	[ CAMPAIGN_STATUS.SENT ]: 'Sent',
	[ CAMPAIGN_STATUS.PAUSED ]: 'Paused',
	[ CAMPAIGN_STATUS.CANCELLED ]: 'Cancelled',
};

export const SUBSCRIBER_STATUS_LABELS = {
	[ SUBSCRIBER_STATUS.SUBSCRIBED ]: 'Subscribed',
	[ SUBSCRIBER_STATUS.UNSUBSCRIBED ]: 'Unsubscribed',
	[ SUBSCRIBER_STATUS.PENDING ]: 'Pending',
	[ SUBSCRIBER_STATUS.BOUNCED ]: 'Bounced',
};

// Status colors.
export const STATUS_COLORS = {
	draft: '#9e9e9e',
	scheduled: '#2196f3',
	sending: '#ff9800',
	sent: '#4caf50',
	paused: '#ff9800',
	cancelled: '#f44336',
	subscribed: '#4caf50',
	unsubscribed: '#f44336',
	pending: '#ff9800',
	bounced: '#f44336',
};

// Article statuses.
export const ARTICLE_STATUS = {
	DRAFT: 'draft',
	GENERATING: 'generating',
	READY: 'ready',
	REVIEW: 'review',
	SCHEDULED: 'scheduled',
	PUBLISHED: 'published',
	ARCHIVED: 'archived',
};

export const ARTICLE_STATUS_LABELS = {
	[ ARTICLE_STATUS.DRAFT ]: 'Draft',
	[ ARTICLE_STATUS.GENERATING ]: 'Generating',
	[ ARTICLE_STATUS.READY ]: 'Ready',
	[ ARTICLE_STATUS.REVIEW ]: 'Review',
	[ ARTICLE_STATUS.SCHEDULED ]: 'Scheduled',
	[ ARTICLE_STATUS.PUBLISHED ]: 'Published',
	[ ARTICLE_STATUS.ARCHIVED ]: 'Archived',
};

// `generating` and `ready` were both #2196f3, so two different stages of an
// article's life rendered as the same colour — invisible on a badge, and
// indistinguishable on the pipeline bars that now use this map. Ready is the
// stage that wants your attention, so it takes the module's own indigo.
export const ARTICLE_STATUS_COLORS = {
	draft: '#9e9e9e',
	generating: '#2196f3',
	ready: '#4338CA',
	review: '#ff9800',
	scheduled: '#7b61ff',
	published: '#4caf50',
	archived: '#607d8b',
};

// ── Social Media ─────────────────────────────────────────

export const SOCIAL_POST_STATUS = {
	draft: 'Draft',
	approval_pending: 'Approval Pending',
	scheduled: 'Scheduled',
	publishing: 'Publishing',
	published: 'Published',
	failed: 'Failed',
};

export const SOCIAL_PLATFORMS = {
	facebook: { label: 'Facebook', icon: '📘', color: '#1877F2' },
	instagram: { label: 'Instagram', icon: '📸', color: '#E4405F' },
	x: { label: 'X (Twitter)', icon: '𝕏', color: '#000000' },
};

export const SOCIAL_CHAR_LIMITS = {
	facebook: 63206,
	instagram: 2200,
	x: 280,
};

// Free-tier limits (merged from server via aimeData).
export const FREE_LIMITS = window.aimeData?.freeLimits || {
	email_subscribers: -1,
	email_lists: 10,
	email_templates: 3,
	email_template_imports_free: 4,
	email_scheduled_campaigns: 3,
	email_funnels: 2,
	email_smtp_connections: 2,
	ai_provider_connections: 2,
	csv_import_rows: 100,
	campaigns_per_month: 30,
	subscribers: -1,
	campaign_sends: 1000,
	content_articles_per_month: 20,
	content_max_words: 2000,
	content_presets: 4,
	content_scheduled_posts: 3,
	articles_per_month: 20,
	ai_generations: 50,
	social_accounts: 2,
	social_posts_per_month: 30,
	social_scheduled_posts: 3,
	social_ai_captions: 30,
};

export const PER_PAGE = 20;
