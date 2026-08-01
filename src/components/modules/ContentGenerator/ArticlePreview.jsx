/**
 * Article Preview - read-only view of a generated article.
 */

import { useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button } from '@aime/wp-components';
import { chevronLeft, edit } from '@wordpress/icons';
import useApi from '../../../hooks/useApi';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import { ARTICLE_STATUS_LABELS, ARTICLE_STATUS_COLORS } from '../../../utils/constants';
import sanitizeHtml from '../../../utils/sanitizeHtml';

const ArticlePreview = ( { id, onBack, onNavigate } ) => {
	const { get, loading } = useApi();
	const [ article, setArticle ] = useState( null );

	useEffect( () => {
		if ( ! id ) return;
		const load = async () => {
			try {
				const res = await get( `/content/articles/${ id }` );
				setArticle( res );
			} catch ( e ) {
				// silent
			}
		};
		load();
	}, [ get, id ] );

	if ( loading || ! article ) {
		return <Loader variant="lines" text={ __( 'Loading preview...', 'ai-marketing-expert' ) } />;
	}

	const keywords = Array.isArray( article.keywords ) ? article.keywords : [];

	return (
		<div className="aime-article-preview">
			<div className="aime-page-header">
				<div className="aime-header-left">
					<Button variant="tertiary" onClick={ onBack } icon={ chevronLeft }>
						{ __( 'Back', 'ai-marketing-expert' ) }
					</Button>
					<h2>{ __( 'Article Preview', 'ai-marketing-expert' ) }</h2>
				</div>
				<Button variant="primary" onClick={ () => onNavigate( 'edit-article', { id } ) } icon={ edit }>
					{ __( 'Edit', 'ai-marketing-expert' ) }
				</Button>
			</div>

			<div className="aime-preview-layout">
				<div className="aime-preview-main">
					<Card>
						<div className="aime-preview-meta-bar">
							<span
								className="aime-status-badge"
								style={ { background: ARTICLE_STATUS_COLORS[ article.status ] || '#9e9e9e' } }
							>
								{ ARTICLE_STATUS_LABELS[ article.status ] || article.status }
							</span>
							{ article.tone && <span className="aime-preview-tag">{ article.tone }</span> }
							{ article.language && <span className="aime-preview-tag">{ article.language }</span> }
							{ article.actual_word_count > 0 && (
								<span className="aime-preview-tag">{ article.actual_word_count } { __( 'words', 'ai-marketing-expert' ) }</span>
							) }
						</div>

						<h1 className="aime-preview-title">{ article.title || __( 'Untitled', 'ai-marketing-expert' ) }</h1>

						{ article.excerpt && (
							<p className="aime-preview-excerpt">{ article.excerpt }</p>
						) }

						{ keywords.length > 0 && (
							<div className="aime-preview-keywords">
								{ keywords.map( ( kw, i ) => (
									<span key={ i } className="aime-keyword-tag">{ kw }</span>
								) ) }
							</div>
						) }

						<hr className="aime-preview-divider" />

						<div
							className="aime-preview-content"
							dangerouslySetInnerHTML={ { __html: sanitizeHtml( article.content ) || '<p><em>No content yet.</em></p>' } }
						/>
					</Card>
				</div>

				<div className="aime-preview-sidebar">
					{ /* Scores */ }
					<Card title={ __( 'Scores', 'ai-marketing-expert' ) }>
						<div className="aime-scores">
							<div className="aime-score-item">
								<span>{ __( 'SEO Score', 'ai-marketing-expert' ) }</span>
								<strong className={ article.seo_score >= 70 ? 'aime-score-good' : article.seo_score >= 40 ? 'aime-score-ok' : 'aime-score-bad' }>
									{ article.seo_score || 0 } / 100
								</strong>
							</div>
							<div className="aime-score-item">
								<span>{ __( 'Readability', 'ai-marketing-expert' ) }</span>
								<strong className={ article.readability_score >= 60 ? 'aime-score-good' : article.readability_score >= 30 ? 'aime-score-ok' : 'aime-score-bad' }>
									{ article.readability_score || 0 } / 100
								</strong>
							</div>
						</div>
					</Card>

					{ /* SEO Meta */ }
					{ ( article.meta_title || article.meta_description ) && (
						<Card title={ __( 'SEO Meta', 'ai-marketing-expert' ) }>
							{ article.meta_title && (
								<div className="aime-meta-field">
									<label>{ __( 'Title', 'ai-marketing-expert' ) }</label>
									<p>{ article.meta_title }</p>
								</div>
							) }
							{ article.meta_description && (
								<div className="aime-meta-field">
									<label>{ __( 'Description', 'ai-marketing-expert' ) }</label>
									<p>{ article.meta_description }</p>
								</div>
							) }
						</Card>
					) }

					{ /* History */ }
					{ article.history?.length > 0 && (
						<Card title={ __( 'History', 'ai-marketing-expert' ) }>
							<div className="aime-history-list">
								{ article.history.map( ( h, i ) => (
									<div key={ i } className="aime-history-item">
										<span className="aime-history-action">{ h.action }</span>
										<span className="aime-history-date">{ h.created_at }</span>
										{ h.details && <p className="aime-history-details">{ h.details }</p> }
									</div>
								) ) }
							</div>
						</Card>
					) }

					{ /* WordPress link */ }
					{ article.wp_post_id && (
						<Card title={ __( 'WordPress Post', 'ai-marketing-expert' ) }>
							<p>{ __( 'Post ID:', 'ai-marketing-expert' ) } { article.wp_post_id }</p>
						</Card>
					) }
				</div>
			</div>
		</div>
	);
};

export default ArticlePreview;
