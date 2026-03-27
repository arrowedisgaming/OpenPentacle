/**
 * Client-side PDF generator using pdfmake's browser build.
 * Fonts are embedded as base64 via virtual filesystem — no Node.js APIs needed.
 * Dynamically imports pdfmake to avoid bloating the initial page bundle.
 */
import type { TDocumentDefinitions } from 'pdfmake/interfaces.js';
import type { Content } from 'pdfmake/interfaces.js';
import type { CharacterData } from '$lib/types/character.js';
import type { ContentPack, SpellDefinition } from '$lib/types/content-pack.js';
import type { ComputedSheet } from '$lib/engine/character-sheet.js';
import { resolveSheetData } from './pdf-data-resolver.js';
import { sectionDivider } from './pdf-decorations.js';
import { COLORS, FONTS, FONT_SIZES } from './pdf-styles.js';
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

/** Build the pdfmake document definition */
function buildDocDefinition(
	data: CharacterData,
	pack: ContentPack,
	sheet: ComputedSheet,
	additionalSpells: SpellDefinition[] = []
): TDocumentDefinitions {
	const r = resolveSheetData(data, pack, sheet, additionalSpells);

	const page1Content = [
		buildCharacterHeader(r),
		sectionDivider(),
		buildCoreStatsRow(r),
		sectionDivider()
	];

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

	const detailSections = [
		buildClassFeatures(r),
		buildSpeciesTraits(r),
		buildFeats(r)
	].filter((x): x is Content => x != null);

	if (detailSections.length > 0) {
		page1Content.push(sectionDivider());
		page1Content.push(...detailSections);
	}

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
					w: 612, h: 792,
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

/** Generate a PDF and trigger a browser download.
 *  Lazily imports pdfmake + font data to keep the initial page bundle small. */
export async function downloadCharacterPDF(
	data: CharacterData,
	pack: ContentPack,
	sheet: ComputedSheet,
	additionalSpells: SpellDefinition[] = []
): Promise<void> {
	const docDefinition = buildDocDefinition(data, pack, sheet, additionalSpells);

	// Dynamic imports — only loaded when user clicks PDF
	const [pdfMakeModule, { fontVfs }] = await Promise.all([
		import('pdfmake/build/pdfmake.js'),
		import('./font-data.js')
	]);

	// pdfmake's browser build has vfs/fonts/createPdf().download() APIs
	// that @types/pdfmake doesn't fully declare — use any for the runtime API
	const pdfMake: any = pdfMakeModule.default ?? pdfMakeModule;

	// Write fonts into pdfmake's internal virtual filesystem
	pdfMake.addVirtualFileSystem(fontVfs);
	pdfMake.fonts = {
		[FONTS.header]: {
			normal: 'Cinzel-Variable.ttf',
			bold: 'Cinzel-Variable.ttf',
			italics: 'Cinzel-Variable.ttf',
			bolditalics: 'Cinzel-Variable.ttf'
		},
		[FONTS.body]: {
			normal: 'CrimsonText-Regular.ttf',
			bold: 'CrimsonText-Bold.ttf',
			italics: 'CrimsonText-Italic.ttf',
			bolditalics: 'CrimsonText-BoldItalic.ttf'
		}
	};

	const safeName = (data.name || 'character').slice(0, 50).replace(/[^a-zA-Z0-9]/g, '_');

	return new Promise<void>((resolve) => {
		pdfMake.createPdf(docDefinition).download(`${safeName}.pdf`, () => {
			resolve();
		});
	});
}
