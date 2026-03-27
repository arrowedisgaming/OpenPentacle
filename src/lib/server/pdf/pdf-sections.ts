/** Section builders — each returns pdfmake Content for one area of the PDF */
import type { Content, TableCell } from 'pdfmake/interfaces.js';
import { COLORS, FONTS, FONT_SIZES } from './pdf-styles.js';
import { sectionHeader, abilityScoreBlock } from './pdf-decorations.js';
import type { ResolvedSheetData } from './pdf-data-resolver.js';
import type { AbilityId, SkillId } from '$lib/types/common.js';
import { ABILITY_IDS, ABILITY_NAMES, SKILL_ABILITIES } from '$lib/types/common.js';
import { formatModifier, kebabToTitle, formatSpellLevel, formatCurrency } from '$lib/utils/format.js';

// ─── Character Header ───────────────────────────────────────

export function buildCharacterHeader(r: ResolvedSheetData): Content {
	return {
		columns: [
			{
				stack: [
					{
						text: r.sheet.name || 'Unnamed Character',
						font: FONTS.header,
						fontSize: FONT_SIZES.characterName,
						color: COLORS.inkDark,
						bold: true
					},
					{
						text: `${r.originName} · ${r.backgroundName}`,
						font: FONTS.body,
						fontSize: FONT_SIZES.bodyText + 1,
						color: COLORS.inkMedium,
						margin: [0, 2, 0, 0] as [number, number, number, number]
					}
				],
				width: '*'
			},
			{
				stack: [
					{
						text: r.sheet.classSummary,
						font: FONTS.body,
						fontSize: FONT_SIZES.bodyText + 1,
						color: COLORS.inkDark,
						bold: true,
						alignment: 'right' as const
					},
					{
						text: `Level ${r.sheet.level}  ·  Prof ${formatModifier(r.sheet.proficiencyBonus)}`,
						font: FONTS.body,
						fontSize: FONT_SIZES.bodyText,
						color: COLORS.inkMedium,
						alignment: 'right' as const,
						margin: [0, 2, 0, 0] as [number, number, number, number]
					}
				],
				width: 'auto'
			}
		],
		margin: [0, 0, 0, 4] as [number, number, number, number]
	};
}

// ─── Core Stats Row ─────────────────────────────────────────

export function buildCoreStatsRow(r: ResolvedSheetData): Content {
	const abilityCards = ABILITY_IDS.map((id) =>
		abilityScoreBlock(id, r.sheet.abilityScores[id], formatModifier(r.sheet.abilityModifiers[id]))
	);

	const combatStats: Content = {
		table: {
			widths: ['*', '*', '*'],
			body: [
				[
					combatCell('AC', String(r.sheet.armorClass)),
					combatCell('HP', String(r.sheet.maxHP)),
					combatCell('Init', formatModifier(r.sheet.initiative))
				],
				[
					combatCell('Speed', `${r.sheet.speed}ft`),
					combatCell('Size', r.sheet.size),
					combatCell('PP', String(r.sheet.passivePerception))
				]
			]
		},
		layout: {
			hLineWidth: () => 0.5,
			vLineWidth: () => 0.5,
			hLineColor: () => COLORS.borderLight,
			vLineColor: () => COLORS.borderLight,
			paddingLeft: () => 3,
			paddingRight: () => 3,
			paddingTop: () => 2,
			paddingBottom: () => 2
		}
	};

	return {
		columns: [
			{
				table: {
					widths: Array(6).fill('*') as string[],
					body: [abilityCards as any[]]
				},
				layout: {
					hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 0.75 : 0,
					vLineWidth: (i: number, node: any) => (i === 0 || i === node.table.widths.length) ? 0.75 : 0.5,
					hLineColor: () => COLORS.border,
					vLineColor: () => COLORS.borderLight,
					paddingLeft: () => 4,
					paddingRight: () => 4,
					paddingTop: () => 4,
					paddingBottom: () => 4,
					fillColor: () => COLORS.parchment
				},
				width: '*'
			},
			{ width: 8, text: '' },
			{
				...combatStats,
				width: 130
			}
		],
		margin: [0, 4, 0, 0] as [number, number, number, number]
	};
}

