/**
 * Article Editor - core UX for AI-powered article generation and editing.
 */

import { useState, useEffect, useCallback, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	Button,
	TextControl,
	TextareaControl,
	SelectControl,
	TabPanel,
	Spinner,
	RangeControl,
	FormTokenField,
	CheckboxControl,
	ToggleControl,
	Panel,
	PanelBody,
} from '@aime/wp-components';
import { Icon, chevronLeft } from '@wordpress/icons';
import useApi from '../../../hooks/useApi';
import usePro from '../../../hooks/usePro';
import useSlowWarning from '../../../hooks/useSlowWarning';
import Card from '../../common/Card';
import LoadingBtn from '../../common/LoadingBtn';
import Loader from '../../common/Loader';
// import ProGate from '../../common/ProGate';
import { toast } from '../../common/Toast';
import { ARTICLE_STATUS_LABELS } from '../../../utils/constants';
import { consumePrefillData } from '../../../utils/seoContentBridge';
import { ProLabel, ProUpgradeButton } from '../../common/ProLock';

const TONES = [
	{ label: 'Professional', value: 'professional' },
	{ label: 'Casual', value: 'casual' },
	{ label: 'Friendly', value: 'friendly' },
	{ label: 'Authoritative', value: 'authoritative' },
	{ label: 'Humorous', value: 'humorous' },
	{ label: 'Formal', value: 'formal' },
	{ label: 'Conversational', value: 'conversational' },
];

const PRO_TONES = [ 'humorous', 'formal', 'conversational' ];

const LANGUAGES = [
	{ label: 'English', value: 'en' },
	{ label: 'Bengali', value: 'bn' },
	{ label: 'Spanish', value: 'es' },
	{ label: 'French', value: 'fr' },
	{ label: 'German', value: 'de' },
	{ label: 'Hindi', value: 'hi' },
	{ label: 'Arabic', value: 'ar' },
	{ label: 'Portuguese', value: 'pt' },
	{ label: 'Chinese', value: 'zh' },
	{ label: 'Japanese', value: 'ja' },
	{ label: 'Korean', value: 'ko' },
	{ label: 'Russian', value: 'ru' },
	{ label: 'Italian', value: 'it' },
	{ label: 'Dutch', value: 'nl' },
	{ label: 'Turkish', value: 'tr' },
	{ label: 'Indonesian', value: 'id' },
	{ label: 'Vietnamese', value: 'vi' },
	{ label: 'Thai', value: 'th' },
	{ label: 'Polish', value: 'pl' },
	{ label: 'Swedish', value: 'sv' },
	{ label: 'Urdu', value: 'ur' },
	{ label: 'Malay', value: 'ms' },
];

const defaultArticle = {
	title: '',
	topic: '',
	keywords: [],
	tone: 'professional',
	language: 'en',
	word_count_target: 1000,
	content: '',
	excerpt: '',
	outline: '',
	meta_title: '',
	meta_description: '',
	categories: [],
	tags: [],
	featured_image_url: '',
	featured_image_id: 0,
	post_type: 'post',
	default_post_status: 'draft',
	brand_voice_id: '',
	serp_outline_context: '',
	include_table_of_contents: false,
	scheduled_publish_at: '',
	preset_id: '',
	status: 'draft',
};

const toDateTimeLocalValue = ( value ) => ( value ? value.replace( ' ', 'T' ).slice( 0, 16 ) : '' );

