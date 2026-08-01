/**
 * Upcoming Runs — the next scheduled run for each active workflow.
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { apiGet } from '../../../utils/api';
import { toast } from '../../common/Toast';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import { formatDateTime } from '../../../utils/datetime';

// Stored as UTC; rendered in the site timezone and format (Settings → General).
const formatDate = ( value ) => formatDateTime( value );

const UpcomingRuns = ( { onNavigate } ) => {
	const [ loading, setLoading ] = useState( true );
	const [ items, setItems ] = useState( [] );

	const load = useCallback( async () => {
		setLoading( true );
		try {
			const res = await apiGet( '/workflow-automation/upcoming' );
			setItems( res?.upcoming || [] );
		} catch ( e ) {
			toast( e?.message || __( 'Failed to load upcoming runs.', 'ai-marketing-expert' ), 'error' );
		} finally {
			setLoading( false );
		}
	}, [] );

	useEffect( () => {
		load();
	}, [ load ] );

	if ( loading ) {
		return <Loader variant="table" />;
	}

	return (
		<div className="aime-workflow-upcoming">
			<h2 style={ { marginTop: 0 } }>{ __( 'Upcoming Runs', 'ai-marketing-expert' ) }</h2>

			{ items.length === 0 ? (
				<Card>
					<p>{ __( 'No scheduled runs. Activate a workflow with a schedule to see it here.', 'ai-marketing-expert' ) }</p>
				</Card>
			) : (
				<table className="aime-table widefat striped" style={ { width: '100%' } }>
					<thead>
						<tr>
							<th>{ __( 'Workflow', 'ai-marketing-expert' ) }</th>
							<th>{ __( 'Schedule', 'ai-marketing-expert' ) }</th>
							<th>{ __( 'Next run', 'ai-marketing-expert' ) }</th>
						</tr>
					</thead>
					<tbody>
						{ items.map( ( it ) => (
							<tr key={ it.id }>
								<td>
									<button
										type="button"
										style={ { background: 'none', border: 0, padding: 0, color: 'var(--aime-primary)', cursor: 'pointer', fontWeight: 600 } }
										onClick={ () => onNavigate( 'edit-workflow', { id: it.id } ) }
									>
										{ it.name || __( '(untitled)', 'ai-marketing-expert' ) }
									</button>
								</td>
								<td>{ it.schedule_type }</td>
								<td>{ formatDate( it.next_run_at ) }</td>
							</tr>
						) ) }
					</tbody>
				</table>
			) }
		</div>
	);
};

export default UpcomingRuns;
