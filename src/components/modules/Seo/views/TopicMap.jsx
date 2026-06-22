/**
 * Topic Map - topical authority map with AI generation (Pro).
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button, TextControl, TextareaControl, Spinner } from '@aime/wp-components';
import { trash, pencil } from '@wordpress/icons';
import { navigateToNewArticle } from '../../../../utils/seoContentBridge';
import useApi from '../../../../hooks/useApi';
import usePro from '../../../../hooks/usePro';
import useSlowWarning from '../../../../hooks/useSlowWarning';
import Card from '../../../common/Card';
import LoadingBtn from '../../../common/LoadingBtn';
import AiNotice, { isAiConfigured, aiDisabledTitle } from '../../../common/AiNotice';
import Loader from '../../../common/Loader';
import Notice from '../../../common/Notice';
import ProGate from '../../../common/ProGate';
import ConfirmModal from '../../../common/ConfirmModal';
import { toast } from '../../../common/Toast';
import { DonutChart, StackedBar, SortArrow } from './SeoCharts';

const TYPE_COLORS = {
	pillar: '#2196f3',
	cluster: '#4caf50',
	supporting: '#ff9800',
};

const TopicMap = ( { onNavigate } ) => {
	const { get, post, del, loading, error, clearError } = useApi();
	const { hasPro } = usePro();
	const slowWarning = useSlowWarning();
	const [ topics, setTopics ] = useState( [] );
	const [ generating, setGenerating ] = useState( false );
	const [ niche, setNiche ] = useState( '' );
	const [ confirmDelete, setConfirmDelete ] = useState( null );

	const fetchTopics = useCallback( async () => {
		try {
			const res = await get( '/seo/topics' );
			setTopics( res.items || res.data || res || [] );
		} catch ( e ) {
			// silent
		}
	}, [ get ] );

	useEffect( () => {
		fetchTopics();
	}, [ fetchTopics ] );

	const handleGenerate = async () => {
		if ( ! niche.trim() ) return;
		setGenerating( true );
		clearError();
		slowWarning.start();
		try {
			await post( '/seo/topics/generate-map', { niche: niche.trim() } );
			toast( __( 'Topical map generated!', 'ai-marketing-expert' ) );
			fetchTopics();
		} catch ( e ) {
			toast( e.message, 'error' );
		} finally {
			slowWarning.stop();
			setGenerating( false );
		}
	};

	const handleDelete = async ( id ) => {
		try {
			await del( `/seo/topics/${ id }` );
			toast( __( 'Topic deleted.', 'ai-marketing-expert' ) );
			setConfirmDelete( null );
			fetchTopics();
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	};

	// Group topics by type for visual hierarchy.
	const pillars = topics.filter( ( t ) => t.topic_type === 'pillar' );
	const clusters = topics.filter( ( t ) => t.topic_type === 'cluster' );
	const supporting = topics.filter( ( t ) => t.topic_type === 'supporting' );

	return (
		<ProGate feature={ __( 'Topical Authority Map', 'ai-marketing-expert' ) }>
			<div className="aime-seo-topic-map">
				{ error && <Notice type="error" message={ error } dismissible onDismiss={ clearError } /> }

				<div className="aime-page-header">
					<h2>{ __( 'Topical Authority Map', 'ai-marketing-expert' ) }</h2>
				</div>

				{ /* AI Generation */ }
				<Card title={ __( 'Generate Topic Map', 'ai-marketing-expert' ) }>
					<div className="aime-form-grid aime-form-grid-2">
						<TextControl
							label={ __( 'Niche / Main Topic', 'ai-marketing-expert' ) }
							value={ niche }
							onChange={ setNiche }
							placeholder={ __( 'e.g. home fitness equipment', 'ai-marketing-expert' ) }
							__nextHasNoMarginBottom
						/>
						<div style={ { display: 'flex', alignItems: 'flex-end' } }>
							{ generating ? (
								<LoadingBtn primary>{ __( 'Generating\u2026', 'ai-marketing-expert' ) }</LoadingBtn>
							) : (
								<Button
									variant="primary"
									onClick={ handleGenerate }
									disabled={ ! isAiConfigured() || ! niche.trim() }
									title={ ! isAiConfigured() ? aiDisabledTitle() : undefined }
								>
									{ __( 'Generate Map with AI', 'ai-marketing-expert' ) }
								</Button>
							) }
						</div>
						<AiNotice />
					</div>
					{ generating && <Loader text={ __( 'AI is building your topical map\u2026', 'ai-marketing-expert' ) } /> }
				</Card>

				{ /* Topic list grouped visually */ }
				{ loading && ! topics.length ? (
					<Loader text={ __( 'Loading topics\u2026', 'ai-marketing-expert' ) } />
				) : topics.length === 0 ? (
					<Card>
						<p className="aime-empty-text">
							{ __( 'No topics yet. Generate a topical map above to get started.', 'ai-marketing-expert' ) }
						</p>
					</Card>
				) : (
					<>
						{ /* Summary Stats Row */ }
						<div className="aime-kw-summary-row">
							<div className="aime-kw-stat-card">
								<span className="aime-kw-stat-val">{ topics.length }</span>
								<span className="aime-kw-stat-label">{ __( 'Total Topics', 'ai-marketing-expert' ) }</span>
							</div>
							<div className="aime-kw-stat-card">
								<span className="aime-kw-stat-val" style={ { color: TYPE_COLORS.pillar } }>{ pillars.length }</span>
								<span className="aime-kw-stat-label">{ __( 'Pillar', 'ai-marketing-expert' ) }</span>
							</div>
							<div className="aime-kw-stat-card">
								<span className="aime-kw-stat-val" style={ { color: TYPE_COLORS.cluster } }>{ clusters.length }</span>
								<span className="aime-kw-stat-label">{ __( 'Cluster', 'ai-marketing-expert' ) }</span>
							</div>
							<div className="aime-kw-stat-card">
								<span className="aime-kw-stat-val" style={ { color: TYPE_COLORS.supporting } }>{ supporting.length }</span>
								<span className="aime-kw-stat-label">{ __( 'Supporting', 'ai-marketing-expert' ) }</span>
							</div>
						</div>

						{ /* Charts Row */ }
						<div className="aime-analytics-charts-row">
							<Card title={ __( 'Topic Type Distribution', 'ai-marketing-expert' ) }>
								<DonutChart
									data={ [
										{ label: __( 'Pillar', 'ai-marketing-expert' ), value: pillars.length, color: TYPE_COLORS.pillar },
										{ label: __( 'Cluster', 'ai-marketing-expert' ), value: clusters.length, color: TYPE_COLORS.cluster },
										{ label: __( 'Supporting', 'ai-marketing-expert' ), value: supporting.length, color: TYPE_COLORS.supporting },
									] }
								/>
							</Card>
							<Card title={ __( 'Topic Breakdown', 'ai-marketing-expert' ) }>
								<StackedBar
									segments={ [
										{ label: __( 'Pillar', 'ai-marketing-expert' ), value: pillars.length, color: TYPE_COLORS.pillar },
										{ label: __( 'Cluster', 'ai-marketing-expert' ), value: clusters.length, color: TYPE_COLORS.cluster },
										{ label: __( 'Supporting', 'ai-marketing-expert' ), value: supporting.length, color: TYPE_COLORS.supporting },
									] }
									height={ 24 }
								/>
							</Card>
						</div>

						{ /* Pillar Topics */ }
						{ pillars.length > 0 && (
							<Card title={ __( 'Pillar Topics', 'ai-marketing-expert' ) }>
								<div className="aime-topic-grid">
									{ pillars.map( ( t ) => (
										<div key={ t.id } className="aime-topic-card" style={ { borderLeft: `4px solid ${ TYPE_COLORS.pillar }` } }>
											<div className="aime-topic-card-header">
												<h4>{ t.name }</h4>
												<div style={ { display: 'flex', gap: 4 } }>
													<Button
														icon={ pencil }
														label={ __( 'Write Article', 'ai-marketing-expert' ) }
														onClick={ () => navigateToNewArticle( {
															topic: t.name,
															keywords: [ t.name ],
															outline: t.description || '',
															content_type: 'pillar_page',
															source: 'topic-map',
														} ) }
													/>
													<Button
														icon={ trash }
														isDestructive
														label={ __( 'Delete', 'ai-marketing-expert' ) }
														onClick={ () => setConfirmDelete( t.id ) }
													/>
												</div>
											</div>
											{ t.description && <p className="aime-topic-desc">{ t.description }</p> }
										{ t.notes && (
											<span className="aime-tag">{ t.notes }</span>
										) }
									</div>
								) ) }
								</div>
							</Card>
						) }

						{ /* Cluster Topics */ }
						{ clusters.length > 0 && (
							<Card title={ __( 'Cluster Topics', 'ai-marketing-expert' ) }>
								<div className="aime-topic-grid">
									{ clusters.map( ( t ) => (
										<div key={ t.id } className="aime-topic-card" style={ { borderLeft: `4px solid ${ TYPE_COLORS.cluster }` } }>
											<div className="aime-topic-card-header">
												<h4>{ t.name }</h4>
												<div style={ { display: 'flex', gap: 4 } }>
													<Button
														icon={ pencil }
														label={ __( 'Write Article', 'ai-marketing-expert' ) }
														onClick={ () => navigateToNewArticle( {
															topic: t.name,
															keywords: [ t.name ],
															outline: t.description || '',
															content_type: 'blog_post',
															source: 'topic-map',
														} ) }
													/>
													<Button
														icon={ trash }
														isDestructive
														label={ __( 'Delete', 'ai-marketing-expert' ) }
														onClick={ () => setConfirmDelete( t.id ) }
													/>
												</div>
											</div>
											{ t.description && <p className="aime-topic-desc">{ t.description }</p> }
										{ t.parent_id && (
											<small className="aime-topic-parent">
												{ __( 'Parent:', 'ai-marketing-expert' ) }{ ' ' }
												{ pillars.find( ( p ) => p.id === t.parent_id )?.name || `#${ t.parent_id }` }
												</small>
											) }
										</div>
									) ) }
								</div>
							</Card>
						) }

						{ /* Supporting Topics */ }
						{ supporting.length > 0 && (
							<Card title={ __( 'Supporting Topics', 'ai-marketing-expert' ) }>
								<div className="aime-topic-grid">
									{ supporting.map( ( t ) => (
										<div key={ t.id } className="aime-topic-card" style={ { borderLeft: `4px solid ${ TYPE_COLORS.supporting }` } }>
											<div className="aime-topic-card-header">
												<h4>{ t.name }</h4>
												<div style={ { display: 'flex', gap: 4 } }>
													<Button
														icon={ pencil }
														label={ __( 'Write Article', 'ai-marketing-expert' ) }
														onClick={ () => navigateToNewArticle( {
															topic: t.name,
															keywords: [ t.name ],
															outline: t.description || '',
															content_type: 'blog_post',
															source: 'topic-map',
														} ) }
													/>
													<Button
														icon={ trash }
														isDestructive
														label={ __( 'Delete', 'ai-marketing-expert' ) }
														onClick={ () => setConfirmDelete( t.id ) }
													/>
												</div>
											</div>
											{ t.description && <p className="aime-topic-desc">{ t.description }</p> }
											{ t.notes && (
												<span className="aime-tag">{ t.notes }</span>
											) }
										</div>
									) ) }
								</div>
							</Card>
						) }
					</>
				) }

				{ confirmDelete && (
					<ConfirmModal
						title={ __( 'Delete Topic', 'ai-marketing-expert' ) }
						message={ __( 'Are you sure you want to delete this topic?', 'ai-marketing-expert' ) }
						onConfirm={ () => handleDelete( confirmDelete ) }
						onCancel={ () => setConfirmDelete( null ) }
					/>
				) }
			</div>
		</ProGate>
	);
};

export default TopicMap;
