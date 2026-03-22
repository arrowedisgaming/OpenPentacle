/** Raw spell object from the Open5E v2 API */
export interface Open5eSpell {
	key: string;
	name: string;
	level: number;
	school: { name: string; key: string };
	casting_time: string;
	ritual: boolean;
	concentration: boolean;
	duration: string;
	range: number | null;
	range_text: string;
	range_unit: string;
	verbal: boolean;
	somatic: boolean;
	material: boolean;
	material_specified: string | null;
	material_cost: number | null;
	material_consumed: boolean;
	desc: string;
	higher_level: string;
	damage_roll: string | null;
	damage_types: { name: string; key: string }[];
	classes: { name: string; key: string; url: string }[];
	document: {
		key: string;
		name: string;
		display_name: string;
		publisher: { name: string; key: string };
	};
}

/** Document (source) metadata from the Open5E v2 API */
export interface Open5eDocument {
	key: string;
	name: string;
	display_name: string;
	publisher: { name: string; key: string };
	gamesystem: { key: string; name: string };
}

/** Paginated response from Open5E v2 API */
export interface Open5ePaginatedResponse<T> {
	count: number;
	next: string | null;
	previous: string | null;
	results: T[];
}

/** Source info exposed to the client */
export interface Open5eSourceInfo {
	key: string;
	displayName: string;
	publisher: string;
	gameSystem: string;
	spellCount: number;
}
