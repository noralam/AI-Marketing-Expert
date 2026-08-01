/**
 * Calendar - visual calendar view for scheduled social posts (Pro).
 */

import { useState, useEffect, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Button } from '@aime/wp-components';
import useApi from '../../../hooks/useApi';
import Card from '../../common/Card';
import Loader from '../../common/Loader';
import ProGate from '../../common/ProGate';
import { toast } from '../../common/Toast';
import { SOCIAL_PLATFORMS, SOCIAL_POST_STATUS } from '../../../utils/constants';
import { siteToday } from '../../../utils/datetime';

const DAYS = [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ];
const MONTHS = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December',
];

const Calendar = ( { onNavigate } ) => {
	const { get, put, loading } = useApi();
	const [ currentDate, setCurrentDate ] = useState( new Date() );
	const [ events, setEvents ] = useState( [] );
	const [ selectedDay, setSelectedDay ] = useState( null );
	const [ dragItem, setDragItem ] = useState( null );

	const year = currentDate.getFullYear();
	const month = currentDate.getMonth();
	const firstDay = new Date( year, month, 1 ).getDay();
	const daysInMonth = new Date( year, month + 1, 0 ).getDate();

	const fetchEvents = useCallback( async () => {
		try {
			const start = `${ year }-${ String( month + 1 ).padStart( 2, '0' ) }-01 00:00:00`;
			const endDay = new Date( year, month + 1, 0 ).getDate();
			const end = `${ year }-${ String( month + 1 ).padStart( 2, '0' ) }-${ String( endDay ).padStart( 2, '0' ) } 23:59:59`;
			const res = await get( `/social/schedule?start=${ encodeURIComponent( start ) }&end=${ encodeURIComponent( end ) }` );
			setEvents( res.items || res || [] );
		} catch ( e ) {
			toast( e.message, 'error' );
		}
	}, [ get, year, month ] );

	useEffect( () => {
		fetchEvents();
	}, [ fetchEvents ] );

	const prevMonth = () => setCurrentDate( new Date( year, month - 1, 1 ) );
	const nextMonth = () => setCurrentDate( new Date( year, month + 1, 1 ) );
	const goToday = () => setCurrentDate( new Date() );

	const getEventsForDay = ( day ) => {
		const dateStr = `${ year }-${ String( month + 1 ).padStart( 2, '0' ) }-${ String( day ).padStart( 2, '0' ) }`;
		return events.filter( ( e ) => ( e.scheduled_at || '' ).startsWith( dateStr ) );
	};

	const handleDragStart = ( e, event ) => {
		setDragItem( event );
		e.dataTransfer.effectAllowed = 'move';
	};

	const handleDrop = async ( e, day ) => {
		e.preventDefault();
		if ( ! dragItem || dragItem.status === 'published' ) return;

		const time = ( dragItem.scheduled_at || '' ).split( ' ' )[ 1 ] || '12:00:00';
		const newDate = `${ year }-${ String( month + 1 ).padStart( 2, '0' ) }-${ String( day ).padStart( 2, '0' ) } ${ time }`;

		try {
			await put( `/social/schedule/${ dragItem.id }`, { scheduled_at: newDate } );
			toast( __( 'Post rescheduled.', 'ai-marketing-expert' ) );
			fetchEvents();
		} catch ( err ) {
			toast( err.message, 'error' );
		}
		setDragItem( null );
	};

	const handleDragOver = ( e ) => e.preventDefault();

	// "Today" follows the site timezone, not the admin's browser, so the
	// highlighted cell matches the day the scheduler will actually publish on.
	const today = siteToday();
	const isToday = ( day ) =>
		today.year === year && today.month === month && today.day === day;

	const calendarContent = (
		<div className="aime-social-calendar">
			{ /* Header */ }
			<div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 } }>
				<h2 style={ { margin: 0 } }>{ __( 'Calendar', 'ai-marketing-expert' ) }</h2>
				<Button variant="primary" onClick={ () => onNavigate( 'new-post' ) }>
					{ __( '+ New Post', 'ai-marketing-expert' ) }
				</Button>
			</div>

			<Card>
				{ /* Month navigation */ }
				<div style={ { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 } }>
					<Button variant="secondary" size="compact" onClick={ prevMonth }>&larr;</Button>
					<div style={ { display: 'flex', alignItems: 'center', gap: 12 } }>
						<h3 style={ { margin: 0, fontSize: 18, fontWeight: 700 } }>
							{ MONTHS[ month ] } { year }
						</h3>
						<Button variant="tertiary" size="compact" onClick={ goToday }>
							{ __( 'Today', 'ai-marketing-expert' ) }
						</Button>
					</div>
					<Button variant="secondary" size="compact" onClick={ nextMonth }>&rarr;</Button>
				</div>

				{ loading ? (
					<Loader variant="calendar" text={ __( 'Loading calendar...', 'ai-marketing-expert' ) } />
				) : (
					<>
						{ /* Days of week header */ }
						<div style={ { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0 } }>
							{ DAYS.map( ( d ) => (
								<div key={ d } style={ {
									padding: '8px 4px', textAlign: 'center',
									fontWeight: 700, fontSize: 12, color: 'var(--aime-text-muted)',
									borderBottom: '2px solid var(--aime-border)',
								} }>
									{ d }
								</div>
							) ) }
						</div>

						{ /* Calendar grid */ }
						<div style={ { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0 } }>
							{ /* Empty cells for days before month start */ }
							{ Array.from( { length: firstDay } ).map( ( _, i ) => (
								<div key={ `empty-${ i }` } style={ {
									minHeight: 100, padding: 4,
									borderBottom: '1px solid var(--aime-border)',
									borderRight: '1px solid var(--aime-border)',
									background: '#fafafa',
								} } />
							) ) }

							{ /* Day cells */ }
							{ Array.from( { length: daysInMonth } ).map( ( _, i ) => {
								const day = i + 1;
								const dayEvents = getEventsForDay( day );
								return (
									<div
										key={ day }
										onDrop={ ( e ) => handleDrop( e, day ) }
										onDragOver={ handleDragOver }
										onClick={ () => setSelectedDay( selectedDay === day ? null : day ) }
										style={ {
											minHeight: 100, padding: 4, cursor: 'pointer',
											borderBottom: '1px solid var(--aime-border)',
											borderRight: '1px solid var(--aime-border)',
											background: isToday( day ) ? '#E8F5E9' : ( selectedDay === day ? '#F5F5F5' : '#fff' ),
											transition: 'background .15s',
										} }
									>
										<div style={ {
											fontSize: 13, fontWeight: isToday( day ) ? 700 : 400,
											color: isToday( day ) ? '#1B5E20' : 'inherit',
											marginBottom: 4, padding: '2px 6px',
										} }>
											{ day }
										</div>
										{ dayEvents.slice( 0, 3 ).map( ( ev ) => {
											const pInfo = SOCIAL_PLATFORMS[ ev.platform ] || {};
											const statusColors = {
												scheduled: '#1565C0', published: '#2E7D32', failed: '#C62828', draft: '#616161',
											};
											return (
												<div
													key={ ev.id }
													draggable={ ev.status !== 'published' }
													onDragStart={ ( e ) => handleDragStart( e, ev ) }
													onClick={ ( e ) => { e.stopPropagation(); onNavigate( 'edit-post', { id: ev.id } ); } }
													style={ {
														padding: '2px 6px', marginBottom: 2, borderRadius: 4,
														fontSize: 11, lineHeight: 1.3, cursor: 'grab',
														background: pInfo.color ? `${ pInfo.color }15` : '#f5f5f5',
														borderLeft: `3px solid ${ statusColors[ ev.status ] || '#999' }`,
														whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
													} }
													title={ ev.content?.substring( 0, 100 ) }
												>
													{ pInfo.icon && <span style={ { marginRight: 3 } }>{ pInfo.icon }</span> }
													{ ( ev.scheduled_at || '' ).split( ' ' )[ 1 ]?.substring( 0, 5 ) || '' }
													{ ' ' }
													{ ev.content?.substring( 0, 20 ) || '' }
												</div>
											);
										} ) }
										{ dayEvents.length > 3 && (
											<div style={ { fontSize: 11, color: 'var(--aime-text-muted)', padding: '0 6px' } }>
												+{ dayEvents.length - 3 } { __( 'more', 'ai-marketing-expert' ) }
											</div>
										) }
									</div>
								);
							} ) }
						</div>
					</>
				) }
			</Card>

			{ /* Selected day detail */ }
			{ selectedDay && (
				<Card title={ `${ MONTHS[ month ] } ${ selectedDay }, ${ year }` } style={ { marginTop: 16 } }>
					{ getEventsForDay( selectedDay ).length === 0 ? (
						<p style={ { color: 'var(--aime-text-muted)', textAlign: 'center', padding: 20 } }>
							{ __( 'No posts scheduled for this day.', 'ai-marketing-expert' ) }
						</p>
					) : (
						<div style={ { display: 'flex', flexDirection: 'column', gap: 8 } }>
							{ getEventsForDay( selectedDay ).map( ( ev ) => {
								const pInfo = SOCIAL_PLATFORMS[ ev.platform ] || {};
								return (
									<div key={ ev.id } style={ {
										display: 'flex', justifyContent: 'space-between', alignItems: 'center',
										padding: '10px 12px', borderRadius: 8,
										border: '1px solid var(--aime-border)', background: '#fafafa',
									} }>
										<div style={ { flex: 1 } }>
											<div style={ { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } }>
												<span style={ { color: pInfo.color, fontWeight: 600, fontSize: 13 } }>
													{ pInfo.icon } { pInfo.label || ev.platform }
												</span>
												<span style={ {
													display: 'inline-block', padding: '1px 8px', borderRadius: 10,
													fontSize: 11, fontWeight: 600,
													background: ev.status === 'published' ? '#E8F5E9' : ev.status === 'failed' ? '#FFEBEE' : '#E3F2FD',
													color: ev.status === 'published' ? '#2E7D32' : ev.status === 'failed' ? '#C62828' : '#1565C0',
												} }>
													{ SOCIAL_POST_STATUS[ ev.status ] || ev.status }
												</span>
											</div>
											<div style={ { fontSize: 13, color: '#333' } }>
												{ ev.content?.substring( 0, 100 ) }{ ( ev.content?.length || 0 ) > 100 ? '...' : '' }
											</div>
											<div style={ { fontSize: 12, color: 'var(--aime-text-muted)', marginTop: 4 } }>
												{ ( ev.scheduled_at || '' ).split( ' ' )[ 1 ]?.substring( 0, 5 ) || '' }
												{ ev.account_name && ` · ${ ev.account_name }` }
											</div>
										</div>
										<Button variant="tertiary" size="compact" onClick={ () => onNavigate( 'edit-post', { id: ev.id } ) }>
											{ __( 'Edit', 'ai-marketing-expert' ) }
										</Button>
									</div>
								);
							} ) }
						</div>
					) }
				</Card>
			) }
		</div>
	);

	return (
		<ProGate feature="social_visual_calendar" description={ __( 'Upgrade to Pro to access the visual social media calendar with drag-and-drop scheduling.', 'ai-marketing-expert' ) }>
			{ calendarContent }
		</ProGate>
	);
};

export default Calendar;