function combatCell(label: string, value: string): TableCell {
	return {
		stack: [
			{
				text: value,
				font: FONTS.body,
				fontSize: FONT_SIZES.combatStat,
				bold: true,
				color: COLORS.inkDark,
				alignment: 'center' as const
			},
			{
				text: label,
				font: FONTS.body,
				fontSize: FONT_SIZES.combatLabel,
				color: COLORS.inkLight,
				alignment: 'center' as const
			}
		]
	};
}

// ─── Saving Throws ──────────────────────────────────────────

export function buildSavingThrows(r: ResolvedSheetData): Content {
	const rows = ABILITY_IDS.map((id) => {
		const save = r.sheet.savingThrows[id];
		return [
			{ text: save.proficient ? '●' : '○', fontSize: 7, color: save.proficient ? COLORS.accent : COLORS.inkLight, font: FONTS.body },
			{ text: ABILITY_NAMES[id], fontSize: FONT_SIZES.bodySmall, color: save.proficient ? COLORS.inkDark : COLORS.inkMedium, font: FONTS.body, bold: save.proficient },
			{ text: formatModifier(save.modifier), fontSize: FONT_SIZES.bodySmall, alignment: 'right' as const, color: COLORS.inkDark, font: FONTS.body }
		];
	});

	return {
		stack: [
			sectionHeader('Saving Throws'),
			{
				table: {
					widths: [8, '*', 'auto'],
					body: rows
				},
				layout: 'noBorders'
			}
		]
	};
}

// ─── Skills ─────────────────────────────────────────────────

export function buildSkills(r: ResolvedSheetData): Content {
	const skillIds = Object.keys(SKILL_ABILITIES) as SkillId[];
	const rows = skillIds.map((skillId) => {
		const skill = r.sheet.skills[skillId];
		const icon = skill.proficiency === 'expertise' ? '◉' : skill.proficiency === 'proficient' ? '●' : '○';
		const isProf = skill.proficiency !== 'none';
		return [
			{ text: icon, fontSize: 7, color: isProf ? COLORS.accent : COLORS.inkLight, font: FONTS.body },
			{ text: kebabToTitle(skillId), fontSize: FONT_SIZES.bodySmall, color: isProf ? COLORS.inkDark : COLORS.inkMedium, font: FONTS.body, bold: isProf },
			{ text: formatModifier(skill.modifier), fontSize: FONT_SIZES.bodySmall, alignment: 'right' as const, color: COLORS.inkDark, font: FONTS.body }
		];
	});

	// Split into two columns
	const mid = Math.ceil(rows.length / 2);
	const leftRows = rows.slice(0, mid);
	const rightRows = rows.slice(mid);

	return {
		stack: [
			sectionHeader('Skills'),
			{
				columns: [
					{
						table: { widths: [8, '*', 'auto'], body: leftRows },
						layout: 'noBorders',
						width: '*'
					},
					{ width: 8, text: '' },
					{
						table: { widths: [8, '*', 'auto'], body: rightRows },
						layout: 'noBorders',
						width: '*'
					}
				]
			}
		]
	};
}

// ─── Weapons Table ──────────────────────────────────────────

export function buildWeaponsTable(r: ResolvedSheetData): Content | null {
	if (r.weapons.length === 0) return null;

	const headerRow: TableCell[] = ['Name', 'Attack', 'Damage', 'Properties'].map((h) => ({
		text: h,
		fontSize: FONT_SIZES.tableHeader,
		font: FONTS.body,
		bold: true,
		color: COLORS.accent
	}));

	const dataRows = r.weapons.map((w) => [
		{ text: w.name, fontSize: FONT_SIZES.tableCell, font: FONTS.body, color: COLORS.inkDark },
		{ text: formatModifier(w.attackBonus), fontSize: FONT_SIZES.tableCell, font: FONTS.body, color: COLORS.inkDark },
		{
			text: `${w.damage}${w.damageBonus !== 0 ? ` ${formatModifier(w.damageBonus)}` : ''} ${w.damageType}`,
			fontSize: FONT_SIZES.tableCell, font: FONTS.body, color: COLORS.inkDark
		},
		{
			text: [
				...(w.range ? [`${w.range.normal}/${w.range.long}ft`] : []),
				...w.properties.map(kebabToTitle)
			].join(', '),
			fontSize: FONT_SIZES.tableCell, font: FONTS.body, color: COLORS.inkMedium
		}
	]);

	return {
		stack: [
			sectionHeader('Weapons & Attacks'),
			{
				table: {
					widths: ['auto', 'auto', '*', '*'],
					headerRows: 1,
					body: [headerRow, ...dataRows]
				},
				layout: {
					hLineWidth: (i: number) => (i <= 1) ? 0.5 : 0,
					vLineWidth: () => 0,
					hLineColor: () => COLORS.borderLight,
					paddingLeft: () => 2,
					paddingRight: () => 4,
					paddingTop: () => 2,
					paddingBottom: () => 2
				}
			}
		]
	};
}

