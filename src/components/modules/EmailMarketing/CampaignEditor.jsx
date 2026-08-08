/**
 * Campaign Editor - multi-step campaign builder with premium styling.
 *
 * Steps:
 *   1. Compose            - Email body (Visual / HTML / Preview)
 *   2. Subject & Settings - Campaign name, subject, preview text, UTM, throttle
 *   3. Recipients         - Pick lists or tags
 *   4. Review & Send      - Summary, test-send, schedule, send now
 */

import { useState, useEffect, useCallback, useRef } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Button, Spinner } from '@aime/wp-components';
import useApi from '../../../hooks/useApi';
import useSlowWarning from '../../../hooks/useSlowWarning';
import Card from '../../common/Card';
import LoadingBtn from '../../common/LoadingBtn';
import AiNotice, { isAiConfigured, aiDisabledTitle } from '../../common/AiNotice';
import Loader from '../../common/Loader';
import Notice from '../../common/Notice';
import WPEditor from '../../common/WPEditor';
import { isProActive, ProLabel, ProUpgradeButton } from '../../common/ProLock';
import sanitizeHtml from '../../../utils/sanitizeHtml';
import { siteDateTimeToUtc } from '../../../utils/datetime';

/* --------- constants --------- */

const MERGE_TAGS = [
	{ label: 'First Name', tag: '{{first_name}}' },
	{ label: 'Last Name', tag: '{{last_name}}' },
	{ label: 'Email', tag: '{{email}}' },
	{ label: 'Unsubscribe', tag: '{{unsubscribe_url}}' },
];

const STEPS = [
	{ key: 'compose', label: __( 'Compose', 'ai-marketing-expert' ) },
	{ key: 'subject', label: __( 'Subject & Settings', 'ai-marketing-expert' ) },
	{ key: 'recipients', label: __( 'Recipients', 'ai-marketing-expert' ) },
	{ key: 'review', label: __( 'Review & Send', 'ai-marketing-expert' ) },
];

const SMART_SEGMENT_OPTIONS = [
	{ value: 'top_openers', label: __( 'Top Openers', 'ai-marketing-expert' ) },
	{ value: 'top_clickers', label: __( 'Top Clickers', 'ai-marketing-expert' ) },
	{ value: 'most_engaged', label: __( 'Most Engaged', 'ai-marketing-expert' ) },
];

const PRO_AI_TONES = [ 'formal', 'humorous', 'minimalist' ];

// The body is HTML out of the editor. Both questions asked of it here — "is
// there anything to work from" and "what is this email about" — are about the
// words, not the markup, and an empty editor still ships a `<p>&nbsp;</p>`.
const plainBody = ( html ) => ( html || '' )
	.replace( /<[^>]*>/g, ' ' )
	.replace( /&nbsp;/g, ' ' )
	.replace( /\s+/g, ' ' )
	.trim();

