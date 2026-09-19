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
	send_email: '📧',
	delay: '⏳',
	generate_ad_copy: '💰',
	ai_brain: '🧠',
	custom_prompt: '✨',
	condition: '❓',
	send_notification: '🔔',
};

export const TRIGGER_ICONS = {
	schedule: '⏰',
	post_published: '📰',
	subscriber_created: '👤',
	chatbot_lead: '💬',
	user_registered: '👋',
	comment_posted: '💬',
	woo_cart_abandoned: '🛒',
	woo_order_completed: '🎉',
	inbound_webhook: '🌐',
	cf7_submission: '📋',
};

export const actionIcon = ( type ) => ACTION_ICONS[ type ] || '⚡';

export const triggerIcon = ( key ) => TRIGGER_ICONS[ key ] || '⏰';
