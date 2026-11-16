<?php
/**
 * Pure-PHP SSL Socket IMAP Client.
 *
 * Implements a lightweight, zero-dependency IMAP4rev1 client via native PHP
 * SSL stream sockets. Resolves PHP 8.4 deprecation/removal of ext-imap.
 *
 * @package WPSpace\AiMarketingExpert
 */

namespace WPSpace\AiMarketingExpert;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class PureImapClient {

	/**
	 * Connection socket resource.
	 *
	 * @var resource|null
	 */
	private $socket = null;

	/**
	 * Tag counter for IMAP commands.
	 *
	 * @var int
	 */
	private int $tag_counter = 0;

	/**
	 * Socket timeout in seconds.
	 */
	public const TIMEOUT_SECONDS = 5;

	/**
	 * Connect to IMAP server over SSL/TLS.
	 *
	 * @param string $host       IMAP server hostname (e.g. imap.gmail.com).
	 * @param int    $port       Port number (default: 993).
	 * @param string $encryption Protocol encryption: 'ssl', 'tls', or 'none'.
	 * @return true|\WP_Error
	 */
	public function connect( string $host, int $port = 993, string $encryption = 'ssl' ) {
		$resolved_ip = gethostbyname( $host );
		if ( ! apply_filters( 'aime_allow_private_imap_host', false, $host ) ) {
			if ( ! filter_var( $resolved_ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE ) ) {
				return new \WP_Error(
					'imap_private_ip',
					__( 'IMAP host resolves to a disallowed private or reserved IP address.', 'ai-marketing-expert' )
				);
			}
		}

		$use_implicit_ssl = ( 'ssl' === $encryption || 993 === $port );
		$prefix           = $use_implicit_ssl ? 'ssl://' : 'tcp://';
		$target           = $prefix . $host . ':' . $port;

		$allow_insecure = (bool) apply_filters( 'aime_imap_allow_self_signed', false, $host );
		$context        = stream_context_create( array(
			'ssl' => array(
				'verify_peer'       => ! $allow_insecure,
				'verify_peer_name'  => ! $allow_insecure,
				'allow_self_signed' => $allow_insecure,
				'peer_name'         => $host,
			),
		) );

		$errno  = 0;
		$errstr = '';

		$this->socket = @stream_socket_client(
			$target,
			$errno,
			$errstr,
			self::TIMEOUT_SECONDS,
			STREAM_CLIENT_CONNECT,
			$context
		);

		if ( ! $this->socket ) {
			return new \WP_Error(
				'imap_connect_failed',
				sprintf(
					/* translators: 1: target host, 2: error message, 3: error code */
					__( 'Failed to connect to IMAP server %1$s: %2$s (Code %3$d)', 'ai-marketing-expert' ),
					$target,
					$errstr ?: 'Unknown error',
					$errno
				)
			);
		}

		stream_set_timeout( $this->socket, self::TIMEOUT_SECONDS );

		// Read server initial greeting
		$greeting = $this->read_line();
		if ( null === $greeting || ( false === strpos( $greeting, '* OK' ) && false === strpos( $greeting, '* PREAUTH' ) ) ) {
			$this->disconnect();
			/* translators: %s: IMAP server greeting response */
			return new \WP_Error( 'imap_invalid_greeting', sprintf( __( 'Unexpected IMAP server greeting: %s', 'ai-marketing-expert' ), (string) $greeting ) );
		}

		// Negotiate STARTTLS on port 143 or when encryption is tls.
		if ( 'tls' === $encryption && ! $use_implicit_ssl ) {
			$starttls_resp = $this->send_command( 'STARTTLS' );
			if ( is_wp_error( $starttls_resp ) ) {
				$this->disconnect();
				return $starttls_resp;
			}
			$crypto_method = STREAM_CRYPTO_METHOD_TLS_CLIENT;
			if ( defined( 'STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT' ) ) {
				$crypto_method |= STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT;
			}
			if ( defined( 'STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT' ) ) {
				$crypto_method |= STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT;
			}
			if ( ! @stream_socket_enable_crypto( $this->socket, true, $crypto_method ) ) {
				$this->disconnect();
				return new \WP_Error( 'imap_starttls_failed', __( 'STARTTLS negotiation failed.', 'ai-marketing-expert' ) );
			}
		}

		return true;
	}

