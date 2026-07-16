<?php
/**
 * Condition action — evaluates a check and routes the workflow down its
 * Yes or No branch. The engine reads reference['branch'] to decide which
 * children to enqueue.
 *
 * @package WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Actions
 */

namespace WPSpace\AiMarketingExpert\Modules\WorkflowAutomation\Actions;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class ConditionAction extends BaseAction {

	/**
	 * @param array $config  Step config: check, field, value.
	 * @param array $context Workflow context (parent_output, event, previous).
	 * @return array
	 */
	public static function run( array $config, array $context ): array {
		$check = (string) ( $config['check'] ?? 'previous_step_succeeded' );
		$value = (string) ( $config['value'] ?? '' );

		switch ( $check ) {
			case 'previous_output_contains':
				$haystack = (string) ( $context['parent_output']['preview'] ?? '' );
				$matched  = '' !== $value && false !== mb_stripos( $haystack, $value );
				break;

			case 'event_field_contains':
				$field    = (string) ( $config['field'] ?? '' );
				$haystack = (string) self::event_field( $context['event'] ?? array(), $field );
				$matched  = '' !== $value && false !== mb_stripos( $haystack, $value );
				break;

			case 'previous_step_succeeded':
			default:
				// The engine passes the parent's success flag through the queue;
				// root-level conditions (no parent) count as succeeded.
				$matched = (bool) ( $context['parent_success'] ?? true );
				break;
		}

		$branch = $matched ? 'yes' : 'no';

		return self::ok(
			sprintf(
				/* translators: %s: taken branch (yes/no) */
				__( 'Condition → %s', 'ai-marketing-expert' ),
				$branch
			),
			array( 'branch' => $branch )
		);
	}

	/**
	 * Resolve a dot-notation field from the event payload (e.g. metadata.page_url).
	 *
	 * @param array  $event Event payload.
	 * @param string $field Dot-notation path.
	 * @return string
	 */
	private static function event_field( array $event, string $field ): string {
		if ( '' === $field ) {
			return '';
		}
		$node = $event;
		foreach ( explode( '.', $field ) as $part ) {
			if ( ! is_array( $node ) || ! array_key_exists( $part, $node ) ) {
				return '';
			}
			$node = $node[ $part ];
		}
		return is_scalar( $node ) ? (string) $node : (string) wp_json_encode( $node );
	}
}
