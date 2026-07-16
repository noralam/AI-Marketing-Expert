<?php
/**
 * Send Notification action — emails a templated message with workflow tokens.
 *
 * @package WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Actions
 */

namespace WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Actions;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class SendNotificationAction extends BaseAction {

	/**
	 * @param array $config  Step config: to, subject, body.
	 * @param array $context Workflow context.
	 * @return array
	 */
	public static function run( array $config, array $context ): array {
		$to = sanitize_email( (string) ( $config['to'] ?? '' ) );
		if ( '' === $to ) {
			$to = (string) get_option( 'admin_email' );
		}
		if ( ! is_email( $to ) ) {
			return self::fail( __( 'Invalid notification recipient.', 'ai-marketing-expert' ) );
		}

		$subject = self::replace_tokens( (string) ( $config['subject'] ?? '' ), $context );
		$body    = self::replace_tokens( (string) ( $config['body'] ?? '' ), $context );

		if ( '' === trim( $subject ) ) {
			$subject = sprintf(
				/* translators: %s: workflow name */
				__( 'Workflow notification: %s', 'ai-marketing-expert' ),
				(string) ( $context['workflow_name'] ?? '' )
			);
		}

		$sent = wp_mail( $to, $subject, $body );
		if ( ! $sent ) {
			return self::fail( __( 'wp_mail() failed to send the notification.', 'ai-marketing-expert' ) );
		}

		return self::ok(
			sprintf(
				/* translators: 1: recipient, 2: subject */
				__( 'Notification sent to %1$s: %2$s', 'ai-marketing-expert' ),
				$to,
				$subject
			)
		);
	}

	/**
	 * Replace {topic} {workflow_name} {previous_preview} and {event.field}
	 * (dot notation) tokens in a template string.
	 */
	private static function replace_tokens( string $template, array $context ): string {
		$previous         = $context['previous'] ?? array();
		$previous_preview = '';
		if ( ! empty( $previous ) ) {
			$last             = end( $previous );
			$previous_preview = (string) ( $last['preview'] ?? '' );
		}
		if ( '' === $previous_preview && isset( $context['parent_output']['preview'] ) ) {
			$previous_preview = (string) $context['parent_output']['preview'];
		}

		$out = strtr( $template, array(
			'{topic}'            => (string) ( $context['topic'] ?? '' ),
			'{workflow_name}'    => (string) ( $context['workflow_name'] ?? '' ),
			'{previous_preview}' => $previous_preview,
		) );

		// {event.field} tokens with dot-notation paths into the event payload.
		$event = is_array( $context['event'] ?? null ) ? $context['event'] : array();
		return (string) preg_replace_callback(
			'/\{event\.([a-zA-Z0-9_.]+)\}/',
			static function ( array $m ) use ( $event ): string {
				$node = $event;
				foreach ( explode( '.', $m[1] ) as $part ) {
					if ( ! is_array( $node ) || ! array_key_exists( $part, $node ) ) {
						return '';
					}
					$node = $node[ $part ];
				}
				return is_scalar( $node ) ? (string) $node : (string) wp_json_encode( $node );
			},
			$out
		);
	}
}