	/**
	 * Authenticate with the IMAP server.
	 *
	 * @param string $username Mailbox username / email.
	 * @param string $password App password or account password.
	 * @return true|\WP_Error
	 */
	public function login( string $username, string $password ) {
		if ( ! $this->socket ) {
			return new \WP_Error( 'imap_not_connected', __( 'IMAP socket is not connected.', 'ai-marketing-expert' ) );
		}

		// Escape quotes and backslashes in credentials for IMAP quoted-string
		$safe_user = addcslashes( $username, '"\\' );
		$safe_pass = addcslashes( $password, '"\\' );

		$tag      = $this->next_tag();
		$cmd      = sprintf( '%s LOGIN "%s" "%s"', $tag, $safe_user, $safe_pass );
		$response = $this->send_command( $tag, $cmd );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		if ( false === strpos( $response, $tag . ' OK' ) ) {
			/* translators: %s: IMAP server error response */
			return new \WP_Error( 'imap_login_failed', sprintf( __( 'IMAP authentication failed: %s', 'ai-marketing-expert' ), trim( $response ) ) );
		}

		return true;
	}

	/**
	 * Select a mailbox folder (default: INBOX).
	 *
	 * @param string $mailbox Mailbox folder name.
	 * @return int|\WP_Error Total messages in mailbox.
	 */
	public function select_mailbox( string $mailbox = 'INBOX' ) {
		$tag      = $this->next_tag();
		$cmd      = sprintf( '%s SELECT "%s"', $tag, addcslashes( $mailbox, '"\\' ) );
		$response = $this->send_command( $tag, $cmd );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		if ( false === strpos( $response, $tag . ' OK' ) ) {
			/* translators: 1: mailbox folder name, 2: IMAP server response */
			return new \WP_Error( 'imap_select_failed', sprintf( __( 'Could not select mailbox folder %1$s: %2$s', 'ai-marketing-expert' ), $mailbox, $response ) );
		}

		// Extract total exists: * 123 EXISTS
		if ( preg_match( '/\*\s+(\d+)\s+EXISTS/i', $response, $matches ) ) {
			return (int) $matches[1];
		}

		return 0;
	}

	/**
	 * Search for message IDs matching an IMAP search criterion.
	 *
	 * @param string $criteria Search string, e.g. 'UNSEEN' or 'ALL'.
	 * @return array|\WP_Error Array of message integer IDs.
	 */
	public function search( string $criteria = 'UNSEEN' ) {
		$tag      = $this->next_tag();
		$cmd      = sprintf( '%s SEARCH %s', $tag, $criteria );
		$response = $this->send_command( $tag, $cmd );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$ids = array();
		if ( preg_match( '/\*\s+SEARCH\s+([0-9\s]+)/i', $response, $matches ) ) {
			$raw_ids = preg_split( '/\s+/', trim( $matches[1] ) );
			foreach ( $raw_ids as $id ) {
				$val = absint( $id );
				if ( $val > 0 ) {
					$ids[] = $val;
				}
			}
		}

		return $ids;
	}

	/**
	 * Fetch raw message header and body slice for bounce analysis.
	 *
	 * Limits body download to 8 KB to avoid socket stalls and memory exhaustion
	 * on large emails.
	 *
	 * @param int $msg_id Message sequence number.
	 * @return array|\WP_Error { raw: string }
	 */
	public function fetch_message( int $msg_id ) {
		$tag      = $this->next_tag();
		$cmd      = sprintf( '%s FETCH %d (BODY.PEEK[HEADER] BODY.PEEK[TEXT]<0.8192>)', $tag, $msg_id );
		$response = $this->send_command( $tag, $cmd, true, 6 );

		// Fallback to headers only if partial body slice is rejected by non-standard server
		if ( is_wp_error( $response ) || ( false === strpos( $response, $tag . ' OK' ) && false !== strpos( $response, $tag . ' BAD' ) ) ) {
			$tag2     = $this->next_tag();
			$cmd2     = sprintf( '%s FETCH %d (BODY.PEEK[HEADER])', $tag2, $msg_id );
			$response = $this->send_command( $tag2, $cmd2, true, 5 );
		}

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		return array(
			'raw' => $response,
		);
	}

	/**
	 * Mark message for deletion.
	 *
	 * @param int $msg_id Message sequence number.
	 * @return true|\WP_Error
	 */
	public function delete_message( int $msg_id ) {
		$tag      = $this->next_tag();
		$cmd      = sprintf( '%s STORE %d +FLAGS (\Deleted)', $tag, $msg_id );
		$response = $this->send_command( $tag, $cmd, false, 5 );

		return is_wp_error( $response ) ? $response : true;
	}

	/**
	 * Mark message as read (\Seen).
	 *
	 * @param int $msg_id Message sequence number.
	 * @return true|\WP_Error
	 */
	public function mark_seen( int $msg_id ) {
		$tag      = $this->next_tag();
		$cmd      = sprintf( '%s STORE %d +FLAGS (\Seen)', $tag, $msg_id );
		$response = $this->send_command( $tag, $cmd, false, 5 );

		return is_wp_error( $response ) ? $response : true;
	}

