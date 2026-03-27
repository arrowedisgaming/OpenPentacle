/** Decorative elements for the PDF character sheet */
import type { Content } from 'pdfmake/interfaces.js';
import { COLORS, FONTS, FONT_SIZES } from './pdf-styles.js';

/** Horizontal divider line with diamond ornaments */
export function sectionDivider(): Content {
	return {
		canvas: [
			{
				type: 'line',
				x1: 0, y1: 4,
				x2: 515, y2: 4,
				lineWidth: 0.75,
				lineColor: COLORS.border
			},
			// Left diamond
			{
				type: 'polyline',
				points: [
					{ x: 4, y: 0 },
					{ x: 8, y: 4 },
					{ x: 4, y: 8 },
					{ x: 0, y: 4 }
				],
				lineWidth: 0,
				closePath: true,
				color: COLORS.border
			},
			// Right diamond
			{
				type: 'polyline',
				points: [
					{ x: 511, y: 0 },
					{ x: 515, y: 4 },
					{ x: 511, y: 8 },
					{ x: 507, y: 4 }
				],
				lineWidth: 0,
				closePath: true,
				color: COLORS.border
			}
		],
		margin: [0, 6, 0, 6] as [number, number, number, number]
	};
}

/** Section header with accent underline */
export function sectionHeader(title: string): Content {
	return {
		stack: [
			{
				text: title.toUpperCase(),
				font: FONTS.header,
				fontSize: FONT_SIZES.sectionHeader,
				color: COLORS.accent,
				bold: true,
				characterSpacing: 1.5
			},
			{
				canvas: [
					{
						type: 'line',
						x1: 0, y1: 0,
						x2: 80, y2: 0,
						lineWidth: 1.5,
						lineColor: COLORS.accentGold
					}
				],
				margin: [0, 1, 0, 4] as [number, number, number, number]
			}
		]
	};
}

/** Ability score card with modifier prominent and score below */
export function abilityScoreBlock(
	ability: string,
	score: number,
	modifier: string
): Content {
	return {
		stack: [
			{
				text: ability.toUpperCase(),
				font: FONTS.header,
				fontSize: FONT_SIZES.abilityLabel,
				color: COLORS.inkLight,
				alignment: 'center' as const,
				characterSpacing: 1
			},
			{
				text: modifier,
				font: FONTS.body,
				fontSize: FONT_SIZES.abilityModifier,
				color: COLORS.inkDark,
				bold: true,
				alignment: 'center' as const,
				margin: [0, 1, 0, 0] as [number, number, number, number]
			},
			{
				text: String(score),
				font: FONTS.body,
				fontSize: FONT_SIZES.abilityScore,
				color: COLORS.inkMedium,
				alignment: 'center' as const
			}
		]
	};
}