// ─── Proficiencies ──────────────────────────────────────────

export function buildProficiencies(r: ResolvedSheetData): Content | null {
	const entries = Object.entries(r.proficiencyGroups);
	if (entries.length === 0) return null;

	const items: Content[] = entries.map(([label, values]) => ({
		stack: [
			{ text: label, fontSize: FONT_SIZES.bodySmall, font: FONTS.body, bold: true, color: COLORS.accent },
			{ text: values.join(', '), fontSize: FONT_SIZES.bodySmall, font: FONTS.body, color: COLORS.inkDark, margin: [0, 0, 0, 3] as [number, number, number, number] }
		]
	}));

	return {
		stack: [
			sectionHeader('Proficiencies'),
			...items
		]
	};
}

// ─── Equipment List ─────────────────────────────────────────

export function buildEquipmentList(r: ResolvedSheetData): Content | null {
	const allItems = [
		...r.armorItems.map((a) => a.name),
		...r.otherEquipment.map((e) => e.quantity > 1 ? `${e.name} (×${e.quantity})` : e.name)
	];
	if (allItems.length === 0) return null;

	return {
		stack: [
			sectionHeader('Equipment'),
			{
				text: allItems.join(', '),
				fontSize: FONT_SIZES.bodySmall,
				font: FONTS.body,
				color: COLORS.inkDark
			}
		]
	};
}

// ─── Currency ───────────────────────────────────────────────

export function buildCurrency(r: ResolvedSheetData): Content | null {
	const formatted = formatCurrency(r.currency as unknown as Record<string, number>);
	if (formatted === '0 gp') return null;

	return {
		stack: [
			sectionHeader('Coins'),
			{ text: formatted, fontSize: FONT_SIZES.bodyText, font: FONTS.body, color: COLORS.inkDark }
		]
	};
}

// ─── Class Features ─────────────────────────────────────────

export function buildClassFeatures(r: ResolvedSheetData): Content | null {
	if (r.classFeatures.length === 0) return null;

	const items: Content[] = [];
	for (const feature of r.classFeatures) {
		const key = `${feature.id}-${feature.level}`;
		const displayName = r.featureDisplayNames.get(key) ?? feature.name;
		const description = r.featureDescriptions.get(key) ?? feature.description;
		const choiceLabels = r.featureChoiceLabels.get(key) ?? [];
		const asiLabel = r.asiChoiceLabels.get(key);

		const featureContent: Content[] = [
			{
				columns: [
					{
						text: [
							{ text: `Lv${feature.level} `, fontSize: FONT_SIZES.bodySmall, color: COLORS.accentGold, bold: true },
							{ text: displayName, fontSize: FONT_SIZES.bodyText, bold: true, color: COLORS.inkDark }
						],
						width: '*',
						font: FONTS.body
					}
				]
			}
		];

		if (asiLabel) {
			featureContent.push({
				text: asiLabel,
				fontSize: FONT_SIZES.bodySmall,
				font: FONTS.body,
				color: COLORS.accent,
				margin: [8, 0, 0, 0] as [number, number, number, number]
			});
		}

		for (const label of choiceLabels) {
			featureContent.push({
				text: label,
				fontSize: FONT_SIZES.bodySmall,
				font: FONTS.body,
				color: COLORS.accent,
				margin: [8, 0, 0, 0] as [number, number, number, number]
			});
		}

		if (description) {
			featureContent.push({
				text: description,
				fontSize: FONT_SIZES.bodySmall,
				font: FONTS.body,
				color: COLORS.inkMedium,
				margin: [8, 1, 0, 2] as [number, number, number, number]
			});
		}

		items.push({ stack: featureContent, margin: [0, 0, 0, 3] as [number, number, number, number] });
	}

	return {
		stack: [
			sectionHeader('Class Features'),
			...items
		]
	};
}

// ─── Feats ──────────────────────────────────────────────────

