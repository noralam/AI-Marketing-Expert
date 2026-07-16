/**
 * Emoji icon maps for workflow actions and triggers (pattern-copied from
 * the email module's AutomationEditor ICON_MAP).
 */

export const ACTION_ICONS = {
	generate_blog_post: '📝',
	run_seo_audit: '🔍',
	enroll_in_funnel: '🪜',
	publish_social_post: '📣',
	send_email_campaign: '✉️',
	generate_ad_copy: '💰',
	custom_prompt: '✨',
	condition: '❓',
	send_notification: '🔔',
};

export const TRIGGER_ICONS = {
	schedule: '⏰',
	post_published: '📰',
	subscriber_created: '👤',
	chatbot_lead: '💬',
};

export const actionIcon = ( type ) => ACTION_ICONS[ type ] || '⚡';

export const triggerIcon = ( key ) => TRIGGER_ICONS[ key ] || '⏰';
