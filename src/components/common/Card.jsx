/**
 * Card component.
 */

const Card = ( { title, children, className = '', actions, icon } ) => {
	return (
		<div className={ `aime-card ${ className }` }>
			{ ( title || actions ) && (
				<div className="aime-card-header">
					<div className="aime-card-title-wrap">
						{ icon && <span className="aime-card-icon">{ icon }</span> }
						{ title && <h3 className="aime-card-title">{ title }</h3> }
					</div>
					{ actions && (
						<div className="aime-card-actions">{ actions }</div>
					) }
				</div>
			) }
			<div className="aime-card-body">
				{ children }
			</div>
		</div>
	);
};

export default Card;