export function buildFeats(r: ResolvedSheetData): Content | null {
	if (r.feats.length === 0) return null;

	const items: Content[] = r.feats.map((feat) => {
		const parts: Content[] = [
			{
				text: [
					{ text: feat.name, fontSize: FONT_SIZES.bodyText, bold: true, color: COLORS.inkDark },
					{ text: `  (${feat.source})`, fontSize: FONT_SIZES.bodySmall, color: COLORS.inkLight },
					...(feat.category ? [{ text: `  [${feat.category}]`, fontSize: FONT_SIZES.bodySmall, color: COLORS.accentGold }] : [])
				],
				font: FONTS.body
			}
		];

		if (feat.description) {
			parts.push({
				text: feat.description,
				fontSize: FONT_SIZES.bodySmall,
				font: FONTS.body,
				color: COLORS.inkMedium,
				margin: [8, 1, 0, 0] as [number, number, number, number]
			});
		}

		if (feat.choices.length > 0) {
			const choiceText = feat.choices.map((c) => `${c.label}: ${c.value}`).join(', ');
			parts.push({
				text: choiceText,
				fontSize: FONT_SIZES.bodySmall,
				font: FONTS.body,
				color: COLORS.accent,
				margin: [8, 0, 0, 0] as [number, number, number, number]
			});
		}

		return { stack: parts, margin: [0, 0, 0, 3] as [number, number, number, number] };
	});

	return {
		stack: [
			sectionHeader('Feats'),
			...items
		]
	};
}

// ─── Species Traits ─────────────────────────────────────────

export function buildSpeciesTraits(r: ResolvedSheetData): Content | null {
	if (r.speciesTraits.length === 0) return null;

	const items: Content[] = r.speciesTraits.map((trait) => ({
		stack: [
			{ text: trait.name, fontSize: FONT_SIZES.bodyText, font: FONTS.body, bold: true, color: COLORS.inkDark },
			{ text: trait.description, fontSize: FONT_SIZES.bodySmall, font: FONTS.body, color: COLORS.inkMedium, margin: [8, 1, 0, 2] as [number, number, number, number] }
		]
	}));

	return {
		stack: [
			sectionHeader(`Species Traits (${r.originName})`),
			...items
		]
	};
}

// ─── Flavor Text ────────────────────────────────────────────

export function buildFlavorText(r: ResolvedSheetData): Content | null {
	const f = r.flavor;
	const sections: Content[] = [];

	const addSection = (label: string, value?: string) => {
		if (!value) return;
		sections.push({
			stack: [
				{ text: label, fontSize: FONT_SIZES.bodySmall, font: FONTS.body, bold: true, color: COLORS.accent },
				{ text: value, fontSize: FONT_SIZES.bodySmall, font: FONTS.body, color: COLORS.inkDark, margin: [0, 0, 0, 3] as [number, number, number, number] }
			]
		});
	};

	addSection('Personality Traits', f.personalityTraits);
	addSection('Ideals', f.ideals);
	addSection('Bonds', f.bonds);
	addSection('Flaws', f.flaws);
	addSection('Backstory', f.backstory);

	// Physical characteristics
	const physical = [f.age && `Age: ${f.age}`, f.height && `Height: ${f.height}`, f.weight && `Weight: ${f.weight}`,
		f.eyes && `Eyes: ${f.eyes}`, f.skin && `Skin: ${f.skin}`, f.hair && `Hair: ${f.hair}`].filter(Boolean);
	if (physical.length > 0) {
		sections.push({
			text: physical.join('  ·  '),
			fontSize: FONT_SIZES.bodySmall,
			font: FONTS.body,
			color: COLORS.inkMedium,
			italics: true,
			margin: [0, 0, 0, 3] as [number, number, number, number]
		});
	}

	addSection('Appearance', f.appearance);

	if (sections.length === 0) return null;

	return {
		stack: [
			sectionHeader('Personality & Backstory'),
			...sections
		]
	};
}

// ─── Spellcasting Page ──────────────────────────────────────

