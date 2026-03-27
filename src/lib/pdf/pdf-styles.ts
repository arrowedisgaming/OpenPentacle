/** Design constants for the PDF character sheet */

export const COLORS = {
	parchment: '#F5F0E8',
	parchmentDark: '#E8E0D0',
	inkDark: '#2C1810',
	inkMedium: '#4A3728',
	inkLight: '#6B5B4F',
	accent: '#8B2500',
	accentGold: '#B8860B',
	border: '#A0906B',
	borderLight: '#C4B89A',
	white: '#FFFFFF'
} as const;

export const FONT_SIZES = {
	characterName: 22,
	sectionHeader: 13,
	subsectionHeader: 11,
	abilityModifier: 18,
	abilityLabel: 7,
	abilityScore: 8,
	bodyText: 9,
	bodySmall: 8,
	tableHeader: 8,
	tableCell: 8,
	footer: 7,
	spellName: 8,
	combatStat: 12,
	combatLabel: 7
} as const;

export const FONTS = {
	header: 'Cinzel',
	body: 'Crimson'
} as const;
