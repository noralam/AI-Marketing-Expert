/**
 * Repurpose - turn Content Generator articles into social posts (Pro).
 */

import { useState, useCallback, useEffect, useRef, useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, SelectControl, TextareaControl } from '@aime/wp-components';
import apiFetch from '@wordpress/api-fetch';
import useApi from '../../../hooks/useApi';
import useSlowWarning from '../../../hooks/useSlowWarning';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import LoadingBtn from '../../common/LoadingBtn';
import ProGate from '../../common/ProGate';
import { toast } from '../../common/Toast';
import AiNotice, { isAiConfigured, aiDisabledTitle } from '../../common/AiNotice';
import { SOCIAL_PLATFORMS } from '../../../utils/constants';

const FORMATS = [
	{ label: 'Summary', value: 'summary' },
	{ label: 'Thread', value: 'thread' },
	{ label: 'Key Quotes', value: 'quotes' },
];

const Repurpose = ( { onNavigate } ) => {
	const { get, post, loading } = useApi();
	const slowWarning = useSlowWarning();
	const [ articles, setArticles ] = useState( [] ); // content-generator articles
	const [ wpPosts, setWpPosts ] = useState( [] );   // WordPress posts
	const [ accounts, setAccounts ] = useState( [] );
	const [ selectedArticle, setSelectedArticle ] = useState( '' ); // "wp-{id}" or "cg-{id}"
	const [ selectedAccount, setSelectedAccount ] = useState( '' );
	const [ format, setFormat ] = useState( 'summary' );
	const [ generatedPosts, setGeneratedPosts ] = useState( [] );
	const [ generating, setGenerating ] = useState( false );
	const [ searchTerm, setSearchTerm ] = useState( '' );
	const [ dropdownOpen, setDropdownOpen ] = useState( false );
	const dropdownRef = useRef( null );

	const fetchData = useCallback( async () => {
		try {
			const [ articleRes, accountRes ] = await Promise.all( [
				get( '/content/articles?per_page=100&status=published' ).catch( () => [] ),
				get( '/social/accounts' ),
			] );
			setArticles( articleRes.items || articleRes || [] );
			setAccounts( accountRes.items || accountRes || [] );
		} catch ( e ) {
			// silent
		}
		// Fetch WP posts separately (core REST API).
		try {
			const posts = await apiFetch( { path: '/wp/v2/posts?per_page=100&status=publish&_fields=id,title,date,excerpt' } );
			setWpPosts( posts || [] );
		} catch ( e ) {
			// silent - may not have posts
		}
	}, [ get ] );

	useEffect( () => {
		fetchData();
	}, [ fetchData ] );

	// Close dropdown on outside click.
	useEffect( () => {
		const handler = ( e ) => {
			if ( dropdownRef.current && ! dropdownRef.current.contains( e.target ) ) {
				setDropdownOpen( false );
			}
		};
		document.addEventListener( 'mousedown', handler );
		return () => document.removeEventListener( 'mousedown', handler );
	}, [] );

	// Merge all sources into a single list.
	const allItems = useMemo( () => {
		const items = [];
		articles.forEach( ( a ) => {
			items.push( {
				key: `cg-${ a.id }`,
				label: a.title || `#${ a.id }`,
				source: 'Content Generator',
				excerpt: a.excerpt || '',
				word_count: a.word_count || null,
				date: a.created_at ? a.created_at.split( ' ' )[ 0 ] : '',
			} );
		} );
		wpPosts.forEach( ( p ) => {
			items.push( {
				key: `wp-${ p.id }`,
				label: p.title?.rendered || `Post #${ p.id }`,
				source: 'WordPress',
				excerpt: p.excerpt?.rendered ? p.excerpt.rendered.replace( /<[^>]+>/g, '' ).trim() : '',
				word_count: null,
				date: p.date ? p.date.split( 'T' )[ 0 ] : '',
			} );
		} );
		return items;
	}, [ articles, wpPosts ] );

	const filteredItems = useMemo( () => {
		if ( ! searchTerm ) return allItems;
		const q = searchTerm.toLowerCase();
		return allItems.filter( ( i ) => i.label.toLowerCase().includes( q ) || i.source.toLowerCase().includes( q ) );
	}, [ allItems, searchTerm ] );

	const selectedItem = allItems.find( ( i ) => i.key === selectedArticle );

	const account = accounts.find( ( a ) => String( a.id ) === selectedAccount );
	const platform = account?.platform || 'facebook';

	const handleGenerate = async () => {
		if ( generating ) return;
		if ( ! selectedArticle ) {
			toast( __( 'Please select an article.', 'ai-marketing-expert' ), 'error' );
			return;
		}
		if ( ! selectedAccount ) {
			toast( __( 'Please select an account.', 'ai-marketing-expert' ), 'error' );
			return;
		}

		setGenerating( true );
		slowWarning.start();
		try {
			const payload = { platform, format };
			if ( selectedArticle.startsWith( 'wp-' ) ) {
				payload.wp_post_id = parseInt( selectedArticle.replace( 'wp-', '' ), 10 );
			} else {
				payload.article_id = parseInt( selectedArticle.replace( 'cg-', '' ), 10 );
			}
			const res = await post( '/social/ai/repurpose', payload );
			const posts = res.posts || ( res.content ? [ { content: res.content, hashtags: res.hashtags || '' } ] : [] );
			setGeneratedPosts( posts );
			if ( posts.length > 0 ) {
				toast( __( 'Posts generated from article!', 'ai-marketing-expert' ) );
			}
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			slowWarning.stop();
			setGenerating( false );
		}
	};

	const handleSaveAsDraft = async ( idx ) => {
		const item = generatedPosts[ idx ];
		if ( ! item ) return;

		try {
			await post( '/social/posts', {
				account_id: parseInt( selectedAccount, 10 ),
				content: item.content,
				hashtags: item.hashtags || '',
				ai_generated: true,
			} );
			toast( __( 'Saved as draft!', 'ai-marketing-expert' ) );
			// Mark as saved visually
			setGeneratedPosts( ( prev ) =>
				prev.map( ( p, i ) => ( i === idx ? { ...p, saved: true } : p ) )
			);
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	const handleSaveAll = async () => {
		const unsaved = generatedPosts.filter( ( p ) => ! p.saved );
		let saved = 0;
		for ( const item of unsaved ) {
			try {
				await post( '/social/posts', {
					account_id: parseInt( selectedAccount, 10 ),
					content: item.content,
					hashtags: item.hashtags || '',
					ai_generated: true,
				} );
				saved++;
			} catch ( e ) {
				// continue with rest
			}
		}
		if ( saved > 0 ) {
			toast( `${ saved } ${ __( 'posts saved as drafts.', 'ai-marketing-expert' ) }` );
			setGeneratedPosts( ( prev ) => prev.map( ( p ) => ( { ...p, saved: true } ) ) );
		}
	};

	const repurposeContent = (
		<div className="aime-repurpose">
			<div style={ { marginBottom: 20 } }>
				<h2 style={ { margin: 0 } }>{ __( 'Repurpose Content', 'ai-marketing-expert' ) }</h2>
				<p style={ { fontSize: 14, color: 'var(--aime-text-muted)', margin: '4px 0 0' } }>
					{ __( 'Transform your articles into platform-ready social media posts using AI.', 'ai-marketing-expert' ) }
				</p>
			</div>

			<div style={ { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 } }>
				{ /* Selection panel */ }
				<Card title={ __( 'Source & Target', 'ai-marketing-expert' ) }>
					<div style={ { display: 'flex', flexDirection: 'column', gap: 16 } }>
						{ /* Searchable Article Select */ }
						<div ref={ dropdownRef } style={ { position: 'relative' } }>
							<label style={ { display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 4 } }>
								{ __( 'Article', 'ai-marketing-expert' ) }
							</label>
							<div
								onClick={ () => setDropdownOpen( ! dropdownOpen ) }
								style={ {
									border: '1px solid #8c8f94',
									borderRadius: 4,
									padding: '6px 10px',
									cursor: 'pointer',
									background: '#fff',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'space-between',
									minHeight: 36,
								} }
							>
								<span style={ { color: selectedItem ? '#1e1e1e' : '#757575', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 } }>
									{ selectedItem ? selectedItem.label : __( '— Select Article —', 'ai-marketing-expert' ) }
								</span>
								<span style={ { fontSize: 10, marginLeft: 8, color: '#757575' } }>▼</span>
							</div>

							{ dropdownOpen && (
								<div style={ {
									position: 'absolute',
									top: '100%',
									left: 0,
									right: 0,
									zIndex: 100,
									background: '#fff',
									border: '1px solid #8c8f94',
									borderTop: 'none',
									borderRadius: '0 0 4px 4px',
									boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
									maxHeight: 280,
									display: 'flex',
									flexDirection: 'column',
								} }>
									<div style={ { padding: '6px 8px', borderBottom: '1px solid #e0e0e0' } }>
										<input
											type="text"
											placeholder={ __( 'Search articles...', 'ai-marketing-expert' ) }
											value={ searchTerm }
											onChange={ ( e ) => setSearchTerm( e.target.value ) }
											onClick={ ( e ) => e.stopPropagation() }
											autoFocus
											style={ {
												width: '100%',
												border: '1px solid #ddd',
												borderRadius: 4,
												padding: '6px 10px',
												fontSize: 13,
												outline: 'none',
												boxSizing: 'border-box',
											} }
										/>
									</div>
									<div style={ { overflowY: 'auto', maxHeight: 230 } }>
										{ filteredItems.length === 0 && (
											<div style={ { padding: '12px 10px', color: '#757575', fontSize: 13, textAlign: 'center' } }>
												{ __( 'No articles found.', 'ai-marketing-expert' ) }
											</div>
										) }
										{ filteredItems.map( ( item ) => (
											<div
												key={ item.key }
												onClick={ () => {
													setSelectedArticle( item.key );
													setDropdownOpen( false );
													setSearchTerm( '' );
												} }
												style={ {
													padding: '8px 12px',
													cursor: 'pointer',
													background: item.key === selectedArticle ? '#f0f0f0' : 'transparent',
													borderBottom: '1px solid #f0f0f0',
													transition: 'background 0.15s',
												} }
												onMouseEnter={ ( e ) => { e.currentTarget.style.background = '#f6f7f7'; } }
												onMouseLeave={ ( e ) => { e.currentTarget.style.background = item.key === selectedArticle ? '#f0f0f0' : 'transparent'; } }
											>
												<div style={ { fontSize: 14, fontWeight: 500, lineHeight: 1.3 } }>
													{ item.label }
												</div>
												<div style={ { fontSize: 11, color: '#757575', marginTop: 2 } }>
													<span style={ {
														display: 'inline-block',
														padding: '1px 6px',
														borderRadius: 8,
														fontSize: 10,
														fontWeight: 600,
														background: item.source === 'WordPress' ? '#e1f5fe' : '#e8f5e9',
														color: item.source === 'WordPress' ? '#0277bd' : '#2e7d32',
														marginRight: 6,
													} }>
														{ item.source }
													</span>
													{ item.date }
												</div>
											</div>
										) ) }
									</div>
								</div>
							) }
						</div>

						<SelectControl
							label={ __( 'Target Account', 'ai-marketing-expert' ) }
							value={ selectedAccount }
							options={ [
								{ label: __( '— Select Account —', 'ai-marketing-expert' ), value: '' },
								...accounts.map( ( a ) => ( { label: `${ a.name } (${ a.platform })`, value: String( a.id ) } ) ),
							] }
							onChange={ setSelectedAccount }
							help={ accounts.length === 0 ? __( 'No accounts connected. Go to Accounts tab to connect one.', 'ai-marketing-expert' ) : undefined }
							__nextHasNoMarginBottom
						/>

						<SelectControl
							label={ __( 'Format', 'ai-marketing-expert' ) }
							value={ format }
							options={ FORMATS }
							onChange={ setFormat }
							help={
								format === 'summary'
									? __( 'A concise summary of the article.', 'ai-marketing-expert' )
									: format === 'thread'
										? __( 'A multi-part thread (best for X).', 'ai-marketing-expert' )
										: __( 'Key quotes and highlights from the article.', 'ai-marketing-expert' )
							}
							__nextHasNoMarginBottom
						/>

						{ generating ? (
							<LoadingBtn primary style={ { marginTop: 8 } }>
								{ __( 'Generating Posts...', 'ai-marketing-expert' ) }
							</LoadingBtn>
						) : (
							<Button
								variant="primary"
								onClick={ handleGenerate }
								disabled={ ! isAiConfigured() || ! selectedArticle || ! selectedAccount }
								title={ ! isAiConfigured() ? aiDisabledTitle() : undefined }
								style={ { marginTop: 8 } }
							>
								{ __( '✨ Generate Social Posts', 'ai-marketing-expert' ) }
							</Button>
						) }
						<AiNotice />
					</div>
				</Card>

				{ /* Article preview */ }
				<Card title={ __( 'Article Preview', 'ai-marketing-expert' ) }>
					{ selectedItem ? (
						<div>
							<h4 style={ { margin: '0 0 8px', fontSize: 16 } }>{ selectedItem.label }</h4>
							<span style={ {
								display: 'inline-block',
								padding: '2px 8px',
								borderRadius: 8,
								fontSize: 11,
								fontWeight: 600,
								background: selectedItem.source === 'WordPress' ? '#e1f5fe' : '#e8f5e9',
								color: selectedItem.source === 'WordPress' ? '#0277bd' : '#2e7d32',
								marginBottom: 8,
							} }>
								{ selectedItem.source }
							</span>
							{ selectedItem.excerpt && (
								<p style={ { fontSize: 13, lineHeight: 1.5, color: '#555' } }>
									{ selectedItem.excerpt.substring( 0, 300 ) }{ selectedItem.excerpt.length > 300 ? '…' : '' }
								</p>
							) }
							<div style={ { fontSize: 12, color: 'var(--aime-text-muted)', marginTop: 8 } }>
								{ selectedItem.word_count && `${ selectedItem.word_count } words` }
								{ selectedItem.date && ` · ${ selectedItem.date }` }
							</div>
						</div>
					) : (
						<div style={ { textAlign: 'center', padding: '30px 10px', color: 'var(--aime-text-muted)' } }>
							<p>{ __( 'Select an article to see its preview.', 'ai-marketing-expert' ) }</p>
						</div>
					) }
				</Card>
			</div>

			{ /* Generated Posts */ }
			{ generatedPosts.length > 0 && (
				<div style={ { marginTop: 24 } }>
					<div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 } }>
						<h3 style={ { margin: 0, fontSize: 16 } }>
							{ __( 'Generated Posts', 'ai-marketing-expert' ) }
							<span style={ { fontSize: 13, color: 'var(--aime-text-muted)', fontWeight: 400, marginLeft: 8 } }>
								({ generatedPosts.length })
							</span>
						</h3>
						{ generatedPosts.some( ( p ) => ! p.saved ) && (
							<Button variant="secondary" size="compact" onClick={ handleSaveAll } disabled={ loading }>
								{ __( 'Save All as Drafts', 'ai-marketing-expert' ) }
							</Button>
						) }
					</div>

					<div style={ { display: 'flex', flexDirection: 'column', gap: 12 } }>
						{ generatedPosts.map( ( item, idx ) => {
							const pInfo = SOCIAL_PLATFORMS[ platform ] || {};
							return (
								<Card key={ idx }>
									<div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } }>
										<div style={ { flex: 1 } }>
											<div style={ { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } }>
												<span style={ { color: pInfo.color, fontWeight: 600, fontSize: 13 } }>
													{ pInfo.icon } { pInfo.label || platform }
												</span>
												{ format === 'thread' && (
													<span style={ { fontSize: 12, color: 'var(--aime-text-muted)' } }>
														{ __( 'Part', 'ai-marketing-expert' ) } { idx + 1 }
													</span>
												) }
												{ item.saved && (
													<span style={ {
														fontSize: 11, fontWeight: 600, color: '#2E7D32',
														background: '#E8F5E9', padding: '2px 8px', borderRadius: 10,
													} }>
														{ __( 'Saved', 'ai-marketing-expert' ) }
													</span>
												) }
											</div>

											<div style={ {
												fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap',
												padding: 12, borderRadius: 8, background: 'var(--aime-bg-alt, #f9f9f9)',
											} }>
												{ item.content }
											</div>

											{ item.hashtags && (
												<div style={ { marginTop: 6, fontSize: 13, color: '#1B5E20' } }>
													{ item.hashtags }
												</div>
											) }
										</div>

										{ ! item.saved && (
											<div style={ { marginLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 } }>
												<Button variant="primary" size="compact" onClick={ () => handleSaveAsDraft( idx ) } disabled={ loading }>
													{ __( 'Save Draft', 'ai-marketing-expert' ) }
												</Button>
											</div>
										) }
									</div>
								</Card>
							);
						} ) }
					</div>
				</div>
			) }

			{ allItems.length === 0 && (
				<Card style={ { marginTop: 20 } }>
					<div style={ { textAlign: 'center', padding: '30px 20px' } }>
						<p style={ { fontSize: 15, color: 'var(--aime-text-muted)' } }>
							{ __( 'No published posts or articles found. Create content first, then come back to repurpose it.', 'ai-marketing-expert' ) }
						</p>
					</div>
				</Card>
			) }
		</div>
	);

	return (
		<ProGate feature="social_repurpose" description={ __( 'Upgrade to Pro to repurpose your blog articles into social media posts powered by AI.', 'ai-marketing-expert' ) }>
			{ repurposeContent }
		</ProGate>
	);
};

export default Repurpose;
