/**
 * OAuth Proxy Server for AI Marketing Expert
 *
 * Endpoints:
 *   GET  /v1/authorize  — Redirect user to platform OAuth screen
 *   GET  /v1/callback   — Receive code from platform, pass to opener via postMessage
 *   POST /v1/token      — Exchange auth code for tokens (server-to-server)
 *   POST /v1/refresh    — Refresh an access token (server-to-server)
 *   GET  /health        — Health check
 */

'use strict';

require('dotenv').config();

const express    = require('express');
const axios      = require('axios');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ------------------------------------------------------------------
 * Middleware
 * ----------------------------------------------------------------*/
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled for inline script in callback page
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting — 30 requests per minute per IP
const limiter = rateLimit({
	windowMs: 60 * 1000,
	max: 30,
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: 'Too many requests. Please try again later.' },
});
app.use(limiter);

/* ------------------------------------------------------------------
 * Platform configuration
 * ----------------------------------------------------------------*/
const CALLBACK_URL = process.env.CALLBACK_URL || 'https://oauth.wpthemespace.com/v1/callback';

const PLATFORMS = {
	facebook: {
		authUrl:      'https://www.facebook.com/v21.0/dialog/oauth',
		tokenUrl:     'https://graph.facebook.com/v21.0/oauth/access_token',
		profileUrl:   'https://graph.facebook.com/v21.0/me',
		scopes:       'pages_manage_posts,pages_read_engagement',
		clientId:     process.env.FACEBOOK_APP_ID,
		clientSecret: process.env.FACEBOOK_APP_SECRET,
	},
	instagram: {
		authUrl:      'https://www.facebook.com/v21.0/dialog/oauth',
		tokenUrl:     'https://graph.facebook.com/v21.0/oauth/access_token',
		profileUrl:   'https://graph.facebook.com/v21.0/me',
		scopes:       'instagram_basic,instagram_content_publish,pages_show_list',
		clientId:     process.env.FACEBOOK_APP_ID,
		clientSecret: process.env.FACEBOOK_APP_SECRET,
	},
};

/* ------------------------------------------------------------------
 * Origin validation
 * Returns a normalized https://host[:port] string when the value is a
 * plausible postMessage targetOrigin, or '' when the input is empty,
 * a wildcard, a non-http(s) scheme, or otherwise malformed. Anything
 * we cannot trust is rejected so the proxy never hands a leaked code
 * to a hostile window.
 * ----------------------------------------------------------------*/
function validateSiteOrigin( rawSite ) {
	if ( typeof rawSite !== 'string' ) return '';
	const site = rawSite.trim();
	if ( ! site || site === '*' ) return '';

	let url;
	try {
		url = new URL( site );
	} catch ( _ ) {
		return '';
	}

	if ( url.protocol !== 'https:' && url.protocol !== 'http:' ) return '';
	if ( ! url.hostname || url.hostname === '*' ) return '';
	// Reject userinfo, paths, queries, fragments — only origin is allowed.
	if ( url.username || url.password ) return '';
	if ( url.pathname && url.pathname !== '/' ) return '';
	if ( url.search ) return '';
	if ( url.hash ) return '';

	return `${ url.protocol }//${ url.host }`;
}

/* ------------------------------------------------------------------
 * In-memory state store (state ➜ { platform, site, expires, used })
 * The `used` flag makes each state one-shot: once the token endpoint
 * exchanges a state, no second request can reuse it.
 * ----------------------------------------------------------------*/
const stateStore = new Map();

// Purge expired entries every 5 minutes
setInterval(() => {
	const now = Date.now();
	for (const [key, val] of stateStore) {
		if (val.expires < now) stateStore.delete(key);
	}
}, 5 * 60 * 1000);

/* ------------------------------------------------------------------
 * GET /v1/authorize
 * Query: platform, state, callback, site
 * ----------------------------------------------------------------*/
app.get('/v1/authorize', (req, res) => {
	const { platform, state, callback, site } = req.query;

	if (!platform || !state) {
		return res.status(400).json({ error: 'Missing required parameters: platform, state.' });
	}

	const config = PLATFORMS[platform];
	if (!config || !config.clientId) {
		return res.status(400).json({ error: `Platform "${platform}" is not configured or not supported.` });
	}

	// `site` is the URL of the WP install that initiated the flow. The
	// proxy will later use it as the postMessage targetOrigin so the
	// auth code is delivered only back to the opener that started it.
	// We refuse wildcard, non-http(s), and any URL that has userinfo /
	// path / query / fragment — those cannot be used as a targetOrigin
	// safely. Missing `site` is allowed for server-to-server flows and
	// resolved at callback time from the request's Origin/Referer.
	const safeSite = site ? validateSiteOrigin( String(site) ) : '';
	if (site && !safeSite) {
		return res.status(400).json({ error: 'Invalid site. Provide an http(s) origin (e.g. https://example.com) without a path or query string.' });
	}

	// Store state for later verification
	stateStore.set(state, {
		platform,
		site:    safeSite,
		expires: Date.now() + 10 * 60 * 1000, // 10 min TTL
		used:    false,
	});

	// Redirect to platform OAuth screen
	const params = new URLSearchParams({
		client_id:     config.clientId,
		redirect_uri:  CALLBACK_URL,
		scope:         config.scopes,
		state,
		response_type: 'code',
	});

	res.redirect(`${config.authUrl}?${params.toString()}`);
});

