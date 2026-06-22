/**
 * Styled confirmation modal — premium modal style.
 */

const ConfirmModal = ( {
	title = 'Confirm',
	message,
	confirmLabel = 'Confirm',
	cancelLabel = 'Cancel',
	isDestructive = false,
	onConfirm,
	onCancel,
} ) => {
	return (
		<div className="aime-premium-modal-overlay" onClick={ ( e ) => { if ( e.target === e.currentTarget ) onCancel(); } }>
			<div className="aime-premium-modal" style={ { width: '440px' } }>
				<div className="aime-premium-modal-header">
					<h3>
						<span className="aime-premium-modal-icon" style={ isDestructive ? { background: 'linear-gradient(135deg, #c62828, #e53935)' } : {} }>
							{ isDestructive ? (
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
							) : (
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
							) }
						</span>
						{ title }
					</h3>
					<button className="aime-modal-close" onClick={ onCancel }>&times;</button>
				</div>
				<div className="aime-premium-modal-body">
					<p style={ { margin: 0, fontSize: 14, color: 'var(--aime-text)', lineHeight: 1.6 } }>{ message }</p>
				</div>
				<div className="aime-premium-modal-footer">
					<button className="aime-btn-cancel" onClick={ onCancel }>{ cancelLabel }</button>
					<button
						className={ isDestructive ? 'aime-btn-danger' : 'aime-btn-primary' }
						onClick={ onConfirm }
					>
						{ confirmLabel }
					</button>
				</div>
			</div>
		</div>
	);
};

export default ConfirmModal;
