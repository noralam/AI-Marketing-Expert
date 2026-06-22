/**
 * AiTools - AI features hub: template generation, spam check, insights, recommendations etc.
 */

import { useState, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, TextControl, TextareaControl, SelectControl, Spinner } from '@aime/wp-components';
import useApi from '../../../hooks/useApi';
import useSlowWarning from '../../../hooks/useSlowWarning';
import Card from '../../common/Card';
import LoadingBtn from '../../common/LoadingBtn';
import AiNotice, { isAiConfigured, aiDisabledTitle } from '../../common/AiNotice';
import Notice from '../../common/Notice';
import ProLock, { isProActive, ProLabel } from '../../common/ProLock';

const AiTools = () => {
	const { get, post, error, clearError } = useApi();
	const slowWarning = useSlowWarning();
	const hasPro = isProActive();
	const [ copied, setCopied ] = useState( false );

	const handleCopy = useCallback( ( text ) => {
		navigator.clipboard.writeText( text ).then( () => {
			setCopied( true );
			setTimeout( () => setCopied( false ), 2000 );
		} );
	}, [] );

	/* Template generator */
	const [ tplType, setTplType ] = useState( 'marketing' );
	const [ tplDesc, setTplDesc ] = useState( '' );
	const [ tplResult, setTplResult ] = useState( null );
	const [ tplLoading, setTplLoading ] = useState( false );

	/* Subject optimizer */
	const [ subject, setSubject ] = useState( '' );
	const [ subjectResults, setSubjectResults ] = useState( null );
	const [ subjectLoading, setSubjectLoading ] = useState( false );

	/* Content scorer */
	const [ content, setContent ] = useState( '' );
	const [ scoreResult, setScoreResult ] = useState( null );
	const [ scoreLoading, setScoreLoading ] = useState( false );

	/* Spam checker */
	const [ spamSubject, setSpamSubject ] = useState( '' );
	const [ spamBody, setSpamBody ] = useState( '' );
	const [ spamResult, setSpamResult ] = useState( null );
	const [ spamLoading, setSpamLoading ] = useState( false );
	const [ rewriteLoading, setRewriteLoading ] = useState( false );

	/* Send time optimizer */
	const [ sendTimeIndustry, setSendTimeIndustry ] = useState( '' );
	const [ sendTimeResult, setSendTimeResult ] = useState( null );
	const [ sendTimeLoading, setSendTimeLoading ] = useState( false );

	/* Segment suggestions */
	const [ segGoal, setSegGoal ] = useState( '' );
	const [ segResult, setSegResult ] = useState( null );
	const [ segLoading, setSegLoading ] = useState( false );

	const handleGenerateTemplate = async () => {
		setTplLoading( true );
		setTplResult( null );
		slowWarning.start();
		try {
			const res = await post( '/email/ai/generate-template', { prompt: tplDesc, style: tplType } );
			setTplResult( res.template || res );
		} catch ( e ) { /* */ } finally {
			slowWarning.stop();
			setTplLoading( false );
		}
	};

	const handleOptimizeSubject = async () => {
		setSubjectLoading( true );
		setSubjectResults( null );
		slowWarning.start();
		try {
			const res = await post( '/email/ai/optimize-subject', { subject } );
			setSubjectResults( res );
		} catch ( e ) { /* */ } finally {
			slowWarning.stop();
			setSubjectLoading( false );
		}
	};

	const handleScoreContent = async () => {
		setScoreLoading( true );
		setScoreResult( null );
		slowWarning.start();
		try {
			const res = await post( '/email/ai/score-content', { content } );
			setScoreResult( res );
		} catch ( e ) { /* */ } finally {
			slowWarning.stop();
			setScoreLoading( false );
		}
	};

	const handleSpamCheck = async () => {
		setSpamLoading( true );
		setSpamResult( null );
		slowWarning.start();
		try {
			const res = await post( '/email/ai/spam-check', { subject: spamSubject, content: spamBody } );
			setSpamResult( res.analysis || res );
		} catch ( e ) { /* */ } finally {
			slowWarning.stop();
			setSpamLoading( false );
		}
	};

	const handleRewriteWithoutSpam = async () => {
		if ( ! spamResult?.word_flags?.length ) return;
		setRewriteLoading( true );
		slowWarning.start();
		try {
			const res = await post( '/email/ai/rewrite-without-spam', {
				subject: spamSubject,
				content: spamBody,
				spam_words: spamResult.word_flags,
			} );
			if ( res.subject ) setSpamSubject( res.subject );
			if ( res.content ) setSpamBody( res.content );
			setSpamResult( null );
		} catch ( e ) { /* */ } finally {
			slowWarning.stop();
			setRewriteLoading( false );
		}
	};

	const handleSendTime = async () => {
		setSendTimeLoading( true );
		setSendTimeResult( null );
		slowWarning.start();
		try {
			const res = await get( '/email/ai/send-time', { industry: sendTimeIndustry || 'general' } );
			setSendTimeResult( res );
		} catch ( e ) { /* */ } finally {
			slowWarning.stop();
			setSendTimeLoading( false );
		}
	};

	const handleSegmentSuggestions = async () => {
		setSegLoading( true );
		setSegResult( null );
		slowWarning.start();
		try {
			const res = await get( '/email/ai/segment-suggestions' );
			setSegResult( res.segments || res );
		} catch ( e ) { /* */ } finally {
			slowWarning.stop();
			setSegLoading( false );
		}
	};

	return (
		<div className="aime-ai-tools">
			{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }

			<h2>{ __( '\u2728 AI Marketing Tools', 'ai-marketing-expert' ) }</h2>
			<p className="aime-muted">{ __( 'Leverage AI to improve your email marketing performance.', 'ai-marketing-expert' ) }</p>
			<AiNotice />

			<div className="aime-ai-tools-grid">
				{ /* Template Generator */ }
				<Card title={ __( 'Template Generator', 'ai-marketing-expert' ) }>
					<SelectControl label={ __( 'Type', 'ai-marketing-expert' ) } value={ tplType } options={ [
						{ label: 'Marketing', value: 'marketing' },
						{ label: 'Newsletter', value: 'newsletter' },
						{ label: 'Welcome', value: 'welcome' },
						{ label: 'Promotional', value: 'promotional' },
						{ label: 'Transactional', value: 'transactional' },
					] } onChange={ setTplType } __nextHasNoMarginBottom />
					<TextControl label={ __( 'Description', 'ai-marketing-expert' ) } value={ tplDesc } onChange={ setTplDesc } placeholder={ __( 'What is this email about?', 'ai-marketing-expert' ) } __nextHasNoMarginBottom />
					{ tplLoading ? (
						<LoadingBtn primary>{ __( 'Generating...', 'ai-marketing-expert' ) }</LoadingBtn>
					) : (
						<Button variant="primary" onClick={ handleGenerateTemplate } disabled={ ! isAiConfigured() } title={ ! isAiConfigured() ? aiDisabledTitle() : undefined }>
							{ __( 'Generate', 'ai-marketing-expert' ) }
						</Button>
					) }
					{ tplResult && (
						<div className="aime-ai-result">
							{ tplResult.subject && <p><strong>{ __( 'Subject:', 'ai-marketing-expert' ) }</strong> { tplResult.subject }</p> }
							{ ( tplResult.body || tplResult.html ) && (
								<details>
									<summary>{ __( 'View HTML', 'ai-marketing-expert' ) }</summary>
									<div className="aime-code-block-wrap">
										<button className="aime-copy-btn" onClick={ () => handleCopy( tplResult.body || tplResult.html ) } title={ __( 'Copy HTML', 'ai-marketing-expert' ) }>
											{ copied ? '\u2713 ' + __( 'Copied!', 'ai-marketing-expert' ) : '\uD83D\uDCCB ' + __( 'Copy', 'ai-marketing-expert' ) }
										</button>
										<pre className="aime-code-block">{ tplResult.body || tplResult.html }</pre>
									</div>
								</details>
							) }
						</div>
					) }
				</Card>

				{ /* Subject Optimizer */ }
				<Card title={ __( 'Subject Line Optimizer', 'ai-marketing-expert' ) }>
					<TextControl label={ __( 'Subject', 'ai-marketing-expert' ) } value={ subject } onChange={ setSubject } placeholder={ __( 'Enter your subject line...', 'ai-marketing-expert' ) } __nextHasNoMarginBottom />
					{ subjectLoading ? (
						<LoadingBtn primary>{ __( 'Optimizing...', 'ai-marketing-expert' ) }</LoadingBtn>
					) : (
						<Button variant="primary" onClick={ handleOptimizeSubject } disabled={ ! isAiConfigured() || ! subject } title={ ! isAiConfigured() ? aiDisabledTitle() : undefined }>
							{ __( 'Optimize', 'ai-marketing-expert' ) }
						</Button>
					) }
					{ subjectResults && (
						<div className="aime-ai-result">
							{ subjectResults.score !== undefined && (
								<p><strong>{ __( 'Original Score:', 'ai-marketing-expert' ) }</strong> <span className="aime-score-badge">{ subjectResults.score }/100</span></p>
							) }
							{ subjectResults.analysis && <p className="aime-analysis-text">{ subjectResults.analysis }</p> }
							{ Array.isArray( subjectResults.suggestions ) && (
								<ul className="aime-subject-suggestions">
									{ subjectResults.suggestions.map( ( s, i ) => (
										<li key={ i } className={ i === subjectResults.best_pick ? 'aime-best-pick' : '' }>
											{ typeof s === 'string' ? s : s.subject || JSON.stringify( s ) }
											{ i === subjectResults.best_pick && <span className="aime-best-pick-badge">{ __( '\u2605 Best', 'ai-marketing-expert' ) }</span> }
										</li>
									) ) }
								</ul>
							) }
							{ /* fallback: legacy array-only response */ }
							{ Array.isArray( subjectResults ) && (
								<ul>{ subjectResults.map( ( s, i ) => <li key={ i }>{ typeof s === 'string' ? s : s.subject || JSON.stringify( s ) }</li> ) }</ul>
							) }
						</div>
					) }
				</Card>

				{ /* Content Scorer */ }
				<ProLock locked={ ! hasPro }><Card title={ <span className="aime-pro-card-header">{ __( 'Content Scorer', 'ai-marketing-expert' ) }{ ! hasPro && <ProLabel /> }</span> }>
					<TextareaControl label={ __( 'Email Content', 'ai-marketing-expert' ) } value={ content } onChange={ setContent } rows={ 4 } placeholder={ __( 'Paste your email content...', 'ai-marketing-expert' ) } />
					{ scoreLoading ? (
						<LoadingBtn primary>{ __( 'Scoring...', 'ai-marketing-expert' ) }</LoadingBtn>
					) : (
						<Button variant="primary" onClick={ handleScoreContent } disabled={ ! isAiConfigured() || ! content } title={ ! isAiConfigured() ? aiDisabledTitle() : undefined }>
							{ __( 'Score', 'ai-marketing-expert' ) }
						</Button>
					) }
					{ scoreResult && (
						<div className="aime-ai-result">
							{ ( scoreResult.overall_score !== undefined || scoreResult.score !== undefined ) && (
								<div className="aime-score-overview">
									<p className="aime-score-big"><strong>{ __( 'Overall:', 'ai-marketing-expert' ) }</strong> <span className="aime-score-badge">{ scoreResult.overall_score ?? scoreResult.score }/100</span></p>
									<div className="aime-score-breakdown">
										{ scoreResult.readability_score !== undefined && <span>{ __( 'Readability:', 'ai-marketing-expert' ) } { scoreResult.readability_score }</span> }
										{ scoreResult.engagement_score !== undefined && <span>{ __( 'Engagement:', 'ai-marketing-expert' ) } { scoreResult.engagement_score }</span> }
										{ scoreResult.spam_score !== undefined && <span>{ __( 'Spam Risk:', 'ai-marketing-expert' ) } { scoreResult.spam_score }</span> }
									</div>
								</div>
							) }
							{ ( scoreResult.summary || scoreResult.feedback ) && <p>{ scoreResult.summary || scoreResult.feedback }</p> }
							{ Array.isArray( scoreResult.issues ) && scoreResult.issues.length > 0 && (
								<>
									<p><strong>{ __( 'Issues:', 'ai-marketing-expert' ) }</strong></p>
									<ul>{ scoreResult.issues.map( ( iss, i ) => <li key={ i }>{ iss }</li> ) }</ul>
								</>
							) }
							{ Array.isArray( scoreResult.improvements ) && scoreResult.improvements.length > 0 && (
								<>
									<p><strong>{ __( 'Improvements:', 'ai-marketing-expert' ) }</strong></p>
									<ul>{ scoreResult.improvements.map( ( imp, i ) => <li key={ i }>{ imp }</li> ) }</ul>
								</>
							) }
							{ typeof scoreResult === 'string' && <p>{ scoreResult }</p> }
							{ scoreResult.raw && <p>{ scoreResult.raw }</p> }
						</div>
					) }
				</Card></ProLock>

				{ /* Spam Checker */ }
				<Card title={ __( 'Spam Checker', 'ai-marketing-expert' ) }>
					<TextControl label={ __( 'Subject', 'ai-marketing-expert' ) } value={ spamSubject } onChange={ setSpamSubject } __nextHasNoMarginBottom />
					<TextareaControl label={ __( 'Body', 'ai-marketing-expert' ) } value={ spamBody } onChange={ setSpamBody } rows={ 4 } />
					{ spamLoading ? (
						<LoadingBtn primary>{ __( 'Checking...', 'ai-marketing-expert' ) }</LoadingBtn>
					) : (
						<Button variant="primary" onClick={ handleSpamCheck } disabled={ ! isAiConfigured() || ( ! spamSubject && ! spamBody ) } title={ ! isAiConfigured() ? aiDisabledTitle() : undefined }>
							{ __( 'Check', 'ai-marketing-expert' ) }
						</Button>
					) }
					{ spamResult && (
						<div className="aime-ai-result">
							{ spamResult.spam_score !== undefined && (
								<div className="aime-spam-header">
									<p><strong>{ __( 'Spam Score:', 'ai-marketing-expert' ) }</strong> <span className="aime-score-badge">{ spamResult.spam_score }/10</span></p>
									{ spamResult.verdict && <span className={ `aime-verdict-badge aime-verdict--${ spamResult.verdict }` }>{ spamResult.verdict }</span> }
								</div>
							) }
							{ Array.isArray( spamResult.word_flags ) && spamResult.word_flags.length > 0 && (
								<div className="aime-spam-words">
									<p><strong>{ __( 'Spam Trigger Words:', 'ai-marketing-expert' ) }</strong></p>
									<div className="aime-spam-word-tags">
										{ spamResult.word_flags.map( ( w, i ) => <span key={ i } className="aime-spam-word-tag">{ w }</span> ) }
									</div>
									{ rewriteLoading ? (
										<LoadingBtn>{ __( 'Rewriting...', 'ai-marketing-expert' ) }</LoadingBtn>
									) : (
										<Button variant="secondary" className="aime-rewrite-btn" onClick={ handleRewriteWithoutSpam }>
											{ __( '\u2728 Rewrite Without Spam Words', 'ai-marketing-expert' ) }
										</Button>
									) }
								</div>
							) }
							{ Array.isArray( spamResult.triggers ) && spamResult.triggers.length > 0 && (
								<>
									<p><strong>{ __( 'Issues Found:', 'ai-marketing-expert' ) }</strong></p>
									<ul className="aime-spam-triggers">
										{ spamResult.triggers.map( ( t, i ) => (
											<li key={ i }>
												<strong>{ typeof t === 'string' ? t : t.issue }</strong>
												{ t.severity && <span className={ `aime-severity aime-severity--${ t.severity }` }>{ t.severity }</span> }
												{ t.recommendation && <span className="aime-trigger-rec">{ t.recommendation }</span> }
											</li>
										) ) }
									</ul>
								</>
							) }
							{ Array.isArray( spamResult.improvements ) && spamResult.improvements.length > 0 && (
								<>
									<p><strong>{ __( 'Suggestions:', 'ai-marketing-expert' ) }</strong></p>
									<ul>{ spamResult.improvements.map( ( imp, i ) => <li key={ i }>{ imp }</li> ) }</ul>
								</>
							) }
							{ typeof spamResult === 'string' && <p>{ spamResult }</p> }
							{ spamResult.raw && <p>{ spamResult.raw }</p> }
						</div>
					) }
				</Card>

				{ /* Send Time Optimizer */ }
				<ProLock locked={ ! hasPro }><Card title={ <span className="aime-pro-card-header">{ __( 'Send Time Optimizer', 'ai-marketing-expert' ) }{ ! hasPro && <ProLabel /> }</span> }>
					<TextControl label={ __( 'Industry', 'ai-marketing-expert' ) } value={ sendTimeIndustry } onChange={ setSendTimeIndustry } placeholder={ __( 'e.g. SaaS, E-commerce, Education...', 'ai-marketing-expert' ) } __nextHasNoMarginBottom />
					{ sendTimeLoading ? (
						<LoadingBtn primary>{ __( 'Analyzing...', 'ai-marketing-expert' ) }</LoadingBtn>
					) : (
						<Button variant="primary" onClick={ handleSendTime } disabled={ ! isAiConfigured() } title={ ! isAiConfigured() ? aiDisabledTitle() : undefined }>
							{ __( 'Get Recommendation', 'ai-marketing-expert' ) }
						</Button>
					) }
					{ sendTimeResult && (
						<div className="aime-ai-result">
							{ typeof sendTimeResult === 'object' ? (
								<>
									{ ! sendTimeResult.has_data && (
										<p className="aime-info-note">{ __( 'Based on industry best practices (no historical data yet).', 'ai-marketing-expert' ) }</p>
									) }
									{ sendTimeResult.best_day && sendTimeResult.best_day !== 'None' && <p><strong>{ __( 'Best Day:', 'ai-marketing-expert' ) }</strong> { sendTimeResult.best_day }</p> }
									{ sendTimeResult.best_hour !== undefined && sendTimeResult.best_hour !== null && <p><strong>{ __( 'Best Hour:', 'ai-marketing-expert' ) }</strong> { sendTimeResult.best_hour }:00</p> }
									{ sendTimeResult.analysis && <p className="aime-analysis-text">{ sendTimeResult.analysis }</p> }
									{ Array.isArray( sendTimeResult.best_times ) && sendTimeResult.best_times.length > 0 && (
										<>
											<p><strong>{ __( 'Top Send Slots:', 'ai-marketing-expert' ) }</strong></p>
											<ul className="aime-send-slots">
												{ sendTimeResult.best_times.map( ( s, i ) => (
													<li key={ i }>{ s.day } { s.hour }:00{ s.confidence ? ` (${ s.confidence })` : '' }</li>
												) ) }
											</ul>
										</>
									) }
									{ Array.isArray( sendTimeResult.avoid_times ) && sendTimeResult.avoid_times.length > 0 && (
										<>
											<p><strong>{ __( 'Avoid:', 'ai-marketing-expert' ) }</strong></p>
											<ul>{ sendTimeResult.avoid_times.map( ( s, i ) => <li key={ i }>{ s.day } { s.hour }:00</li> ) }</ul>
										</>
									) }
									{ sendTimeResult.raw && ! sendTimeResult.best_day && <p className="aime-raw-result">{ __( 'AI returned an unexpected format. Please try again.', 'ai-marketing-expert' ) }</p> }
								</>
							) : <p>{ sendTimeResult }</p> }
						</div>
					) }
				</Card></ProLock>

				{ /* Segment Suggestions */ }
				<ProLock locked={ ! hasPro }><Card title={ <span className="aime-pro-card-header">{ __( 'Segment Suggestions', 'ai-marketing-expert' ) }{ ! hasPro && <ProLabel /> }</span> }>
					<TextControl label={ __( 'Goal', 'ai-marketing-expert' ) } value={ segGoal } onChange={ setSegGoal } placeholder={ __( 'e.g. Increase engagement, Re-engage inactive...', 'ai-marketing-expert' ) } __nextHasNoMarginBottom />
					{ segLoading ? (
						<LoadingBtn primary>{ __( 'Suggesting...', 'ai-marketing-expert' ) }</LoadingBtn>
					) : (
						<Button variant="primary" onClick={ handleSegmentSuggestions } disabled={ ! isAiConfigured() || ! segGoal } title={ ! isAiConfigured() ? aiDisabledTitle() : undefined }>
							{ __( 'Suggest Segments', 'ai-marketing-expert' ) }
						</Button>
					) }
					{ segResult && (
						<div className="aime-ai-result">
							{ Array.isArray( segResult ) ? (
								<ul>{ segResult.map( ( s, i ) => <li key={ i }>{ typeof s === 'string' ? s : s.name || JSON.stringify( s ) }</li> ) }</ul>
							) : <p>{ typeof segResult === 'string' ? segResult : JSON.stringify( segResult ) }</p> }
						</div>
					) }
				</Card></ProLock>
			</div>
		</div>
	);
};

export default AiTools;
