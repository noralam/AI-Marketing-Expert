/**
 * Error Boundary - catches React errors and shows a user-friendly fallback.
 */

import { Component } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button } from '@aime/wp-components';

class ErrorBoundary extends Component {
	constructor( props ) {
		super( props );
		this.state = { hasError: false, error: null };
		this._domRetries = 0;
	}

	static getDerivedStateFromError( error ) {
		return { hasError: true, error };
	}

	componentDidCatch( error, errorInfo ) {
		// eslint-disable-next-line no-console
		console.error( 'AI Marketing Expert Error:', error, errorInfo );

		// Auto-recover from benign DOM reconciliation errors (e.g. TinyMCE
		// restructuring the DOM tree outside React's awareness). The underlying
		// functionality is not affected - only React's commit-phase removeChild
		// call fails because a node was moved by the external editor.
		if ( error?.name === 'NotFoundError' && this._domRetries < 3 ) {
			this._domRetries += 1;
			this.setState( { hasError: false, error: null } );
			return;
		}

		// Reset counter for unrelated errors.
		this._domRetries = 0;
	}

	handleReset = () => {
		this._domRetries = 0;
		this.setState( { hasError: false, error: null } );
	};

	render() {
		if ( this.state.hasError ) {
			// While auto-recovering from a DOM error, render nothing briefly
			// instead of flashing the error screen.
			if ( this.state.error?.name === 'NotFoundError' && this._domRetries < 3 ) {
				return null;
			}

			return (
				<div className="aime-error-boundary">
					<div className="aime-error-boundary-content">
						<h2>{ __( 'Something went wrong', 'ai-marketing-expert' ) }</h2>
						<p>
							{ __( 'An unexpected error occurred. Please try again.', 'ai-marketing-expert' ) }
						</p>
						{ this.state.error && (
							<pre className="aime-error-details">
								{ this.state.error.toString() }
							</pre>
						) }
						<Button variant="primary" onClick={ this.handleReset }>
							{ __( 'Try Again', 'ai-marketing-expert' ) }
						</Button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

export default ErrorBoundary;