/* ------------------------------------------------------------------
 * GET /v1/callback
 * Query: code, state  (or error, error_description)
 * Renders an HTML page that sends data back to opener via postMessage.
 * The postMessage targetOrigin is taken from the validated site stored
 * at /v1/authorize time. If no site was registered we refuse to deliver
 * the code rather than falling back to a wildcard targetOrigin.
 * ----------------------------------------------------------------*/
app.get('/v1/callback', (req, res) => {
	const { code, state, error, error_description } = req.query;

	// Platform returned an error
	if (error) {
		return res.send(renderCallbackPage({
			success: false,
			error:   error_description || error,
		}));
	}

	if (!code || !state) {
		return res.status(400).send(renderCallbackPage({
			success: false,
			error:   'Missing code or state parameter.',
		}));
	}

	// Verify state. We do NOT mark it used here; the token endpoint is
	// the one that actually exchanges it for credentials and is the
	// place that must enforce single-use.
	const stored = stateStore.get(state);
	if (!stored || stored.expires < Date.now()) {
		stateStore.delete(state);
		return res.status(400).send(renderCallbackPage({
			success: false,
			error:   'Invalid or expired session. Please close this window and try again.',
		}));
	}

	// The auth code must only ever be delivered back to the exact origin that
	// started the flow. If no validated site origin was registered at
	// /v1/authorize time we refuse to post the code at all — never fall back
	// to a '*' targetOrigin, which would hand the code to any window able to
	// read this popup. Legitimate WP flows always supply `site`.
	if (!stored.site) {
		return res.status(400).send(renderCallbackPage({
			success: false,
			error:   'No registered site origin for this session. Please close this window and start the connection again.',
		}));
	}

	// Send code back to opener via postMessage — the WP plugin will
	// exchange it for tokens by calling POST /v1/token server-to-server.
	res.send(renderCallbackPage({
		success:      true,
		platform:     stored.platform,
		code,
		state,
		targetOrigin: stored.site,
	}));
});

/* ------------------------------------------------------------------
 * POST /v1/token
 * Body: { platform, code, state, callback, site }
 * Returns: { access_token, refresh_token, expires_in, user_id, name, avatar_url }
 *
 * `state` is required: it must match a non-expired entry in stateStore
 * that was created by /v1/authorize and that has not already been used.
 * One-shot enforcement prevents an attacker who captured a code from
 * replaying it.
 * ----------------------------------------------------------------*/
app.post('/v1/token', async (req, res) => {
	const { platform, code, state } = req.body;

	if (!platform || !code || !state) {
		return res.status(400).json({ error: 'Missing required fields: platform, code, state.' });
	}

	const config = PLATFORMS[platform];
	if (!config || !config.clientSecret) {
		return res.status(400).json({ error: `Platform "${platform}" is not configured.` });
	}

	// Verify state: must exist, not be expired, and not have been used.
	const stored = stateStore.get(state);
	if (!stored || stored.expires < Date.now() || stored.used) {
		stateStore.delete(state);
		return res.status(400).json({ error: 'Invalid or expired state. Restart the connection flow.' });
	}
	if (stored.platform !== platform) {
		return res.status(400).json({ error: 'State was issued for a different platform.' });
	}
	// Mark used and remove so it cannot be replayed.
	stateStore.delete(state);

	try {
		// 1. Exchange code for short-lived token
		const tokenRes = await axios.post(config.tokenUrl, null, {
			params: {
				client_id:     config.clientId,
				client_secret: config.clientSecret,
				redirect_uri:  CALLBACK_URL,
				code,
			},
			timeout: 30000,
		});

		const tokenData = tokenRes.data;
		if (!tokenData.access_token) {
			return res.status(400).json({
				error: tokenData.error?.message || 'Token exchange failed.',
			});
		}

		// 2. Exchange for long-lived token
		let accessToken = tokenData.access_token;
		let expiresIn   = tokenData.expires_in || 5184000;

		try {
			const llRes = await axios.get(config.tokenUrl, {
				params: {
					grant_type:        'fb_exchange_token',
					client_id:         config.clientId,
					client_secret:     config.clientSecret,
					fb_exchange_token: tokenData.access_token,
				},
				timeout: 15000,
			});
			if (llRes.data.access_token) {
				accessToken = llRes.data.access_token;
				expiresIn   = llRes.data.expires_in || 5184000;
			}
		} catch (_) {
			// Continue with short-lived token
		}

		// 3. Fetch user profile
		const profileRes = await axios.get(config.profileUrl, {
			params: {
				fields:       'id,name,picture',
				access_token: accessToken,
			},
			timeout: 15000,
		});
		const profile = profileRes.data;

		// 4. Respond — format must match plugin's parse_token_response()
		res.json({
			access_token:  accessToken,
			refresh_token: accessToken,            // FB long-lived tokens double as refresh
			expires_in:    expiresIn,
			user_id:       String(profile.id || ''),
			name:          profile.name || '',
			avatar_url:    profile.picture?.data?.url || '',
		});

	} catch (err) {
		console.error('[/v1/token] token exchange failed (status %s)', err.response?.status || 'n/a');
		res.status(500).json({
			error: err.response?.data?.error?.message || 'Token exchange failed.',
		});
	}
});