export function buildSpellcastingPage(r: ResolvedSheetData): Content[] | null {
	if (r.spellGroups.size === 0) return null;

	const sections: Content[] = [];

	// Spellcasting header
	const spellInfo: string[] = [];
	if (r.spellcastingAbility) spellInfo.push(`Ability: ${r.spellcastingAbility}`);
	const dcEntries = Object.entries(r.sheet.spellSaveDC);
	if (dcEntries.length > 0) {
		spellInfo.push(`Save DC: ${dcEntries[0][1]}`);
		spellInfo.push(`Attack: ${formatModifier(r.sheet.spellAttackBonus[dcEntries[0][0]])}`);
	}

	sections.push(sectionHeader('Spellcasting'));
	if (spellInfo.length > 0) {
		sections.push({
			text: spellInfo.join('    ·    '),
			fontSize: FONT_SIZES.bodyText,
			font: FONTS.body,
			color: COLORS.inkDark,
			bold: true,
			margin: [0, 0, 0, 6] as [number, number, number, number]
		});
	}

	// Spell slots
	const slotEntries = Object.entries(r.sheet.spellSlots).filter(([, count]) => count > 0);
	if (slotEntries.length > 0) {
		const slotText = slotEntries.map(([level, count]) =>
			`${formatSpellLevel(Number(level))}: ${'●'.repeat(count)}`
		).join('    ');

		sections.push({
			text: [
				{ text: 'SPELL SLOTS  ', fontSize: FONT_SIZES.bodySmall, bold: true, color: COLORS.accent },
				{ text: slotText, fontSize: FONT_SIZES.bodySmall, color: COLORS.inkDark }
			],
			font: FONTS.body,
			margin: [0, 0, 0, 8] as [number, number, number, number]
		});
	}

	// Pact slots
	if (r.sheet.pactSlots) {
		sections.push({
			text: [
				{ text: 'PACT SLOTS  ', fontSize: FONT_SIZES.bodySmall, bold: true, color: COLORS.accent },
				{ text: `${r.sheet.pactSlots.count} × ${formatSpellLevel(r.sheet.pactSlots.level)} level`, fontSize: FONT_SIZES.bodySmall, color: COLORS.inkDark }
			],
			font: FONTS.body,
			margin: [0, 0, 0, 8] as [number, number, number, number]
		});
	}

	// Spell groups by level (two-column layout)
	const groupEntries = [...r.spellGroups.entries()];
	const leftGroups = groupEntries.filter((_, i) => i % 2 === 0);
	const rightGroups = groupEntries.filter((_, i) => i % 2 === 1);

	const buildSpellColumn = (groups: [number, { spell: any; source: string; prepared: boolean }[]][]): Content => ({
		stack: groups.map(([level, spells]) => ({
			stack: [
				{
					text: (level === 0 ? 'Cantrips' : `${formatSpellLevel(level)} Level`).toUpperCase(),
					fontSize: FONT_SIZES.subsectionHeader,
					font: FONTS.header,
					color: COLORS.accent,
					characterSpacing: 1,
					margin: [0, 0, 0, 2] as [number, number, number, number]
				},
				...spells.map((s) => ({
					text: [
						{ text: s.prepared && s.spell.level > 0 ? '★ ' : '  ', color: COLORS.accentGold },
						{ text: s.spell.name, color: COLORS.inkDark },
						...(s.spell.concentration ? [{ text: ' (C)', color: COLORS.inkLight, fontSize: FONT_SIZES.bodySmall - 1 }] : []),
						...(s.spell.ritual ? [{ text: ' (R)', color: COLORS.inkLight, fontSize: FONT_SIZES.bodySmall - 1 }] : []),
						...(s.source === 'feat' ? [{ text: ' [MI]', color: COLORS.accentGold, fontSize: FONT_SIZES.bodySmall - 1 }] : []),
						...(s.source === 'origin' ? [{ text: ' [Species]', color: COLORS.accentGold, fontSize: FONT_SIZES.bodySmall - 1 }] : [])
					],
					fontSize: FONT_SIZES.spellName,
					font: FONTS.body,
					margin: [0, 0, 0, 1] as [number, number, number, number]
				}))
			],
			margin: [0, 0, 0, 6] as [number, number, number, number]
		})) as Content[]
	});

	sections.push({
		columns: [
			{ ...(buildSpellColumn(leftGroups) as any), width: '*' },
			{ width: 12, text: '' },
			{ ...(buildSpellColumn(rightGroups) as any), width: '*' }
		]
	});

	// Legend
	sections.push({
		text: '★ = prepared  ·  C = concentration  ·  R = ritual  ·  MI = Magic Initiate',
		fontSize: FONT_SIZES.bodySmall - 1,
		font: FONTS.body,
		color: COLORS.inkLight,
		italics: true,
		margin: [0, 4, 0, 0] as [number, number, number, number]
	});

	return sections;
}