const ArticleEditor = ( { id, onBack, onNavigate } ) => {
	const { get, post, put, del, loading } = useApi();
	const { hasPro, freeLimits } = usePro();
	const slowWarning = useSlowWarning();
	const freeMaxWords = Number( freeLimits?.content_max_words || 2000 );
	const toneOptions = TONES.map( ( tone ) => ( {
		...tone,
		label: ! hasPro && PRO_TONES.includes( tone.value ) ? `${ tone.label } (PRO)` : tone.label,
	} ) );

	const aiConfigured = window.aimeData?.aiConfigured ?? false;
	const aiDisabledTitle = __( 'Please set up an AI provider API key in Settings first.', 'ai-marketing-expert' );

	// Validate required fields before saving.
	const validateSaveFields = () => {
		const e = {};
		if ( ! article.topic.trim() ) {
			e.topic = __( 'Topic / Subject is required.', 'ai-marketing-expert' );
		}
		setErrors( e );
		return Object.keys( e ).length === 0;
	};

	const [ article, setArticle ] = useState( { ...defaultArticle } );
	const [ presets, setPresets ] = useState( [] );
	const [ brandVoices, setBrandVoices ] = useState( [] );
	const [ versions, setVersions ] = useState( [] );
	const [ taxonomies, setTaxonomies ] = useState( { categories: [], tags: [], post_types: [] } );
	const [ vaultKeywords, setVaultKeywords ] = useState( [] );
	const [ generating, setGenerating ] = useState( false );
	const [ generatingOutline, setGeneratingOutline ] = useState( false );
	const [ generatingMeta, setGeneratingMeta ] = useState( false );
	const [ humanizing, setHumanizing ] = useState( false );
	const [ saving, setSaving ] = useState( false );
	const [ publishing, setPublishing ] = useState( false );
	const [ scheduling, setScheduling ] = useState( false );
	const [ showSchedule, setShowSchedule ] = useState( false );
	const [ scheduleValue, setScheduleValue ] = useState( '' );
	const [ loaded, setLoaded ] = useState( false );
	const [ seoResult, setSeoResult ] = useState( null );
	const [ activeTab, setActiveTab ] = useState( 'compose' );
	const [ generatingImage, setGeneratingImage ] = useState( false );
	const [ imageTab, setImageTab ] = useState( 'ai' );
	const [ imageProgress, setImageProgress ] = useState( '' );
	const [ imageError, setImageError ] = useState( '' );
	const [ generateError, setGenerateError ] = useState( '' );
	const [ errors, setErrors ] = useState( {} );
	const [ showThinkingHint, setShowThinkingHint ] = useState( true );
	const editorId = 'aime-tinymce-editor';
	const editorReady = useRef( false );
	const editorWrapRef = useRef( null );
	const contentRef = useRef( '' ); // tracks article.content for imperative syncing

	// Validate required fields before AI generation.
	const validateGenFields = () => {
		const e = {};
		if ( ! article.topic.trim() ) {
			e.topic = __( 'Topic / Subject is required.', 'ai-marketing-expert' );
		}
		if ( ! article.keywords || article.keywords.length === 0 ) {
			e.keywords = __( 'Add at least one keyword.', 'ai-marketing-expert' );
		}
		setErrors( e );
		return Object.keys( e ).length === 0;
	};

	// Load existing article, presets, taxonomies.
	useEffect( () => {
		const init = async () => {
			try {
				const [ presetsRes, taxRes, voiceRes ] = await Promise.all( [
					get( '/content/presets' ),
					get( '/content/wp-taxonomies' ),
					get( '/content/brand-voices' ),
				] );
				setPresets( presetsRes || [] );
				setTaxonomies( taxRes || { categories: [], tags: [], post_types: [] } );
				setBrandVoices( voiceRes.items || [] );

				// Fetch keyword vault items for suggestions dropdown.
				try {
					const kwRes = await get( '/seo/keywords', { per_page: 200 } );
					const kwItems = ( kwRes.items || kwRes.data || [] ).map( ( kw ) => kw.keyword ).filter( Boolean );
					setVaultKeywords( kwItems );
				} catch ( e ) {
					// SEO module may not be active - silent.
				}

				if ( id ) {
					const res = await get( `/content/articles/${ id }` );
					try {
						const versionRes = await get( `/content/articles/${ id }/versions` );
						setVersions( versionRes.items || [] );
					} catch ( e ) {}
					setArticle( {
						...defaultArticle,
						...res,
						word_count_target: parseInt( res.word_count_target ) || defaultArticle.word_count_target,
						keywords: ( Array.isArray( res.keywords ) ? res.keywords : [] ).filter( ( k ) => typeof k === 'string' && k !== '' ),
						categories: ( Array.isArray( res.category_ids ) ? res.category_ids : [] ).map( Number ).filter( Boolean ),
						tags: ( Array.isArray( res.tag_ids ) ? res.tag_ids : [] ).filter( ( t ) => typeof t === 'string' && t !== '' ),
						featured_image_url: res.featured_image_url || '',
						featured_image_id: res.featured_image_id || 0,
						brand_voice_id: res.brand_voice_id || '',
						outline: typeof res.outline === 'object' ? JSON.stringify( res.outline, null, 2 ) : ( res.outline || '' ),
					} );
				} else {
					// Apply saved settings defaults for new articles.
					try {
						const settings = await get( '/content/settings' );
						if ( settings ) {
							setArticle( ( prev ) => ( {
								...prev,
								tone: settings.default_tone || prev.tone,
								language: settings.default_language || prev.language,
								word_count_target: parseInt( settings.default_word_count ) || prev.word_count_target,
								post_type: settings.default_post_type || prev.post_type,
								default_post_status: settings.default_post_status || prev.default_post_status,
								categories: settings.default_category_id ? [ Number( settings.default_category_id ) ] : prev.categories,
								brand_voice_id: ( voiceRes.items || [] ).find( ( voice ) => Number( voice.is_default ) === 1 )?.id || prev.brand_voice_id,
							} ) );
						}
					} catch ( e ) {
						// Use hardcoded defaults on failure.
					}

					// Apply SEO module prefill data (keyword vault, content calendar, topic map).
					const prefill = consumePrefillData();
					if ( prefill ) {
						setArticle( ( prev ) => ( {
							...prev,
							...( prefill.topic && { topic: prefill.topic } ),
							...( prefill.title && { title: prefill.title } ),
							...( prefill.keywords?.length && { keywords: prefill.keywords } ),
							...( prefill.outline && { outline: prefill.outline } ),
							...( prefill.word_count_target && { word_count_target: parseInt( prefill.word_count_target, 10 ) || prev.word_count_target } ),
							...( prefill.meta_title && { meta_title: prefill.meta_title } ),
							...( prefill.meta_description && { meta_description: prefill.meta_description } ),
							...( prefill.excerpt && { excerpt: prefill.excerpt } ),
						} ) );
					}
				}
			} catch ( e ) {
				// silent
			} finally {
				setLoaded( true );
			}
		};
		init();
	}, [ get, id ] );

	// TinyMCE lifecycle (init + cleanup in one effect)
	useEffect( () => {
		const wrap = editorWrapRef.current;
		if ( ! wrap || editorReady.current ) return;

		// Safety: remove any stale TinyMCE instance with the same ID.
		try {
			const api = window.wp?.oldEditor || window.wp?.editor;
			if ( api && window.tinymce?.get( editorId ) ) {
				api.remove( editorId );
			}
		} catch ( e ) { /* */ }
		wrap.innerHTML = '';

		// Create textarea imperatively so React doesn't track it.
		const ta = document.createElement( 'textarea' );
		ta.id = editorId;
		ta.className = 'wp-editor-area';
		ta.rows = 20;
		ta.value = contentRef.current || '';
		wrap.appendChild( ta );

		const api = window.wp?.oldEditor || window.wp?.editor;
		if ( api ) {
			api.initialize( editorId, {
				tinymce: {
					wpautop: true,
					plugins: 'charmap colorpicker hr lists media paste tabfocus textcolor wordpress wpautoresize wpeditimage wpemoji wpgallery wplink wptextpattern',
					toolbar1: 'formatselect | bold italic underline strikethrough | bullist numlist | blockquote hr | alignleft aligncenter alignright | link unlink | wp_adv',
					toolbar2: 'strikethrough hr forecolor pastetext removeformat charmap outdent indent undo redo wp_help',
					height: 400,
					statusbar: false,
					setup( editor ) {
						editor.on( 'change keyup', () => {
							const content = editor.getContent();
							contentRef.current = content;
							setField( 'content', content );
						} );
					},
				},
				quicktags: true,
				mediaButtons: true,
			} );
			editorReady.current = true;
		}

		return () => {
			const cleanApi = window.wp?.oldEditor || window.wp?.editor;
			if ( cleanApi && editorReady.current ) {
				try { cleanApi.remove( editorId ); } catch ( e ) { /* */ }
			}
			try {
				const inst = window.tinymce?.get( editorId );
				if ( inst ) inst.remove();
			} catch ( e ) { /* */ }
			editorReady.current = false;
			if ( wrap ) wrap.innerHTML = '';
		};
	}, [ loaded ] );

	// Keep contentRef in sync so the imperative textarea gets the right initial value.
	useEffect( () => {
		contentRef.current = article.content || '';
	}, [ article.content ] );

	useEffect( () => {
		setScheduleValue( toDateTimeLocalValue( article.scheduled_publish_at ) );
	}, [ article.scheduled_publish_at ] );

	// Sync React state -> TinyMCE when content changes externally (e.g. AI generation).
	useEffect( () => {
		if ( ! editorReady.current ) return;
		const tinymceInst = window.tinymce?.get( editorId );
		if ( tinymceInst && tinymceInst.getContent() !== article.content ) {
			tinymceInst.setContent( article.content || '' );
		}
	}, [ article.content ] );

	const setField = ( key, value ) => {
		if ( key === 'tone' && ! hasPro && PRO_TONES.includes( value ) ) {
			toast( __( 'This tone is available in Pro.', 'ai-marketing-expert' ), 'warning' );
			return;
		}
		if ( key === 'word_count_target' && ! hasPro ) {
			value = Math.min( Number( value ) || defaultArticle.word_count_target, freeMaxWords );
		}
		if ( key === 'brand_voice_id' && ! hasPro && value ) {
			toast( __( 'Brand Voice is available in Pro.', 'ai-marketing-expert' ), 'warning' );
			return;
		}
		setArticle( ( prev ) => ( { ...prev, [ key ]: value } ) );
	};

	// Save article
	const handleSave = async () => {
		if ( ! validateSaveFields() ) {
			toast( __( 'Please fill in all required fields before saving.', 'ai-marketing-expert' ), 'error' );
			return;
		}
		setSaving( true );
		try {
			// Parse outline back to object to prevent double-encoding on the server.
			let outlineParsed = article.outline || [];
			if ( typeof outlineParsed === 'string' ) {
				try { outlineParsed = JSON.parse( outlineParsed ); } catch ( e ) { outlineParsed = []; }
			}

			const payload = {
				...article,
				word_count_target: article.word_count_target,
				keywords: article.keywords,
				category_ids: ( article.categories || [] ).map( Number ),
				tag_ids: article.tags,
				outline: outlineParsed,
				featured_image_url: article.featured_image_url || '',
				featured_image_id: article.featured_image_id || 0,
			};
			delete payload.categories;
			delete payload.tags;
			delete payload.category_ids_raw;
			delete payload.tag_ids_raw;

			if ( id ) {
				await put( `/content/articles/${ id }`, payload );
				toast( __( 'Article saved.', 'ai-marketing-expert' ) );
				const versionRes = await get( `/content/articles/${ id }/versions` );
				setVersions( versionRes.items || [] );
			} else {
				const res = await post( '/content/articles', payload );
				toast( __( 'Article created.', 'ai-marketing-expert' ) );
				if ( res?.id ) {
					onNavigate( 'edit-article', { id: res.id } );
				}
			}
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			setSaving( false );
		}
	};

	// Generate full article with AI
	const handleGenerate = async () => {
		if ( ! validateGenFields() ) {
			toast( __( 'Please fill in all required fields.', 'ai-marketing-expert' ), 'error' );
			return;
		}
		setGenerating( true );
		setGenerateError( '' );
		// Warn immediately — article generation can take up to 5 minutes.
		// The toast auto-hides after 10s (user can dismiss earlier with ×),
		// and slowWarning.start() below fires another reminder after 15s.
		toast(
			__( 'Article generation started. This may take up to 5 minutes depending on your AI model and word count. Please keep this page open.', 'ai-marketing-expert' ),
			'warning',
			10000
		);
		slowWarning.start();
		try {
			const payload = {
				topic: article.topic,
				keywords: article.keywords,
				tone: ! hasPro && PRO_TONES.includes( article.tone ) ? 'professional' : article.tone,
				word_count: ! hasPro ? Math.min( Number( article.word_count_target ) || defaultArticle.word_count_target, freeMaxWords ) : article.word_count_target,
				language: article.language,
				outline: article.outline,
				serp_context: article.serp_outline_context,
				include_table_of_contents: hasPro && !! article.include_table_of_contents,
				post_type: article.post_type || 'post',
				category_ids: ( article.categories || [] ).map( Number ),
				tag_ids: article.tags || [],
				brand_voice_id: hasPro ? ( article.brand_voice_id || 0 ) : 0,
				preset_id: article.preset_id || undefined,
			};
			const res = await post( '/content/generate', payload );
			if ( res?.id ) {
				// Article is auto-saved by the API. Navigate to edit it.
				toast( __( 'Article generated successfully! Redirecting...', 'ai-marketing-expert' ) );
				onNavigate( 'edit-article', { id: res.id } );
				return;
			}
			// Fallback: populate inline if no id returned.
			if ( res?.parsed ) {
				setField( 'title', res.parsed.title || article.title );
				setField( 'content', res.parsed.body || res.content || '' );
				setField( 'excerpt', res.parsed.excerpt || '' );
				if ( res.parsed.outline ) {
					setField( 'outline', JSON.stringify( res.parsed.outline, null, 2 ) );
				}
			} else if ( res?.content ) {
				setField( 'content', res.content );
			}
			toast( __( 'Article generated! Review and save.', 'ai-marketing-expert' ) );
		} catch ( e ) {
			const msg = e?.message || __( 'AI generation failed. Check your AI provider settings.', 'ai-marketing-expert' );
			setGenerateError( msg );
			toast( msg, 'error' );
		} finally {
			slowWarning.stop();
			setGenerating( false );
		}
	};

	// Humanize content (rewrite to sound natural)
	const handleHumanize = async () => {
		if ( ! hasPro ) {
			toast( __( 'Deep Humanize is available in Pro.', 'ai-marketing-expert' ), 'warning' );
			return;
		}
		if ( ! article.content || ! article.content.trim() ) {
			toast( __( 'Generate or write content first before humanizing.', 'ai-marketing-expert' ), 'error' );
			return;
		}
		setHumanizing( true );
		slowWarning.start();
		try {
				const instruction = hasPro
				? 'Deeply humanize this content to sound completely natural, as if written by an experienced human writer. '
				  + 'CRITICAL RULES: 1) Keep ALL sections including the conclusion \u2014 do NOT remove any sections. '
				  + '2) Keep approximately the same word count \u2014 do NOT shorten or truncate the content. '
				  + '3) Keep the same HTML structure (h2, h3, p, ul, ol, li, strong, em tags). '
				  + '4) Do NOT add random words, abbreviations, or unrelated text. '
				  + '5) Vary sentence length, use natural transitions, and remove AI-like patterns. '
				  + '6) Preserve the original meaning and all key points. '
				  + 'Return ONLY the improved HTML content.'
				: 'Lightly humanize this content: make it sound more natural and conversational. '
				  + 'CRITICAL RULES: 1) Keep ALL sections including the conclusion \u2014 do NOT remove any sections. '
				  + '2) Keep approximately the same word count. '
				  + '3) Keep the same HTML formatting and structure. '
				  + '4) Do NOT add random words or unrelated text. '
				  + 'Return ONLY the improved HTML content.';
			const res = await post( '/content/generate/improve', {
				content: article.content,
				instruction,
				tone: article.tone || 'professional',
			} );
			if ( res?.content ) {
				setField( 'content', res.content );
				toast( hasPro
					? __( 'Content deeply humanized!', 'ai-marketing-expert' )
					: __( 'Content lightly humanized. Upgrade to Pro for deeper humanization.', 'ai-marketing-expert' ),
				'success' );
			}
		} catch ( e ) {
			toast( e?.message || __( 'Humanize failed. Please try again.', 'ai-marketing-expert' ), 'error' );
		} finally {
			slowWarning.stop();
			setHumanizing( false );
		}
	};

	// Generate outline
	const handleGenerateOutline = async () => {
		if ( ! hasPro ) {
			toast( __( 'Generate Outline is available in Pro.', 'ai-marketing-expert' ), 'warning' );
			return;
		}
		if ( ! validateGenFields() ) {
			toast( __( 'Please fill in all required fields.', 'ai-marketing-expert' ), 'error' );
			return;
		}
		setGeneratingOutline( true );
		slowWarning.start();
		try {
			const res = await post( '/content/generate/outline', {
				topic: article.topic,
				keywords: article.keywords,
				tone: article.tone,
				style: 'blog_post',
				serp_context: article.serp_outline_context,
			} );
			if ( res?.outline ) {
				setField( 'outline', JSON.stringify( res.outline, null, 2 ) );
				if ( res.outline.title && ! article.title ) {
					setField( 'title', res.outline.title );
				}
			}
			toast( __( 'Outline generated!', 'ai-marketing-expert' ) );
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			slowWarning.stop();
			setGeneratingOutline( false );
		}
	};

	// Generate meta
	const handleGenerateMeta = async () => {
		if ( ! article.content ) {
			toast( __( 'Generate or write content first.', 'ai-marketing-expert' ), 'error' );
			return;
		}
		setGeneratingMeta( true );
		slowWarning.start();
		try {
			const res = await post( '/content/generate/meta', {
				title: article.title,
				content: article.content,
				keywords: article.keywords,
			} );
			if ( res?.meta ) {
				setField( 'meta_title', res.meta.meta_title || '' );
				setField( 'meta_description', res.meta.meta_description || '' );
			}
			toast( __( 'Meta generated!', 'ai-marketing-expert' ) );
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			slowWarning.stop();
			setGeneratingMeta( false );
		}
	};

	// SEO optimize
	const handleSeoOptimize = async () => {
		slowWarning.start();
		try {
			const res = await post( '/content/generate/seo-optimize', {
				content: article.content,
				keywords: article.keywords,
				title: article.title,
			} );
			if ( res?.analysis ) {
				setSeoResult( res.analysis );
			}
			toast( __( 'SEO analysis complete!', 'ai-marketing-expert' ) );
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			slowWarning.stop();
		}
	};

	// Publish to WordPress
	const handlePublish = async ( postStatus = article.default_post_status || 'draft' ) => {
		if ( ! validateSaveFields() ) {
			toast( __( 'Please fill in all required fields before publishing.', 'ai-marketing-expert' ), 'error' );
			return;
		}
		setPublishing( postStatus );
		try {
			// Auto-save first if article has no id yet.
			let articleId = id;
			if ( ! articleId ) {
				let outlineParsed = article.outline || [];
				if ( typeof outlineParsed === 'string' ) {
					try { outlineParsed = JSON.parse( outlineParsed ); } catch ( e ) { outlineParsed = []; }
				}
				const payload = {
					...article,
					word_count_target: article.word_count_target,
					keywords: article.keywords,
					category_ids: ( article.categories || [] ).map( Number ),
					tag_ids: article.tags,
					outline: outlineParsed,
					featured_image_url: article.featured_image_url || '',
					featured_image_id: article.featured_image_id || 0,
				};
				delete payload.categories;
				delete payload.tags;
				const saved = await post( '/content/articles', payload );
				if ( saved?.id ) {
					articleId = saved.id;
					onNavigate( 'edit-article', { id: saved.id } );
				} else {
					toast( __( 'Could not save article before publishing.', 'ai-marketing-expert' ), 'error' );
					return;
				}
			}
			const res = await post( `/content/articles/${ articleId }/publish`, { post_status: postStatus } );
			const successMessages = {
				draft: __( 'Saved as draft in WordPress!', 'ai-marketing-expert' ),
				publish: __( 'Published to WordPress!', 'ai-marketing-expert' ),
				pending: __( 'Submitted for review in WordPress!', 'ai-marketing-expert' ),
				private: __( 'Saved as private in WordPress!', 'ai-marketing-expert' ),
			};
			toast( successMessages[ postStatus ] || __( 'Sent to WordPress!', 'ai-marketing-expert' ), 'success' );
			if ( res?.edit_url ) {
				setField( 'wp_edit_url', res.edit_url );
			}
			if ( res?.status ) {
				setField( 'status', res.status );
			}
		} catch ( e ) {
			toast( e.message || __( 'Publishing failed.', 'ai-marketing-expert' ), 'error' );
		} finally {
			setPublishing( false );
		}
	};

	const handleSchedulePublish = async () => {
		if ( ! validateSaveFields() ) {
			toast( __( 'Please fill in all required fields before scheduling.', 'ai-marketing-expert' ), 'error' );
			return;
		}
		if ( ! scheduleValue ) {
			toast( __( 'Select a publish date and time.', 'ai-marketing-expert' ), 'error' );
			return;
		}

		setScheduling( true );
		try {
			let articleId = id;
			if ( ! articleId ) {
				let outlineParsed = article.outline || [];
				if ( typeof outlineParsed === 'string' ) {
					try { outlineParsed = JSON.parse( outlineParsed ); } catch ( e ) { outlineParsed = []; }
				}
				const payload = {
					...article,
					word_count_target: article.word_count_target,
					keywords: article.keywords,
					category_ids: ( article.categories || [] ).map( Number ),
					tag_ids: article.tags,
					outline: outlineParsed,
					featured_image_url: article.featured_image_url || '',
					featured_image_id: article.featured_image_id || 0,
					scheduled_publish_at: scheduleValue,
				};
				delete payload.categories;
				delete payload.tags;
				const saved = await post( '/content/articles', payload );
				if ( saved?.id ) {
					articleId = saved.id;
					onNavigate( 'edit-article', { id: saved.id } );
				} else {
					toast( __( 'Could not save article before scheduling.', 'ai-marketing-expert' ), 'error' );
					return;
				}
			}

			const res = await post( `/content/articles/${ articleId }/schedule`, {
				scheduled_publish_at: scheduleValue,
			} );
			setField( 'status', res?.status || 'scheduled' );
			setField( 'scheduled_publish_at', res?.scheduled_publish_at || scheduleValue.replace( 'T', ' ' ) + ':00' );
			setShowSchedule( false );
			toast( __( 'Article scheduled in WordPress.', 'ai-marketing-expert' ), 'success' );
		} catch ( e ) {
			toast( e.message || __( 'Scheduling failed.', 'ai-marketing-expert' ), 'error' );
		} finally {
			setScheduling( false );
		}
	};

	if ( ! loaded ) {
		return <Loader text={ __( 'Loading editor...', 'ai-marketing-expert' ) } />;
	}

	const presetOptions = [
		{ label: __( '\u2014 No preset \u2014', 'ai-marketing-expert' ), value: '' },
		...presets.map( ( p ) => ( { label: p.name, value: String( p.id ) } ) ),
	];

	const categoryOptions = ( taxonomies.categories || [] ).map( ( c ) => ( {
		label: c.name,
		value: c.id,
	} ) );

	const postTypeOptions = ( taxonomies.post_types || [] ).map( ( pt ) => ( {
		label: pt.label,
		value: pt.name,
	} ) );

	const postStatusLabels = {
		draft: __( 'Save to WP (Draft)', 'ai-marketing-expert' ),
		publish: __( 'Publish to WP', 'ai-marketing-expert' ),
		pending: __( 'Submit for Review', 'ai-marketing-expert' ),
		private: __( 'Save to WP (Private)', 'ai-marketing-expert' ),
	};
	const brandVoiceOptions = [
		{ label: __( 'Default / None', 'ai-marketing-expert' ), value: '' },
		...brandVoices.map( ( voice ) => ( { label: voice.name, value: String( voice.id ) } ) ),
	];

	const restoreVersion = async ( versionId ) => {
		if ( ! window.confirm( __( 'Restore this version? Current content will be snapshotted first.', 'ai-marketing-expert' ) ) ) return;
		try {
			await post( `/content/articles/${ id }/versions/${ versionId }/restore` );
			toast( __( 'Version restored. Reloading article...', 'ai-marketing-expert' ) );
			window.location.reload();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	return (
		<div className="aime-article-editor">
			{ /* Header */ }
			<div className="aime-page-header">
				<div className="aime-header-left">
					<Button variant="tertiary" onClick={ onBack } icon={ chevronLeft }>
						{ __( 'Back', 'ai-marketing-expert' ) }
					</Button>
					<h2>{ id ? __( 'Edit Article', 'ai-marketing-expert' ) : __( 'New Article', 'ai-marketing-expert' ) }</h2>
					{ article.status && (
						<span className="aime-status-badge" style={ { marginLeft: 8 } }>
							{ ARTICLE_STATUS_LABELS[ article.status ] || article.status }
						</span>
					) }
				</div>
				<div className="aime-page-header-actions">
					{ showSchedule && (
						<div className="aime-schedule-inline">
							<TextControl
								type="datetime-local"
								value={ scheduleValue }
								onChange={ setScheduleValue }
								__nextHasNoMarginBottom
							/>
							<Button variant="primary" onClick={ handleSchedulePublish } isBusy={ scheduling } disabled={ scheduling || saving || !! publishing }>
								{ scheduling ? __( 'Scheduling...', 'ai-marketing-expert' ) : __( 'Confirm Schedule', 'ai-marketing-expert' ) }
							</Button>
						</div>
					) }
					<Button variant="secondary" onClick={ () => setShowSchedule( ( value ) => ! value ) } disabled={ scheduling || saving || !! publishing }>
						{ __( 'Schedule Publish', 'ai-marketing-expert' ) }
					</Button>
					<Button variant="secondary" onClick={ handleSave } isBusy={ saving }>
						{ saving ? __( 'Saving...', 'ai-marketing-expert' ) : __( 'Save', 'ai-marketing-expert' ) }
					</Button>
					<Button
						variant="secondary"
						onClick={ () => handlePublish( 'draft' ) }
						disabled={ !! publishing || saving }
					>
						{ publishing === 'draft'
							? <><Spinner style={ { marginRight: 4 } } />{ __( 'Saving Draft...', 'ai-marketing-expert' ) }</>
							: __( 'Save to WP (Draft)', 'ai-marketing-expert' )
						}
					</Button>
					<Button
						variant="primary"
						onClick={ () => handlePublish( 'publish' ) }
						disabled={ !! publishing || saving }
					>
						{ publishing === 'publish'
							? <><Spinner style={ { marginRight: 4 } } />{ __( 'Publishing...', 'ai-marketing-expert' ) }</>
							: __( 'Publish to WP', 'ai-marketing-expert' )
						}
					</Button>
				</div>
			</div>

			<div className="aime-content-editor-grid">
				{ /* Left - main editor area */ }
				<div className="aime-content-editor-main">
					{ /* Topic & generation controls */ }
					<Card title={ __( 'AI Generation', 'ai-marketing-expert' ) }>
						<div className={ `aime-form-field${ errors.topic ? ' has-error' : '' }` }>
							<TextControl
								label={ __( 'Topic / Subject', 'ai-marketing-expert' ) + ' *' }
								value={ article.topic }
								onChange={ ( v ) => { setField( 'topic', v ); if ( errors.topic ) setErrors( ( prev ) => ( { ...prev, topic: '' } ) ); } }
								placeholder={ __( 'e.g., Best SEO practices for 2025', 'ai-marketing-expert' ) }
							/>
							{ errors.topic && <span className="aime-field-error">{ errors.topic }</span> }
						</div>

						<div className={ `aime-form-field${ errors.keywords ? ' has-error' : '' }` }>
							<FormTokenField
								label={ __( 'Target Keywords', 'ai-marketing-expert' ) + ' *' }
								value={ article.keywords }
								suggestions={ vaultKeywords.filter( ( kw ) => ! article.keywords.includes( kw ) ) }
								onChange={ ( tokens ) => { setField( 'keywords', tokens ); if ( errors.keywords ) setErrors( ( prev ) => ( { ...prev, keywords: '' } ) ); } }
								placeholder={ __( 'Search keyword vault or add custom...', 'ai-marketing-expert' ) }
								__experimentalExpandOnFocus
							/>
							{ errors.keywords && <span className="aime-field-error">{ errors.keywords }</span> }
						</div>

						<div className="aime-gen-controls">
							<SelectControl
								label={ __( 'Tone', 'ai-marketing-expert' ) }
								value={ article.tone }
								options={ toneOptions }
								onChange={ ( v ) => setField( 'tone', v ) }
							/>
							<SelectControl
								label={ __( 'Language', 'ai-marketing-expert' ) }
								value={ article.language }
								options={ LANGUAGES }
								onChange={ ( v ) => setField( 'language', v ) }
							/>
							<RangeControl
								label={ __( 'Word Count Target', 'ai-marketing-expert' ) }
								value={ article.word_count_target }
								onChange={ ( v ) => setField( 'word_count_target', v ) }
								min={ 300 }
								max={ hasPro ? 5000 : freeMaxWords }
								step={ 100 }
								withInputField
							/>
							<SelectControl
								label={ __( 'Preset', 'ai-marketing-expert' ) }
								value={ String( article.preset_id || '' ) }
								options={ presetOptions }
								onChange={ ( v ) => setField( 'preset_id', v ) }
							/>
							<SelectControl
								label={ hasPro ? __( 'Brand Voice', 'ai-marketing-expert' ) : <ProLabel>{ __( 'Brand Voice', 'ai-marketing-expert' ) }</ProLabel> }
								value={ String( article.brand_voice_id || '' ) }
								options={ brandVoiceOptions }
								onChange={ ( v ) => setField( 'brand_voice_id', v ) }
								disabled={ ! hasPro }
							/>
							<ToggleControl
								label={ __( 'Table of Contents', 'ai-marketing-expert' ) }
								help={ __( 'Add a linked table of contents before the first main section.', 'ai-marketing-expert' ) }
								checked={ !! article.include_table_of_contents }
								onChange={ ( value ) => setField( 'include_table_of_contents', value ) }
							/>
						</div>

						<TextareaControl
							label={ __( 'SERP / Brief Context for Outline', 'ai-marketing-expert' ) }
							help={ __( 'Optional: paste SEO brief notes, SERP questions, competitor gaps, or search intent. This is sent to outline/article generation.', 'ai-marketing-expert' ) }
							value={ article.serp_outline_context || '' }
							onChange={ ( v ) => setField( 'serp_outline_context', v ) }
							rows={ 3 }
						/>

						<div className="aime-gen-actions">
							{ generatingOutline ? (
								<LoadingBtn>{ __( 'Generating...', 'ai-marketing-expert' ) }</LoadingBtn>
							) : (
								<Button
									variant="secondary"
									onClick={ handleGenerateOutline }
									disabled={ ! aiConfigured || generating }
									title={ ! aiConfigured ? aiDisabledTitle : undefined }
								>
									<span className="aime-pro-inline-action">{ __( 'Generate Outline', 'ai-marketing-expert' ) }{ ! hasPro && <ProLabel /> }</span>
								</Button>
							) }
							{ generating ? (
								<LoadingBtn primary>{ __( 'Generating Article...', 'ai-marketing-expert' ) }</LoadingBtn>
							) : (
								<Button
									variant="primary"
									onClick={ handleGenerate }
									disabled={ ! aiConfigured || generatingOutline }
									className="aime-btn-generate"
									title={ ! aiConfigured ? aiDisabledTitle : undefined }
								>
									{ __( 'Generate Full Article', 'ai-marketing-expert' ) }
								</Button>
							) }
					</div>
					{ generateError && (
						<p className="aime-field-error aime-gen-error">{ generateError }</p>
					) }
						{ ! aiConfigured && (
							<p className="aime-ai-notice">
								{ __( '\u26A0 AI features are disabled. Please configure an AI provider API key in', 'ai-marketing-expert' ) }{ ' ' }
								<a href={ `${ window.aimeData?.adminUrl || '/wp-admin/' }admin.php?page=ai-marketing-expert-ai-providers` }>
									{ __( 'Settings', 'ai-marketing-expert' ) }
								</a>.
							</p>
						) }
						<p className="aime-ai-quality-hint">
							{ __( '\u2139 Content length and quality depend on your AI model. Larger models produce more accurate word counts and higher-quality content.', 'ai-marketing-expert' ) }
						</p>
					</Card>

					{ /* Outline preview */ }
					{ article.outline && article.outline !== '[]' && article.outline !== '{}' && article.outline.trim() !== '' && ( () => {
						let items = null;
						try {
							const parsed = JSON.parse( article.outline );
							if ( Array.isArray( parsed ) && parsed.length > 0 ) {
								items = parsed;
							} else if ( typeof parsed === 'object' && Object.keys( parsed ).length === 0 ) {
								return null;
							}
						} catch {} // not valid JSON

						if ( items ) {
							return (
								<Card title={ __( 'Outline', 'ai-marketing-expert' ) }>
									<ul className="aime-outline-list">
										{ items.map( ( item, i ) => {
											const heading = item.heading || item.title || item.text || item.name || item.section || item.section_title || '';
											const rawLevel = String( item.level || 'h2' ).replace( /^h/i, '' );
											const levelNum = parseInt( rawLevel, 10 );
											const level = ( levelNum >= 1 && levelNum <= 6 ) ? levelNum : 2;
											const indent = Math.max( 0, level - 2 );
											if ( ! heading ) return null;
											return (
												<li key={ i } style={ { paddingLeft: `${ indent * 20 }px` } }>
													<span className="aime-outline-level">H{ level }</span>
													<span className="aime-outline-heading">{ heading }</span>
												</li>
											);
										} ) }
									</ul>
								</Card>
							);
						}

						// Fallback: show raw text if not parseable as array.
						return (
							<Card title={ __( 'Outline', 'ai-marketing-expert' ) }>
								<pre className="aime-outline-preview">{ article.outline }</pre>
							</Card>
						);
					} )() }

					{ /* Title */ }
					<Card>
						<TextControl
							label={ __( 'Article Title', 'ai-marketing-expert' ) }
							value={ article.title }
							onChange={ ( v ) => setField( 'title', v ) }
							placeholder={ __( 'Enter article title...', 'ai-marketing-expert' ) }
							className="aime-title-input"
						/>
						{ ! article.title && (
							<p className="aime-field-hint">{ __( 'A title will be auto-generated by AI, or you can type one manually.', 'ai-marketing-expert' ) }</p>
						) }
					</Card>

					{ /* Content */ }
					<Card title={ __( 'Content', 'ai-marketing-expert' ) }>
						{ generating && (
							<div className="aime-generating-overlay">
								<Spinner />
								<p>{ __( 'AI is writing your article...', 'ai-marketing-expert' ) }</p>
							</div>
						) }
						<div className="aime-tinymce-wrap" ref={ editorWrapRef } style={ generating ? { display: 'none' } : undefined } />
						{ article.content && (
							<div className="aime-content-stats">
								<span>{ __( 'Words:', 'ai-marketing-expert' ) } { article.content.replace( /<[^>]*>/g, ' ' ).split( /\s+/ ).filter( Boolean ).length }</span>
								<span>{ __( 'Characters:', 'ai-marketing-expert' ) } { article.content.replace( /<[^>]*>/g, '' ).length }</span>
							</div>
						) }
						{ article.content && (
							<div className="aime-humanize-wrap">
								{ humanizing ? (
									<LoadingBtn>{ __( 'Humanizing...', 'ai-marketing-expert' ) }</LoadingBtn>
								) : (
									<Button
										variant="secondary"
										onClick={ handleHumanize }
										disabled={ ! aiConfigured || generating }
										title={ ! aiConfigured ? aiDisabledTitle : undefined }
										className="aime-btn-humanize"
									>
										<span className="aime-pro-inline-action">{ '\u2728 ' + __( 'Deep Humanize', 'ai-marketing-expert' ) }{ ! hasPro && <ProLabel /> }</span>
									</Button>
								) }
								{ ! hasPro && <ProUpgradeButton /> }
							</div>
						) }
						{ article.content && showThinkingHint && (
							<div className="aime-ai-thinking-hint" role="status">
								<span className="aime-ai-thinking-hint__icon" aria-hidden="true">{ '💡' }</span>
								<div className="aime-ai-thinking-hint__body">
									<strong>{ __( 'Auto-cleaned model reasoning', 'ai-marketing-expert' ) }</strong>
									<p>
										{ __( 'Some AI models (such as MiniMax M3 used via a custom provider) emit internal reasoning before the actual article. The plugin automatically strips this reasoning, but for cleaner output consider switching to a model that does not emit chain-of-thought:', 'ai-marketing-expert' ) }
									</p>
									<p className="aime-ai-thinking-hint__models">
										{ __( 'Recommended: GPT-5.2, Claude Sonnet 4.6, or Gemini 2.5 Flash (Stable).', 'ai-marketing-expert' ) }
										<a href={ `${ window.aimeData?.adminUrl || '/wp-admin/' }admin.php?page=ai-marketing-expert-ai-providers` }>
											{ __( 'Change AI provider →', 'ai-marketing-expert' ) }
										</a>
									</p>
								</div>
								<button
									type="button"
									className="aime-ai-thinking-hint__dismiss"
									onClick={ () => setShowThinkingHint( false ) }
									aria-label={ __( 'Dismiss', 'ai-marketing-expert' ) }
								>
									{ '×' }
								</button>
							</div>
						) }
					</Card>

					{ /* Excerpt */ }
					<Card>
						<TextareaControl
							label={ __( 'Excerpt', 'ai-marketing-expert' ) }
							value={ article.excerpt || '' }
							onChange={ ( v ) => setField( 'excerpt', v ) }
							rows={ 3 }
							placeholder={ __( 'Short summary (auto-generated with article)', 'ai-marketing-expert' ) }
						/>
					</Card>
				</div>

				{ /* Right - sidebar panels */ }
				<div className="aime-content-editor-side">
					{ /* SEO & Meta */ }
					<Card title={ __( 'SEO & Meta', 'ai-marketing-expert' ) }>
						<TextControl
							label={ __( 'Meta Title', 'ai-marketing-expert' ) }
							value={ article.meta_title || '' }
							onChange={ ( v ) => setField( 'meta_title', v ) }
							placeholder={ __( 'SEO title (max 60 chars)', 'ai-marketing-expert' ) }
						/>
						<span className="aime-char-count">
							{ ( article.meta_title || '' ).length } / 60
						</span>

						<TextareaControl
							label={ __( 'Meta Description', 'ai-marketing-expert' ) }
							value={ article.meta_description || '' }
							onChange={ ( v ) => setField( 'meta_description', v ) }
							rows={ 3 }
							placeholder={ __( 'Meta description (max 160 chars)', 'ai-marketing-expert' ) }
						/>
						<span className="aime-char-count">
							{ ( article.meta_description || '' ).length } / 160
						</span>

						<div className="aime-seo-actions">
							{ generatingMeta ? (
								<LoadingBtn>{ __( 'Generating Meta...', 'ai-marketing-expert' ) }</LoadingBtn>
							) : (
								<Button variant="secondary" onClick={ handleGenerateMeta } disabled={ ! aiConfigured } title={ ! aiConfigured ? aiDisabledTitle : undefined }>
									{ __( 'AI Generate Meta', 'ai-marketing-expert' ) }
								</Button>
							) }
							<Button variant="link" onClick={ handleSeoOptimize } disabled={ ! aiConfigured } title={ ! aiConfigured ? aiDisabledTitle : undefined }>
								{ __( 'SEO Analysis', 'ai-marketing-expert' ) }
							</Button>
						</div>
						{ ! aiConfigured && (
							<p className="aime-ai-notice">
								{ __( '\u26A0 Configure an AI provider key in Settings to enable AI features.', 'ai-marketing-expert' ) }
							</p>
						) }

						{ /* SEO scores */ }
						{ ( article.seo_score || article.readability_score ) && (
							<div className="aime-scores">
								<div className="aime-score-item">
									<span>{ __( 'SEO Score', 'ai-marketing-expert' ) }</span>
									<strong>{ article.seo_score || 0 }/100</strong>
								</div>
								<div className="aime-score-item">
									<span>{ __( 'Readability', 'ai-marketing-expert' ) }</span>
									<strong>{ article.readability_score || 0 }/100</strong>
								</div>
							</div>
						) }

						{ /* SEO analysis result */ }
						{ seoResult && (
							<div className="aime-seo-result">
								<h4>{ __( 'SEO Analysis', 'ai-marketing-expert' ) }</h4>
								{ seoResult.issues?.map( ( issue, i ) => (
									<div key={ i } className={ `aime-seo-issue aime-seo-${ issue.severity }` }>
										<strong>{ issue.severity }:</strong> { issue.message }
										{ issue.suggestion && <p className="aime-seo-suggestion">{ issue.suggestion }</p> }
									</div>
								) ) }
								{ seoResult.content_suggestions?.map( ( s, i ) => (
									<p key={ i } className="aime-seo-suggestion">\u2022 { s }</p>
								) ) }
							</div>
						) }
					</Card>

					{ /* Taxonomy */ }
					<Card title={ __( 'WordPress Settings', 'ai-marketing-expert' ) }>
						<SelectControl
							label={ __( 'Post Type', 'ai-marketing-expert' ) }
							value={ article.post_type || 'post' }
							options={ postTypeOptions.length ? postTypeOptions : [ { label: 'Post', value: 'post' } ] }
							onChange={ ( v ) => {
								setField( 'post_type', v );
								if ( v !== 'post' ) {
									setField( 'categories', [] );
									setField( 'tags', [] );
								}
							} }
						/>

						{ ( article.post_type || 'post' ) === 'post' && categoryOptions.length > 0 && (
							<div className="aime-categories-field">
								<label>{ __( 'Categories', 'ai-marketing-expert' ) }</label>
								<div className="aime-checkbox-list">
									{ categoryOptions.map( ( cat ) => (
										<CheckboxControl
											key={ cat.value }
											label={ cat.label }
											checked={ ( article.categories || [] ).includes( Number( cat.value ) ) }
											onChange={ ( checked ) => {
												const numVal = Number( cat.value );
												const cats = ( article.categories || [] ).map( Number );
												if ( checked ) {
													if ( ! cats.includes( numVal ) ) {
														setField( 'categories', [ ...cats, numVal ] );
													}
												} else {
													setField( 'categories', cats.filter( ( c ) => c !== numVal ) );
												}
											} }
										/>
									) ) }
								</div>
							</div>
						) }

						{ ( article.post_type || 'post' ) === 'post' && (
							<FormTokenField
								label={ __( 'Tags', 'ai-marketing-expert' ) }
								value={ article.tags || [] }
								suggestions={ ( taxonomies.tags || [] ).map( ( t ) => t.name ) }
								onChange={ ( tokens ) => setField( 'tags', tokens ) }
								placeholder={ __( 'Add tag...', 'ai-marketing-expert' ) }
							/>
						) }
					</Card>

					{ /* Image - tabbed interface */ }
						<Card title={ __( 'Featured Image', 'ai-marketing-expert' ) }>
							{ article.featured_image_url && (
								<div className="aime-featured-image-preview">
									<img src={ article.featured_image_url } alt={ article.title || 'Featured image' } />
									<Button
										variant="link"
										isDestructive
										className="aime-remove-image"
										onClick={ () => { setField( 'featured_image_url', '' ); setField( 'featured_image_id', 0 ); } }
									>
										{ __( 'Remove Image', 'ai-marketing-expert' ) }
									</Button>
								</div>
							) }
							<div className="aime-image-tabs">
								<div className="aime-image-tabs__nav">
									<button
										type="button"
										className={ `aime-image-tabs__tab${ imageTab === 'ai' ? ' is-active' : '' }` }
										onClick={ () => setImageTab( 'ai' ) }
									>
										<span className="aime-pro-inline-action">{ __( '\uD83C\uDFA8 AI Generate', 'ai-marketing-expert' ) }{ ! hasPro && <ProLabel /> }</span>
									</button>
									<button
										type="button"
										className={ `aime-image-tabs__tab${ imageTab === 'upload' ? ' is-active' : '' }` }
										onClick={ () => setImageTab( 'upload' ) }
									>
										{ __( '\uD83D\uDCC1 Upload', 'ai-marketing-expert' ) }
									</button>
								</div>
								<div className="aime-image-tabs__content">
									{ imageTab === 'ai' && (
										<div className="aime-image-tab-panel">
											<p className="aime-image-tab-desc">
												{ __( 'Generate a featured image from your article content using AI.', 'ai-marketing-expert' ) }
											</p>
											{ generatingImage ? (
											<div className="aime-image-generating">
												<LoadingBtn primary>{ imageProgress || __( 'Generating Image...', 'ai-marketing-expert' ) }</LoadingBtn>
												<p className="aime-image-progress-hint">{ __( 'Image generation may take 30-60 seconds depending on your AI model.', 'ai-marketing-expert' ) }</p>
											</div>
										) : (
											<>
											<Button
												variant="primary"
												disabled={ ! hasPro || ! aiConfigured || ( ! article.title && ! article.content ) }
												title={ ! aiConfigured ? aiDisabledTitle : ( ! article.title && ! article.content ) ? __( 'Generate or write content first', 'ai-marketing-expert' ) : undefined }
												onClick={ async () => {
													setGeneratingImage( true );
													setImageError( '' );
													setImageProgress( __( 'Connecting to AI provider...', 'ai-marketing-expert' ) );
													const progressTimer1 = setTimeout( () => setImageProgress( __( 'Generating image, this may take a minute...', 'ai-marketing-expert' ) ), 5000 );
													const progressTimer2 = setTimeout( () => setImageProgress( __( 'Still working \u2014 AI is processing your image...', 'ai-marketing-expert' ) ), 20000 );
													const progressTimer3 = setTimeout( () => setImageProgress( __( 'Almost there \u2014 retrying if needed...', 'ai-marketing-expert' ) ), 45000 );
													slowWarning.start();
													try {
														const res = await post( '/content/generate/image', {
															title: article.title,
															content: article.content,
															article_id: id || 0,
														} );
														if ( res?.image_url ) {
															setField( 'featured_image_url', res.image_url );
															setField( 'featured_image_id', res.attachment_id || 0 );
															toast( __( 'Featured image generated!', 'ai-marketing-expert' ) );
														} else if ( res?.prompts ) {
															toast( __( 'Image prompt generated: ', 'ai-marketing-expert' ) + res.prompts[ 0 ] );
														}
													} catch ( e ) {
														const msg = e?.message || __( 'Image generation failed. Check your AI provider settings.', 'ai-marketing-expert' );
														setImageError( msg );
														toast( msg, 'error' );
													} finally {
														clearTimeout( progressTimer1 );
														clearTimeout( progressTimer2 );
														clearTimeout( progressTimer3 );
														slowWarning.stop();
														setImageProgress( '' );
														setGeneratingImage( false );
													}
												} }
											>
												<span className="aime-pro-inline-action">{ __( 'Generate Image', 'ai-marketing-expert' ) }{ ! hasPro && <ProLabel /> }</span>
											</Button>
											{ ! hasPro && <ProUpgradeButton /> }
											</>
										) }
											{ imageError && (
												<p className="aime-field-error aime-image-error">{ imageError }</p>
											) }
											{ ( ! article.title && ! article.content ) && (
												<p className="aime-field-hint">{ __( 'Write or generate article content first, then generate a featured image.', 'ai-marketing-expert' ) }</p>
											) }
										</div>
									) }
									{ imageTab === 'upload' && (
										<div className="aime-image-tab-panel">
											<p className="aime-image-tab-desc">
												{ __( 'Upload an image or pick one from your WordPress Media Library.', 'ai-marketing-expert' ) }
											</p>
											<Button
												variant="primary"
												onClick={ () => {
													const frame = wp.media( {
														title: __( 'Select Featured Image', 'ai-marketing-expert' ),
														library: { type: 'image' },
														multiple: false,
														button: { text: __( 'Use this image', 'ai-marketing-expert' ) },
													} );
													frame.on( 'select', () => {
														const attachment = frame.state().get( 'selection' ).first().toJSON();
														setField( 'featured_image_url', attachment.url );
														setField( 'featured_image_id', attachment.id || 0 );
													} );
													frame.open();
												} }
											>
												{ __( 'Open Media Library', 'ai-marketing-expert' ) }
											</Button>
										</div>
									) }
								</div>
							</div>
						</Card>

					{ id && (
						<Card title={ __( 'Versions', 'ai-marketing-expert' ) }>
							{ versions.length === 0 ? (
								<p className="aime-empty-text">{ __( 'No saved versions yet.', 'ai-marketing-expert' ) }</p>
							) : (
								<div className="aime-version-list">
									{ versions.map( ( version ) => (
										<div className="aime-version-row" key={ version.id }>
											<div><strong>{ version.label }</strong><span>{ version.created_at }</span></div>
											<Button variant="secondary" isSmall onClick={ () => restoreVersion( version.id ) }>{ __( 'Restore', 'ai-marketing-expert' ) }</Button>
										</div>
									) ) }
								</div>
							) }
						</Card>
					) }
				</div>
			</div>
		</div>
	);
};

export default ArticleEditor;
