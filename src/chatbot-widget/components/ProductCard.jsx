/**
 * ProductCard — product recommendation card rendered under an AI message.
 *
 * Shows product image, title, price, a link to the product page, and a
 * prominent "Buy Now" button (add-to-cart → checkout for simple Woo
 * products; product page otherwise).
 */

import { __, sprintf } from '@wordpress/i18n';

const isSafeUrl = ( url ) => /^https?:\/\//i.test( String( url || '' ).trim() );

const ProductCard = ( { product } ) => {
	const { title, url, image, price_html: priceHtml, buy_url: buyUrl } = product;

	if ( ! title ) {
		return null;
	}

	const pageUrl = isSafeUrl( url ) ? url : '';
	const checkoutUrl = isSafeUrl( buyUrl ) ? buyUrl : pageUrl;

	return (
		<div className="aime-chat-product-card">
			{ image && (
				pageUrl ? (
					<a
						className="aime-chat-product-card__media"
						href={ pageUrl }
						target="_blank"
						rel="noopener noreferrer nofollow"
						tabIndex={ -1 }
						aria-hidden="true"
					>
						<img src={ image } alt="" loading="lazy" />
					</a>
				) : (
					<span className="aime-chat-product-card__media">
						<img src={ image } alt="" loading="lazy" />
					</span>
				)
			) }
			<div className="aime-chat-product-card__body">
				{ pageUrl ? (
					<a
						className="aime-chat-product-card__title"
						href={ pageUrl }
						target="_blank"
						rel="noopener noreferrer nofollow"
					>
						{ title }
					</a>
				) : (
					<span className="aime-chat-product-card__title">{ title }</span>
				) }
				{ priceHtml && (
					<span className="aime-chat-product-card__price">{ priceHtml }</span>
				) }
				<div className="aime-chat-product-card__actions">
					{ checkoutUrl && (
						<a
							className="aime-chat-product-card__buy"
							href={ checkoutUrl }
							target="_blank"
							rel="noopener noreferrer nofollow"
							aria-label={ sprintf(
								/* translators: %s: product title */
								__( 'Buy %s now', 'ai-marketing-expert' ),
								title
							) }
						>
							{ __( 'Buy Now', 'ai-marketing-expert' ) }
						</a>
					) }
					{ pageUrl && (
						<a
							className="aime-chat-product-card__view"
							href={ pageUrl }
							target="_blank"
							rel="noopener noreferrer nofollow"
							aria-label={ sprintf(
								/* translators: %s: product title */
								__( 'View product: %s', 'ai-marketing-expert' ),
								title
							) }
						>
							{ __( 'View product', 'ai-marketing-expert' ) }
						</a>
					) }
				</div>
			</div>
		</div>
	);
};

export default ProductCard;