	/**
	 * Expunge deleted messages and close session.
	 */
	public function disconnect(): void {
		if ( $this->socket ) {
			try {
				$tag = $this->next_tag();
				// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fwrite -- Socket connection stream, not a file.
				@fwrite( $this->socket, $tag . " EXPUNGE\r\n" );
				// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fwrite -- Socket connection stream, not a file.
				@fwrite( $this->socket, $tag . " LOGOUT\r\n" );
			} catch ( \Throwable $t ) {
				// Ignore disconnect exceptions.
			}
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fclose -- Socket connection stream, not a file.
			@fclose( $this->socket );
			$this->socket = null;
		}
	}

	/**
	 * Helper: Test IMAP connection diagnostic.
	 *
	 * @param array $config { host, port, encryption, username, password }
	 * @return array { success: bool, message: string, total_messages: int, unseen: int }
	 */
	public static function test_connection( array $config ): array {
		$host       = sanitize_text_field( $config['host'] ?? '' );
		$port       = absint( $config['port'] ?? 993 );
		$encryption = sanitize_text_field( $config['encryption'] ?? 'ssl' );
		$username   = sanitize_text_field( $config['username'] ?? '' );
		$password   = (string) ( $config['password'] ?? '' );

		if ( empty( $host ) || empty( $username ) || empty( $password ) ) {
			return array(
				'success' => false,
				'message' => __( 'Host, username, and password are required for IMAP test.', 'ai-marketing-expert' ),
			);
		}

		$client = new self();
		$conn   = $client->connect( $host, $port, $encryption );
		if ( is_wp_error( $conn ) ) {
			return array(
				'success' => false,
				'message' => $conn->get_error_message(),
			);
		}

		$login = $client->login( $username, $password );
		if ( is_wp_error( $login ) ) {
			$client->disconnect();
			return array(
				'success' => false,
				'message' => $login->get_error_message(),
			);
		}

		$total = $client->select_mailbox( 'INBOX' );
		if ( is_wp_error( $total ) ) {
			$client->disconnect();
			return array(
				'success' => false,
				'message' => $total->get_error_message(),
			);
		}

		$unseen = $client->search( 'UNSEEN' );
		$unseen_count = is_array( $unseen ) ? count( $unseen ) : 0;

		$client->disconnect();

		return array(
			'success'        => true,
			'message'        => sprintf(
				/* translators: 1: total messages, 2: unseen messages */
				__( 'IMAP connection successful! Found %1$d total messages (%2$d unread) in INBOX.', 'ai-marketing-expert' ),
				$total,
				$unseen_count
			),
			'total_messages' => (int) $total,
			'unseen_count'   => $unseen_count,
		);
	}

	/**
	 * Send an IMAP command and wait for tagged completion response.
	 *
	 * @param string $tag             IMAP command tag.
	 * @param string $command         Full IMAP command string.
	 * @param bool   $multiline       Whether response is expected to have multiple lines.
	 * @param int    $timeout_seconds Maximum wall-clock seconds to wait for response.
	 * @return string|\WP_Error
	 */
	private function send_command( string $tag, string $command, bool $multiline = false, int $timeout_seconds = 8 ) {
		if ( ! $this->socket ) {
			return new \WP_Error( 'imap_not_connected', __( 'Socket disconnected.', 'ai-marketing-expert' ) );
		}

		$payload = $command . "\r\n";
		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_fwrite -- Socket connection stream, not a file.
		$written = @fwrite( $this->socket, $payload );
		if ( false === $written || 0 === $written ) {
			return new \WP_Error( 'imap_write_failed', __( 'Failed to write command to IMAP stream.', 'ai-marketing-expert' ) );
		}

		$buffer     = '';
		$start_time = microtime( true );

		while ( ! feof( $this->socket ) ) {
			// Wall-clock protection against stalled commands
			if ( ( microtime( true ) - $start_time ) > $timeout_seconds ) {
				break;
			}

			$line = $this->read_line();
			if ( null === $line ) {
				break;
			}
			$buffer .= $line . "\n";

			// Tagged response completes the command (e.g. A001 OK / NO / BAD)
			if ( 0 === strpos( $line, $tag . ' ' ) ) {
				break;
			}
		}

		return $buffer;
	}

	/**
	 * Read a single CRLF-terminated line from stream.
	 *
	 * @return string|null Null on EOF, socket timeout, or disconnect; string otherwise.
	 */
	private function read_line(): ?string {
		if ( ! $this->socket ) {
			return null;
		}

		$line = fgets( $this->socket, 4096 );
		if ( false === $line ) {
			return null;
		}

		$meta = stream_get_meta_data( $this->socket );
		if ( ! empty( $meta['timed_out'] ) ) {
			return null;
		}

		return rtrim( $line, "\r\n" );
	}

	/**
	 * Generate next unique command tag.
	 */
	private function next_tag(): string {
		$this->tag_counter++;
		return sprintf( 'A%04d', $this->tag_counter );
	}
}
