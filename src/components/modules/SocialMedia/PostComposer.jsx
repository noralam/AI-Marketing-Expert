/**
 * PostComposer - create / edit a social media post with AI assistance.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Button, SelectControl, TextControl, TextareaControl, CheckboxControl, Icon, Spinner } from '@aime/wp-components';
import useApi from '../../../hooks/useApi';
import useSlowWarning from '../../../hooks/useSlowWarning';
import Card from '../../common/Card';
import LoadingBtn from '../../common/LoadingBtn';
import AiNotice, { isAiConfigured, aiDisabledTitle } from '../../common/AiNotice';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';
import { ProUpgradeButton } from '../../common/ProLock';
import { toast } from '../../common/Toast';
import { SOCIAL_POST_STATUS, SOCIAL_CHAR_LIMITS, FREE_LIMITS } from '../../../utils/constants';
import { browserToSiteWall, siteToBrowserWall, siteTimezone, tzDiffers } from '../../../utils/wallClock';

const PostComposer = ( { id, onBack, onNavigate } ) => {
	const { get, post, put } = useApi();
	const slowWarning = useSlowWarning();
	const [ accounts, setAccounts ] = useState( [] );
	const [ form, setForm ] = useState( {
		account_id: '',
		content: '',
		hashtags: '',
		media_urls: [],
		scheduled_at: '',
		publish_now: false,
		ai_generated: false,
	} );
	const [ captionLoading, setCaptionLoading ] = useState( false );
	const [ hashtagsLoading, setHashtagsLoading ] = useState( false );
	const [ imageGenerating, setImageGenerating ] = useState( false );
	const [ savingLoading, setSavingLoading ] = useState( false );
	const [ publishingLoading, setPublishingLoading ] = useState( false );
	const [ aiTopic, setAiTopic ] = useState( '' );
	const [ aiTone, setAiTone ] = useState( 'professional' );
	const [ aiLength, setAiLength ] = useState( 'medium' );
	const [ loadingPost, setLoadingPost ] = useState( false );
	const [ socialSettings, setSocialSettings ] = useState( null );
	const [ scheduledCount, setScheduledCount ] = useState( 0 );
	const [ showStockPicker, setShowStockPicker ] = useState( false );
	const [ stockReady, setStockReady ] = useState( null );
	const [ stockProvider, setStockProvider ] = useState( 'pexels' );
	const [ stockQuery, setStockQuery ] = useState( '' );
	const [ stockResults, setStockResults ] = useState( [] );
	const [ stockSearching, setStockSearching ] = useState( false );
	const [ stockSearched, setStockSearched ] = useState( false );
	const [ stockImportingId, setStockImportingId ] = useState( null );
	const isEditing = !! id;
	const hasPro = !! window.aimeData?.hasPro;
	const scheduledLimit = FREE_LIMITS.social_scheduled_posts || 3;

	// Fetch accounts for the dropdown.
	const fetchAccounts = useCallback( async () => {
		try {
			const [ accountRes, settingsRes, scheduledRes, pendingRes, globalSettingsRes ] = await Promise.all( [
				get( '/social/accounts' ),
				get( '/social/settings' ).catch( () => null ),
				get( '/social/posts', { status: 'scheduled', per_page: 1 } ).catch( () => null ),
				get( '/social/posts', { status: 'approval_pending', per_page: 1 } ).catch( () => null ),
				get( '/settings' ).catch( () => null ),
			] );
			setAccounts( accountRes.items || accountRes || [] );
			setSocialSettings( settingsRes );
			setScheduledCount( ( scheduledRes?.total || 0 ) + ( pendingRes?.total || 0 ) );
			const s = globalSettingsRes?.settings || globalSettingsRes || {};
			const hasPexels = !! s.has_pexels_key;
			const hasPixabay = !! s.has_pixabay_key;
			let p = s.stock_provider === 'pixabay' ? 'pixabay' : 'pexels';
			if ( p === 'pixabay' && ! hasPixabay && hasPexels ) {
				p = 'pexels';
			} else if ( p === 'pexels' && ! hasPexels && hasPixabay ) {
				p = 'pixabay';
			}
			setStockProvider( p );
			setStockReady( hasPexels || hasPixabay );
		} catch ( e ) {
			// silent
		}
	}, [ get ] );

	// Load existing post if editing.
	const fetchPost = useCallback( async () => {
		if ( ! id ) return;
		setLoadingPost( true );
		try {
			const res = await get( `/social/posts/${ id }` );
			setForm( {
				account_id: String( res.account_id || '' ),
				content: res.content || '',
				hashtags: res.hashtags || '',
			media_urls: res.media_urls || [],
			// Stored value is site-tz wall time; the input edits browser time.
			scheduled_at: res.scheduled_at ? siteToBrowserWall( res.scheduled_at ).replace( ' ', 'T' ).substring( 0, 16 ) : '',
				publish_now: false,
				ai_generated: !! res.ai_generated,
			} );
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			setLoadingPost( false );
		}
	}, [ get, id ] );

	useEffect( () => {
		fetchAccounts();
		fetchPost();
	}, [ fetchAccounts, fetchPost ] );

	useEffect( () => {
		if ( isEditing || ! socialSettings?.auto_hashtags || ! socialSettings?.default_hashtags ) {
			return;
		}

		setForm( ( prev ) => {
			if ( prev.hashtags.trim() ) {
				return prev;
			}

			return { ...prev, hashtags: socialSettings.default_hashtags };
		} );
	}, [ isEditing, socialSettings ] );

	const selectedAccount = accounts.find( ( a ) => String( a.id ) === String( form.account_id ) );
	const platform = selectedAccount?.platform || '';
	const charLimit = SOCIAL_CHAR_LIMITS[ platform ] || 2200;
	const contentLength = ( form.content + ( form.hashtags ? '\n\n' + form.hashtags : '' ) ).length;
	const isOverLimit = contentLength > charLimit;
	const hasLocalMedia = form.media_urls.some( ( url ) => /https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test( url ) );
	const needsInstagramMedia = platform === 'instagram' && form.media_urls.length === 0;
	const canPublishNow = ! isOverLimit && ! hasLocalMedia && ! needsInstagramMedia;
	const scheduleLimitReached = ! hasPro && scheduledCount >= scheduledLimit && ! form.scheduled_at;
	const platformLabel = selectedAccount?.platform === 'x'
		? __( 'X', 'ai-marketing-expert' )
		: selectedAccount?.platform
			? selectedAccount.platform.charAt( 0 ).toUpperCase() + selectedAccount.platform.slice( 1 )
			: '';
	const aiContentLabel = platform === 'instagram'
		? __( 'Caption', 'ai-marketing-expert' )
		: __( 'Post', 'ai-marketing-expert' );
	const aiGenerateButtonText = selectedAccount
		? sprintf( __( '✨ Generate %s %s', 'ai-marketing-expert' ), platformLabel, aiContentLabel )
		: __( '✨ Generate Content', 'ai-marketing-expert' );
	const aiGeneratingText = selectedAccount
		? sprintf( __( 'Generating %s %s...', 'ai-marketing-expert' ), platformLabel, aiContentLabel.toLowerCase() )
		: __( 'Generating content...', 'ai-marketing-expert' );

	const updateForm = ( key, value ) => {
		setForm( ( prev ) => ( { ...prev, [ key ]: value } ) );
	};

	const handleSave = async ( publishNow = false ) => {
		if ( ! form.account_id ) {
			toast( __( 'Please select an account.', 'ai-marketing-expert' ), 'error' );
			return;
		}
		if ( ! form.content.trim() ) {
			toast( __( 'Post content cannot be empty.', 'ai-marketing-expert' ), 'error' );
			return;
		}
		if ( publishNow && ! canPublishNow ) {
			toast( __( 'Please fix platform requirements before publishing.', 'ai-marketing-expert' ), 'error' );
			return;
		}
		if ( ! publishNow && form.scheduled_at && scheduleLimitReached ) {
			toast( __( 'Free plan allows 3 scheduled posts at a time. Upgrade to Pro for unlimited scheduling.', 'ai-marketing-expert' ), 'error' );
			return;
		}

		if ( publishNow ) {
			setPublishingLoading( true );
		} else {
			setSavingLoading( true );
		}

		try {
			const data = {
				...form,
				// Input is browser wall time; the queue compares site wall time.
				scheduled_at: form.scheduled_at ? browserToSiteWall( form.scheduled_at ) : '',
				publish_now: publishNow,
			};

			if ( isEditing ) {
				await put( `/social/posts/${ id }`, data );
				if ( publishNow ) {
					await post( `/social/posts/${ id }/publish` );
					toast( __( 'Post published!', 'ai-marketing-expert' ) );
				} else {
					toast( __( 'Post updated.', 'ai-marketing-expert' ) );
				}
			} else {
				await post( '/social/posts', data );
				toast( publishNow
					? __( 'Post published!', 'ai-marketing-expert' )
					: ( form.scheduled_at ? __( 'Post scheduled!', 'ai-marketing-expert' ) : __( 'Post saved as draft.', 'ai-marketing-expert' ) )
				);
			}
			onBack();
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			setSavingLoading( false );
			setPublishingLoading( false );
		}
	};

	const handleAiCaption = async () => {
		if ( captionLoading ) return;
		if ( ! form.account_id ) {
			toast( __( 'Please select an account before generating AI content.', 'ai-marketing-expert' ), 'error' );
			return;
		}
		if ( ! aiTopic.trim() ) {
			toast( __( 'Please enter a topic for AI generation.', 'ai-marketing-expert' ), 'error' );
			return;
		}

		setCaptionLoading( true );
		slowWarning.start();
		try {
			const res = await post( '/social/ai/caption', {
				platform,
				topic: aiTopic,
				tone: aiTone,
				length: aiLength,
				context: form.content,
			} );
			if ( res.content ) {
				updateForm( 'content', res.content );
				updateForm( 'ai_generated', true );
				toast( __( 'AI caption generated!', 'ai-marketing-expert' ) );
			} else {
				toast( __( 'AI did not return usable post content. Please try again.', 'ai-marketing-expert' ), 'error' );
			}
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			slowWarning.stop();
			setCaptionLoading( false );
		}
	};

	const handleAiHashtags = async () => {
		if ( hashtagsLoading ) return;
		if ( ! form.account_id ) {
			toast( __( 'Please select an account before generating hashtags.', 'ai-marketing-expert' ), 'error' );
			return;
		}
		if ( ! form.content.trim() ) {
			toast( __( 'Write some content first to generate relevant hashtags.', 'ai-marketing-expert' ), 'error' );
			return;
		}

		setHashtagsLoading( true );
		slowWarning.start();
		try {
			const res = await post( '/social/ai/hashtags', {
				content: form.content,
				platform,
				count: 10,
			} );
			if ( res.hashtags ) {
				updateForm( 'hashtags', res.hashtags );
				toast( __( 'Hashtags generated!', 'ai-marketing-expert' ) );
			} else {
				toast( __( 'AI could not generate hashtags. Try again or write more content.', 'ai-marketing-expert' ), 'error' );
			}
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			slowWarning.stop();
			setHashtagsLoading( false );
		}
	};

	const handleMediaAdd = () => {
		if ( window.wp?.media ) {
			const frame = window.wp.media( {
				title: __( 'Select Media', 'ai-marketing-expert' ),
				multiple: true,
				library: { type: 'image' },
			} );
			frame.on( 'select', () => {
				const selected = frame.state().get( 'selection' ).toJSON();
				const urls = selected.map( ( s ) => s.url );
				updateForm( 'media_urls', [ ...form.media_urls, ...urls ] );
			} );
			frame.open();
		}
	};

	const handleStockSearch = async ( customQuery ) => {
		const q = ( typeof customQuery === 'string' ? customQuery : stockQuery ).trim() || aiTopic.trim();
		if ( ! q ) {
			toast( __( 'Enter a keyword to search free stock photos.', 'ai-marketing-expert' ), 'error' );
			return;
		}
		setStockSearching( true );
		try {
			const res = await get( '/stock-images/search', { query: q, q, per_page: 9 } );
			if ( res?.provider ) {
				setStockProvider( res.provider );
			}
			const images = res?.images || res?.items || [];
			setStockResults( Array.isArray( images ) ? images : [] );
			setStockSearched( true );
			setStockReady( true );
		} catch ( e ) {
			if ( e?.not_configured || e?.data?.not_configured ) {
				setStockReady( false );
			}
			toast( e.message || __( 'Stock photo search failed.', 'ai-marketing-expert' ), 'error' );
		} finally {
			setStockSearching( false );
		}
	};

	const handleStockImport = async ( item ) => {
		if ( ! item?.full || stockImportingId ) return;
		setStockImportingId( item.id );
		try {
			const res = await post( '/stock-images/import', {
				url: item.full,
				alt: item.alt || aiTopic.trim() || __( 'Social media post image', 'ai-marketing-expert' ),
				credit: item.photographer || item.credit || '',
				provider: item.provider || stockProvider,
			} );
			if ( res?.url ) {
				updateForm( 'media_urls', [ ...form.media_urls, res.url ] );
				toast( __( 'Stock photo imported to Media Library and attached!', 'ai-marketing-expert' ) );
			}
		} catch ( e ) {
			toast( e.message || __( 'Could not import stock photo.', 'ai-marketing-expert' ), 'error' );
		} finally {
			setStockImportingId( null );
		}
	};

	const handleAiImageGenerate = async () => {
		if ( imageGenerating ) return;
		if ( ! form.account_id ) {
			toast( __( 'Please select an account before generating an AI image.', 'ai-marketing-expert' ), 'error' );
			return;
		}
		const prompt = form.content.trim() || aiTopic.trim();
		if ( ! prompt ) {
			toast( __( 'Write some content or a topic first so AI knows what image to generate.', 'ai-marketing-expert' ), 'error' );
			return;
		}

		setImageGenerating( true );
		slowWarning.start();
		try {
			const res = await post( '/social/ai/generate-image', {
				content: form.content,
				prompt: aiTopic,
				platform,
			} );
			if ( res.image_url ) {
				updateForm( 'media_urls', [ ...form.media_urls, res.image_url ] );
				toast( __( 'AI image generated and added!', 'ai-marketing-expert' ) );
			}
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			slowWarning.stop();
			setImageGenerating( false );
		}
	};

	const removeMedia = ( index ) => {
		updateForm( 'media_urls', form.media_urls.filter( ( _, i ) => i !== index ) );
	};

	if ( loadingPost ) {
		return <Loader variant="form" text={ __( 'Loading post...', 'ai-marketing-expert' ) } />;
	}

	return (
		<div className="aime-post-composer">
			{ /* Inject spinner keyframes - guaranteed available even if global.scss fails */ }
			<style>{ '@keyframes aime-spin { to { transform: rotate(360deg); } }' }</style>
			<div className="aime-section-header" style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 } }>
				<div style={ { display: 'flex', alignItems: 'center', gap: 12 } }>
					<Button variant="tertiary" onClick={ onBack }>&larr; { __( 'Back', 'ai-marketing-expert' ) }</Button>
					<h2 style={ { margin: 0 } }>{ isEditing ? __( 'Edit Post', 'ai-marketing-expert' ) : __( 'Create Post', 'ai-marketing-expert' ) }</h2>
				</div>
			</div>

			{ ! hasPro && (
				<Notice type="info" message={ sprintf( __( 'Free plan includes %1$d scheduled posts at a time. You currently have %2$d scheduled.', 'ai-marketing-expert' ), scheduledLimit, scheduledCount ) } />
			) }

			<div style={ { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 } }>
				{ /* Main Editor */ }
				<div>
					<Card title={ __( 'Post Content', 'ai-marketing-expert' ) }>
						<div style={ { marginBottom: 16 } }>
							<SelectControl
								label={ __( 'Account', 'ai-marketing-expert' ) }
								value={ form.account_id }
								options={ [
									{ label: __( '— Select Account —', 'ai-marketing-expert' ), value: '' },
									...accounts.map( ( a ) => ( {
										label: `${ a.name } (${ a.platform })`,
										value: String( a.id ),
									} ) ),
								] }
								onChange={ ( v ) => updateForm( 'account_id', v ) }
								__nextHasNoMarginBottom
							/>
						</div>

						<TextareaControl
							label={ __( 'Content', 'ai-marketing-expert' ) }
							value={ form.content }
							onChange={ ( v ) => updateForm( 'content', v ) }
							rows={ 7 }
							help={ `${ contentLength }/${ charLimit } ${ __( 'characters', 'ai-marketing-expert' ) }` }
							__nextHasNoMarginBottom
						/>
						{ isOverLimit && (
							<p style={ { color: '#f44336', fontSize: 12, margin: '4px 0 0' } }>
								{ __( 'Content exceeds the character limit for this platform.', 'ai-marketing-expert' ) }
							</p>
						) }
						{ selectedAccount && (
							<p style={ { color: 'var(--aime-text-muted)', fontSize: 12, margin: '6px 0 0' } }>
								{ platform === 'x'
									? __( 'X supports text posts up to 280 characters. Hashtags count toward this limit.', 'ai-marketing-expert' )
									: platform === 'instagram'
										? __( 'Instagram publishing requires at least one publicly accessible image.', 'ai-marketing-expert' )
										: __( 'Facebook supports text, links, and image posts.', 'ai-marketing-expert' ) }
							</p>
						) }

						<div style={ { marginTop: 16 } }>
							<TextareaControl
								label={ __( 'Hashtags', 'ai-marketing-expert' ) }
								value={ form.hashtags }
								onChange={ ( v ) => updateForm( 'hashtags', v ) }
								rows={ 2 }
								placeholder="#marketing #social #ai"
								__nextHasNoMarginBottom
							/>
							{ hashtagsLoading ? (
								<LoadingBtn style={ { marginTop: 4 } }>
									{ __( 'Generating Hashtags...', 'ai-marketing-expert' ) }
								</LoadingBtn>
							) : (
								<Button variant="tertiary" size="compact" onClick={ handleAiHashtags } disabled={ ! isAiConfigured() } title={ ! isAiConfigured() ? aiDisabledTitle() : undefined } style={ { marginTop: 4 } }>
									{ __( '✨ AI Generate Hashtags', 'ai-marketing-expert' ) }
								</Button>
							) }
						</div>

						{ /* Media */ }
						<div style={ { marginTop: 16 } }>
							<label style={ { display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 8 } }>
								{ __( 'Media', 'ai-marketing-expert' ) }
							</label>
							<div style={ { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 } }>
								{ form.media_urls.map( ( url, i ) => (
									<div key={ i } style={ { position: 'relative', width: 80, height: 80 } }>
										<img src={ url } alt="" style={ { width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--aime-border, #e2e8f0)' } } />
										<button
											onClick={ () => removeMedia( i ) }
											style={ {
												position: 'absolute', top: -6, right: -6,
												width: 20, height: 20, borderRadius: '50%',
												background: '#f44336', color: '#fff', border: 'none',
												cursor: 'pointer', fontSize: 12, lineHeight: '20px',
											} }
										>
											&times;
										</button>
									</div>
								) ) }
							</div>
							<div style={ { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } }>
								<Button variant="secondary" size="compact" onClick={ handleMediaAdd }>
									{ __( '+ Upload / Media Library', 'ai-marketing-expert' ) }
								</Button>
								<Button
									variant={ showStockPicker ? 'primary' : 'secondary' }
									size="compact"
									onClick={ () => {
										const next = ! showStockPicker;
										setShowStockPicker( next );
										if ( next && ! stockQuery.trim() && aiTopic.trim() ) {
											setStockQuery( aiTopic.trim() );
										}
									} }
								>
									{ __( '📷 Free Stock Photos', 'ai-marketing-expert' ) }
								</Button>
								{ imageGenerating ? (
									<LoadingBtn>
										{ __( 'Generating Image...', 'ai-marketing-expert' ) }
									</LoadingBtn>
								) : (
									<Button variant="tertiary" size="compact" onClick={ handleAiImageGenerate } disabled={ ! isAiConfigured() } title={ ! isAiConfigured() ? aiDisabledTitle() : undefined }>
										{ __( '✨ AI Generate Image', 'ai-marketing-expert' ) }
									</Button>
								) }
							</div>

							{ showStockPicker && (
								<div style={ {
									marginTop: 12,
									padding: 16,
									borderRadius: 10,
									background: 'var(--aime-bg-alt, #f8fafc)',
									border: '1px solid var(--aime-border, #e2e8f0)',
								} }>
									<div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 } }>
										<div style={ { display: 'flex', alignItems: 'center', gap: 8 } }>
											<span style={ { fontWeight: 600, fontSize: 13 } }>
												{ __( 'Search Free Stock Photos', 'ai-marketing-expert' ) }
											</span>
											<span style={ {
												display: 'inline-block',
												padding: '2px 8px',
												borderRadius: 999,
												fontSize: 11,
												fontWeight: 600,
												background: '#e0f2fe',
												color: '#0369a1',
												textTransform: 'capitalize',
											} }>
												{ stockProvider === 'pixabay' ? 'Pixabay' : 'Pexels' }
											</span>
										</div>
										<div style={ { display: 'flex', alignItems: 'center', gap: 10 } }>
											<a
												href={ `${ window.aimeData?.adminUrl || '/wp-admin/' }admin.php?page=ai-marketing-expert-settings&tab=stock_photos` }
												style={ { fontSize: 12, color: 'var(--aime-primary, #2563eb)', textDecoration: 'none', fontWeight: 500 } }
											>
												{ __( '⚙ Stock API Settings', 'ai-marketing-expert' ) }
											</a>
											<button
												type="button"
												onClick={ () => setShowStockPicker( false ) }
												style={ { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--aime-text-muted)', lineHeight: 1 } }
												aria-label={ __( 'Close stock photo picker', 'ai-marketing-expert' ) }
											>
												&times;
											</button>
										</div>
									</div>

									{ stockReady === false ? (
										<div style={ { padding: '8px 0 4px' } }>
											<p style={ { fontSize: 13, color: 'var(--aime-text-secondary, #475569)', margin: '0 0 10px' } }>
												{ __( 'Free stock photo search requires a Pexels or Pixabay API key. Both are 100% free and take less than a minute to set up in Global Settings.', 'ai-marketing-expert' ) }
											</p>
											<Button
												variant="primary"
												size="compact"
												onClick={ () => {
													window.location.href = `${ window.aimeData?.adminUrl || '/wp-admin/' }admin.php?page=ai-marketing-expert-settings&tab=stock_photos`;
												} }
											>
												{ __( 'Configure Free Stock Photo API →', 'ai-marketing-expert' ) }
											</Button>
										</div>
									) : (
										<>
											<div style={ { display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 10 } }>
												<div style={ { flex: 1 } }>
													<TextControl
														value={ stockQuery }
														placeholder={ aiTopic.trim() || __( 'e.g. modern office, coffee laptop, fitness...', 'ai-marketing-expert' ) }
														onChange={ setStockQuery }
														onKeyDown={ ( e ) => {
															if ( e.key === 'Enter' ) {
																e.preventDefault();
																handleStockSearch();
															}
														} }
														__nextHasNoMarginBottom
													/>
												</div>
												<Button
													variant="primary"
													onClick={ () => handleStockSearch() }
													disabled={ stockSearching }
												>
													{ stockSearching ? <Spinner style={ { margin: 0 } } /> : __( 'Search', 'ai-marketing-expert' ) }
												</Button>
											</div>

											{ stockSearched && stockResults.length === 0 && ! stockSearching && (
												<p style={ { fontSize: 12, color: 'var(--aime-text-muted)', margin: '8px 0 0' } }>
													{ __( 'No photos matched that search. Try simpler or broader keywords.', 'ai-marketing-expert' ) }
												</p>
											) }

											{ stockResults.length > 0 && (
												<>
													<div style={ {
														display: 'grid',
														gridTemplateColumns: 'repeat(auto-fill, minmax(125px, 1fr))',
														gap: 10,
														marginTop: 8,
													} }>
														{ stockResults.map( ( item ) => {
															const isImporting = stockImportingId === item.id;
															return (
																<button
																	key={ `${ item.provider || stockProvider }-${ item.id }` }
																	type="button"
																	onClick={ () => handleStockImport( item ) }
																	disabled={ !! stockImportingId }
																	title={ item.credit || item.photographer ? sprintf( __( 'Click to import — %s', 'ai-marketing-expert' ), item.photographer || item.credit ) : __( 'Click to import to Media Library', 'ai-marketing-expert' ) }
																	style={ {
																		position: 'relative',
																		padding: 0,
																		border: '1px solid var(--aime-border, #cbd5e1)',
																		borderRadius: 8,
																		overflow: 'hidden',
																		cursor: stockImportingId ? 'wait' : 'pointer',
																		background: '#0f172a',
																		height: 92,
																		display: 'block',
																		width: '100%',
																	} }
																>
																	<img
																		src={ item.thumb || item.preview || item.full }
																		alt={ item.alt || '' }
																		loading="lazy"
																		style={ { width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: isImporting ? 0.45 : 0.95 } }
																	/>
																	<span style={ {
																		position: 'absolute',
																		left: 0,
																		right: 0,
																		bottom: 0,
																		padding: '3px 6px',
																		fontSize: 10,
																		color: '#fff',
																		background: 'linear-gradient(transparent, rgba(0,0,0,0.78))',
																		textAlign: 'left',
																		whiteSpace: 'nowrap',
																		overflow: 'hidden',
																		textOverflow: 'ellipsis',
																	} }>
																		{ isImporting ? __( 'Importing…', 'ai-marketing-expert' ) : ( item.photographer || __( '+ Add to Post', 'ai-marketing-expert' ) ) }
																	</span>
																</button>
															);
														} ) }
													</div>
													<p style={ { fontSize: 11, color: 'var(--aime-text-muted)', margin: '8px 0 0' } }>
														{ __( 'Click any photo to download it into your WordPress Media Library and attach it to this post.', 'ai-marketing-expert' ) }
													</p>
												</>
											) }
										</>
									) }
								</div>
							) }
						</div>

						{ /* Schedule */ }
						<div style={ { marginTop: 16 } }>
							<label style={ { display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 8 } }>
								{ __( 'Schedule', 'ai-marketing-expert' ) }
							</label>
							<input
								type="datetime-local"
								value={ form.scheduled_at ? form.scheduled_at.replace( ' ', 'T' ).substring( 0, 16 ) : '' }
								onChange={ ( e ) => {
									if ( scheduleLimitReached && e.target.value ) {
										toast( __( 'Free plan allows 3 scheduled posts at a time. Upgrade to Pro for unlimited scheduling.', 'ai-marketing-expert' ), 'error' );
										return;
									}
									updateForm( 'scheduled_at', e.target.value || '' );
								} }
								disabled={ scheduleLimitReached }
								style={ { padding: '8px 12px', border: '1px solid var(--aime-border)', borderRadius: 6, fontSize: 14 } }
							/>
							{ tzDiffers() && (
								<p style={ { color: 'var(--aime-text-muted)', fontSize: 12, margin: '6px 0 0' } }>
									{ sprintf(
										/* translators: %s: site timezone name. */
										__( 'Your entry is converted to the site timezone (%s) when saved.', 'ai-marketing-expert' ),
										siteTimezone()
									) }
								</p>
							) }
							{ scheduleLimitReached && <ProUpgradeButton /> }
							{ form.scheduled_at && (
								<Button variant="link" size="compact" onClick={ () => updateForm( 'scheduled_at', '' ) } style={ { marginLeft: 8 } }>
									{ __( 'Clear', 'ai-marketing-expert' ) }
								</Button>
							) }
							{ needsInstagramMedia && (
								<p style={ { color: '#C62828', fontSize: 12, margin: '8px 0 0' } }>
									{ __( 'Instagram needs at least one image before publishing.', 'ai-marketing-expert' ) }
								</p>
							) }
							{ hasLocalMedia && (
								<p style={ { color: '#C62828', fontSize: 12, margin: '8px 0 0' } }>
									{ __( 'Localhost media cannot be fetched by social platforms. Use a public media URL before publishing.', 'ai-marketing-expert' ) }
								</p>
							) }
							{ scheduleLimitReached && (
								<p style={ { color: '#C62828', fontSize: 12, margin: '8px 0 0' } }>
									{ __( 'Schedule limit reached. Publish or clear an existing scheduled post, or upgrade to Pro.', 'ai-marketing-expert' ) }
								</p>
							) }
						</div>
					</Card>

					{ /* Action Buttons */ }
					<div style={ { display: 'flex', gap: 12, marginTop: 16 } }>
					<Button variant="primary" onClick={ () => handleSave( false ) } disabled={ savingLoading || publishingLoading }>
						{ savingLoading
							? <><Spinner style={ { marginRight: 4 } } />{ __( 'Saving…', 'ai-marketing-expert' ) }</>
							: form.scheduled_at ? __( 'Schedule Post', 'ai-marketing-expert' ) : __( 'Save Draft', 'ai-marketing-expert' )
						}
					</Button>
					<Button variant="secondary" onClick={ () => handleSave( true ) } disabled={ savingLoading || publishingLoading || ! canPublishNow }>
						{ publishingLoading
								? <><Spinner style={ { marginRight: 4 } } />{ __( 'Publishing…', 'ai-marketing-expert' ) }</>
								: __( 'Publish Now', 'ai-marketing-expert' )
							}
						</Button>
						<Button variant="tertiary" onClick={ onBack }>
							{ __( 'Cancel', 'ai-marketing-expert' ) }
						</Button>
					</div>
				</div>

				{ /* AI Sidebar */ }
				<div>
					<Card title={ __( '✨ AI Assistant', 'ai-marketing-expert' ) } className="aime-ai-sidebar">
						<p style={ { fontSize: 13, color: 'var(--aime-text-muted)', marginBottom: 16 } }>
							{ selectedAccount
								? sprintf( __( 'Generate a %s-ready post using AI. Enter a topic, tone, and length.', 'ai-marketing-expert' ), platformLabel )
								: __( 'Select an account first so AI can generate content for the correct platform.', 'ai-marketing-expert' ) }
						</p>

						<TextareaControl
							label={ __( 'Topic / Brief', 'ai-marketing-expert' ) }
							value={ aiTopic }
							onChange={ setAiTopic }
							rows={ 3 }
							placeholder={ __( 'New product launch, summer sale, tips for...', 'ai-marketing-expert' ) }
							__nextHasNoMarginBottom
						/>
						{ selectedAccount && platform === 'x' && (
							<p style={ { fontSize: 12, color: 'var(--aime-text-muted)', margin: '8px 0 0' } }>
								{ __( 'X posts are generated to fit within 280 characters. Hashtags stay separate.', 'ai-marketing-expert' ) }
							</p>
						) }

						<div style={ { marginTop: 12 } }>
							<SelectControl
								label={ __( 'Tone', 'ai-marketing-expert' ) }
								value={ aiTone }
								options={ [
									{ label: __( 'Professional', 'ai-marketing-expert' ), value: 'professional' },
									{ label: __( 'Casual', 'ai-marketing-expert' ), value: 'casual' },
									{ label: __( 'Humorous', 'ai-marketing-expert' ), value: 'humorous' },
									{ label: __( 'Inspirational', 'ai-marketing-expert' ), value: 'inspirational' },
									{ label: __( 'Urgent', 'ai-marketing-expert' ), value: 'urgent' },
									{ label: __( 'Educational', 'ai-marketing-expert' ), value: 'educational' },
								] }
								onChange={ setAiTone }
								__nextHasNoMarginBottom
							/>
						</div>

						{ platform !== 'x' && (
							<div style={ { marginTop: 12 } }>
								<SelectControl
									label={ __( 'Caption Length', 'ai-marketing-expert' ) }
									value={ aiLength }
									options={ [
										{ label: __( 'Short & Punchy (45–80 words)', 'ai-marketing-expert' ), value: 'short' },
										{ label: __( 'Standard / Engaging (110–190 words)', 'ai-marketing-expert' ), value: 'medium' },
										{ label: __( 'Detailed / Storytelling (200–350 words)', 'ai-marketing-expert' ), value: 'long' },
									] }
									onChange={ setAiLength }
									help={ platform === 'instagram' ? __( 'Creates scroll-stopping hooks, structured paragraphs/bullets, and a strong call-to-action.', 'ai-marketing-expert' ) : undefined }
									__nextHasNoMarginBottom
								/>
							</div>
						) }

						{ captionLoading ? (
							<LoadingBtn light style={ { marginTop: 16, width: '100%' } }>
								{ aiGeneratingText }
							</LoadingBtn>
						) : (
							<Button variant="primary" onClick={ handleAiCaption } disabled={ ! isAiConfigured() || ! selectedAccount } title={ ! isAiConfigured() ? aiDisabledTitle() : undefined } style={ { marginTop: 16, width: '100%' } }>
								{ aiGenerateButtonText }
							</Button>
						) }
						<AiNotice />
					</Card>

					{ /* Preview Card */ }
					{ form.content && (
						<Card title={ __( 'Preview', 'ai-marketing-expert' ) } className="aime-preview-card" style={ { marginTop: 16 } }>
							<div style={ {
								padding: 16, borderRadius: 8,
								background: 'var(--aime-bg-alt, #f9f9f9)',
								fontSize: 14, lineHeight: 1.6,
								wordBreak: 'break-word',
							} }>
								{ selectedAccount && (
									<div style={ { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 } }>
										{ selectedAccount.avatar_url ? (
											<img src={ selectedAccount.avatar_url } alt="" style={ { width: 32, height: 32, borderRadius: '50%' } } />
										) : (
											<div style={ { width: 32, height: 32, borderRadius: '50%', background: '#1B5E20', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 } }>
												{ ( selectedAccount.name || '?' ).charAt( 0 ) }
											</div>
										) }
										<div>
											<div style={ { fontWeight: 600, fontSize: 13 } }>{ selectedAccount.name }</div>
											<div style={ { fontSize: 11, color: 'var(--aime-text-muted)' } }>{ platform }</div>
										</div>
									</div>
								) }
								<div>{ form.content }</div>
								{ form.hashtags && (
									<div style={ { marginTop: 10, color: '#1B5E20', fontSize: 13 } }>
										{ form.hashtags }
									</div>
								) }
								{ form.media_urls.length > 0 && (
									<div style={ { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' } }>
										{ form.media_urls.map( ( url, i ) => (
											<img key={ i } src={ url } alt="" style={ { width: 60, height: 60, objectFit: 'cover', borderRadius: 6 } } />
										) ) }
									</div>
								) }
							</div>
						</Card>
					) }
				</div>
			</div>
		</div>
	);
};

export default PostComposer;