const escapeHtml = ( value = '' ) => String( value )
	.replace( /&/g, '&amp;' )
	.replace( /</g, '&lt;' )
	.replace( />/g, '&gt;' )
	.replace( /"/g, '&quot;' )
	.replace( /'/g, '&#039;' );

const stripTemplateFooterMarkup = ( body = '' ) => body
	.replace( /(?:<hr\b[^>]*>\s*)?<p\b[^>]*>\s*(?:[^<]*&bull;\s*)?<a\b[^>]*href=["'][^"']*(?:\{\{unsubscribe(?:_url)?\}\}|aime_track=unsubscribe)[^"']*["'][^>]*>.*?<\/a>(?:\s*from these emails?)?\s*<\/p>/gis, '' )
	.replace( /<div\b[^>]*>\s*(?:[^<]*&bull;\s*)?<a\b[^>]*href=["'][^"']*(?:\{\{unsubscribe(?:_url)?\}\}|aime_track=unsubscribe)[^"']*["'][^>]*>.*?<\/a>(?:\s*from these emails?)?\s*<\/div>/gis, '' )
	.replace( /<a\b[^>]*href=["'][^"']*(?:\{\{unsubscribe(?:_url)?\}\}|aime_track=unsubscribe)[^"']*["'][^>]*>.*?<\/a>/gis, '' );

const buildPreviewEmailHtml = ( body = '', settings = {}, hasPro = true ) => {
	const strippedBody = stripTemplateFooterMarkup( body );
	const footer = settings.email_footer || '';
	const companyName = settings.company_name || '';
	const companyAddress = settings.company_address || '';
	const unsubscribeText = settings.unsubscribe_text || 'Unsubscribe';

	const footerParts = [];
	// Free tier: branding always leads the footer, matching CampaignProcessor.
	if ( ! hasPro ) {
		footerParts.push( '<p style="margin:0 0 8px;color:#64748b;font-size:12px">Sent with <a href="https://wpthemespace.com/product/ai-marketing-expert/" target="_blank" rel="noopener" style="color:#64748b;text-decoration:underline">AI Marketing Expert</a></p>' );
	}
	if ( footer ) {
		footerParts.push( footer );
	}
	if ( companyName || companyAddress ) {
		footerParts.push( `<p style="margin:8px 0 0;color:#64748b;font-size:12px">${ escapeHtml( companyName ) }${ companyName && companyAddress ? '<br>' : '' }${ escapeHtml( companyAddress ).replace( /\n/g, '<br>' ) }</p>` );
	}
	if ( unsubscribeText ) {
		footerParts.push( `<p style="margin:8px 0 0"><a href="{{unsubscribe_url}}" style="color:#64748b">${ escapeHtml( unsubscribeText ) }</a></p>` );
	}

	if ( ! footerParts.length ) {
		return strippedBody;
	}

	const footerHtml = `<div class="aime-email-footer" style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;text-align:center">${ footerParts.join( '' ) }</div>`;

	return strippedBody.toLowerCase().includes( '</body>' )
		? strippedBody.replace( /<\/body>/i, `${ footerHtml }</body>` )
		: `${ strippedBody }${ footerHtml }`;
};

/* --------- Template SVG thumbnails --------- */
const TEMPLATE_SVGS = {
	newsletter: (
		<svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg">
			<rect width="240" height="160" rx="4" fill="#f8faf8"/>
			<rect x="20" y="12" width="200" height="24" rx="4" fill="#1b5e20" opacity=".9"/>
			<rect x="70" y="18" width="100" height="4" rx="2" fill="#fff"/>
			<rect x="88" y="25" width="64" height="3" rx="1.5" fill="#fff" opacity=".6"/>
			<rect x="20" y="46" width="200" height="50" rx="4" fill="#e8f5e9"/>
			<rect x="32" y="54" width="120" height="5" rx="2.5" fill="#2e7d32"/>
			<rect x="32" y="64" width="176" height="3" rx="1.5" fill="#66bb6a" opacity=".5"/>
			<rect x="32" y="72" width="160" height="3" rx="1.5" fill="#66bb6a" opacity=".5"/>
			<rect x="32" y="80" width="80" height="8" rx="4" fill="#1b5e20"/>
			<rect x="20" y="106" width="96" height="40" rx="4" fill="#f1f8e9"/>
			<rect x="28" y="114" width="60" height="4" rx="2" fill="#558b2f"/>
			<rect x="28" y="123" width="80" height="3" rx="1.5" fill="#aed581" opacity=".6"/>
			<rect x="28" y="131" width="70" height="3" rx="1.5" fill="#aed581" opacity=".6"/>
			<rect x="124" y="106" width="96" height="40" rx="4" fill="#f1f8e9"/>
			<rect x="132" y="114" width="60" height="4" rx="2" fill="#558b2f"/>
			<rect x="132" y="123" width="80" height="3" rx="1.5" fill="#aed581" opacity=".6"/>
			<rect x="132" y="131" width="70" height="3" rx="1.5" fill="#aed581" opacity=".6"/>
		</svg>
	),
	promotional: (
		<svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg">
			<rect width="240" height="160" rx="4" fill="#fff8e1"/>
			<rect x="20" y="12" width="200" height="60" rx="4" fill="#ff8f00"/>
			<rect x="60" y="24" width="120" height="8" rx="4" fill="#fff"/>
			<rect x="80" y="38" width="80" height="4" rx="2" fill="#fff" opacity=".7"/>
			<rect x="80" y="50" width="80" height="14" rx="7" fill="#fff"/>
			<rect x="92" y="54" width="56" height="6" rx="3" fill="#ff8f00"/>
			<rect x="20" y="82" width="60" height="60" rx="4" fill="#ffe0b2"/>
			<rect x="28" y="115" width="44" height="4" rx="2" fill="#e65100"/>
			<rect x="28" y="123" width="36" height="8" rx="4" fill="#ff6d00"/>
			<rect x="90" y="82" width="60" height="60" rx="4" fill="#ffe0b2"/>
			<rect x="98" y="115" width="44" height="4" rx="2" fill="#e65100"/>
			<rect x="98" y="123" width="36" height="8" rx="4" fill="#ff6d00"/>
			<rect x="160" y="82" width="60" height="60" rx="4" fill="#ffe0b2"/>
			<rect x="168" y="115" width="44" height="4" rx="2" fill="#e65100"/>
			<rect x="168" y="123" width="36" height="8" rx="4" fill="#ff6d00"/>
		</svg>
	),
	welcome: (
		<svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg">
			<rect width="240" height="160" rx="4" fill="#e3f2fd"/>
			<circle cx="120" cy="36" r="20" fill="#1565c0" opacity=".15"/>
			<rect x="108" y="28" width="24" height="16" rx="4" fill="#1565c0"/>
			<rect x="50" y="68" width="140" height="6" rx="3" fill="#1565c0"/>
			<rect x="60" y="80" width="120" height="3" rx="1.5" fill="#64b5f6" opacity=".6"/>
			<rect x="70" y="88" width="100" height="3" rx="1.5" fill="#64b5f6" opacity=".6"/>
			<rect x="80" y="102" width="80" height="12" rx="6" fill="#1565c0"/>
			<rect x="92" y="106" width="56" height="4" rx="2" fill="#fff"/>
			<rect x="60" y="126" width="120" height="3" rx="1.5" fill="#90caf9" opacity=".4"/>
			<rect x="80" y="134" width="80" height="3" rx="1.5" fill="#90caf9" opacity=".4"/>
		</svg>
	),
	announcement: (
		<svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg">
			<rect width="240" height="160" rx="4" fill="#fce4ec"/>
			<rect x="20" y="12" width="200" height="16" rx="4" fill="#c62828"/>
			<rect x="70" y="16" width="100" height="4" rx="2" fill="#fff"/>
			<rect x="30" y="38" width="180" height="42" rx="4" fill="#fff"/>
			<rect x="42" y="46" width="120" height="5" rx="2.5" fill="#c62828"/>
			<rect x="42" y="56" width="156" height="3" rx="1.5" fill="#ef9a9a" opacity=".6"/>
			<rect x="42" y="64" width="140" height="3" rx="1.5" fill="#ef9a9a" opacity=".6"/>
			<rect x="30" y="90" width="86" height="50" rx="4" fill="#ffebee"/>
			<rect x="42" y="100" width="62" height="4" rx="2" fill="#d32f2f"/>
			<rect x="42" y="110" width="50" height="3" rx="1.5" fill="#ef9a9a" opacity=".5"/>
			<rect x="42" y="120" width="40" height="8" rx="4" fill="#c62828"/>
			<rect x="124" y="90" width="86" height="50" rx="4" fill="#ffebee"/>
			<rect x="136" y="100" width="62" height="4" rx="2" fill="#d32f2f"/>
			<rect x="136" y="110" width="50" height="3" rx="1.5" fill="#ef9a9a" opacity=".5"/>
			<rect x="136" y="120" width="40" height="8" rx="4" fill="#c62828"/>
		</svg>
	),
	minimal: (
		<svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg">
			<rect width="240" height="160" rx="4" fill="#fafafa"/>
			<rect x="40" y="20" width="160" height="5" rx="2.5" fill="#333"/>
			<rect x="60" y="32" width="120" height="3" rx="1.5" fill="#999"/>
			<line x1="40" y1="46" x2="200" y2="46" stroke="#e0e0e0" strokeWidth="1"/>
			<rect x="40" y="56" width="160" height="3" rx="1.5" fill="#666" opacity=".5"/>
			<rect x="40" y="64" width="150" height="3" rx="1.5" fill="#666" opacity=".5"/>
			<rect x="40" y="72" width="140" height="3" rx="1.5" fill="#666" opacity=".5"/>
			<rect x="40" y="80" width="120" height="3" rx="1.5" fill="#666" opacity=".5"/>
			<rect x="40" y="96" width="80" height="10" rx="2" fill="#333"/>
			<rect x="52" y="99" width="56" height="4" rx="2" fill="#fff"/>
			<line x1="40" y1="118" x2="200" y2="118" stroke="#e0e0e0" strokeWidth="1"/>
			<rect x="80" y="128" width="80" height="3" rx="1.5" fill="#bbb"/>
			<rect x="90" y="136" width="60" height="3" rx="1.5" fill="#bbb"/>
		</svg>
	),
	product_launch: (
		<svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg">
			<rect width="240" height="160" rx="4" fill="#ede7f6"/>
			<rect x="20" y="12" width="200" height="55" rx="4" fill="#4527a0"/>
			<rect x="50" y="20" width="140" height="7" rx="3.5" fill="#fff"/>
			<rect x="70" y="33" width="100" height="4" rx="2" fill="#fff" opacity=".6"/>
			<rect x="85" y="46" width="70" height="12" rx="6" fill="#fff"/>
			<rect x="96" y="50" width="48" height="4" rx="2" fill="#4527a0"/>
			<rect x="20" y="78" width="96" height="64" rx="4" fill="#d1c4e9"/>
			<rect x="32" y="86" width="72" height="36" rx="4" fill="#b39ddb" opacity=".5"/>
			<rect x="32" y="128" width="60" height="4" rx="2" fill="#4527a0"/>
			<rect x="124" y="78" width="96" height="64" rx="4" fill="#d1c4e9"/>
			<rect x="136" y="86" width="72" height="36" rx="4" fill="#b39ddb" opacity=".5"/>
			<rect x="136" y="128" width="60" height="4" rx="2" fill="#4527a0"/>
		</svg>
	),
	event_invite: (
		<svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg">
			<rect width="240" height="160" rx="4" fill="#e0f2f1"/>
			<rect x="30" y="12" width="180" height="50" rx="8" fill="#00695c" opacity=".9"/>
			<rect x="60" y="22" width="120" height="6" rx="3" fill="#fff"/>
			<rect x="80" y="34" width="80" height="3" rx="1.5" fill="#fff" opacity=".6"/>
			<rect x="80" y="42" width="80" height="10" rx="5" fill="#fff"/>
			<rect x="92" y="45" width="56" height="4" rx="2" fill="#00695c"/>
			<rect x="30" y="72" width="55" height="36" rx="4" fill="#b2dfdb"/>
			<rect x="36" y="78" width="24" height="4" rx="2" fill="#00695c"/>
			<rect x="36" y="86" width="43" height="3" rx="1.5" fill="#4db6ac" opacity=".6"/>
			<rect x="36" y="94" width="38" height="3" rx="1.5" fill="#4db6ac" opacity=".6"/>
			<rect x="92" y="72" width="55" height="36" rx="4" fill="#b2dfdb"/>
			<rect x="98" y="78" width="24" height="4" rx="2" fill="#00695c"/>
			<rect x="98" y="86" width="43" height="3" rx="1.5" fill="#4db6ac" opacity=".6"/>
			<rect x="98" y="94" width="38" height="3" rx="1.5" fill="#4db6ac" opacity=".6"/>
			<rect x="154" y="72" width="55" height="36" rx="4" fill="#b2dfdb"/>
			<rect x="160" y="78" width="24" height="4" rx="2" fill="#00695c"/>
			<rect x="160" y="86" width="43" height="3" rx="1.5" fill="#4db6ac" opacity=".6"/>
			<rect x="160" y="94" width="38" height="3" rx="1.5" fill="#4db6ac" opacity=".6"/>
			<rect x="60" y="120" width="120" height="24" rx="4" fill="#e0f2f1"/>
			<rect x="72" y="128" width="96" height="4" rx="2" fill="#00695c" opacity=".4"/>
		</svg>
	),
	abandoned_cart: (
		<svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg">
			<rect width="240" height="160" rx="4" fill="#fff3e0"/>
			<rect x="40" y="14" width="160" height="6" rx="3" fill="#e65100"/>
			<rect x="60" y="26" width="120" height="3" rx="1.5" fill="#ff9800" opacity=".5"/>
			<rect x="30" y="40" width="180" height="50" rx="4" fill="#fff"/>
			<rect x="42" y="48" width="36" height="36" rx="4" fill="#ffe0b2"/>
			<rect x="86" y="50" width="80" height="4" rx="2" fill="#333"/>
			<rect x="86" y="60" width="60" height="3" rx="1.5" fill="#999"/>
			<rect x="86" y="70" width="40" height="4" rx="2" fill="#e65100"/>
			<rect x="178" y="58" width="20" height="20" rx="4" fill="#e65100" opacity=".15"/>
			<rect x="65" y="100" width="110" height="14" rx="7" fill="#e65100"/>
			<rect x="78" y="104" width="84" height="6" rx="3" fill="#fff"/>
			<rect x="60" y="124" width="120" height="3" rx="1.5" fill="#ffcc80" opacity=".5"/>
			<rect x="70" y="134" width="100" height="3" rx="1.5" fill="#ffcc80" opacity=".5"/>
		</svg>
	),
	feedback: (
		<svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg">
			<rect width="240" height="160" rx="4" fill="#f3e5f5"/>
			<circle cx="120" cy="30" r="16" fill="#7b1fa2" opacity=".15"/>
			<rect x="112" y="24" width="16" height="12" rx="3" fill="#7b1fa2"/>
			<rect x="50" y="56" width="140" height="5" rx="2.5" fill="#7b1fa2"/>
			<rect x="60" y="66" width="120" height="3" rx="1.5" fill="#ce93d8" opacity=".5"/>
			<circle cx="76" cy="88" r="8" fill="#f3e5f5" stroke="#7b1fa2" strokeWidth="2"/>
			<circle cx="100" cy="88" r="8" fill="#f3e5f5" stroke="#7b1fa2" strokeWidth="2"/>
			<circle cx="124" cy="88" r="8" fill="#f3e5f5" stroke="#7b1fa2" strokeWidth="2"/>
			<circle cx="148" cy="88" r="8" fill="#f3e5f5" stroke="#7b1fa2" strokeWidth="2"/>
			<circle cx="172" cy="88" r="8" fill="#7b1fa2"/>
			<rect x="40" y="108" width="160" height="24" rx="4" fill="#fff"/>
			<rect x="52" y="116" width="100" height="3" rx="1.5" fill="#bbb"/>
			<rect x="80" y="140" width="80" height="10" rx="5" fill="#7b1fa2"/>
		</svg>
	),
	reengagement: (
		<svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg">
			<rect width="240" height="160" rx="4" fill="#e8eaf6"/>
			<rect x="30" y="14" width="180" height="40" rx="4" fill="#283593"/>
			<rect x="60" y="22" width="120" height="6" rx="3" fill="#fff"/>
			<rect x="70" y="34" width="100" height="3" rx="1.5" fill="#fff" opacity=".6"/>
			<rect x="30" y="64" width="180" height="3" rx="1.5" fill="#5c6bc0" opacity=".4"/>
			<rect x="30" y="72" width="160" height="3" rx="1.5" fill="#5c6bc0" opacity=".4"/>
			<rect x="30" y="80" width="140" height="3" rx="1.5" fill="#5c6bc0" opacity=".4"/>
			<rect x="65" y="96" width="50" height="12" rx="6" fill="#283593"/>
			<rect x="125" y="96" width="50" height="12" rx="6" fill="#fff" stroke="#283593" strokeWidth="1.5"/>
			<rect x="60" y="122" width="120" height="3" rx="1.5" fill="#9fa8da" opacity=".4"/>
			<rect x="80" y="134" width="80" height="3" rx="1.5" fill="#9fa8da" opacity=".4"/>
		</svg>
	),
};

const TEMPLATE_IMAGE_MAP = [
	// Order matters: more specific names must be matched before the broader
	// category keys, otherwise e.g. "Seasonal Sale" (category: promotional)
	// would resolve to the promotional image.
	{ keys: [ 'seasonal', 'sale' ], file: 'template-seasonal-sale.webp' },
	{ keys: [ 'digest', 'roundup' ], file: 'template-digest-roundup.webp' },
	{ keys: [ 'event', 'invitation', 'invite' ], file: 'template-event-invitation.webp' },
	{ keys: [ 'feedback', 'survey' ], file: 'template-feedback-request.webp' },
	{ keys: [ 'minimal', 'dark' ], file: 'template-minimal-dark.webp' },
	{ keys: [ 'modern', 'card' ], file: 'template-modern-card.webp' },
	{ keys: [ 'newsletter', 'classic' ], file: 'template-newsletter-classic.webp' },
	{ keys: [ 'notification', 'alert', 'announcement', 'update' ], file: 'template-notification-alert.webp' },
	{ keys: [ 'product', 'launch' ], file: 'template-product-launch.webp' },
	{ keys: [ 're-engagement', 'reengagement', 'winback' ], file: 'template-re-engagement.webp' },
	{ keys: [ 'transactional', 'receipt' ], file: 'template-transactional-receipt.webp' },
	{ keys: [ 'welcome', 'onboard' ], file: 'template-welcome-email.webp' },
	{ keys: [ 'promotional', 'promotion', 'offer', 'flash', 'discount' ], file: 'template-promotional-offer.webp' },
	{ keys: [ 'simple', 'text', 'plain' ], file: 'template-simple-text.webp' },
];

const getTemplateImage = ( template ) => {
	const haystack = `${ template.title || '' } ${ template.name || '' } ${ template.category || '' }`.toLowerCase();
	const match = TEMPLATE_IMAGE_MAP.find( ( item ) => item.keys.some( ( key ) => haystack.includes( key ) ) );
	return `${ window.aimeData?.pluginUrl || '' }assets/img/templates/${ match?.file || 'template-modern-card.webp' }`;
};

/* ======================================== component ======================================== */

const CampaignEditor = ( { id: propId, templateId, initialStep, onBack, onNavigate } ) => {
	const [ campaignId, setCampaignId ] = useState( propId );
	const savedIdRef = useRef( propId !== 'new' ? propId : null );
	const savingRef = useRef( false );
	const sendingRef = useRef( false );
	const isNew = campaignId === 'new';
	const id = campaignId;
	const { get, post, put, loading } = useApi( { toastErrors: true } );
	const slowWarning = useSlowWarning();
	const hasPro = isProActive();
	const freeLimits = window.aimeData?.freeLimits || {};
	const freeTemplateLimit = Number( freeLimits.email_template_imports_free || 4 );

	/* ---- state ---- */
	const [ step, setStep ] = useState( initialStep || 0 );
	const [ campaign, setCampaign ] = useState( null );
	const [ form, setForm ] = useState( {
		title: '',
		email_subject: '',
		email_pre_header: '',
		email_body: '',
		template_id: 0,
		settings: {},
	} );
	const [ notice, setNotice ] = useState( null );
	/* ---- unsaved-changes tracking: snapshot of the last loaded/saved form ---- */
	const savedFormRef = useRef( null );
	useEffect( () => {
		if ( savedFormRef.current === null ) {
			savedFormRef.current = JSON.stringify( form );
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [] );
	const isDirty = savedFormRef.current !== null && JSON.stringify( form ) !== savedFormRef.current;
	useEffect( () => {
		const handler = ( e ) => {
			if ( isDirty ) {
				e.preventDefault();
				e.returnValue = '';
			}
		};
		window.addEventListener( 'beforeunload', handler );
		return () => window.removeEventListener( 'beforeunload', handler );
	}, [ isDirty ] );
	const handleBack = () => {
		if ( isDirty && ! window.confirm( __( 'You have unsaved changes. Leave without saving?', 'ai-marketing-expert' ) ) ) {
			return;
		}
		onBack();
	};
	const [ savingDraft, setSavingDraft ] = useState( false );
	const [ sendingCampaign, setSendingCampaign ] = useState( false );
	const [ tags, setTags ] = useState( [] );
	const [ lists, setLists ] = useState( [] );
	const [ templates, setTemplates ] = useState( [] );
	const [ installingDefaults, setInstallingDefaults ] = useState( false );
	const [ emailSettings, setEmailSettings ] = useState( {} );
	const [ recipientMode, setRecipientMode ] = useState( 'all' );
	const [ recipientType, setRecipientType ] = useState( 'lists' );
	const [ selectedRecipients, setSelectedRecipients ] = useState( [] );
	const [ smartSegment, setSmartSegment ] = useState( { type: 'most_engaged', days: 90, limit: 500 } );
	const [ excludedLists, setExcludedLists ] = useState( [] );
	const [ excludedTags, setExcludedTags ] = useState( [] );
	const [ showExclude, setShowExclude ] = useState( false );
	const [ contactCount, setContactCount ] = useState( null );
	const [ countLoading, setCountLoading ] = useState( false );
	const [ audienceRange, setAudienceRange ] = useState( [ 0, 0 ] ); // [ start, end ] - 0,0 means "all"
	const [ aiSubject, setAiSubject ] = useState( null );
	const [ aiSubjectTarget, setAiSubjectTarget ] = useState( 'subject_a' );
	const [ aiPreviewText, setAiPreviewText ] = useState( null );
	const [ aiLoading, setAiLoading ] = useState( null );
	const [ aiBodyLoading, setAiBodyLoading ] = useState( false );
	const [ aiWriterOpen, setAiWriterOpen ] = useState( false );
	const [ templatePickerOpen, setTemplatePickerOpen ] = useState( false );
	const [ aiPrompt, setAiPrompt ] = useState( '' );
	const [ aiTone, setAiTone ] = useState( 'professional' );
	const [ aiLayoutMode, setAiLayoutMode ] = useState( 'simple-html' );
	const [ utmSource, setUtmSource ] = useState( '' );
	const [ utmMedium, setUtmMedium ] = useState( 'email' );
	const [ utmCampaign, setUtmCampaign ] = useState( '' );
	const [ utmEnabled, setUtmEnabled ] = useState( false );
	const [ sendThrottle, setSendThrottle ] = useState( '0' );
	const [ stepErrors, setStepErrors ] = useState( {} );
	/* Modal states for Send Test and Schedule */
	const [ testModalOpen, setTestModalOpen ] = useState( false );
	const [ testEmail, setTestEmail ] = useState( '' );
	const [ scheduleModalOpen, setScheduleModalOpen ] = useState( false );
	const [ scheduleDate, setScheduleDate ] = useState( '' );
	const [ scheduleTime, setScheduleTime ] = useState( '' );
	/* A/B testing */
	const [ abEnabled, setAbEnabled ] = useState( false );
	const [ abSubject, setAbSubject ] = useState( '' );
	const [ abVariantId, setAbVariantId ] = useState( null );

	/* ---- data fetching ---- */
	const [ skipFetch, setSkipFetch ] = useState( false );
	const fetchCampaign = useCallback( async () => {
		if ( isNew || skipFetch ) return;
		try {
			const data = await get( `/email/campaigns/${ id }` );
			setCampaign( data );
			const loadedForm = {
				// A campaign has an id before it has a name — the row exists the
				// moment the editor opens, and saving refuses a blank name. The id
				// stands in so the field is never empty and the required-field error
				// never fires on a campaign the user only wanted to open; it is an
				// ordinary editable value, not a lock.
				title: data.title || sprintf(
					/* translators: %s: campaign id */
					__( 'Campaign #%s', 'ai-marketing-expert' ),
					id
				),
				email_subject: data.email_subject || '',
				email_pre_header: data.email_pre_header || '',
				email_body: data.email_body || '',
				template_id: data.template_id || 0,
				settings: data.settings || {},
			};
			setForm( loadedForm );
			savedFormRef.current = JSON.stringify( loadedForm );
			const s = typeof data.settings === 'string' ? JSON.parse( data.settings || '{}' ) : ( data.settings || {} );
				if ( s.all ) { setRecipientMode( 'all' ); }
			else if ( s.lists ) { setRecipientMode( 'specific' ); setRecipientType( 'lists' ); setSelectedRecipients( s.lists ); }
			else if ( s.tags ) { setRecipientMode( 'specific' ); setRecipientType( 'tags' ); setSelectedRecipients( s.tags ); }
			else if ( s.segments?.length ) {
				const savedSegment = s.segments[ 0 ];
				setRecipientMode( 'specific' );
				setRecipientType( 'segments' );
				setSelectedRecipients( [ savedSegment.type || 'most_engaged' ] );
				setSmartSegment( {
					type: savedSegment.type || 'most_engaged',
					days: savedSegment.days || 90,
					limit: savedSegment.limit || 500,
				} );
			}
			if ( s.exclude_lists?.length || s.exclude_tags?.length ) {
				setShowExclude( true );
				if ( s.exclude_lists ) setExcludedLists( s.exclude_lists );
				if ( s.exclude_tags ) setExcludedTags( s.exclude_tags );
			}
			// UTM values are stored in top-level campaign columns, not inside settings.
			if ( data.utm_status ) setUtmEnabled( !! parseInt( data.utm_status ) );
			if ( data.utm_source ) setUtmSource( data.utm_source );
			if ( data.utm_medium ) setUtmMedium( data.utm_medium );
			if ( data.utm_campaign ) setUtmCampaign( data.utm_campaign );
			if ( s.send_throttle ) setSendThrottle( String( s.send_throttle ) );
			if ( s.audience_offset != null && s.audience_limit != null ) {
				setAudienceRange( [ s.audience_offset, s.audience_offset + s.audience_limit ] );
			}
			/* A/B variants */
			if ( data.ab_variants?.length > 0 ) {
				setAbEnabled( true );
				setAbSubject( data.ab_variants[ 0 ].email_subject || '' );
				setAbVariantId( data.ab_variants[ 0 ].id );
			}
		} catch ( e ) { /* */ }
	}, [ get, id, isNew, skipFetch ] );

	const fetchMeta = useCallback( async () => {
		try {
			const [ t, l, tp, settings ] = await Promise.all( [
				get( '/email/tags' ),
				get( '/email/lists' ),
				get( '/email/templates', { per_page: 100 } ),
				get( '/email/settings' ),
			] );
			setTags( t || [] );
			setLists( l || [] );
			setTemplates( ( tp?.items || tp || [] ) );
			setEmailSettings( settings || {} );
		} catch ( e ) { /* */ }
	}, [ get ] );

	const handleInstallDefaults = useCallback( async () => {
		setInstallingDefaults( true );
		try {
			await post( '/email/templates/install-defaults' );
			const tp = await get( '/email/templates', { per_page: 100 } );
			setTemplates( ( tp?.items || tp || [] ) );
		} catch ( e ) { /* */ } finally {
			setInstallingDefaults( false );
		}
	}, [ post, get ] );

	useEffect( () => { fetchCampaign(); }, [ fetchCampaign ] );
	useEffect( () => { fetchMeta(); }, [ fetchMeta ] );

	/* ---- Fetch recipient count whenever selection changes ---- */
	const fetchContactCount = useCallback( async () => {
		setCountLoading( true );
		try {
			const params = { mode: recipientMode === 'all' ? 'all' : recipientType };
			if ( recipientMode === 'specific' ) {
				if ( recipientType === 'lists' ) params.list_ids = selectedRecipients;
				else if ( recipientType === 'tags' ) params.tag_ids = selectedRecipients;
				else {
					params.segment_type = smartSegment.type;
					params.segment_days = smartSegment.days;
					params.segment_limit = smartSegment.limit;
				}
			}
			if ( showExclude ) {
				if ( excludedLists.length ) params.exclude_list_ids = excludedLists;
				if ( excludedTags.length ) params.exclude_tag_ids = excludedTags;
			}
			const res = await get( '/email/subscribers/count', params );
			const total = res?.total ?? 0;
			setContactCount( total );
			setAudienceRange( [ 0, total ] );
		} catch ( e ) {
			setContactCount( null );
		} finally {
			setCountLoading( false );
		}
	}, [ get, recipientMode, recipientType, selectedRecipients, smartSegment, showExclude, excludedLists, excludedTags ] );

	useEffect( () => { fetchContactCount(); }, [ fetchContactCount ] );

	/* Load template when coming from Template Library "Use This Template" */
	useEffect( () => {
		if ( ! templateId || ! isNew ) return;
		( async () => {
			try {
				const tpl = await get( `/email/templates/${ templateId }` );
				if ( tpl?.content ) {
					setForm( ( prev ) => ( {
						...prev,
						email_body: tpl.content,
						email_subject: tpl.subject || prev.email_subject,
						template_id: tpl.id || templateId,
					} ) );
				}
			} catch ( e ) { /* */ }
		} )();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ templateId ] );

	/* ---- step validation ---- */
	const validateStep = ( s ) => {
		const errors = {};
		if ( s === 0 ) {
			if ( ! form.email_body || form.email_body.replace( /<[^>]*>/g, '' ).trim() === '' ) {
				errors.email_body = __( 'Email body is required.', 'ai-marketing-expert' );
			}
		}
		if ( s === 1 ) {
			if ( ! form.title.trim() ) {
				errors.title = __( 'Campaign name is required.', 'ai-marketing-expert' );
			}
			if ( ! form.email_subject.trim() ) {
				errors.email_subject = __( 'Subject line is required.', 'ai-marketing-expert' );
			}
			if ( abEnabled && ! abSubject.trim() ) {
				errors.ab_subject = __( 'Subject B is required when A/B testing is enabled.', 'ai-marketing-expert' );
			}
		}
		if ( s === 2 ) {
			if ( recipientMode !== 'all' && selectedRecipients.length === 0 ) {
				errors.recipients = __( 'Please select at least one audience.', 'ai-marketing-expert' );
			}
		}
		return errors;
	};

	/* ---- actions ---- */
	const buildPayload = () => {
		const settings = {};
		if ( recipientMode === 'all' ) {
			settings.all = true;
		} else if ( recipientType === 'lists' ) {
			settings.lists = selectedRecipients;
		} else if ( recipientType === 'tags' ) {
			settings.tags = selectedRecipients;
		} else {
			settings.segments = [ smartSegment ];
		}
		if ( showExclude ) {
			if ( excludedLists.length > 0 ) settings.exclude_lists = excludedLists;
			if ( excludedTags.length > 0 ) settings.exclude_tags = excludedTags;
		}
		if ( hasPro && sendThrottle ) settings.send_throttle = parseInt( sendThrottle );
		// Audience range - only save if user narrowed from total
		if ( hasPro && contactCount && ( audienceRange[ 0 ] > 0 || audienceRange[ 1 ] < contactCount ) ) {
			settings.audience_offset = audienceRange[ 0 ];
			settings.audience_limit  = audienceRange[ 1 ] - audienceRange[ 0 ];
		}
		// UTM values go as top-level params so the backend saves them to dedicated
		// utm_* DB columns (not inside the settings JSON blob).
		const payload = { ...form, settings };
		if ( hasPro ) {
			payload.utm_status   = utmEnabled ? 1 : 0;
			payload.utm_source   = utmSource;
			payload.utm_medium   = utmMedium;
			payload.utm_campaign = utmCampaign;
		}
		return payload;
	};

	const chooseProFeature = ( message ) => {
		setNotice( { type: 'warning', message } );
	};

	const handleSave = async () => {
		if ( savingRef.current ) {
			return;
		}

		savingRef.current = true;
		setSavingDraft( true );
		const payload = buildPayload();
		try {
			let parentId;
			if ( isNew && ! savedIdRef.current ) {
				const res = await post( '/email/campaigns', payload );
				setSkipFetch( true );
				setCampaignId( res.id );
				savedIdRef.current = res.id;
				parentId = res.id;
				// Update the hash URL so a page reload re-opens this campaign
				// (and loads its content) instead of a fresh empty draft.
				if ( typeof onNavigate === 'function' ) {
					onNavigate( 'campaign-editor', { id: res.id } );
				}
				setNotice( { type: 'success', message: __( 'Campaign created.', 'ai-marketing-expert' ) } );
			} else {
				parentId = savedIdRef.current || id;
				await put( `/email/campaigns/${ parentId }`, payload );
				setNotice( { type: 'success', message: __( 'Campaign saved.', 'ai-marketing-expert' ) } );
			}
			/* A/B variant */
			if ( abEnabled && abSubject.trim() && parentId ) {
				if ( abVariantId ) {
					await put( `/email/campaigns/${ abVariantId }`, { email_subject: abSubject } );
				} else {
					const vRes = await post( `/email/campaigns/${ parentId }/variant`, { email_subject: abSubject } );
					setAbVariantId( vRes.id );
				}
			}
			savedFormRef.current = JSON.stringify( form );
		} catch ( e ) {
			setNotice( { type: 'error', message: e.message } );
		} finally {
			savingRef.current = false;
			setSavingDraft( false );
		}
	};

	const handleSend = async ( scheduledAt = '' ) => {
		if ( sendingRef.current ) {
			return;
		}

		sendingRef.current = true;
		setSendingCampaign( true );
		try {
			const payload = buildPayload();
			let cid = savedIdRef.current || id;
			if ( isNew && ! savedIdRef.current ) {
				const res = await post( '/email/campaigns', payload );
				cid = res.id;
				savedIdRef.current = cid;
				setCampaignId( cid );
				if ( typeof onNavigate === 'function' ) {
					onNavigate( 'campaign-editor', { id: cid } );
				}
			} else {
				await put( `/email/campaigns/${ cid }`, payload );
			}
			await post( `/email/campaigns/${ cid }/send`, { scheduled_at: scheduledAt } );
			setNotice( { type: 'success', message: scheduledAt ? __( 'Campaign scheduled.', 'ai-marketing-expert' ) : __( 'Campaign sending.', 'ai-marketing-expert' ) } );
			onNavigate( 'campaign-progress', { id: cid, sendStartedAt: scheduledAt ? 0 : Date.now() } );
		} catch ( e ) {
			setNotice( { type: 'error', message: e.message } );
			sendingRef.current = false;
			setSendingCampaign( false );
		}
	};

	const handleTestSend = async () => {
		if ( ! testEmail ) return;
		try {
			await post( `/email/campaigns/${ savedIdRef.current || id }/test`, { email: testEmail } );
			setNotice( { type: 'success', message: __( 'Test email sent!', 'ai-marketing-expert' ) } );
			setTestModalOpen( false );
			setTestEmail( '' );
		} catch ( e ) {
			setNotice( { type: 'error', message: e.message } );
		}
	};

	const handleSchedule = () => {
		if ( ! hasPro ) {
			setNotice( { type: 'warning', message: __( 'Free sites can schedule up to 3 campaigns. Upgrade to Pro for unlimited scheduled campaigns.', 'ai-marketing-expert' ) } );
		}
		if ( ! scheduleDate ) return;
		// The picker collects a site-time wall clock; the column is UTC.
		const dt = siteDateTimeToUtc( scheduleDate, scheduleTime );
		// An empty conversion means the date could not be parsed. handleSend( '' )
		// is the send-now path, so bail rather than blasting the campaign.
		if ( ! dt ) {
			setNotice( { type: 'error', message: __( 'That schedule date could not be read. Pick the date and time again.', 'ai-marketing-expert' ) } );
			return;
		}
		setScheduleModalOpen( false );
		handleSend( dt );
	};

	/* AI helpers */
	// The button is live whether or not the field has text. Empty field: the
	// email body is the brief and the AI writes the line. Text already there:
	// that text is the angle and the body is the context, so the rewrite keeps
	// what the user meant instead of ignoring it. A disabled button here only
	// taught people to type a throwaway subject to unlock the thing that writes
	// subjects.
	const handleAiSubject = async ( target = 'subject_a' ) => {
		const subject = target === 'subject_b' ? ( abSubject || form.email_subject ) : form.email_subject;
		const body = plainBody( form.email_body );
		if ( ! subject && ! body && ! form.title ) {
			setNotice( { type: 'warning', message: __( 'Write the email body first, or type a subject line — the AI needs something to work from.', 'ai-marketing-expert' ) } );
			return;
		}
		setAiSubjectTarget( target );
		setAiLoading( target );
		slowWarning.start();
		try {
			const res = await post( '/email/ai/optimize-subject', {
				subject,
				campaign_name: form.title,
				content: body,
			} );
			setAiSubject( res );
		} catch ( e ) { /* */ } finally {
			slowWarning.stop();
			setAiLoading( null );
		}
	};

	const applyAiSubjectSuggestion = ( suggestion ) => {
		if ( aiSubjectTarget === 'subject_b' ) {
			setAbSubject( suggestion );
			setStepErrors( ( prev ) => { const n = { ...prev }; delete n.ab_subject; return n; } );
		} else {
			setForm( ( prev ) => ( { ...prev, email_subject: suggestion } ) );
			setStepErrors( ( prev ) => { const n = { ...prev }; delete n.email_subject; return n; } );
		}
		setAiSubject( null );
	};

	const handleAiPreviewText = async () => {
		const subject = form.email_subject || abSubject;
		const body = plainBody( form.email_body );
		if ( ! subject && ! body && ! form.title ) {
			setNotice( { type: 'warning', message: __( 'Write the email body first, or type a subject line — the AI needs something to work from.', 'ai-marketing-expert' ) } );
			return;
		}
		setAiLoading( 'preview_text' );
		slowWarning.start();
		try {
			const res = await post( '/email/ai/generate-preview-text', {
				subject,
				campaign_name: form.title,
				content: body,
				// Whatever is in the field already is the user's angle, so it
				// goes to the AI as a starting point rather than being thrown away.
				current: form.email_pre_header,
			} );
			setAiPreviewText( res );
		} catch ( e ) { /* */ } finally {
			slowWarning.stop();
			setAiLoading( null );
		}
	};

	const applyAiPreviewTextSuggestion = ( suggestion ) => {
		setForm( ( prev ) => ( { ...prev, email_pre_header: suggestion } ) );
		setAiPreviewText( null );
	};

	const handleAiGenerateBody = async ( customPrompt, customTone, customLayoutMode ) => {
		setAiBodyLoading( true );
		const prompt      = customPrompt || aiPrompt || form.title || form.email_subject || 'professional marketing email';
		const style       = customTone || aiTone || 'professional';
		const layout_mode = customLayoutMode || aiLayoutMode || 'simple-html';
		if ( ! hasPro && ( PRO_AI_TONES.includes( style ) || layout_mode === 'table-safe' ) ) {
			setAiBodyLoading( false );
			chooseProFeature( __( 'Advanced AI tones and table-safe email layout are available in Pro.', 'ai-marketing-expert' ) );
			return;
		}
		slowWarning.start();
		try {
			const res = await post( '/email/ai/generate-template', { prompt, style, layout_mode } );
			if ( res.html ) {
				setForm( ( prev ) => ( { ...prev, email_body: res.html } ) );
				setAiWriterOpen( false );
			}
		} catch ( e ) { /* */ } finally {
			slowWarning.stop();
			setAiBodyLoading( false );
		}
	};

	/* Insert merge tag into TinyMCE or fallback */
	const handleInsertMergeTag = ( tag ) => {
		const editor = window.tinymce?.get( 'aime-campaign-editor' );
		if ( editor && ! editor.isHidden() ) {
			editor.insertContent( tag );
		} else {
			setForm( ( prev ) => ( { ...prev, email_body: prev.email_body + tag } ) );
		}
	};

	/* Navigation helpers */
	const goNext = async () => {
		const errors = validateStep( step );
		if ( Object.keys( errors ).length > 0 ) {
			setStepErrors( errors );
			return;
		}
		setStepErrors( {} );

		/* Auto-save before entering Review step so send/schedule buttons are available. */
		if ( step === STEPS.length - 2 ) {
			if ( savingRef.current ) {
				return;
			}

			savingRef.current = true;
			setSavingDraft( true );
			const payload = buildPayload();
			try {
				if ( isNew && ! savedIdRef.current ) {
					const res = await post( '/email/campaigns', payload );
					savedIdRef.current = res.id;
					setCampaignId( res.id );
					setSkipFetch( true );
					if ( typeof onNavigate === 'function' ) {
						onNavigate( 'campaign-editor', { id: res.id } );
					}
				} else {
					await put( `/email/campaigns/${ savedIdRef.current || id }`, payload );
				}
				/* A/B variant - create or update */
				const parentId = savedIdRef.current || id;
				if ( abEnabled && abSubject.trim() ) {
					if ( abVariantId ) {
						await put( `/email/campaigns/${ abVariantId }`, { email_subject: abSubject } );
					} else {
						const vRes = await post( `/email/campaigns/${ parentId }/variant`, { email_subject: abSubject } );
						setAbVariantId( vRes.id );
					}
				}
			} catch ( e ) {
				setNotice( { type: 'error', message: e.message } );
				return;
			} finally {
				savingRef.current = false;
				setSavingDraft( false );
			}
		}

		setStep( ( s ) => Math.min( s + 1, STEPS.length - 1 ) );
	};
	const goPrev = () => { setStepErrors( {} ); setStep( ( s ) => Math.max( s - 1, 0 ) ); };

	const recipientOptions = recipientType === 'lists' ? lists : recipientType === 'tags' ? tags : SMART_SEGMENT_OPTIONS.map( ( segment ) => ( { id: segment.value, title: segment.label } ) );

	if ( loading && ! isNew && ! campaign && ! skipFetch ) {
		return <Loader variant="form" text={ __( 'Loading campaign...', 'ai-marketing-expert' ) } />;
	}

	/* ======= STEP RENDERERS ======= */

	const renderCompose = () => (
		<div className="aime-editor-compose">
			{ /* -------- AI Email Writer Panel -------- */ }
			<Card>
				<button
					type="button"
					className="aime-ai-writer-toggle"
					onClick={ () => setAiWriterOpen( ! aiWriterOpen ) }
				>
					<span className="aime-ai-writer-icon">{ '\u2728' }</span>
					<span className="aime-ai-writer-title">{ __( 'AI Email Writer', 'ai-marketing-expert' ) }</span>
					<span className="aime-ai-writer-desc">{ __( 'Describe your email and let AI write it for you', 'ai-marketing-expert' ) }</span>
					<span className={ `aime-ai-writer-arrow${ aiWriterOpen ? ' is-open' : '' }` }>{ '\u25BE' }</span>
				</button>

				{ aiWriterOpen && (
					<div className="aime-ai-writer-body">
						<div className="aime-premium-form-group">
							<label className="aime-premium-form-label">{ __( 'What should this email be about?', 'ai-marketing-expert' ) }</label>
							<textarea
								className="aime-premium-input"
								rows={ 3 }
								placeholder={ __( 'e.g. A spring sale announcement with 30% off all products, urgency-driven, include a hero section and CTA button...', 'ai-marketing-expert' ) }
								value={ aiPrompt }
								onChange={ ( e ) => setAiPrompt( e.target.value ) }
							/>
						</div>
						<div className="aime-premium-form-row">
							<div className="aime-premium-form-group" style={ { flex: 1 } }>
								<label className="aime-premium-form-label">{ __( 'Tone / Style', 'ai-marketing-expert' ) }</label>
								<select className="aime-premium-select" value={ aiTone } onChange={ ( e ) => ! hasPro && PRO_AI_TONES.includes( e.target.value ) ? chooseProFeature( __( 'Advanced AI tones are available in Pro.', 'ai-marketing-expert' ) ) : setAiTone( e.target.value ) }>
									<option value="professional">{ __( 'Professional', 'ai-marketing-expert' ) }</option>
									<option value="friendly">{ __( 'Friendly & Casual', 'ai-marketing-expert' ) }</option>
									<option value="urgent">{ __( 'Urgent / FOMO', 'ai-marketing-expert' ) }</option>
									<option value="storytelling">{ __( 'Storytelling', 'ai-marketing-expert' ) }</option>
									<option value="formal" disabled={ ! hasPro }>{ __( 'Formal / Corporate', 'ai-marketing-expert' ) }{ ! hasPro ? ' PRO' : '' }</option>
									<option value="humorous" disabled={ ! hasPro }>{ __( 'Humorous / Fun', 'ai-marketing-expert' ) }{ ! hasPro ? ' PRO' : '' }</option>
									<option value="minimalist" disabled={ ! hasPro }>{ __( 'Minimalist / Clean', 'ai-marketing-expert' ) }{ ! hasPro ? ' PRO' : '' }</option>
								</select>
							</div>
							<div className="aime-premium-form-group" style={ { flex: 1 } }>
								<label className="aime-premium-form-label">{ __( 'Layout Mode', 'ai-marketing-expert' ) }</label>
								<select className="aime-premium-select" value={ aiLayoutMode } onChange={ ( e ) => e.target.value === 'table-safe' && ! hasPro ? chooseProFeature( __( 'Table-safe email layout is available in Pro.', 'ai-marketing-expert' ) ) : setAiLayoutMode( e.target.value ) }>
									<option value="simple-html">{ __( 'Simple HTML', 'ai-marketing-expert' ) }</option>
									<option value="table-safe" disabled={ ! hasPro }>{ __( 'Table-safe email', 'ai-marketing-expert' ) }{ ! hasPro ? ' PRO' : '' }</option>
								</select>
							</div>
							<div className="aime-premium-form-group" style={ { display: 'flex', alignItems: 'flex-end' } }>
								{ aiBodyLoading ? (
									<LoadingBtn primary style={ { whiteSpace: 'nowrap' } }>{ __( '\u2728 Writing...', 'ai-marketing-expert' ) }</LoadingBtn>
								) : (
									<Button
										variant="primary"
										onClick={ () => handleAiGenerateBody( aiPrompt, aiTone, aiLayoutMode ) }
										disabled={ ! isAiConfigured() }
										title={ ! isAiConfigured() ? aiDisabledTitle() : undefined }
										style={ { whiteSpace: 'nowrap' } }
									>
										{ __( '\u2728 Generate Email', 'ai-marketing-expert' ) }
									</Button>
								) }
							</div>
						</div>
						{ form.email_body && (
							<p className="aime-muted" style={ { fontSize: 12, marginTop: 4 } }>
								{ __( 'Generating will replace the current email body.', 'ai-marketing-expert' ) }
							</p>
						) }
						<AiNotice />
					</div>
				) }
			</Card>

			<Card title={ __( 'Email Body', 'ai-marketing-expert' ) }>
				{ /* -------- Import Template Accordion -------- */ }
				<div className="aime-template-accordion">
					<button
						type="button"
						className="aime-template-accordion-toggle"
						onClick={ () => setTemplatePickerOpen( ! templatePickerOpen ) }
					>
						<span className="aime-template-accordion-icon">{ '\uD83D\uDCC4' }</span>
						<span className="aime-template-accordion-title">{ __( 'Import Template', 'ai-marketing-expert' ) }</span>
						<span className="aime-template-accordion-desc">{ __( 'Choose a pre-designed template to start with', 'ai-marketing-expert' ) }</span>
						<span className={ `aime-template-accordion-arrow${ templatePickerOpen ? ' is-open' : '' }` }>{ '\u25BE' }</span>
					</button>

					{ templatePickerOpen && (
						<div className="aime-template-accordion-body">
							{ templates.length > 0 ? (
								<div className="aime-template-picker-grid">
									{ templates.map( ( t, index ) => {
										const isActive = form.template_id === t.id;
										const isLocked = ! hasPro && index >= freeTemplateLimit;
										return (
											<button
												key={ t.id }
												type="button"
												className={ `aime-template-picker-card${ isActive ? ' is-active' : '' }${ isLocked ? ' is-pro-locked' : '' }` }
												onClick={ async () => {
													if ( isLocked ) {
														chooseProFeature( __( 'More email templates are available in Pro.', 'ai-marketing-expert' ) );
														return;
													}
													setForm( ( prev ) => ( { ...prev, template_id: t.id } ) );
													try {
														const tpl = await get( `/email/templates/${ t.id }` );
														if ( tpl && tpl.content ) {
															setForm( ( prev ) => ( { ...prev, email_body: tpl.content } ) );
														}
													} catch ( err ) { /* */ }
												} }
											>
												<div className="aime-template-picker-thumb">
													<img src={ getTemplateImage( t ) } alt={ t.name || t.title } loading="lazy" />
												</div>
												<div className="aime-template-picker-name">
													{ t.name || t.title }
												</div>
												{ isActive && <span className="aime-template-picker-check">{ '\u2713' }</span> }
												{ isLocked && <span className="aime-template-picker-check"><ProLabel /></span> }
											</button>
										);
									} ) }
								</div>
							) : (
								<div className="aime-template-picker-empty" style={ { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '4px 0' } }>
									<p className="aime-muted" style={ { margin: 0 } }>
										{ __( 'No templates yet. Install our ready-made designs to start in one click.', 'ai-marketing-expert' ) }
									</p>
									<Button
										variant="primary"
										onClick={ handleInstallDefaults }
										isBusy={ installingDefaults }
										disabled={ installingDefaults }
									>
										{ installingDefaults
											? __( 'Installing…', 'ai-marketing-expert' )
											: __( 'Install Default Templates', 'ai-marketing-expert' ) }
									</Button>
									{ typeof onNavigate === 'function' && (
										<Button variant="link" onClick={ () => onNavigate( 'templates' ) }>
											{ __( 'Manage templates', 'ai-marketing-expert' ) }
										</Button>
									) }
								</div>
							) }
						</div>
					) }
				</div>

				{ /* WordPress TinyMCE Editor (Visual + Text tabs built-in) */ }
				<WPEditor
					id="aime-campaign-editor"
					value={ form.email_body }
					onChange={ ( html ) => setForm( ( prev ) => ( { ...prev, email_body: html } ) ) }
					height={ 420 }
				/>

				{ /* Merge tags */ }
				<div className="aime-merge-tags-bar">
					<span className="aime-merge-tag-label">{ __( 'Insert:', 'ai-marketing-expert' ) }</span>
					{ MERGE_TAGS.map( ( mt ) => (
						<button key={ mt.tag } className="aime-merge-tag-chip" onClick={ () => handleInsertMergeTag( mt.tag ) }>{ mt.tag }</button>
					) ) }
				</div>

				{ stepErrors.email_body && (
					<p className="aime-field-error">{ stepErrors.email_body }</p>
				) }
			</Card>
		</div>
	);

	const renderSubjectSettings = () => (
		<div className="aime-editor-compose aime-editor-compose--narrow">
			<Card title={ __( 'Campaign Details', 'ai-marketing-expert' ) }>
				<div className="aime-premium-form-group">
					<label className="aime-premium-form-label">{ __( 'Campaign Name', 'ai-marketing-expert' ) } *</label>
					<input
						type="text"
						className={ `aime-premium-input${ stepErrors.title ? ' aime-input-error' : '' }` }
						placeholder={ __( 'e.g. Spring Sale Newsletter', 'ai-marketing-expert' ) }
						value={ form.title }
						onChange={ ( e ) => { setForm( { ...form, title: e.target.value } ); setStepErrors( ( prev ) => { const n = { ...prev }; delete n.title; return n; } ); } }
					/>
					{ stepErrors.title && <p className="aime-field-error">{ stepErrors.title }</p> }
				</div>

				<div className="aime-premium-form-group">
					<label className="aime-premium-form-label">{ __( 'Subject Line', 'ai-marketing-expert' ) } *</label>
					<div className="aime-input-with-action">
						<input
							type="text"
							className={ `aime-premium-input${ stepErrors.email_subject ? ' aime-input-error' : '' }` }
							placeholder={ __( 'Enter email subject line', 'ai-marketing-expert' ) }
							value={ form.email_subject }
							onChange={ ( e ) => { setForm( { ...form, email_subject: e.target.value } ); setStepErrors( ( prev ) => { const n = { ...prev }; delete n.email_subject; return n; } ); } }
						/>
						<button
							type="button"
							className="aime-btn-ai"
							onClick={ () => handleAiSubject( 'subject_a' ) }
							disabled={ ! isAiConfigured() || !! aiLoading }
							title={ ! isAiConfigured() ? aiDisabledTitle() : undefined }
						>
							{ aiLoading === 'subject_a' ? <><Spinner style={ { marginRight: 4 } } />{ __( '\u2728 Optimizing...', 'ai-marketing-expert' ) }</> : __( '\u2728 AI Optimize', 'ai-marketing-expert' ) }
						</button>
					</div>
					{ stepErrors.email_subject && <p className="aime-field-error">{ stepErrors.email_subject }</p> }
				</div>

				{ aiSubject && aiSubject.suggestions && (
					<div className="aime-ai-suggestions">
						<h4>
							{ aiSubjectTarget === 'subject_b' ? __( 'AI Suggestions for Subject B', 'ai-marketing-expert' ) : __( 'AI Suggestions for Subject A', 'ai-marketing-expert' ) }
							{ aiSubject.score && <span className="aime-muted"> ({ __( 'Score', 'ai-marketing-expert' ) }: { aiSubject.score }/100)</span> }
						</h4>
						{ aiSubject.suggestions.map( ( s, i ) => (
							<button key={ i } type="button" className="aime-ai-suggestion-chip" onClick={ () => applyAiSubjectSuggestion( s ) }>
								{ s }
							</button>
						) ) }
					</div>
				) }

				{ /* -------- A/B Testing Toggle -------- */ }
				<div className="aime-premium-form-group" style={ { marginTop: 8 } }>
					<label className="aime-checkbox-row">
						<input type="checkbox" checked={ hasPro && abEnabled } disabled={ ! hasPro } onChange={ ( e ) => { if ( ! hasPro ) { chooseProFeature( __( 'A/B testing is available in Pro.', 'ai-marketing-expert' ) ); return; } setAbEnabled( e.target.checked ); if ( ! e.target.checked ) { setAbSubject( '' ); } } } />
							<span className="aime-checkbox-label"><ProLabel>{ __( 'Enable A/B Testing', 'ai-marketing-expert' ) }</ProLabel></span>
					</label>
					<p className="aime-muted" style={ { fontSize: 12, marginTop: 2 } }>{ __( 'Test two subject lines - recipients are split 50/50 automatically.', 'ai-marketing-expert' ) }</p>
				</div>

				{ abEnabled && (
					<div className="aime-ab-test-panel">
						<div className="aime-ab-variant-row">
							<div className="aime-ab-variant">
								<span className="aime-ab-label aime-ab-label--a">A</span>
								<div className="aime-ab-variant-field">
									<label className="aime-premium-form-label">{ __( 'Subject A (Original)', 'ai-marketing-expert' ) }</label>
									<div className="aime-input-with-action">
										<input type="text" className="aime-premium-input" value={ form.email_subject } readOnly style={ { opacity: 0.7 } } />
										<button
											type="button"
											className="aime-btn-ai"
											onClick={ () => handleAiSubject( 'subject_a' ) }
											disabled={ ! isAiConfigured() || !! aiLoading }
											title={ ! isAiConfigured() ? aiDisabledTitle() : undefined }
										>
											{ aiLoading === 'subject_a' ? <><Spinner style={ { marginRight: 4 } } />{ __( '\u2728 ...', 'ai-marketing-expert' ) }</> : __( '\u2728 AI', 'ai-marketing-expert' ) }
										</button>
									</div>
								</div>
							</div>
							<div className="aime-ab-variant">
								<span className="aime-ab-label aime-ab-label--b">B</span>
								<div className="aime-ab-variant-field">
									<label className="aime-premium-form-label">{ __( 'Subject B (Variant)', 'ai-marketing-expert' ) }</label>
									<div className="aime-input-with-action">
										<input
											type="text"
											className={ `aime-premium-input${ stepErrors.ab_subject ? ' aime-input-error' : '' }` }
											placeholder={ __( 'Enter alternative subject line', 'ai-marketing-expert' ) }
											value={ abSubject }
											onChange={ ( e ) => { setAbSubject( e.target.value ); setStepErrors( ( prev ) => { const n = { ...prev }; delete n.ab_subject; return n; } ); } }
										/>
										<button
											type="button"
											className="aime-btn-ai"
											onClick={ () => handleAiSubject( 'subject_b' ) }
											disabled={ ! isAiConfigured() || !! aiLoading }
											title={ ! isAiConfigured() ? aiDisabledTitle() : undefined }
										>
											{ aiLoading === 'subject_b' ? <><Spinner style={ { marginRight: 4 } } />{ __( '\u2728 ...', 'ai-marketing-expert' ) }</> : __( '\u2728 AI', 'ai-marketing-expert' ) }
										</button>
									</div>
									{ stepErrors.ab_subject && <p className="aime-field-error">{ stepErrors.ab_subject }</p> }
								</div>
							</div>
						</div>
					</div>
				) }

				<div className="aime-premium-form-group">
					<label className="aime-premium-form-label">{ __( 'Preview Text', 'ai-marketing-expert' ) }</label>
					<div className="aime-input-with-action">
						<input
							type="text"
							className="aime-premium-input"
							placeholder={ __( 'Text shown in inbox preview', 'ai-marketing-expert' ) }
							value={ form.email_pre_header }
							onChange={ ( e ) => setForm( { ...form, email_pre_header: e.target.value } ) }
						/>
						<button
							type="button"
							className="aime-btn-ai"
							onClick={ handleAiPreviewText }
							disabled={ ! isAiConfigured() || !! aiLoading }
							title={ ! isAiConfigured() ? aiDisabledTitle() : undefined }
						>
							{ aiLoading === 'preview_text' ? <><Spinner style={ { marginRight: 4 } } />{ __( '\u2728 Writing...', 'ai-marketing-expert' ) }</> : __( '\u2728 AI Write', 'ai-marketing-expert' ) }
						</button>
					</div>
					{ aiPreviewText && aiPreviewText.suggestions && (
						<div className="aime-ai-suggestions">
							<h4>{ __( 'AI Preview Text Suggestions', 'ai-marketing-expert' ) }</h4>
							{ aiPreviewText.suggestions.map( ( s, i ) => (
								<button key={ i } type="button" className="aime-ai-suggestion-chip" onClick={ () => applyAiPreviewTextSuggestion( s ) }>
									{ s }
								</button>
							) ) }
						</div>
					) }
				</div>
			</Card>

			<Card title={ <span className="aime-pro-card-header">{ __( 'UTM Tracking', 'ai-marketing-expert' ) }{ ! hasPro && <ProLabel /> }</span> }>
				<label className="aime-checkbox-row">
					<input type="checkbox" checked={ hasPro && utmEnabled } disabled={ ! hasPro } onChange={ ( e ) => { if ( ! hasPro ) { chooseProFeature( __( 'UTM tracking is available in Pro.', 'ai-marketing-expert' ) ); return; } setUtmEnabled( e.target.checked ); } } />
					<span className="aime-checkbox-label">{ __( 'Enable UTM Tracking', 'ai-marketing-expert' ) }</span>
				</label>
				{ hasPro && utmEnabled && (
					<div className="aime-utm-fields">
						<div className="aime-premium-form-row">
							<div className="aime-premium-form-group">
								<label className="aime-premium-form-label">{ __( 'UTM Source', 'ai-marketing-expert' ) }</label>
								<input className="aime-premium-input" placeholder="newsletter" value={ utmSource } onChange={ ( e ) => setUtmSource( e.target.value ) } />
							</div>
							<div className="aime-premium-form-group">
								<label className="aime-premium-form-label">{ __( 'UTM Medium', 'ai-marketing-expert' ) }</label>
								<input className="aime-premium-input" placeholder="email" value={ utmMedium } onChange={ ( e ) => setUtmMedium( e.target.value ) } />
							</div>
						</div>
						<div className="aime-premium-form-group">
							<label className="aime-premium-form-label">{ __( 'UTM Campaign', 'ai-marketing-expert' ) }</label>
							<input className="aime-premium-input" placeholder={ form.title || 'campaign-name' } value={ utmCampaign } onChange={ ( e ) => setUtmCampaign( e.target.value ) } />
						</div>
					</div>
				) }
			</Card>

			<Card title={ <span className="aime-pro-card-header">{ __( 'Send Throttle', 'ai-marketing-expert' ) }{ ! hasPro && <ProLabel /> }</span> }>
				<div className="aime-premium-form-group">
					<label className="aime-premium-form-label">{ __( 'Emails per minute (0 = no limit)', 'ai-marketing-expert' ) }</label>
					<input className="aime-premium-input" type="number" min="0" value={ hasPro ? sendThrottle : '0' } disabled={ ! hasPro } onChange={ ( e ) => setSendThrottle( e.target.value ) } />
				</div>
				{ ! hasPro && <ProUpgradeButton /> }
				<p className="aime-muted" style={ { fontSize: 13, marginTop: 4 } }>
					{ __( 'Throttle sending to avoid provider rate limits. Set 0 for maximum speed.', 'ai-marketing-expert' ) }
				</p>
			</Card>
		</div>
	);

	const renderRecipients = () => (
		<div className="aime-editor-compose">
			<Card title={ __( 'Include Recipients', 'ai-marketing-expert' ) }>
				<div className="aime-premium-form-group">
					<label className="aime-premium-form-label">{ __( 'Send to', 'ai-marketing-expert' ) }</label>
					<div className="aime-recipient-type-toggle">
						<button
							type="button"
							className={ `aime-toggle-btn${ recipientMode === 'all' ? ' is-selected' : '' }` }
							onClick={ () => { setRecipientMode( 'all' ); setSelectedRecipients( [] ); } }
						>
							{ __( 'All Contacts', 'ai-marketing-expert' ) }
						</button>
						<button
							type="button"
							className={ `aime-toggle-btn${ recipientMode === 'specific' && recipientType === 'lists' ? ' is-selected' : '' }` }
							onClick={ () => { setRecipientMode( 'specific' ); setRecipientType( 'lists' ); setSelectedRecipients( [] ); } }
						>
							{ __( 'Lists', 'ai-marketing-expert' ) }
						</button>
						<button
							type="button"
							className={ `aime-toggle-btn${ recipientMode === 'specific' && recipientType === 'tags' ? ' is-selected' : '' }` }
							onClick={ () => { setRecipientMode( 'specific' ); setRecipientType( 'tags' ); setSelectedRecipients( [] ); } }
						>
							{ __( 'Tags', 'ai-marketing-expert' ) }
						</button>
						<button
							type="button"
							className={ `aime-toggle-btn${ recipientMode === 'specific' && recipientType === 'segments' ? ' is-selected' : '' }` }
							onClick={ () => {
								if ( ! hasPro ) {
									chooseProFeature( __( 'Smart Segments are available in Pro.', 'ai-marketing-expert' ) );
									return;
								}
								setRecipientMode( 'specific' ); setRecipientType( 'segments' ); setSelectedRecipients( [ smartSegment.type ] );
							} }
						>
							<span className="aime-pro-inline-action">{ __( 'Smart Segments', 'ai-marketing-expert' ) }{ ! hasPro && <ProLabel /> }</span>
						</button>
					</div>
				</div>

				{ recipientMode === 'all' && (
					<div className="aime-selected-summary">
						<span className="dashicons dashicons-groups" style={ { marginRight: 6, color: '#4f46e5' } } />
						{ __( 'Campaign will be sent to all subscribed contacts.', 'ai-marketing-expert' ) }
					</div>
				) }

				{ recipientMode === 'specific' && recipientType !== 'segments' && (
					<div className="aime-premium-form-group">
						<label className="aime-premium-form-label">
							{ recipientType === 'lists' ? __( 'Select Lists', 'ai-marketing-expert' ) : __( 'Select Tags', 'ai-marketing-expert' ) }
						</label>
						{ recipientOptions.length === 0 && (
							<p className="aime-muted" style={ { margin: '4px 0' } }>
								{ recipientType === 'lists'
									? __( 'No lists available. Create lists first.', 'ai-marketing-expert' )
									: __( 'No tags available. Create tags first.', 'ai-marketing-expert' ) }
							</p>
						) }
						<div className="aime-toggle-buttons">
							{ recipientOptions.map( ( item ) => {
								const isSelected = selectedRecipients.includes( item.id );
								return (
									<button
										key={ item.id }
										type="button"
										className={ `aime-toggle-btn${ isSelected ? ' is-selected' : '' }` }
										onClick={ () => {
											setSelectedRecipients( isSelected
												? selectedRecipients.filter( ( x ) => x !== item.id )
												: [ ...selectedRecipients, item.id ]
											);
											setStepErrors( ( prev ) => { const n = { ...prev }; delete n.recipients; return n; } );
										} }
										style={ item.color ? { '--tag-color': item.color } : {} }
									>
										{ item.color && <span className="aime-toggle-btn-dot" style={ { background: item.color } } /> }
										{ item.title }
									</button>
								);
							} ) }
						</div>
						{ stepErrors.recipients && <p className="aime-field-error">{ stepErrors.recipients }</p> }
					</div>
				) }

				{ recipientMode === 'specific' && recipientType === 'segments' && (
					<div className="aime-premium-form-group">
						<label className="aime-premium-form-label"><ProLabel>{ __( 'Select Smart Segment', 'ai-marketing-expert' ) }</ProLabel></label>
						<div className="aime-toggle-buttons">
							{ SMART_SEGMENT_OPTIONS.map( ( segment ) => {
								const isSelected = smartSegment.type === segment.value;
								return (
									<button
										key={ segment.value }
										type="button"
										className={ `aime-toggle-btn${ isSelected ? ' is-selected' : '' }` }
										onClick={ () => {
											setSmartSegment( { ...smartSegment, type: segment.value } );
											setSelectedRecipients( [ segment.value ] );
											setStepErrors( ( prev ) => { const n = { ...prev }; delete n.recipients; return n; } );
										} }
									>
										{ segment.label }
									</button>
								);
							} ) }
						</div>
						<div className="aime-two-col" style={ { marginTop: 16 } }>
							<div>
								<label className="aime-premium-form-label">{ __( 'Lookback Days', 'ai-marketing-expert' ) }</label>
								<input
									className="aime-premium-input"
									type="number"
									min="1"
									max="365"
									value={ smartSegment.days }
									onChange={ ( e ) => setSmartSegment( { ...smartSegment, days: Math.min( 365, Math.max( 1, parseInt( e.target.value || '90', 10 ) ) ) } ) }
								/>
							</div>
							<div>
								<label className="aime-premium-form-label">{ __( 'Maximum Contacts', 'ai-marketing-expert' ) }</label>
								<input
									className="aime-premium-input"
									type="number"
									min="1"
									max="5000"
									value={ smartSegment.limit }
									onChange={ ( e ) => setSmartSegment( { ...smartSegment, limit: Math.min( 5000, Math.max( 1, parseInt( e.target.value || '500', 10 ) ) ) } ) }
								/>
							</div>
						</div>
						{ stepErrors.recipients && <p className="aime-field-error">{ stepErrors.recipients }</p> }
					</div>
				) }

				{ recipientMode === 'specific' && selectedRecipients.length > 0 && recipientType !== 'segments' && (
					<div className="aime-selected-summary">
						<strong>{ selectedRecipients.length }</strong> { recipientType === 'lists' ? __( 'list(s) selected', 'ai-marketing-expert' ) : __( 'tag(s) selected', 'ai-marketing-expert' ) }
					</div>
				) }
				{ recipientMode === 'specific' && recipientType === 'segments' && (
					<div className="aime-selected-summary">
						<strong>{ SMART_SEGMENT_OPTIONS.find( ( item ) => item.value === smartSegment.type )?.label }</strong> { __( 'from recent engagement', 'ai-marketing-expert' ) }
					</div>
				) }
			</Card>

			{ /* Exclude section - only visible for All Contacts mode */ }
			{ recipientMode === 'all' && (
			<Card>
				<label className="aime-checkbox-row">
					<input type="checkbox" checked={ showExclude } onChange={ ( e ) => { setShowExclude( e.target.checked ); if ( ! e.target.checked ) { setExcludedLists( [] ); setExcludedTags( [] ); } } } />
					<span className="aime-checkbox-label">{ __( 'Exclude specific lists or tags', 'ai-marketing-expert' ) }</span>
				</label>

				{ showExclude && (
					<div className="aime-exclude-section">
						{ /* Exclude Lists */ }
						<div className="aime-premium-form-group" style={ { marginTop: 16 } }>
							<label className="aime-premium-form-label">{ __( 'Exclude Lists', 'ai-marketing-expert' ) }</label>
							<div className="aime-toggle-buttons">
								{ lists.map( ( item ) => {
									const isExcluded = excludedLists.includes( item.id );
									return (
										<button
											key={ item.id }
											type="button"
											className={ `aime-toggle-btn aime-toggle-btn--exclude${ isExcluded ? ' is-selected' : '' }` }
											onClick={ () => {
												setExcludedLists( isExcluded
													? excludedLists.filter( ( x ) => x !== item.id )
													: [ ...excludedLists, item.id ]
												);
											} }
										>
											{ item.title }
										</button>
									);
								} ) }
							</div>
							{ excludedLists.length > 0 && (
								<div className="aime-selected-summary aime-selected-summary--exclude" style={ { marginTop: 8 } }>
									<strong>{ excludedLists.length }</strong> { __( 'list(s) excluded', 'ai-marketing-expert' ) }
								</div>
							) }
						</div>

						{ /* Exclude Tags */ }
						<div className="aime-premium-form-group" style={ { marginTop: 16 } }>
							<label className="aime-premium-form-label">{ __( 'Exclude Tags', 'ai-marketing-expert' ) }</label>
							<div className="aime-toggle-buttons">
								{ tags.map( ( item ) => {
									const isExcluded = excludedTags.includes( item.id );
									return (
										<button
											key={ item.id }
											type="button"
											className={ `aime-toggle-btn aime-toggle-btn--exclude${ isExcluded ? ' is-selected' : '' }` }
											onClick={ () => {
												setExcludedTags( isExcluded
													? excludedTags.filter( ( x ) => x !== item.id )
													: [ ...excludedTags, item.id ]
												);
											} }
											style={ item.color ? { '--tag-color': item.color } : {} }
										>
											{ item.color && <span className="aime-toggle-btn-dot" style={ { background: item.color } } /> }
											{ item.title }
										</button>
									);
								} ) }
							</div>
							{ excludedTags.length > 0 && (
								<div className="aime-selected-summary aime-selected-summary--exclude" style={ { marginTop: 8 } }>
									<strong>{ excludedTags.length }</strong> { __( 'tag(s) excluded', 'ai-marketing-expert' ) }
								</div>
							) }
						</div>
					</div>
				) }
			</Card>
			) }

			{ /* -------- Contact count & audience range slider -------- */ }
			{ contactCount !== null && (
				<Card>
					<div className="aime-contact-count-bar">
						<span className="aime-contact-count-badge">{ countLoading ? '...' : ( audienceRange[ 1 ] - audienceRange[ 0 ] ).toLocaleString() }</span>
						{ ' ' }
						{ __( 'contacts found based on your selection', 'ai-marketing-expert' ) }
					</div>

					{ contactCount > 0 && (
						<div className="aime-audience-slider" style={ { marginTop: 20 } }>
							<label className="aime-premium-form-label"><ProLabel>{ __( 'Audience Range', 'ai-marketing-expert' ) }</ProLabel></label>
							<p className="aime-muted" style={ { margin: '0 0 12px', fontSize: 13 } }>
								{ __( 'Drag the handles to select a portion of your audience. Useful for splitting sends or A/B testing.', 'ai-marketing-expert' ) }
							</p>
							<div className="aime-range-slider-wrap">
								<input
									type="range"
									min={ 0 }
									max={ contactCount }
									step={ 1 }
									value={ audienceRange[ 0 ] }
									onChange={ ( e ) => {
										if ( ! hasPro ) {
											chooseProFeature( __( 'Audience Range is available in Pro.', 'ai-marketing-expert' ) );
											return;
										}
										const v = Math.min( parseInt( e.target.value ), audienceRange[ 1 ] );
										setAudienceRange( [ v, audienceRange[ 1 ] ] );
									} }
									className="aime-range-input aime-range-start"
								/>
								<input
									type="range"
									min={ 0 }
									max={ contactCount }
									step={ 1 }
									value={ audienceRange[ 1 ] }
									onChange={ ( e ) => {
										if ( ! hasPro ) {
											chooseProFeature( __( 'Audience Range is available in Pro.', 'ai-marketing-expert' ) );
											return;
										}
										const v = Math.max( parseInt( e.target.value ), audienceRange[ 0 ] );
										setAudienceRange( [ audienceRange[ 0 ], v ] );
									} }
									className="aime-range-input aime-range-end"
								/>
								<div
									className="aime-range-track-fill"
									style={ {
										left: `${ ( audienceRange[ 0 ] / contactCount ) * 100 }%`,
										width: `${ ( ( audienceRange[ 1 ] - audienceRange[ 0 ] ) / contactCount ) * 100 }%`,
									} }
								/>
							</div>
							<div className="aime-range-labels">
								<span>0</span>
								{ [ 0.25, 0.5, 0.75 ].map( ( pct ) => {
									const v = Math.round( contactCount * pct );
									return <span key={ pct }>{ v.toLocaleString() }</span>;
								} ) }
								<span>{ contactCount.toLocaleString() }</span>
							</div>
							<div className="aime-range-selection-info">
								<span>{ __( 'From:', 'ai-marketing-expert' ) } <strong>{ audienceRange[ 0 ].toLocaleString() }</strong></span>
								<span>{ __( 'To:', 'ai-marketing-expert' ) } <strong>{ audienceRange[ 1 ].toLocaleString() }</strong></span>
								<span>{ __( 'Sending to:', 'ai-marketing-expert' ) } <strong>{ ( audienceRange[ 1 ] - audienceRange[ 0 ] ).toLocaleString() }</strong> { __( 'contacts', 'ai-marketing-expert' ) }</span>
							</div>
							{ ! hasPro && <ProUpgradeButton /> }
							{ hasPro && ( audienceRange[ 0 ] > 0 || audienceRange[ 1 ] < contactCount ) && (
								<Button variant="link" onClick={ () => setAudienceRange( [ 0, contactCount ] ) } style={ { marginTop: 4 } }>
									{ __( 'Reset to all contacts', 'ai-marketing-expert' ) }
								</Button>
							) }
						</div>
					) }
				</Card>
			) }
		</div>
	);

	const renderReview = () => {
		const previewEmailBody = form.email_body ? buildPreviewEmailHtml( form.email_body, emailSettings, hasPro ) : '';
		const recipientNames = selectedRecipients
			.map( ( rid ) => recipientOptions.find( ( o ) => o.id === rid ) )
			.filter( Boolean )
			.map( ( o ) => o.title );

		const excludedListNames = excludedLists
			.map( ( rid ) => lists.find( ( o ) => o.id === rid ) )
			.filter( Boolean )
			.map( ( o ) => o.title );
		const excludedTagNames = excludedTags
			.map( ( rid ) => tags.find( ( o ) => o.id === rid ) )
			.filter( Boolean )
			.map( ( o ) => o.title );
		const excludedNames = [ ...excludedListNames, ...excludedTagNames ];

		/* -------- Review warnings / issues -------- */
		const reviewWarnings = [];
		if ( form.email_body ) {
			const tmpDiv = document.createElement( 'div' );
			tmpDiv.innerHTML = form.email_body;
			const anchors = tmpDiv.querySelectorAll( 'a' );
			let emptyLinkCount = 0;
			anchors.forEach( ( a ) => {
				const href = ( a.getAttribute( 'href' ) || '' ).trim();
				if ( ! href || href === '#' || href === 'http://' || href === 'https://' ) {
					emptyLinkCount++;
				}
			} );
			if ( emptyLinkCount > 0 ) {
				reviewWarnings.push(
					emptyLinkCount === 1
						? __( 'Your email contains a link without a valid URL. Please go back and add a URL.', 'ai-marketing-expert' )
						: `${ emptyLinkCount } ${ __( 'links in your email have no valid URL. Please go back and fix them.', 'ai-marketing-expert' ) }`
				);
			}
			const images = tmpDiv.querySelectorAll( 'img' );
			let brokenImgCount = 0;
			images.forEach( ( img ) => {
				const src = ( img.getAttribute( 'src' ) || '' ).trim();
				if ( ! src ) brokenImgCount++;
			} );
			if ( brokenImgCount > 0 ) {
				reviewWarnings.push(
					brokenImgCount === 1
						? __( 'Your email contains an image without a source URL.', 'ai-marketing-expert' )
						: `${ brokenImgCount } ${ __( 'images in your email have no source URL.', 'ai-marketing-expert' ) }`
				);
			}
		}
		if ( ! form.email_subject.trim() ) {
			reviewWarnings.push( __( 'Subject line is empty.', 'ai-marketing-expert' ) );
		} else if ( form.email_subject.trim().length < 5 ) {
			reviewWarnings.push( __( 'Subject line is very short. Consider making it more descriptive.', 'ai-marketing-expert' ) );
		} else if ( form.email_subject.length > 100 ) {
			reviewWarnings.push( __( 'Subject line is too long. It may get truncated in some email clients.', 'ai-marketing-expert' ) );
		}
		if ( ! form.email_body || form.email_body.replace( /<[^>]*>/g, '' ).trim() === '' ) {
			reviewWarnings.push( __( 'Email body is empty.', 'ai-marketing-expert' ) );
		}
		if ( recipientMode !== 'all' && selectedRecipients.length === 0 ) {
			reviewWarnings.push( __( 'No recipients selected.', 'ai-marketing-expert' ) );
		}

		return (
			<div className="aime-editor-compose">
				<Card title={ __( 'Review Campaign', 'ai-marketing-expert' ) }>
					<div className="aime-review-grid">
						<div className="aime-review-item">
							<span className="aime-review-label">{ __( 'Campaign Name', 'ai-marketing-expert' ) }</span>
							<span className="aime-review-value">{ form.title || <em className="aime-muted">{ __( 'Not set', 'ai-marketing-expert' ) }</em> }</span>
						</div>
						<div className="aime-review-item">
							<span className="aime-review-label">{ __( 'Subject Line', 'ai-marketing-expert' ) }</span>
							<span className="aime-review-value">{ form.email_subject || <em className="aime-muted">{ __( 'Not set', 'ai-marketing-expert' ) }</em> }</span>
						</div>
						{ abEnabled && abSubject && (
							<div className="aime-review-item">
								<span className="aime-review-label">{ __( 'A/B Testing', 'ai-marketing-expert' ) }</span>
								<span className="aime-review-value">
									<span className="aime-badge aime-badge-success">{ __( 'Enabled', 'ai-marketing-expert' ) }</span>
									<span style={ { marginLeft: 8, fontSize: 13 } }>
										<strong>A:</strong> { form.email_subject } &nbsp;|&nbsp; <strong>B:</strong> { abSubject }
									</span>
								</span>
							</div>
						) }
						<div className="aime-review-item">
							<span className="aime-review-label">{ __( 'Preview Text', 'ai-marketing-expert' ) }</span>
							<span className="aime-review-value">{ form.email_pre_header || <em className="aime-muted">{ __( 'None', 'ai-marketing-expert' ) }</em> }</span>
						</div>
						<div className="aime-review-item">
							<span className="aime-review-label">{ __( 'Email Body', 'ai-marketing-expert' ) }</span>
							<span className="aime-review-value">
								{ form.email_body
									? <span className="aime-badge aime-badge-success">{ __( 'Content added', 'ai-marketing-expert' ) }</span>
									: <span className="aime-badge aime-badge-warning">{ __( 'Empty', 'ai-marketing-expert' ) }</span> }
							</span>
						</div>
						<div className="aime-review-item">
							<span className="aime-review-label">{ __( 'Recipients', 'ai-marketing-expert' ) }</span>
							<span className="aime-review-value">
								{ recipientMode === 'all'
									? <span className="aime-badge aime-badge-success">{ __( 'All Contacts', 'ai-marketing-expert' ) }</span>
									: recipientNames.length > 0
										? recipientNames.map( ( name ) => (
											<span key={ name } className="aime-tag-pill" style={ { marginRight: 4 } }>{ name }</span>
										) )
										: <em className="aime-muted">{ __( 'None selected', 'ai-marketing-expert' ) }</em> }
							</span>
						</div>
						{ excludedNames.length > 0 && (
							<div className="aime-review-item">
								<span className="aime-review-label">{ __( 'Excluded', 'ai-marketing-expert' ) }</span>
								<span className="aime-review-value">
									{ excludedNames.map( ( name ) => (
										<span key={ name } className="aime-tag-pill aime-tag-pill--exclude" style={ { marginRight: 4 } }>{ name }</span>
									) ) }
								</span>
							</div>
						) }
						{ ( utmEnabled && ( utmSource || utmCampaign ) ) && (
							<div className="aime-review-item">
								<span className="aime-review-label">{ __( 'UTM Tracking', 'ai-marketing-expert' ) }</span>
								<span className="aime-review-value aime-muted">{ [ utmSource, utmMedium, utmCampaign ].filter( Boolean ).join( ' / ' ) }</span>
							</div>
						) }
						{ sendThrottle !== '0' && (
							<div className="aime-review-item">
								<span className="aime-review-label">{ __( 'Throttle', 'ai-marketing-expert' ) }</span>
								<span className="aime-review-value">{ sendThrottle } { __( 'emails/min', 'ai-marketing-expert' ) }</span>
							</div>
						) }
					</div>
				</Card>

				{ /* Review warnings - above preview */ }
				{ reviewWarnings.length > 0 && (
					<div className="aime-review-warnings">
						<div className="aime-review-warnings-header">
							<span>{ '\u26A0\uFE0F' }</span> { __( 'Issues Found', 'ai-marketing-expert' ) } <span className="aime-badge aime-badge-warning">{ reviewWarnings.length }</span>
						</div>
						<ul className="aime-review-warnings-list">
							{ reviewWarnings.map( ( w, i ) => <li key={ i }>{ w }</li> ) }
						</ul>
					</div>
				) }

				{ /* Email preview */ }
				<Card title={ __( 'Email Preview', 'ai-marketing-expert' ) }>
					<div className="aime-email-preview-frame">
						<div className="aime-email-preview-bar">
							<strong>{ __( 'Subject:', 'ai-marketing-expert' ) }</strong> { form.email_subject || __( '(no subject)', 'ai-marketing-expert' ) }
						</div>
						<div
							className="aime-email-preview-body"
							dangerouslySetInnerHTML={ { __html: sanitizeHtml( previewEmailBody ) || `<p style="color:#999;text-align:center">${ __( 'No content.', 'ai-marketing-expert' ) }</p>` } }
						/>
					</div>
					<div className="aime-preview-edit-bar">
						<button type="button" className="aime-btn-secondary" onClick={ () => { setStepErrors( {} ); setStep( 0 ); } }>
							<span>{ '\u270F\uFE0F' }</span> { __( 'Back to Edit', 'ai-marketing-expert' ) }
						</button>
					</div>
				</Card>

				{ /* Action buttons */ }
				<Card>
					<div className="aime-review-actions">
						{ ( ! isNew || savedIdRef.current ) && (
							<>
								<button type="button" className="aime-btn-secondary" onClick={ () => setTestModalOpen( true ) } disabled={ sendingCampaign }>
									<span>{ '\uD83D\uDCE7' }</span> { __( 'Send Test', 'ai-marketing-expert' ) }
								</button>
								<button type="button" className="aime-btn-secondary" onClick={ () => setScheduleModalOpen( true ) } disabled={ sendingCampaign }>
									<span>{ '\uD83D\uDCC5' }</span> { __( 'Schedule', 'ai-marketing-expert' ) }{ ! hasPro && <span className="aime-muted" style={ { marginLeft: 6, fontSize: 11 } }>{ __( '3 free', 'ai-marketing-expert' ) }</span> }
								</button>
								<button type="button" className="aime-btn-primary" onClick={ () => handleSend() } disabled={ sendingCampaign }>
									{ sendingCampaign
										? <><Spinner style={ { marginRight: 4 } } />{ __( 'Sending...', 'ai-marketing-expert' ) }</>
										: <><span>{ '\uD83D\uDE80' }</span> { __( 'Send Now', 'ai-marketing-expert' ) }</>
									}
								</button>
							</>
						) }
						{ isNew && ! savedIdRef.current && (
							<p className="aime-muted">{ __( 'Save the campaign first, then you can send or schedule it.', 'ai-marketing-expert' ) }</p>
						) }
					</div>
				</Card>

				{ /* Send Test Modal */ }
				{ testModalOpen && (
					<div className="aime-premium-modal-overlay" onClick={ ( e ) => { if ( e.target === e.currentTarget ) { setTestModalOpen( false ); setTestEmail( '' ); } } }>
						<div className="aime-premium-modal" style={ { maxWidth: 480 } }>
							<div className="aime-premium-modal-header">
								<h3>
									<span className="aime-premium-modal-icon">
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
									</span>
									{ __( 'Send Test Email', 'ai-marketing-expert' ) }
								</h3>
								<button className="aime-modal-close" onClick={ () => { setTestModalOpen( false ); setTestEmail( '' ); } }>&times;</button>
							</div>
							<div className="aime-premium-modal-body">
								<div className="aime-premium-form-group">
									<label className="aime-premium-form-label">{ __( 'Recipient email address', 'ai-marketing-expert' ) }</label>
									<input
										type="email"
										className="aime-premium-input"
										placeholder={ __( 'e.g. you@example.com', 'ai-marketing-expert' ) }
										value={ testEmail }
										onChange={ ( e ) => setTestEmail( e.target.value ) }
										autoFocus
									/>
								</div>
							</div>
							<div className="aime-premium-modal-footer">
								<button className="aime-btn-cancel" onClick={ () => { setTestModalOpen( false ); setTestEmail( '' ); } }>
									{ __( 'Cancel', 'ai-marketing-expert' ) }
								</button>
								<button className="aime-btn-primary" onClick={ handleTestSend } disabled={ ! testEmail }>
									{ __( 'Send Test', 'ai-marketing-expert' ) }
								</button>
							</div>
						</div>
					</div>
				) }

				{ /* Schedule Modal */ }
				{ scheduleModalOpen && (
					<div className="aime-premium-modal-overlay" onClick={ ( e ) => { if ( e.target === e.currentTarget ) { setScheduleModalOpen( false ); setScheduleDate( '' ); setScheduleTime( '' ); } } }>
						<div className="aime-premium-modal" style={ { maxWidth: 480 } }>
							<div className="aime-premium-modal-header">
								<h3>
									<span className="aime-premium-modal-icon">
										<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
									</span>
									{ __( 'Schedule Campaign', 'ai-marketing-expert' ) }
								</h3>
								<button className="aime-modal-close" onClick={ () => { setScheduleModalOpen( false ); setScheduleDate( '' ); setScheduleTime( '' ); } }>&times;</button>
							</div>
							<div className="aime-premium-modal-body">
								<div className="aime-premium-form-group">
									<label className="aime-premium-form-label">{ __( 'Date', 'ai-marketing-expert' ) }</label>
									<input
										type="date"
										className="aime-premium-input"
										value={ scheduleDate }
										onChange={ ( e ) => setScheduleDate( e.target.value ) }
										autoFocus
									/>
								</div>
								<div className="aime-premium-form-group">
									<label className="aime-premium-form-label">{ __( 'Time', 'ai-marketing-expert' ) }</label>
									<input
										type="time"
										className="aime-premium-input"
										value={ scheduleTime }
										onChange={ ( e ) => setScheduleTime( e.target.value ) }
									/>
								</div>
							</div>
							<div className="aime-premium-modal-footer">
								<button className="aime-btn-cancel" onClick={ () => { setScheduleModalOpen( false ); setScheduleDate( '' ); setScheduleTime( '' ); } }>
									{ __( 'Cancel', 'ai-marketing-expert' ) }
								</button>
								<button className="aime-btn-primary" onClick={ handleSchedule } disabled={ ! scheduleDate }>
									{ __( 'Schedule', 'ai-marketing-expert' ) }
								</button>
							</div>
						</div>
					</div>
				) }
			</div>
		);
	};

	const stepRenderers = [ renderCompose, renderSubjectSettings, renderRecipients, renderReview ];

	/* ======= MAIN RENDER ======= */
	return (
		<div className="aime-campaign-editor">
			{ /* Header */ }
			<div className="aime-page-header">
				<div>
					<Button variant="link" onClick={ handleBack }>{ __( '\u2190 Back to Campaigns', 'ai-marketing-expert' ) }</Button>
					<h2>{ isNew ? __( 'New Campaign', 'ai-marketing-expert' ) : ( form.title || __( 'Edit Campaign', 'ai-marketing-expert' ) ) }</h2>
				</div>
				<div className="aime-header-actions">
					<Button variant="secondary" onClick={ handleSave }>{ __( 'Save', 'ai-marketing-expert' ) }</Button>
				</div>
			</div>

			{ notice && <Notice type={ notice.type } message={ notice.message } onDismiss={ () => setNotice( null ) } /> }

			{ /* Step indicator */ }
			<div className="aime-stepper">
				{ STEPS.map( ( s, i ) => (
					<button
						key={ s.key }
						type="button"
						className={ `aime-stepper-step${ i === step ? ' is-active' : '' }${ i < step ? ' is-done' : '' }` }
						onClick={ () => {
							if ( i > step ) {
								/* Validate all intermediate steps before jumping forward */
								for ( let j = step; j < i; j++ ) {
									const errors = validateStep( j );
									if ( Object.keys( errors ).length > 0 ) {
										setStepErrors( errors );
										setStep( j );
										return;
									}
								}
								setStepErrors( {} );
							} else {
								setStepErrors( {} );
							}
							setStep( i );
						} }
					>
						<span className="aime-stepper-circle">
							{ i < step ? '\u2713' : i + 1 }
						</span>
						<span className="aime-stepper-label">{ s.label }</span>
					</button>
				) ) }
			</div>

			{ /* Step content */ }
			<div className="aime-step-content">
				{ stepRenderers[ step ]() }
			</div>

			{ /* Bottom nav */ }
			<div className="aime-step-nav">
				{ step > 0 && (
					<button type="button" className="aime-btn-secondary" onClick={ goPrev }>
						{ __( '\u2190 Back', 'ai-marketing-expert' ) }
					</button>
				) }
				<span style={ { flex: 1 } } />
				<button type="button" className="aime-btn-secondary" onClick={ handleSave } disabled={ savingDraft }>
					{ savingDraft ? <><Spinner style={ { marginRight: 4 } } />{ __( 'Saving...', 'ai-marketing-expert' ) }</> : __( 'Save Draft', 'ai-marketing-expert' ) }
				</button>
				{ step < STEPS.length - 1 && (
					<button type="button" className="aime-btn-primary" onClick={ goNext } disabled={ loading || savingDraft }>
						{ savingDraft && step === STEPS.length - 2
							? <><Spinner style={ { marginRight: 4 } } />{ __( 'Saving...', 'ai-marketing-expert' ) }</>
							: step === STEPS.length - 2
							? __( 'Save & Continue \u2192', 'ai-marketing-expert' )
							: __( 'Continue \u2192', 'ai-marketing-expert' ) }
					</button>
				) }
			</div>
		</div>
	);
};

export default CampaignEditor;
