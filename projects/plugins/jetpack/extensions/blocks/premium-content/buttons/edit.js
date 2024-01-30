import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';
import { compose } from '@wordpress/compose';
import { withDispatch, withSelect } from '@wordpress/data';
import { useEffect, useMemo } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

const ALLOWED_BLOCKS = [
	'core/button',
	'jetpack/recurring-payments',
	'premium-content/login-button',
];

function ButtonsEdit( { context, subscribeButton, setSubscribeButtonPlan } ) {
	// Placing this in a useMemo to support `useEffect` hook below.
	const planIds = useMemo( () => {
		return context[ 'premium-content/planIds' ] || [];
	}, [ context ] );

	const isPreview = context ? context[ 'premium-content/isPreview' ] : false;

	const previewTemplate = [
		[
			'core/button',
			{
				element: 'a',
				uniqueId: 'recurring-payments-id',
				text: __( 'Subscribe', 'jetpack' ),
			},
		],
		[ 'premium-content/login-button' ],
	];

	const template = [
		[
			'jetpack/recurring-payments',
			{ planIds },
			[
				[
					'jetpack/button',
					{
						element: 'a',
						uniqueId: 'recurring-payments-id',
						text: __( 'Subscribe', 'jetpack' ),
						passthroughAttributes: {
							uniqueId: 'uniqueId',
							url: 'url',
						},
					},
				],
			],
		],
		[ 'premium-content/login-button' ],
	];

	// Keep in sync the plan selected on the Premium Content block with the plan selected on the Recurring Payments
	// inner block acting as a subscribe button.
	useEffect( () => {
		if ( ! planIds || planIds.length === 0 || ! subscribeButton ) {
			return;
		}

		const subscribeButtonPlanIds = subscribeButton.attributes.planIds || [];

		// if the plan IDs are the same, don't update the subscribe button
		if (
			subscribeButtonPlanIds.length === planIds.length &&
			subscribeButtonPlanIds.every( i => planIds.includes( i ) )
		) {
			return;
		}

		setSubscribeButtonPlan( planIds );
	}, [ planIds, subscribeButton, setSubscribeButtonPlan ] );

	/*
	 * Hides the product management controls of the Recurring Payments inner block acting as a subscribe
	 * button so users can only switch plans using the plan selector of the Premium Content block.
	 */
	useEffect( () => {
		if ( ! subscribeButton ) {
			return;
		}
		addFilter(
			'jetpack.recurringPayments.editorSettings',
			'jetpack/premium-content-hide-recurring-payments-controls',
			( editorSettings, clientId ) => {
				if ( clientId === subscribeButton.clientId ) {
					return {
						...editorSettings,
						showProductManagementControls: false,
					};
				}
				return editorSettings;
			}
		);
	}, [ subscribeButton ] );

	const blockProps = useBlockProps( {
		className: 'wp-block-buttons',
	} );

	return (
		<div { ...blockProps }>
			<InnerBlocks
				allowedBlocks={ ALLOWED_BLOCKS }
				template={ isPreview ? previewTemplate : template }
				templateInsertUpdatesSelection={ false }
				layout={ { type: 'default', alignments: [] } }
				__experimentalMoverDirection="horizontal"
			/>
		</div>
	);
}

export default compose( [
	withSelect( ( select, props ) => {
		// Only first block is assumed to be a subscribe button (users can add additional Recurring Payments blocks for
		// other plans).
		const subscribeButton = select( 'core/block-editor' )
			.getBlock( props.clientId )
			.innerBlocks.find( block => block.name === 'jetpack/recurring-payments' );

		return { subscribeButton };
	} ),
	withDispatch( ( dispatch, props ) => ( {
		/**
		 * Updates the plans on the Recurring Payments block acting as a subscribe button.
		 *
		 * @param {Array} planIds - Plan IDs.
		 */
		setSubscribeButtonPlan( planIds ) {
			dispatch( 'core/block-editor' ).updateBlockAttributes( props.subscribeButton.clientId, {
				planIds,
			} );
		},
	} ) ),
] )( ButtonsEdit );
