/** Main PDF generator — orchestrates sections into a complete pdfmake document */
import type { TDocumentDefinitions } from 'pdfmake/interfaces.js';
import { join } from 'path';
import { createRequire } from 'module';
import type { CharacterData } from '$lib/types/character.js';
import type { ContentPack, SpellDefinition } from '$lib/types/content-pack.js';
import type { ComputedSheet } from '$lib/engine/character-sheet.js';
import { resolveSheetData } from './pdf-data-resolver.js';
import { sectionDivider } from './pdf-decorations.js';
import { COLORS, FONTS, FONT_SIZES } from './pdf-styles.js';
import type { Content } from 'pdfmake/interfaces.js';
import {
	buildCharacterHeader,
	buildCoreStatsRow,
	buildSavingThrows,
	buildSkills,
	buildWeaponsTable,
	buildProficiencies,
	buildEquipmentList,
	buildCurrency,
	buildClassFeatures,
	buildFeats,
	buildSpeciesTraits,
	buildFlavorText,
	buildSpellcastingPage
} from './pdf-sections.js';

const FONTS_DIR = join(process.cwd(), 'src/lib/server/pdf/fonts');

/** pdfmake singleton — initialized once at module load.
 *  Uses createRequire because pdfmake/src/printer.js has extensionless ESM imports
 *  that fail in Node 25; the CJS build (pdfmake/js/index.js) works correctly. */
const pdfmake = (() => {
	const req = createRequire(import.meta.url);
	const instance = req('pdfmake/js/index.js');
	instance.fonts = {
		[FONTS.header]: {
			normal: join(FONTS_DIR, 'Cinzel-Variable.ttf'),
			bold: join(FONTS_DIR, 'Cinzel-Variable.ttf'),
			italics: join(FONTS_DIR, 'Cinzel-Variable.ttf'),
			bolditalics: join(FONTS_DIR, 'Cinzel-Variable.ttf')
		},
		[FONTS.body]: {
			normal: join(FONTS_DIR, 'CrimsonText-Regular.ttf'),
			bold: join(FONTS_DIR, 'CrimsonText-Bold.ttf'),
			italics: join(FONTS_DIR, 'CrimsonText-Italic.ttf'),
			bolditalics: join(FONTS_DIR, 'CrimsonText-BoldItalic.ttf')
		}
	};
	return instance;
})();

/** Build the pdfmake document definition from resolved data */
export function buildDocDefinition(
	data: CharacterData,
	pack: ContentPack,
	sheet: ComputedSheet,
	additionalSpells: SpellDefinition[] = []
): TDocumentDefinitions {
	const r = resolveSheetData(data, pack, sheet, additionalSpells);

	// ─── Page 1: Main character sheet ────────────────────────
	const page1Content = [
		buildCharacterHeader(r),
		sectionDivider(),
		buildCoreStatsRow(r),
		sectionDivider()
	];

	// Two-column body
	const leftColumn = [
		buildSavingThrows(r),
		{ text: '', margin: [0, 6, 0, 0] as [number, number, number, number] },
		buildSkills(r),
		{ text: '', margin: [0, 6, 0, 0] as [number, number, number, number] },
		buildProficiencies(r)
	].filter((x): x is Content => x != null);

	const rightColumn = [
		buildWeaponsTable(r),
		{ text: '', margin: [0, 6, 0, 0] as [number, number, number, number] },
		buildEquipmentList(r),
		{ text: '', margin: [0, 6, 0, 0] as [number, number, number, number] },
		buildCurrency(r),
		{ text: '', margin: [0, 6, 0, 0] as [number, number, number, number] },
		buildFlavorText(r)
	].filter((x): x is Content => x != null);

	page1Content.push({
		columns: [
			{ stack: leftColumn, width: '*' },
			{ width: 12, text: '' },
			{ stack: rightColumn, width: '*' }
		]
	});

	// ─── Remaining: features, traits, feats ──────────────────
	const detailSections = [
		buildClassFeatures(r),
		buildSpeciesTraits(r),
		buildFeats(r)
	].filter((x): x is Content => x != null);

	if (detailSections.length > 0) {
		page1Content.push(sectionDivider());
		page1Content.push(...detailSections);
	}

	// ─── Spellcasting page (conditional) ─────────────────────
	const spellContent = buildSpellcastingPage(r);
	if (spellContent) {
		page1Content.push(
			{ text: '', pageBreak: 'before' as const },
			...spellContent
		);
	}

	return {
		pageSize: 'LETTER',
		pageMargins: [36, 36, 36, 50],
		defaultStyle: {
			font: FONTS.body,
			fontSize: FONT_SIZES.bodyText,
			color: COLORS.inkDark
		},
		background: () => ({
			canvas: [
				{
					type: 'rect',
					x: 0, y: 0,
					w: 612, h: 792, // Letter size in points
					color: COLORS.parchment
				}
			]
		}),
		content: page1Content,
		footer: (currentPage: number, pageCount: number) => ({
			columns: [
				{
					text: r.sheet.name,
					fontSize: FONT_SIZES.footer,
					font: FONTS.body,
					color: COLORS.inkLight,
					margin: [36, 0, 0, 0] as [number, number, number, number]
				},
				{
					text: `Page ${currentPage} of ${pageCount}`,
					fontSize: FONT_SIZES.footer,
					font: FONTS.body,
					color: COLORS.inkLight,
					alignment: 'right' as const,
					margin: [0, 0, 36, 0] as [number, number, number, number]
				}
			]
		})
	};
}

/** Generate a PDF buffer from character data */
export async function generateCharacterPDFBuffer(
	data: CharacterData,
	pack: ContentPack,
	sheet: ComputedSheet,
	additionalSpells: SpellDefinition[] = []
): Promise<Buffer> {
	const docDefinition = buildDocDefinition(data, pack, sheet, additionalSpells);
	const doc = pdfmake.createPdf(docDefinition);
	return doc.getBuffer();
}