/* ------------------------------------------------------------------
 * POST /v1/refresh
 * Body: { platform, refresh_token, site }
 * Returns: { access_token, refresh_token, expires_in }
 * ----------------------------------------------------------------*/
app.post('/v1/refresh', async (req, res) => {
	const { platform, refresh_token } = req.body;

	if (!platform || !refresh_token) {
		return res.status(400).json({ error: 'Missing required fields: platform, refresh_token.' });
	}

	const config = PLATFORMS[platform];
	if (!config || !config.clientSecret) {
		return res.status(400).json({ error: `Platform "${platform}" is not configured.` });
	}

	try {
		const response = await axios.get(config.tokenUrl, {
			params: {
				grant_type:        'fb_exchange_token',
				client_id:         config.clientId,
				client_secret:     config.clientSecret,
				fb_exchange_token: refresh_token,
			},
			timeout: 30000,
		});

		const data = response.data;
		if (!data.access_token) {
			return res.status(400).json({ error: 'Token refresh failed.' });
		}

		res.json({
			access_token:  data.access_token,
			refresh_token: data.access_token,
			expires_in:    data.expires_in || 5184000,
		});

	} catch (err) {
		console.error('[/v1/refresh] token refresh failed (status %s)', err.response?.status || 'n/a');
		res.status(500).json({
			error: err.response?.data?.error?.message || 'Token refresh failed.',
		});
	}
});

/* ------------------------------------------------------------------
 * GET /health
 * ----------------------------------------------------------------*/
app.get('/health', (_req, res) => {
	res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/* ------------------------------------------------------------------
 * Callback HTML renderer
 * ----------------------------------------------------------------*/
function renderCallbackPage({ success, platform, code, state, error, targetOrigin }) {
	if (!success) {
		return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Connection Failed</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:center;padding:80px 24px;background:#f9fafb">
<div style="max-width:400px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,.1)">
  <div style="font-size:48px;margin-bottom:16px">&#10060;</div>
  <h2 style="color:#dc2626;margin:0 0 12px">Connection Failed</h2>
  <p style="color:#6b7280;margin:0 0 24px">${escapeHtml(error || 'Unknown error occurred.')}</p>
  <p style="color:#9ca3af;font-size:13px">This window will close automatically.</p>
</div>
<script>
if(window.opener){window.opener.postMessage({type:'aime_oauth_error',error:${safeJson(error||'Unknown error')}},${safeJson(targetOrigin||'*')})}
setTimeout(function(){window.close()},3000);
</script>
</body></html>`;
	}

	return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Connected!</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;text-align:center;padding:80px 24px;background:#f9fafb">
<div style="max-width:400px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,.1)">
  <div style="font-size:48px;margin-bottom:16px">&#10004;</div>
  <h2 style="color:#16a34a;margin:0 0 12px">Authorization Successful</h2>
  <p style="color:#6b7280;margin:0">Connecting your account&hellip; This window will close automatically.</p>
</div>
<script>
if(window.opener){window.opener.postMessage({type:'aime_oauth_callback',platform:${safeJson(platform)},code:${safeJson(code)},state:${safeJson(state)}},${safeJson(targetOrigin||'*')})}
setTimeout(function(){window.close()},2000);
</script>
</body></html>`;
}

/** Escape HTML entities. */
function escapeHtml(str) {
	return String(str)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/** JSON.stringify safe for embedding in <script> (prevents </script> breakout). */
function safeJson(value) {
	return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}

/* ------------------------------------------------------------------
 * Start server
 * ----------------------------------------------------------------*/
app.listen(PORT, () => {
	console.log(`[AIME OAuth Proxy] Listening on port ${PORT}`);
	console.log(`[AIME OAuth Proxy] Callback URL: ${CALLBACK_URL}`);
	if (!process.env.FACEBOOK_APP_ID) {
		console.warn('[AIME OAuth Proxy] WARNING: FACEBOOK_APP_ID is not set!');
	}
});
