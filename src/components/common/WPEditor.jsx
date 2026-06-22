/**
 * WPEditor — React wrapper around WordPress TinyMCE (wp.oldEditor / wp_editor).
 *
 * Props:
 *   id        {string}   Unique editor ID (must be valid HTML id, no dots)
 *   value     {string}   HTML content
 *   onChange  {function} Callback receiving HTML string on every change
 *   height    {number}   Editor height in px (default 420)
 */

import { useEffect, useRef, useCallback } from '@wordpress/element';

/* ──────── helpers to access the WP editor API ──────── */
const getEditorAPI = () => window.wp?.oldEditor || window.wp?.editor;

const WPEditor = ( { id = 'aime-tinymce', value = '', onChange, height = 420 } ) => {
	const containerRef = useRef( null );
	const isInitialized = useRef( false );
	const pendingValue = useRef( value );
	// Track the most recent internal content to avoid unnecessary setContent calls
	const lastContent = useRef( value );

	/**
	 * Flush the TinyMCE or textarea content through the onChange callback.
	 */
	const flush = useCallback( () => {
		const editor = window.tinymce?.get( id );
		let html;

		if ( editor && ! editor.isHidden() ) {
			html = editor.getContent();
		} else {
			const ta = document.getElementById( id );
			html = ta ? ta.value : '';
		}

		lastContent.current = html;
		onChange?.( html );
	}, [ id, onChange ] );

	/* ──────── init / destroy ──────── */
	useEffect( () => {
		let cancelled = false;
		let retryTimer = null;
		let attempts = 0;
		// ~6s of retries at 100ms — covers slow/concatenated script loads.
		const MAX_ATTEMPTS = 60;

		const doInitialize = () => {
			const api = getEditorAPI();
			try {
				// Clear any stale editor registered under this id (leftover from a
				// prior mount or a partially-failed init) so the toolbar renders.
				if ( window.tinymce?.get( id ) ) {
					api.remove( id );
				}
			} catch ( e ) { /* */ }

			try {
				api.initialize( id, {
					// Top-level false prevents WP's own autop filter from wrapping
					// <style>/<head> blocks in <p> tags on Visual↔Code tab switches.
					wpautop: false,
					tinymce: {
						wpautop: false,
						height,
						toolbar1:
							'formatselect | bold italic underline strikethrough | ' +
							'bullist numlist blockquote | alignleft aligncenter alignright | ' +
							'link unlink image | wp_adv',
						toolbar2:
							'forecolor backcolor | pastetext removeformat charmap | ' +
							'outdent indent | undo redo | hr wp_more | fullscreen',
						plugins:
							'charmap colorpicker hr image lists link media paste ' +
							'tabfocus textcolor wordpress wpautoresize wpeditimage ' +
							'wplink wptextpattern fullscreen',
						branding: false,
						relative_urls: false,
						remove_script_host: false,
						// Allow <style> as a valid direct child of body so TinyMCE never
						// wraps it in a <p> when setContent() parses email HTML templates.
						valid_children: '+body[style]',
						// Protect <style> blocks from any internal TinyMCE mutation.
						protect: [ /<style[^>]*>[\s\S]*?<\/style>/gi ],
						setup( editor ) {
							editor.on( 'init', () => {
								// Set initial content after init
								if ( pendingValue.current ) {
									editor.setContent( pendingValue.current );
									lastContent.current = pendingValue.current;
								}
							} );

							// Fire onChange on every keystroke / mutation
							editor.on( 'input change keyup NodeChange', () => {
								const html = editor.getContent();
								if ( html !== lastContent.current ) {
									lastContent.current = html;
									onChange?.( html );
								}
							} );
						},
					},
					quicktags: true,
					mediaButtons: true,
				} );

				isInitialized.current = true;
			} catch ( e ) {
				// eslint-disable-next-line no-console
				console.error( 'WPEditor init error', e );
			}
		};

		// Wait until the editor API, the TinyMCE core, and the target textarea
		// are ALL ready before initializing. wp_enqueue_editor() loads these as
		// separate async/concatenated scripts, so wp.oldEditor can be present
		// while window.tinymce is still loading — initializing then leaves the
		// editor without its toolbar.
		const tryInit = () => {
			if ( cancelled ) return;

			const api = getEditorAPI();
			const tinymceReady = !! ( window.tinymce && typeof window.tinymce.init === 'function' );
			const textareaReady = !! document.getElementById( id );

			if ( ! api || ! tinymceReady || ! textareaReady ) {
				if ( attempts++ < MAX_ATTEMPTS ) {
					retryTimer = setTimeout( tryInit, 100 );
				} else {
					// eslint-disable-next-line no-console
					console.warn( 'WPEditor: TinyMCE not available – falling back to textarea.' );
				}
				return;
			}

			doInitialize();
		};

		tryInit();

		return () => {
			cancelled = true;
			if ( retryTimer ) clearTimeout( retryTimer );
			try {
				if ( isInitialized.current ) {
					getEditorAPI()?.remove( id );
					isInitialized.current = false;
				}
			} catch ( e ) { /* */ }
		};
	}, [ id ] ); // eslint-disable-line react-hooks/exhaustive-deps

	/* ──────── sync external value changes ──────── */
	useEffect( () => {
		pendingValue.current = value;

		if ( ! isInitialized.current ) return;

		const editor = window.tinymce?.get( id );
		if ( editor && ! editor.isHidden() ) {
			// Only update if the value actually changed from outside
			if ( value !== lastContent.current ) {
				editor.setContent( value || '' );
				lastContent.current = value;
			}
		} else {
			// Quicktags / text mode – update textarea
			const ta = document.getElementById( id );
			if ( ta && ta.value !== value ) {
				ta.value = value || '';
				lastContent.current = value;
			}
		}
	}, [ id, value ] );

	return (
		<div ref={ containerRef } className="aime-wp-editor-wrap">
			{ /* WordPress editor needs a real textarea to attach to */ }
			<textarea
				id={ id }
				className="wp-editor-area"
				defaultValue={ value }
				style={ { width: '100%', minHeight: height } }
			/>
		</div>
	);
};

export default WPEditor;
