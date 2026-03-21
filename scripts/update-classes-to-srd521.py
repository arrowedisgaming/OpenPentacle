#!/usr/bin/env python3
"""
Update classes.json to match SRD 5.2.1 (2024 D&D revision).

This script:
1. Loads the current classes.json
2. Replaces progression features for all 12 classes
3. Replaces subclass features for all 12 subclasses
4. Updates subclass IDs/names where they changed
5. Updates classSpecific values where needed (monk, warlock)
6. Preserves everything else (spellcasting, equipment, proficiencies, etc.)
"""

import json
import sys
from pathlib import Path

CLASSES_PATH = Path(__file__).parent.parent / "static" / "content-packs" / "srd521" / "classes.json"

# ─── Feature definitions for all 12 classes ─────────────────────────

def f(id, name, desc, level):
    """Shorthand to create a feature dict."""
    return {"id": id, "name": name, "description": desc, "level": level}

ASI_DESC = "You gain the Ability Score Improvement feat or another feat of your choice for which you qualify."
EPIC_BOON_DESC = "You gain an Epic Boon feat or another feat of your choice for which you qualify."

# ─── BARBARIAN ──────────────────────────────────────────────────────

BARBARIAN_FEATURES = {
    1: [
        f("rage", "Rage", "In battle, you fight with primal ferocity. On your turn, you can enter a rage as a Bonus Action. While raging, you gain Advantage on Strength checks and Strength saving throws, bonus rage damage on melee weapon attacks using Strength, and Resistance to Bludgeoning, Piercing, and Slashing damage. Your rage lasts for 1 minute.", 1),
        f("unarmored-defense-barbarian", "Unarmored Defense", "While you are not wearing any armor, your Armor Class equals 10 + your Dexterity modifier + your Constitution modifier. You can use a shield and still gain this benefit.", 1),
        f("weapon-mastery-barbarian", "Weapon Mastery", "Your training with weapons allows you to use the mastery properties of two kinds of weapons of your choice with which you have proficiency.", 1),
    ],
    2: [
        f("danger-sense", "Danger Sense", "You gain an uncanny sense of when things nearby aren't as they should be. You have Advantage on Dexterity saving throws. You don't gain this benefit if you have the Incapacitated condition.", 2),
        f("reckless-attack", "Reckless Attack", "You can throw aside all concern for defense to attack with fierce desperation. When you make your first attack on your turn, you can decide to attack recklessly, giving you Advantage on melee weapon attack rolls using Strength during this turn, but attack rolls against you have Advantage until your next turn.", 2),
    ],
    3: [
        f("barbarian-subclass", "Barbarian Subclass", "You gain a Barbarian subclass of your choice. The Path of the Berserker subclass is detailed after this class's description.", 3),
        f("primal-knowledge", "Primal Knowledge", "You gain proficiency in another skill from the Barbarian skill list.", 3),
    ],
    4: [f("barbarian-asi-4", "Ability Score Improvement", ASI_DESC, 4)],
    5: [
        f("extra-attack-barbarian", "Extra Attack", "You can attack twice instead of once whenever you take the Attack action on your turn.", 5),
        f("fast-movement", "Fast Movement", "Your speed increases by 10 feet while you aren't wearing Heavy armor.", 5),
    ],
    6: [],  # Subclass feature
    7: [
        f("feral-instinct", "Feral Instinct", "Your instincts are so honed that you have Advantage on Initiative rolls.", 7),
        f("instinctive-pounce", "Instinctive Pounce", "As part of the Bonus Action you take to enter your rage, you can move up to half your speed.", 7),
    ],
    8: [f("barbarian-asi-8", "Ability Score Improvement", ASI_DESC, 8)],
    9: [f("brutal-strike", "Brutal Strike", "If you use Reckless Attack, you can forgo Advantage on the next attack roll you make on your turn with a Strength-based attack. If that attack hits, the target takes an extra 1d10 damage and must succeed on a Strength saving throw or be knocked Prone or pushed 15 feet away from you.", 9)],
    10: [],  # Subclass feature
    11: [f("relentless-rage", "Relentless Rage", "Your rage can keep you fighting despite grievous wounds. If you drop to 0 Hit Points while raging and don't die outright, you can make a DC 10 Constitution saving throw. If you succeed, your Hit Points instead change to a number equal to twice your Barbarian level. Each time you use this feature after the first, the DC increases by 5. The DC resets when you finish a Short or Long Rest.", 11)],
    12: [f("barbarian-asi-12", "Ability Score Improvement", ASI_DESC, 12)],
    13: [f("improved-brutal-strike-13", "Improved Brutal Strike", "You have honed new ways to attack furiously. When using Brutal Strike, you can choose Hamstring Blow (reducing the target's Speed by 15 feet until the start of your next turn) or Staggering Blow (the target has Disadvantage on its next saving throw before the end of your next turn).", 13)],
    14: [],  # Subclass feature
    15: [f("persistent-rage", "Persistent Rage", "Your rage is so fierce that it ends early only if you fall Unconscious or if you choose to end it. In addition, if you start your turn with no hostile creature within 60 feet, your rage doesn't end.", 15)],
    16: [f("barbarian-asi-16", "Ability Score Improvement", ASI_DESC, 16)],
    17: [f("improved-brutal-strike-17", "Improved Brutal Strike", "Your Brutal Strike damage increases to 2d10. In addition, you can use two different Brutal Strike effects whenever you use your Brutal Strike feature.", 17)],
    18: [f("indomitable-might", "Indomitable Might", "If your total for a Strength check or Strength saving throw is less than your Strength score, you can use that score in place of the total.", 18)],
    19: [f("barbarian-epic-boon-19", "Epic Boon", EPIC_BOON_DESC, 19)],
    20: [f("primal-champion", "Primal Champion", "You embody the power of the wilds. Your Strength and Constitution scores increase by 4. Your maximum for those scores is now 24.", 20)],
}

BARBARIAN_SUBCLASS = {
    "id": "path-of-the-berserker",
    "name": "Path of the Berserker",
    "description": "For some Barbarians, rage is a means to an end — that end being violence. The Path of the Berserker is a path of untrammeled fury, slick with blood.",
    "features": [
        f("frenzy", "Frenzy", "If you use Reckless Attack while your rage is active, you deal extra damage to the first target you hit on your turn with a Strength-based attack. The extra damage equals your Rage Damage bonus. In addition, when you use your Reckless Attack, you can make one extra attack as part of the same action.", 3),
        f("mindless-rage", "Mindless Rage", "You can't be Charmed or Frightened while raging. If you are Charmed or Frightened when you enter your rage, the effect is suspended for the duration of the rage.", 6),
        f("retaliation", "Retaliation", "When you take damage from a creature that is within 5 feet of you, you can use your Reaction to make one melee attack against that creature, using a weapon or an Unarmed Strike.", 10),
        f("intimidating-presence", "Intimidating Presence", "As a Bonus Action, you can strike terror into others with your menacing presence. When you do, each creature of your choice in a 30-foot Emanation originating from you must make a Wisdom saving throw (DC 8 + your Proficiency Bonus + your Strength modifier). On a failed save, a creature has the Frightened condition for 1 minute. At the end of each of the Frightened creature's turns, the creature repeats the saving throw, ending the effect on itself on a success.", 14),
    ],
}

# ─── BARD ───────────────────────────────────────────────────────────

BARD_FEATURES = {
    1: [
        f("bardic-inspiration", "Bardic Inspiration", "You can inspire others through words, music, or dance. As a Bonus Action, you can give one Bardic Inspiration die (1d6) to a creature within 60 feet who can hear you. The creature can add this die to one ability check, attack roll, or saving throw it makes within 10 minutes. The Bardic Inspiration die increases to 1d8 at level 5, 1d10 at level 10, and 1d12 at level 15. You can use this feature a number of times equal to your Charisma modifier (minimum once), regaining all uses when you finish a Long Rest.", 1),
        f("spellcasting-bard", "Spellcasting", "You have learned to cast spells through your study of music and performance. See the Bard spell list.", 1),
    ],
    2: [
        f("expertise-bard-2", "Expertise", "You gain Expertise in two of your skill proficiencies of your choice.", 2),
        f("jack-of-all-trades", "Jack of All Trades", "You can add half your Proficiency Bonus (round down) to any ability check you make that doesn't already use your Proficiency Bonus.", 2),
    ],
    3: [f("bard-subclass", "Bard Subclass", "You gain a Bard subclass of your choice. The College of Lore subclass is detailed after this class's description.", 3)],
    4: [f("bard-asi-4", "Ability Score Improvement", ASI_DESC, 4)],
    5: [f("font-of-inspiration", "Font of Inspiration", "You now regain all of your expended uses of Bardic Inspiration when you finish a Short or Long Rest.", 5)],
    6: [],  # Subclass feature
    7: [f("countercharm", "Countercharm", "You can use musical notes or words of power to disrupt mind-influencing effects. If you or a creature within 30 feet of you fails a saving throw against an effect that applies the Charmed or Frightened condition, you can use your Reaction to grant a reroll. The new roll must be used.", 7)],
    8: [f("bard-asi-8", "Ability Score Improvement", ASI_DESC, 8)],
    9: [f("expertise-bard-9", "Expertise", "You gain Expertise in two more of your skill proficiencies of your choice.", 9)],
    10: [f("magical-secrets", "Magical Secrets", "You have plundered magical knowledge from a wide spectrum of disciplines. Choose two spells from any spell list. The chosen spells count as Bard spells for you.", 10)],
    11: [],
    12: [f("bard-asi-12", "Ability Score Improvement", ASI_DESC, 12)],
    13: [],
    14: [],  # Subclass feature
    15: [],
    16: [f("bard-asi-16", "Ability Score Improvement", ASI_DESC, 16)],
    17: [],
    18: [f("superior-inspiration", "Superior Inspiration", "When you roll Initiative, you regain two expended uses of Bardic Inspiration.", 18)],
    19: [f("bard-epic-boon-19", "Epic Boon", EPIC_BOON_DESC, 19)],
    20: [f("words-of-creation", "Words of Creation", "You have mastered two of the prime Words of Creation: the words of life and death. You always have Power Word Heal and Power Word Kill prepared. When you cast either spell, you can target a second creature within 10 feet of the first with the same spell, using the same spell slot.", 20)],
}

BARD_SUBCLASS = {
    "id": "college-of-lore",
    "name": "College of Lore",
    "description": "Bards of the College of Lore know something about most things, collecting bits of knowledge from sources as diverse as scholarly tomes and peasant tales.",
    "features": [
        f("bonus-proficiencies-lore", "Bonus Proficiencies", "You gain proficiency with three skills of your choice.", 3),
        f("cutting-words", "Cutting Words", "You learn how to use your wit to distract, confuse, and otherwise sap the confidence of others. When a creature that you can see within 60 feet of you makes an attack roll, an ability check, or a damage roll, you can use your Reaction to expend one of your Bardic Inspiration dice, rolling it and subtracting the number rolled from the creature's roll.", 3),
        f("magical-discoveries", "Magical Discoveries", "You learn two spells from any spell list. A spell you choose must be of a level you can cast. The chosen spells count as Bard spells for you.", 6),
        f("peerless-skill", "Peerless Skill", "When you make an ability check or attack roll and fail, you can expend one use of Bardic Inspiration, roll the Bardic Inspiration die, and add the number rolled to the d20, potentially turning a failure into a success. On a failed ability check, the Inspiration is not expended.", 14),
    ],
}

# ─── CLERIC ─────────────────────────────────────────────────────────

CLERIC_FEATURES = {
    1: [
        f("spellcasting-cleric", "Spellcasting", "You have learned to cast spells through prayer and meditation. See the Cleric spell list.", 1),
        f("divine-order", "Divine Order", "You have dedicated yourself to one of the following sacred roles of your choice: Protector (you gain proficiency with Martial weapons and training with Heavy armor) or Thaumaturge (you gain one extra cantrip from the Cleric spell list and add your Wisdom modifier to Intelligence (Religion) checks).", 1),
    ],
    2: [f("channel-divinity-cleric", "Channel Divinity", "You can channel divine energy directly from the Outer Planes to fuel magical effects. You start with two Channel Divinity effects: Divine Spark and Turn Undead. Each time you use Channel Divinity, you choose which effect to create. You can use Channel Divinity twice and regain all expended uses when you finish a Short or Long Rest. You gain an additional use at level 6 (3 total) and level 18 (4 total).", 2)],
    3: [f("cleric-subclass", "Cleric Subclass", "You gain a Cleric subclass of your choice. The Life Domain subclass is detailed after this class's description.", 3)],
    4: [f("cleric-asi-4", "Ability Score Improvement", ASI_DESC, 4)],
    5: [f("sear-undead", "Sear Undead", "Whenever you use Turn Undead, you can roll a number of d8s equal to your Wisdom modifier (minimum 1d8) and add the rolls together. Each Undead that fails its saving throw against your Turn Undead takes Radiant damage equal to the roll's total. This damage increases to d12s at level 14.", 5)],
    6: [],  # Subclass feature
    7: [f("blessed-strikes", "Blessed Strikes", "Divine power infuses you in battle. When a creature takes damage from one of your cantrips or weapon attacks, you can also deal 1d8 Radiant damage to that creature. You can deal this extra damage only once per turn.", 7)],
    8: [f("cleric-asi-8", "Ability Score Improvement", ASI_DESC, 8)],
    9: [],
    10: [f("divine-intervention", "Divine Intervention", "You can call on your deity to intervene on your behalf. As a Magic action, choose any Cleric spell of level 5 or lower that doesn't require a Reaction to cast. As part of the same action, you cast that spell without expending a spell slot or needing Material components. Once you use this feature, you can't use it again until you finish a Long Rest.", 10)],
    11: [],
    12: [f("cleric-asi-12", "Ability Score Improvement", ASI_DESC, 12)],
    13: [],
    14: [f("improved-blessed-strikes", "Improved Blessed Strikes", "The extra damage of your Blessed Strikes increases to 2d8.", 14)],
    15: [],
    16: [f("cleric-asi-16", "Ability Score Improvement", ASI_DESC, 16)],
    17: [],  # Subclass feature
    18: [],
    19: [f("cleric-epic-boon-19", "Epic Boon", EPIC_BOON_DESC, 19)],
    20: [f("greater-divine-intervention", "Greater Divine Intervention", "You can call on even more powerful divine intervention. When you use Divine Intervention, you can choose any spell from the Cleric spell list, including level 6-9 spells. Once you use this enhanced feature, you can't use Divine Intervention again until you finish 2d4 Long Rests.", 20)],
}

CLERIC_SUBCLASS = {
    "id": "life-domain",
    "name": "Life Domain",
    "description": "The Life Domain focuses on the vibrant positive energy — one of the fundamental forces of the multiverse — that sustains all life.",
    "features": [
        f("disciple-of-life", "Disciple of Life", "When a spell you cast with a spell slot restores Hit Points to a creature, that creature regains additional Hit Points on the turn you cast the spell. The additional Hit Points equal 2 + the spell's level.", 3),
        f("life-domain-spells", "Life Domain Spells", "Your connection to the Life Domain ensures you always have certain spells ready: at level 3 you gain Aid, Bless, Cure Wounds, and Lesser Restoration; higher levels add more healing spells.", 3),
        f("preserve-life", "Preserve Life", "As a Magic action, you present your Holy Symbol and evoke healing energy that can restore a number of Hit Points equal to five times your Cleric level. Choose any creatures within 30 feet of you, and divide those Hit Points among them. This feature can restore a creature to no more than half of its Hit Point maximum.", 3),
        f("blessed-healer", "Blessed Healer", "The healing spells you cast on others heal you as well. When you cast a spell with a spell slot that restores Hit Points to a creature other than you, you regain Hit Points equal to 2 + the spell's level.", 6),
        f("supreme-healing", "Supreme Healing", "When you would normally roll one or more dice to restore Hit Points with a spell, you instead use the highest number possible for each die.", 17),
    ],
}

# ─── DRUID ──────────────────────────────────────────────────────────

DRUID_FEATURES = {
    1: [
        f("spellcasting-druid", "Spellcasting", "Drawing on the divine essence of nature, you can cast spells to shape that essence to your will. See the Druid spell list.", 1),
        f("druidic", "Druidic", "You know Druidic, the secret language of Druids.", 1),
        f("primal-order", "Primal Order", "You have dedicated yourself to one of the following sacred roles of your choice: Magician (you know one extra Druid cantrip and add your Wisdom modifier to Intelligence (Nature) checks) or Warden (you gain proficiency with Martial weapons and training with Medium armor).", 1),
    ],
    2: [
        f("wild-shape", "Wild Shape", "The power of nature allows you to assume the form of an animal. As a Bonus Action, you can shape-shift into a Beast form. You stay in that form for a number of hours equal to half your Druid level (round down), and you can use Wild Shape a number of times equal to your Proficiency Bonus, regaining all uses when you finish a Long Rest.", 2),
        f("wild-companion", "Wild Companion", "You can summon a nature spirit. You can expend a use of Wild Shape to cast Find Familiar without Material components. When you cast it this way, the familiar is a Fey and disappears when you use this feature again or when a number of hours equal to half your Druid level have passed.", 2),
    ],
    3: [f("druid-subclass", "Druid Subclass", "You gain a Druid subclass of your choice. The Circle of the Land subclass is detailed after this class's description.", 3)],
    4: [f("druid-asi-4", "Ability Score Improvement", ASI_DESC, 4)],
    5: [f("wild-resurgence", "Wild Resurgence", "If you have no uses of Wild Shape left, you can give yourself one use by expending a spell slot (no action required). You can do so only once per turn. In addition, you can expend one use of Wild Shape (no action required) to give yourself a level 1 spell slot, and you can't do so again until you finish a Long Rest.", 5)],
    6: [],  # Subclass feature
    7: [f("elemental-fury", "Elemental Fury", "The might of the elements flows through you. You gain one of the following options of your choice: Potent Spellcasting (you add your Wisdom modifier to the damage you deal with any Druid cantrip) or Primal Strike (once on each of your turns when you hit a creature with an attack roll using a weapon or an Unarmed Strike, you can deal an extra 1d8 Cold, Fire, Lightning, or Thunder damage).", 7)],
    8: [f("druid-asi-8", "Ability Score Improvement", ASI_DESC, 8)],
    9: [],
    10: [],  # Subclass feature
    11: [],
    12: [f("druid-asi-12", "Ability Score Improvement", ASI_DESC, 12)],
    13: [],
    14: [],  # Subclass feature + Improved Elemental Fury
    15: [],
    16: [f("druid-asi-16", "Ability Score Improvement", ASI_DESC, 16)],
    17: [],
    18: [f("beast-spells", "Beast Spells", "While in a Beast form from Wild Shape, you can cast spells. You can provide Verbal, Somatic, and Material components for the spells you cast.", 18)],
    19: [f("druid-epic-boon-19", "Epic Boon", EPIC_BOON_DESC, 19)],
    20: [f("archdruid", "Archdruid", "The vitality of nature constantly blooms within you, granting you the following benefits: you regain one expended use of Wild Shape whenever you start your turn with 0 uses remaining, and you can cast Alter Self at will without expending a spell slot.", 20)],
}

# Druid L14 has both subclass feature AND Improved Elemental Fury
DRUID_L14_EXTRA = f("improved-elemental-fury", "Improved Elemental Fury", "The option you chose for Elemental Fury grows more powerful. Potent Spellcasting: the extra damage from this feature is now 2d8. Primal Strike: the extra damage is now 2d8.", 14)

DRUID_SUBCLASS = {
    "id": "circle-of-the-land",
    "name": "Circle of the Land",
    "description": "The Circle of the Land is made up of mystics and sages who safeguard ancient knowledge and rites through oral tradition. These Druids meet in sacred circles of trees or standing stones to whisper primal secrets in Druidic.",
    "features": [
        f("circle-of-the-land-spells", "Circle of the Land Spells", "Whenever you finish a Long Rest, choose one type of land: arid, polar, temperate, or tropical. Consult the associated list of Circle spells. You always have those spells prepared.", 3),
        f("lands-aid", "Land's Aid", "As a Magic action, you can expend a use of your Wild Shape and choose a point within 60 feet of you. Vitality-giving flowers and life-draining thorns appear for a moment in a 10-foot-radius Sphere centered on that point. Each creature of your choice in that area regains Hit Points equal to 2d6 plus your Wisdom modifier, and each creature of your choice in that area must make a Constitution saving throw against your spell save DC, taking 2d6 Necrotic damage on a failed save or half as much on a success. The healing and damage increase by 1d6 at Druid levels 10 and 14.", 3),
        f("natural-recovery", "Natural Recovery", "You can cast one of your Circle spells without expending a spell slot, and you must finish a Long Rest before doing so again. At Druid level 10, you gain a second use of this feature.", 6),
        f("natures-ward", "Nature's Ward", "You are immune to the Poisoned condition, and you have Resistance to a damage type associated with your current land choice.", 10),
        f("natures-sanctuary", "Nature's Sanctuary", "When a creature within 30 feet of you makes an attack roll, you can use your Reaction to force the attacker to make a Wisdom saving throw against your spell save DC. On a failed save, the attacker must target a different creature or lose the attack. On a successful save, the attacker is immune to this effect for 24 hours.", 14),
    ],
}

# ─── FIGHTER ────────────────────────────────────────────────────────

FIGHTER_FEATURES = {
    1: [
        f("fighting-style-fighter", "Fighting Style", "You adopt a particular style of fighting as your specialty. Choose one Fighting Style feat.", 1),
        f("second-wind", "Second Wind", "You have a limited well of stamina. As a Bonus Action, you can regain Hit Points equal to 1d10 + your Fighter level. You can use this feature twice and regain all expended uses when you finish a Short or Long Rest. You gain an additional use at levels 4 and 10.", 1),
        f("weapon-mastery-fighter", "Weapon Mastery", "Your training with weapons allows you to use the mastery properties of three kinds of weapons of your choice with which you have proficiency.", 1),
    ],
    2: [
        f("action-surge", "Action Surge", "You can push yourself beyond your normal limits for a moment. On your turn, you can take one additional action. Once you use this feature, you must finish a Short or Long Rest before you can use it again. You gain a second use at level 17.", 2),
        f("tactical-mind", "Tactical Mind", "You have a mind for tactics. When you fail an ability check, you can expend a use of your Second Wind, rolling 1d10 and adding the number rolled to the ability check, potentially turning a failure into a success. If the check still fails, the Second Wind use isn't expended.", 2),
    ],
    3: [f("fighter-subclass", "Fighter Subclass", "You gain a Fighter subclass of your choice. The Champion subclass is detailed after this class's description.", 3)],
    4: [f("fighter-asi-4", "Ability Score Improvement", ASI_DESC, 4)],
    5: [
        f("extra-attack-fighter", "Extra Attack", "You can attack twice instead of once whenever you take the Attack action on your turn.", 5),
        f("tactical-shift", "Tactical Shift", "Whenever you activate your Second Wind with a Bonus Action, you can move up to half your speed without provoking Opportunity Attacks.", 5),
    ],
    6: [f("fighter-asi-6", "Ability Score Improvement", ASI_DESC, 6)],
    7: [],  # Subclass feature
    8: [f("fighter-asi-8", "Ability Score Improvement", ASI_DESC, 8)],
    9: [
        f("indomitable", "Indomitable", "If you fail a saving throw, you can reroll it with a bonus equal to your Fighter level divided by 3 (round down), and you must use the new roll. You can use this feature twice and gain a third use at level 13.", 9),
        f("tactical-master", "Tactical Master", "When you attack with a weapon whose mastery property you can use, you can replace that property with the Push, Sap, or Slow property for that attack.", 9),
    ],
    10: [],  # Subclass feature
    11: [f("two-extra-attacks", "Two Extra Attacks", "You can attack three times instead of once whenever you take the Attack action on your turn.", 11)],
    12: [f("fighter-asi-12", "Ability Score Improvement", ASI_DESC, 12)],
    13: [
        f("indomitable-improvement", "Indomitable (three uses)", "You can now use Indomitable three times between Long Rests.", 13),
        f("studied-attacks", "Studied Attacks", "You study your opponents and learn from each attack you make. If you make an attack roll against a creature and miss, you have Advantage on your next attack roll against that creature before the end of your next turn.", 13),
    ],
    14: [f("fighter-asi-14", "Ability Score Improvement", ASI_DESC, 14)],
    15: [],  # Subclass feature
    16: [f("fighter-asi-16", "Ability Score Improvement", ASI_DESC, 16)],
    17: [f("action-surge-two-uses", "Action Surge (two uses)", "You can use Action Surge twice before a rest, but only once per turn.", 17)],
    18: [],  # Subclass feature
    19: [f("fighter-epic-boon-19", "Epic Boon", EPIC_BOON_DESC, 19)],
    20: [f("three-extra-attacks", "Three Extra Attacks", "You can attack four times instead of once whenever you take the Attack action on your turn.", 20)],
}

FIGHTER_SUBCLASS = {
    "id": "champion",
    "name": "Champion",
    "description": "A Champion focuses on the development of martial prowess in a relentless pursuit of victory. Champions combine rigorous training with physical excellence to deal devastating blows.",
    "features": [
        f("improved-critical", "Improved Critical", "Your attack rolls with weapons and Unarmed Strikes can score a Critical Hit on a roll of 19 or 20 on the d20.", 3),
        f("remarkable-athlete", "Remarkable Athlete", "Thanks to your athleticism, you have Advantage on Initiative rolls and Strength (Athletics) checks. In addition, immediately after you score a Critical Hit, you can move up to half your Speed without provoking Opportunity Attacks.", 3),
        f("additional-fighting-style", "Additional Fighting Style", "You gain another Fighting Style feat of your choice.", 7),
        f("heroic-warrior", "Heroic Warrior", "The thrill of battle drives you toward victory. During combat, you can give yourself Heroic Inspiration whenever you start your turn without it.", 10),
        f("superior-critical", "Superior Critical", "Your attack rolls with weapons and Unarmed Strikes can now score a Critical Hit on a roll of 18-20 on the d20.", 15),
        f("survivor", "Survivor", "You attain the pinnacle of resilience in battle. Defy Death: you have Advantage on Death Saving Throws, and when you roll 18-20 on a Death Saving Throw, you gain the benefit of rolling a 20. Heroic Rally: at the start of each of your turns, you regain Hit Points equal to 5 + your Constitution modifier if you are Bloodied and have at least 1 Hit Point.", 18),
    ],
}

# ─── MONK ───────────────────────────────────────────────────────────

MONK_FEATURES = {
    1: [
        f("martial-arts", "Martial Arts", "Your practice of martial arts gives you mastery of combat styles that use Unarmed Strikes and Monk weapons (Simple Melee weapons and Martial Melee weapons with the Light property). You gain Bonus Unarmed Strike (as a Bonus Action), Martial Arts Die (1d6, increasing at higher levels), and Dexterous Attacks (you can use Dexterity for attack and damage rolls with Unarmed Strikes and Monk weapons).", 1),
        f("unarmored-defense-monk", "Unarmored Defense", "While you aren't wearing armor or wielding a Shield, your base Armor Class equals 10 + your Dexterity modifier + your Wisdom modifier.", 1),
    ],
    2: [
        f("monks-focus", "Monk's Focus", "Your focus and martial training allow you to harness extraordinary energy: Focus Points. Your Monk level determines your number of points. You can expend these points to fuel Flurry of Blows, Patient Defense, and Step of the Wind. You regain all expended Focus Points when you finish a Short or Long Rest.", 2),
        f("unarmored-movement", "Unarmored Movement", "Your speed increases by 10 feet while you aren't wearing armor or wielding a Shield. This bonus increases as you gain Monk levels, as shown in the Monk Features table.", 2),
        f("uncanny-metabolism", "Uncanny Metabolism", "When you roll Initiative, you can regain all expended Focus Points. When you do so, roll your Martial Arts die and regain a number of Hit Points equal to your Monk level plus the number rolled. Once you use this feature, you can't use it again until you finish a Long Rest.", 2),
    ],
    3: [
        f("deflect-attacks", "Deflect Attacks", "When an attack roll hits you and its damage includes Bludgeoning, Piercing, or Slashing damage, you can take a Reaction to reduce the attack's total damage against you. The reduction equals 1d10 + your Dexterity modifier + your Monk level. If you reduce the damage to 0, you can expend 1 Focus Point to redirect some of the attack's force.", 3),
        f("monk-subclass", "Monk Subclass", "You gain a Monk subclass of your choice. The Warrior of the Open Hand subclass is detailed after this class's description.", 3),
    ],
    4: [
        f("monk-asi-4", "Ability Score Improvement", ASI_DESC, 4),
        f("slow-fall", "Slow Fall", "You can take a Reaction when you fall to reduce any damage you take from the fall by an amount equal to five times your Monk level.", 4),
    ],
    5: [
        f("extra-attack-monk", "Extra Attack", "You can attack twice instead of once whenever you take the Attack action on your turn.", 5),
        f("stunning-strike", "Stunning Strike", "Once per turn when you hit a creature with a Monk weapon or an Unarmed Strike, you can expend 1 Focus Point to attempt a stunning strike. The target must make a Constitution saving throw. On a failed save, the target has the Stunned condition until the start of your next turn.", 5),
    ],
    6: [f("empowered-strikes", "Empowered Strikes", "Whenever you deal damage with your Unarmed Strike, it can deal your choice of Force damage or its normal damage type.", 6)],
    7: [f("evasion-monk", "Evasion", "When you're subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage if you succeed on the saving throw and only half damage if you fail. You don't benefit from this feature if you have the Incapacitated condition.", 7)],
    8: [f("monk-asi-8", "Ability Score Improvement", ASI_DESC, 8)],
    9: [f("acrobatic-movement", "Acrobatic Movement", "While you aren't wearing armor or wielding a Shield, you gain the ability to move along vertical surfaces and across liquids on your turn without falling during the movement.", 9)],
    10: [
        f("heightened-focus", "Heightened Focus", "Your Flurry of Blows, Patient Defense, and Step of the Wind gain the following improvements: Flurry of Blows now lets you make three Unarmed Strikes with it for 1 Focus Point; Patient Defense grants Temporary Hit Points equal to two rolls of your Martial Arts die; Step of the Wind gives a Fly Speed for the current turn.", 10),
        f("self-restoration", "Self-Restoration", "Through sheer force of will, you can remove one of the following conditions from yourself at the end of each of your turns: Charmed, Frightened, or Poisoned. In addition, forgoing food and drink doesn't give you levels of Exhaustion.", 10),
    ],
    11: [],  # Subclass feature
    12: [f("monk-asi-12", "Ability Score Improvement", ASI_DESC, 12)],
    13: [f("deflect-energy", "Deflect Energy", "You can now use your Deflect Attacks feature against attacks that deal any damage type, not just Bludgeoning, Piercing, or Slashing.", 13)],
    14: [f("disciplined-survivor", "Disciplined Survivor", "Your physical and mental discipline grant you proficiency in all saving throws. Additionally, whenever you make a saving throw and fail, you can expend 1 Focus Point to reroll it, and you must use the new roll.", 14)],
    15: [f("perfect-focus", "Perfect Focus", "When you roll Initiative and don't use Uncanny Metabolism, you regain expended Focus Points until you have 4 if you have fewer than 4.", 15)],
    16: [f("monk-asi-16", "Ability Score Improvement", ASI_DESC, 16)],
    17: [],  # Subclass feature
    18: [f("superior-defense", "Superior Defense", "At the start of your turn, you can expend 3 Focus Points to bolster yourself against harm for 1 minute or until you have the Incapacitated condition. During that time, you have Resistance to all damage except Force damage.", 18)],
    19: [f("monk-epic-boon-19", "Epic Boon", EPIC_BOON_DESC, 19)],
    20: [f("body-and-mind", "Body and Mind", "You have developed your body and mind to new heights. Your Dexterity and Wisdom scores increase by 4, to a maximum of 25.", 20)],
}

MONK_SUBCLASS = {
    "id": "warrior-of-the-open-hand",
    "name": "Warrior of the Open Hand",
    "description": "Warriors of the Open Hand are masters of unarmed combat. They learn techniques to push and trip their opponents and manipulate their own energy to protect themselves from harm.",
    "features": [
        f("open-hand-technique", "Open Hand Technique", "Whenever you hit a creature with an attack granted by your Flurry of Blows, you can impose one of the following effects: Addle (the target can't make Opportunity Attacks until the start of its next turn), Push (the target must succeed on a Strength saving throw or be pushed up to 15 feet away), or Topple (the target must succeed on a Dexterity saving throw or have the Prone condition).", 3),
        f("wholeness-of-body", "Wholeness of Body", "You gain the ability to heal yourself. As a Bonus Action, you can roll your Martial Arts die. You regain a number of Hit Points equal to the number rolled plus your Wisdom modifier (minimum 1). You can use this feature a number of times equal to your Wisdom modifier, and you regain all expended uses when you finish a Long Rest.", 6),
        f("fleet-step", "Fleet Step", "When you take a Bonus Action other than Step of the Wind, you can also use Step of the Wind immediately after that Bonus Action.", 11),
        f("quivering-palm", "Quivering Palm", "You gain the ability to set up lethal vibrations in someone's body. When you hit a creature with an Unarmed Strike, you can expend 4 Focus Points to start these imperceptible vibrations, which last for a number of days equal to your Monk level. You can have only one creature under the effect at a time. When you take the Attack action on your turn, you can end the vibrations harmlessly or force the target to make a Constitution saving throw, taking 10d12 Force damage on a failed save or half on a success.", 17),
    ],
}

# Monk classSpecific updates (martial arts die increased, ki -> focus, movement changed)
MONK_CLASS_SPECIFIC = {
    1:  {"martialArtsDie": "1d6",  "focusPoints": 0,  "unarmoredMovement": 0},
    2:  {"martialArtsDie": "1d6",  "focusPoints": 2,  "unarmoredMovement": 10},
    3:  {"martialArtsDie": "1d6",  "focusPoints": 3,  "unarmoredMovement": 10},
    4:  {"martialArtsDie": "1d6",  "focusPoints": 4,  "unarmoredMovement": 10},
    5:  {"martialArtsDie": "1d8",  "focusPoints": 5,  "unarmoredMovement": 10},
    6:  {"martialArtsDie": "1d8",  "focusPoints": 6,  "unarmoredMovement": 15},
    7:  {"martialArtsDie": "1d8",  "focusPoints": 7,  "unarmoredMovement": 15},
    8:  {"martialArtsDie": "1d8",  "focusPoints": 8,  "unarmoredMovement": 15},
    9:  {"martialArtsDie": "1d8",  "focusPoints": 9,  "unarmoredMovement": 15},
    10: {"martialArtsDie": "1d8",  "focusPoints": 10, "unarmoredMovement": 20},
    11: {"martialArtsDie": "1d10", "focusPoints": 11, "unarmoredMovement": 20},
    12: {"martialArtsDie": "1d10", "focusPoints": 12, "unarmoredMovement": 20},
    13: {"martialArtsDie": "1d10", "focusPoints": 13, "unarmoredMovement": 20},
    14: {"martialArtsDie": "1d10", "focusPoints": 14, "unarmoredMovement": 25},
    15: {"martialArtsDie": "1d10", "focusPoints": 15, "unarmoredMovement": 25},
    16: {"martialArtsDie": "1d10", "focusPoints": 16, "unarmoredMovement": 25},
    17: {"martialArtsDie": "1d12", "focusPoints": 17, "unarmoredMovement": 25},
    18: {"martialArtsDie": "1d12", "focusPoints": 18, "unarmoredMovement": 30},
    19: {"martialArtsDie": "1d12", "focusPoints": 19, "unarmoredMovement": 30},
    20: {"martialArtsDie": "1d12", "focusPoints": 20, "unarmoredMovement": 30},
}

# ─── PALADIN ────────────────────────────────────────────────────────

PALADIN_FEATURES = {
    1: [
        f("lay-on-hands", "Lay On Hands", "Your blessed touch can heal wounds. You have a pool of healing power that replenishes when you finish a Long Rest. With that pool, you can restore a total number of Hit Points equal to five times your Paladin level.", 1),
        f("spellcasting-paladin", "Spellcasting", "You have learned to cast spells through prayer and meditation. See the Paladin spell list.", 1),
        f("weapon-mastery-paladin", "Weapon Mastery", "Your training with weapons allows you to use the mastery properties of two kinds of weapons of your choice with which you have proficiency.", 1),
    ],
    2: [
        f("fighting-style-paladin", "Fighting Style", "You adopt a particular style of fighting as your specialty. Choose one Fighting Style feat.", 2),
        f("paladins-smite", "Paladin's Smite", "You always have the Divine Smite spell prepared. In addition, you can cast it without expending a spell slot, but you must finish a Long Rest before you can cast it in this way again.", 2),
    ],
    3: [
        f("channel-divinity-paladin", "Channel Divinity", "You can channel divine energy to fuel magical effects. Each Channel Divinity option provided by your subclass explains how to use it. You can use this feature twice and regain all expended uses when you finish a Short or Long Rest.", 3),
        f("paladin-subclass", "Paladin Subclass", "You gain a Paladin subclass of your choice. The Oath of Devotion subclass is detailed after this class's description.", 3),
    ],
    4: [f("paladin-asi-4", "Ability Score Improvement", ASI_DESC, 4)],
    5: [
        f("extra-attack-paladin", "Extra Attack", "You can attack twice instead of once whenever you take the Attack action on your turn.", 5),
        f("faithful-steed", "Faithful Steed", "You can cast Find Steed without expending a spell slot. You can also cast it normally. When you cast it either way, you can't do so again until you finish a Long Rest.", 5),
    ],
    6: [f("aura-of-protection", "Aura of Protection", "You and friendly creatures within 10 feet of you gain a bonus to saving throws equal to your Charisma modifier (minimum +1). This aura extends to 30 feet at level 18.", 6)],
    7: [],  # Subclass feature
    8: [f("paladin-asi-8", "Ability Score Improvement", ASI_DESC, 8)],
    9: [f("abjure-foes", "Abjure Foes", "As a Magic action, you can expend one use of your Channel Divinity to present your Holy Symbol and speak a prayer of denunciation. Each creature of your choice within 60 feet must make a Wisdom saving throw. On a failed save, a creature has the Frightened condition for 1 minute. The Frightened creature can repeat the saving throw at the end of each of its turns.", 9)],
    10: [f("aura-of-courage", "Aura of Courage", "You and friendly creatures within 10 feet of you can't be Frightened while you are conscious. This aura extends to 30 feet at level 18.", 10)],
    11: [f("radiant-strikes", "Radiant Strikes", "Your strikes carry divine power. When you hit a creature with an attack roll using a Melee weapon or an Unarmed Strike, the target takes an extra 1d8 Radiant damage.", 11)],
    12: [f("paladin-asi-12", "Ability Score Improvement", ASI_DESC, 12)],
    13: [],
    14: [f("restoring-touch", "Restoring Touch", "When you use Lay on Hands on a creature, you can also remove one or more of the following conditions from the creature: Blinded, Charmed, Deafened, Frightened, Paralyzed, or Stunned. You must expend 5 Hit Points from the healing pool for each condition removed.", 14)],
    15: [],  # Subclass feature
    16: [f("paladin-asi-16", "Ability Score Improvement", ASI_DESC, 16)],
    17: [],
    18: [f("aura-expansion", "Aura Expansion", "Your Aura of Protection and Aura of Courage now extend to 30 feet.", 18)],
    19: [f("paladin-epic-boon-19", "Epic Boon", EPIC_BOON_DESC, 19)],
    20: [],  # Subclass feature
}

PALADIN_SUBCLASS = {
    "id": "oath-of-devotion",
    "name": "Oath of Devotion",
    "description": "The Oath of Devotion binds a Paladin to the loftiest ideals of justice, virtue, and order. These Paladins meet the ideal of the knight in shining armor.",
    "features": [
        f("oath-of-devotion-spells", "Oath of Devotion Spells", "The magic of your oath gives you the following spells. They are always prepared and count as Paladin spells for you.", 3),
        f("sacred-weapon", "Sacred Weapon", "When you take the Attack action, you can expend one use of your Channel Divinity to imbue one Melee weapon that you are holding with positive energy. For 10 minutes, you add your Charisma modifier to attack rolls made with that weapon (minimum +1). The weapon also emits Bright Light in a 20-foot radius and Dim Light for an additional 20 feet. The effect ends if you no longer hold the weapon or are Incapacitated.", 3),
        f("aura-of-devotion", "Aura of Devotion", "You and friendly creatures within 10 feet of you can't be Charmed while you are conscious. This aura extends to 30 feet at Paladin level 18.", 7),
        f("smite-of-protection", "Smite of Protection", "Your divine smite becomes a form of protection. When any creature within 30 feet of you takes damage, you can use your Reaction to expend a spell slot and reduce the damage by 2d8 plus 1d8 per spell level above 1.", 15),
        f("holy-nimbus", "Holy Nimbus", "As a Bonus Action, you can emanate an aura of sunlight for 1 minute. The aura sheds Bright Light in a 30-foot radius and Dim Light for an additional 30 feet. Whenever an enemy creature starts its turn in the Bright Light, it takes 10 Radiant damage. You also have Advantage on saving throws against spells cast by Fiends or Undead.", 20),
    ],
}

# ─── RANGER ─────────────────────────────────────────────────────────

RANGER_FEATURES = {
    1: [
        f("spellcasting-ranger", "Spellcasting", "You have learned to channel the magical essence of nature to cast spells. See the Ranger spell list.", 1),
        f("favored-enemy", "Favored Enemy", "You always have the Hunter's Mark spell prepared, and it doesn't count against the number of spells you can prepare. You can cast it a number of times equal to your Wisdom modifier without expending a spell slot, and you regain all expended uses when you finish a Long Rest.", 1),
        f("weapon-mastery-ranger", "Weapon Mastery", "Your training with weapons allows you to use the mastery properties of two kinds of weapons of your choice with which you have proficiency.", 1),
    ],
    2: [
        f("deft-explorer", "Deft Explorer", "Thanks to your travels, you gain the following benefits: you gain Expertise in one of your skill proficiencies, and you can speak, read, and write two languages of your choice.", 2),
        f("fighting-style-ranger", "Fighting Style", "You adopt a particular style of fighting as your specialty. Choose one Fighting Style feat.", 2),
    ],
    3: [f("ranger-subclass", "Ranger Subclass", "You gain a Ranger subclass of your choice. The Hunter subclass is detailed after this class's description.", 3)],
    4: [f("ranger-asi-4", "Ability Score Improvement", ASI_DESC, 4)],
    5: [f("extra-attack-ranger", "Extra Attack", "You can attack twice instead of once whenever you take the Attack action on your turn.", 5)],
    6: [f("roving", "Roving", "Your walking speed increases by 10 feet. You also gain a Climb Speed and a Swim Speed equal to your walking speed.", 6)],
    7: [],  # Subclass feature
    8: [f("ranger-asi-8", "Ability Score Improvement", ASI_DESC, 8)],
    9: [f("expertise-ranger", "Expertise", "You gain Expertise in one of your skill proficiencies of your choice.", 9)],
    10: [f("tireless", "Tireless", "Primal forces now help fuel you on every foray. You have a number of d8s equal to your Proficiency Bonus. Whenever you finish a Short Rest, you can spend one of those dice, roll it, and regain a number of Hit Points equal to the roll plus your Wisdom modifier.", 10)],
    11: [],  # Subclass feature
    12: [f("ranger-asi-12", "Ability Score Improvement", ASI_DESC, 12)],
    13: [f("relentless-hunter", "Relentless Hunter", "Taking damage can't break your Concentration on Hunter's Mark.", 13)],
    14: [f("natures-veil", "Nature's Veil", "You invoke spirits of nature to magically hide yourself. As a Bonus Action, you can become Invisible until the start of your next turn. You can use this feature a number of times equal to your Wisdom modifier, and you regain all expended uses when you finish a Long Rest.", 14)],
    15: [],  # Subclass feature
    16: [f("ranger-asi-16", "Ability Score Improvement", ASI_DESC, 16)],
    17: [f("precise-hunter", "Precise Hunter", "You have Advantage on attack rolls against the creature currently marked by your Hunter's Mark.", 17)],
    18: [f("feral-senses", "Feral Senses", "Your connection to the forces of nature grants you Blindsight with a range of 30 feet.", 18)],
    19: [f("ranger-epic-boon-19", "Epic Boon", EPIC_BOON_DESC, 19)],
    20: [f("foe-slayer", "Foe Slayer", "You become an unparalleled hunter of your enemies. Once per turn when you hit a creature marked by your Hunter's Mark, you can deal extra damage equal to your Wisdom modifier to that creature. You can also use this feature on a miss to turn it into a hit instead.", 20)],
}

RANGER_SUBCLASS = {
    "id": "hunter",
    "name": "Hunter",
    "description": "You stalk prey in the wilds and elsewhere, using your abilities to protect the world against threats.",
    "features": [
        f("hunters-lore", "Hunter's Lore", "You can call on the forces of nature to reveal certain strengths and weaknesses of your prey. While a creature is marked by your Hunter's Mark, you know whether that creature has any Immunities, Resistances, or Vulnerabilities, and if so, what they are.", 3),
        f("hunters-prey", "Hunter's Prey", "You gain one of the following features of your choice: Colossus Slayer (once per turn when you hit a creature with a weapon, the creature takes an extra 1d8 damage if it's below its hit point maximum), Giant Killer (when a Large or larger creature within 5 feet of you hits or misses you with an attack, you can take a Reaction to attack that creature), or Horde Breaker (once per turn when you make an attack, you can make another attack with the same weapon against a different creature within 5 feet of the original target).", 3),
        f("defensive-tactics", "Defensive Tactics", "You gain one of the following features of your choice: Escape the Horde (Opportunity Attacks have Disadvantage against you), Multiattack Defense (when a creature hits you with an attack, you gain +4 to AC against all subsequent attacks that creature makes during the current turn), or Steel Will (you have Advantage on saving throws against the Frightened condition).", 7),
        f("superior-hunters-prey", "Superior Hunter's Prey", "You gain one of the following features of your choice: Volley (you can use your action to make a ranged attack against any number of creatures within 10 feet of a point you can see within your weapon's range, using a separate attack roll for each), or Whirlwind Attack (you can use your action to make a melee attack against any number of creatures within 5 feet of you, with a separate attack roll for each).", 11),
        f("superior-hunters-defense", "Superior Hunter's Defense", "You gain one of the following features of your choice: Evasion, Stand Against the Tide (when a hostile creature misses you with a melee attack, you can use your Reaction to force that creature to repeat the same attack against another creature), or Uncanny Dodge (when an attacker you can see hits you with an attack, you can halve the attack's damage against you).", 15),
    ],
}

# ─── ROGUE ──────────────────────────────────────────────────────────

ROGUE_FEATURES = {
    1: [
        f("expertise-rogue-1", "Expertise", "You gain Expertise in two of your skill proficiencies of your choice.", 1),
        f("sneak-attack", "Sneak Attack", "You know how to strike subtly and exploit a foe's distraction. Once per turn, you can deal extra damage to one creature you hit with an attack roll if you have Advantage on the roll and the attack uses a Finesse or Ranged weapon. The extra damage is listed in the Sneak Attack column of the Rogue Features table.", 1),
        f("thieves-cant", "Thieves' Cant", "You know Thieves' Cant, a secret mix of dialect, jargon, and code that allows you to hide messages in seemingly normal conversation.", 1),
        f("weapon-mastery-rogue", "Weapon Mastery", "Your training with weapons allows you to use the mastery properties of two kinds of weapons of your choice with which you have proficiency.", 1),
    ],
    2: [f("cunning-action", "Cunning Action", "Your quick thinking and agility allow you to act speedily. You can take a Bonus Action on each of your turns in combat to take the Dash, Disengage, or Hide action.", 2)],
    3: [
        f("rogue-subclass", "Rogue Subclass", "You gain a Rogue subclass of your choice. The Thief subclass is detailed after this class's description.", 3),
        f("steady-aim", "Steady Aim", "As a Bonus Action, you give yourself Advantage on your next attack roll on the current turn. You can use this feature only if you haven't moved during this turn, and after you use it, your Speed is 0 until the end of the current turn.", 3),
    ],
    4: [f("rogue-asi-4", "Ability Score Improvement", ASI_DESC, 4)],
    5: [
        f("cunning-strike", "Cunning Strike", "You have developed cunning ways to use your Sneak Attack. When you deal Sneak Attack damage, you can add one of the following effects: Disarm (the target must succeed on a Dexterity saving throw or drop one item it's holding), Poison (you deal extra Poison damage equal to your Sneak Attack damage, and the target must succeed on a Constitution saving throw or have the Poisoned condition for 1 minute), or Trip (the target must succeed on a Dexterity saving throw or have the Prone condition).", 5),
        f("uncanny-dodge", "Uncanny Dodge", "When an attacker that you can see hits you with an attack roll, you can use your Reaction to halve the attack's damage against you.", 5),
    ],
    6: [f("expertise-rogue-6", "Expertise", "You gain Expertise in two more of your skill proficiencies of your choice.", 6)],
    7: [
        f("evasion-rogue", "Evasion", "When you're subjected to an effect that allows you to make a Dexterity saving throw to take only half damage, you instead take no damage if you succeed on the saving throw and only half damage if you fail. You don't benefit from this feature if you have the Incapacitated condition.", 7),
        f("reliable-talent", "Reliable Talent", "Whenever you make an ability check that uses a skill proficiency, you can treat a d20 roll of 9 or lower as a 10.", 7),
    ],
    8: [f("rogue-asi-8", "Ability Score Improvement", ASI_DESC, 8)],
    9: [],  # Subclass feature
    10: [f("rogue-asi-10", "Ability Score Improvement", ASI_DESC, 10)],
    11: [f("improved-cunning-strike", "Improved Cunning Strike", "You can use up to two Cunning Strike effects when you deal Sneak Attack damage, paying the cost for each effect.", 11)],
    12: [f("rogue-asi-12", "Ability Score Improvement", ASI_DESC, 12)],
    13: [],  # Subclass feature
    14: [f("devious-strikes", "Devious Strikes", "You gain additional Cunning Strike options: Daze (the target must succeed on a Constitution saving throw or have the Dazed condition until the end of your next turn), Knock Out (the target must succeed on a Constitution saving throw or have the Unconscious condition for 1 minute; the condition ends early if the target takes damage), and Obscure (you become Invisible until the end of your next turn).", 14)],
    15: [f("slippery-mind", "Slippery Mind", "You gain proficiency in Wisdom saving throws.", 15)],
    16: [f("rogue-asi-16", "Ability Score Improvement", ASI_DESC, 16)],
    17: [],  # Subclass feature
    18: [f("elusive", "Elusive", "You are so evasive that attackers rarely gain the upper hand against you. No attack roll has Advantage against you unless you have the Incapacitated condition.", 18)],
    19: [f("rogue-epic-boon-19", "Epic Boon", EPIC_BOON_DESC, 19)],
    20: [f("stroke-of-luck", "Stroke of Luck", "You have an uncanny knack for succeeding when you need to. If you fail a d20 Test, you can turn the roll into a 20. Once you use this feature, you can't use it again until you finish a Short or Long Rest.", 20)],
}

ROGUE_SUBCLASS = {
    "id": "thief",
    "name": "Thief",
    "description": "A Thief hones the skills of stealth and infiltration. Burglars, bandits, cutpurses, and other criminals typically follow this archetype, though so do Rogues who prefer to think of themselves as professional treasure seekers.",
    "features": [
        f("fast-hands", "Fast Hands", "As a Bonus Action, you can do one of the following: make a Dexterity (Sleight of Hand) check, use Thieves' Tools to try to disarm a trap or open a lock, or take the Use an Object action.", 3),
        f("second-story-work", "Second-Story Work", "You have trained to reach especially hard-to-reach places. You gain a Climb Speed equal to your Speed. In addition, when you make a running jump, the distance you cover increases by a number of feet equal to your Dexterity modifier.", 3),
        f("supreme-sneak", "Supreme Sneak", "You have Advantage on every Dexterity (Stealth) check you make, provided you aren't wearing Medium or Heavy armor.", 9),
        f("use-magic-device", "Use Magic Device", "You have learned enough about the workings of magic that you can improvise the use of items even when they are not intended for you. You ignore all class, species, and level requirements on the use of magic items.", 13),
        f("thiefs-reflexes", "Thief's Reflexes", "You have become adept at laying ambushes and quickly escaping danger. You can take two turns during the first round of any combat. You take your first turn at your normal Initiative and your second turn at your Initiative minus 10.", 17),
    ],
}

# ─── SORCERER ──────────────────────────────────────────────────────

SORCERER_FEATURES = {
    1: [
        f("spellcasting-sorcerer", "Spellcasting", "An event in your past or in the life of a parent or ancestor left an indelible mark on you, granting you the ability to cast spells. See the Sorcerer spell list.", 1),
        f("innate-sorcery", "Innate Sorcery", "An event in your past left an indelible mark on you, infusing you with simmering magic. As a Bonus Action, you can unleash that magic for 1 minute, during which you gain Advantage on the attack rolls of Sorcerer spells you cast and your spell save DC increases by 1. You can use this feature twice and regain all expended uses when you finish a Long Rest.", 1),
    ],
    2: [
        f("font-of-magic", "Font of Magic", "You can tap into a deep wellspring of magic within yourself represented by Sorcery Points. You have a number of Sorcery Points equal to your Sorcerer level. You can use Sorcery Points to gain additional spell slots or sacrifice spell slots to gain additional Sorcery Points.", 2),
        f("metamagic", "Metamagic", "You gain the ability to twist your spells to suit your needs. You learn two Metamagic options of your choice. You learn additional options at levels 10 and 17. When you cast a spell, you can use one Metamagic option, expending the Sorcery Points it requires.", 2),
    ],
    3: [f("sorcerer-subclass", "Sorcerer Subclass", "You gain a Sorcerer subclass of your choice. The Draconic Sorcery subclass is detailed after this class's description.", 3)],
    4: [f("sorcerer-asi-4", "Ability Score Improvement", ASI_DESC, 4)],
    5: [f("sorcerous-restoration", "Sorcerous Restoration", "When you finish a Short Rest, you can regain expended Sorcery Points, but no more than a number equal to half your Sorcerer level (round down). Once you use this feature, you can't do so again until you finish a Long Rest.", 5)],
    6: [],  # Subclass feature
    7: [f("sorcery-incarnate", "Sorcery Incarnate", "While your Innate Sorcery feature is active, you can use up to two Metamagic options on each spell you cast. In addition, if you have no uses of Innate Sorcery left, you can use it if you spend 2 Sorcery Points when you take the Bonus Action to activate it.", 7)],
    8: [f("sorcerer-asi-8", "Ability Score Improvement", ASI_DESC, 8)],
    9: [],
    10: [f("metamagic-10", "Metamagic", "You learn an additional Metamagic option.", 10)],
    11: [],
    12: [f("sorcerer-asi-12", "Ability Score Improvement", ASI_DESC, 12)],
    13: [],
    14: [],  # Subclass feature
    15: [],
    16: [f("sorcerer-asi-16", "Ability Score Improvement", ASI_DESC, 16)],
    17: [f("metamagic-17", "Metamagic", "You learn an additional Metamagic option.", 17)],
    18: [],  # Subclass feature
    19: [f("sorcerer-epic-boon-19", "Epic Boon", EPIC_BOON_DESC, 19)],
    20: [f("arcane-apotheosis", "Arcane Apotheosis", "You can use one Metamagic option on each of your turns without expending Sorcery Points on it.", 20)],
}

SORCERER_SUBCLASS = {
    "id": "draconic-sorcery",
    "name": "Draconic Sorcery",
    "description": "Your innate magic comes from the gift of a dragon. Perhaps an ancient dragon befriended a distant ancestor and bestowed a portion of their power, or you might have absorbed magic from being exposed to a dragon's breath.",
    "features": [
        f("draconic-resilience", "Draconic Resilience", "The magic in your body manifests physical traits of your draconic ancestor. Your Hit Point maximum increases by 1, and it increases by 1 again whenever you gain a level in this class. Parts of your skin are covered by a thin sheen of scales. When you aren't wearing armor, your AC equals 10 + your Dexterity modifier + your Charisma modifier.", 3),
        f("draconic-spells", "Draconic Spells", "When you reach a Sorcerer level specified in the Draconic Spells table, you thereafter always have the listed spells prepared.", 3),
        f("elemental-affinity", "Elemental Affinity", "Your draconic magic has an affinity with a damage type associated with dragons. Choose one type: Acid, Cold, Fire, Lightning, or Poison. You have Resistance to that damage type, and when you cast a spell that deals damage of that type, you can add your Charisma modifier to one damage roll of that spell.", 6),
        f("dragon-wings", "Dragon Wings", "As a Bonus Action, you can cause draconic wings to appear on your back. The wings last for 1 hour or until you dismiss them. You have a Fly Speed of 60 feet while the wings are present. Once you use this feature, you can't use it again until you finish a Long Rest unless you spend 3 Sorcery Points to restore it.", 14),
        f("dragon-companion", "Dragon Companion", "You can cast Summon Dragon without a Material component. You can also cast it once without a spell slot, and you regain the ability to cast it this way when you finish a Long Rest. Whenever you cast it, you can modify it so it doesn't require Concentration and its duration becomes 1 minute.", 18),
    ],
}

# ─── WARLOCK ────────────────────────────────────────────────────────

WARLOCK_FEATURES = {
    1: [
        f("eldritch-invocations", "Eldritch Invocations", "You have unearthed Eldritch Invocations, pieces of forbidden knowledge that imbue you with an abiding magical ability. You gain one invocation of your choice, such as Pact of the Tome. When you gain certain Warlock levels, you gain more invocations as shown in the Warlock Features table.", 1),
        f("pact-magic", "Pact Magic", "Through occult ceremony, you have formed a pact with a mysterious entity to gain magical powers. You have spell slots that you regain when you finish a Short or Long Rest. All your Pact Magic spell slots are the same level.", 1),
    ],
    2: [f("magical-cunning", "Magical Cunning", "You can perform an esoteric rite for 1 minute. At the end of it, you regain expended Pact Magic spell slots but no more than a number equal to half your maximum (round up). Once you use this feature, you can't do so again until you finish a Long Rest.", 2)],
    3: [f("warlock-subclass", "Warlock Subclass", "You gain a Warlock subclass of your choice. The Fiend Patron subclass is detailed after this class's description.", 3)],
    4: [f("warlock-asi-4", "Ability Score Improvement", ASI_DESC, 4)],
    5: [],
    6: [],  # Subclass feature
    7: [],
    8: [f("warlock-asi-8", "Ability Score Improvement", ASI_DESC, 8)],
    9: [f("contact-patron", "Contact Patron", "You always have the Contact Other Plane spell prepared. You can cast it without expending a spell slot to contact your patron, and you automatically succeed on the spell's saving throw.", 9)],
    10: [],  # Subclass feature
    11: [f("mystic-arcanum-6", "Mystic Arcanum", "Your patron bestows upon you a magical secret called an arcanum. Choose one level 6 spell from the Warlock spell list as this arcanum. You can cast this spell once without expending a spell slot. You must finish a Long Rest before you can do so again. You gain additional arcana at levels 13 (level 7), 15 (level 8), and 17 (level 9).", 11)],
    12: [f("warlock-asi-12", "Ability Score Improvement", ASI_DESC, 12)],
    13: [f("mystic-arcanum-7", "Mystic Arcanum (level 7 spell)", "Choose one level 7 Warlock spell as your arcanum. You can cast it once without expending a spell slot, regaining the ability when you finish a Long Rest.", 13)],
    14: [],  # Subclass feature
    15: [f("mystic-arcanum-8", "Mystic Arcanum (level 8 spell)", "Choose one level 8 Warlock spell as your arcanum. You can cast it once without expending a spell slot, regaining the ability when you finish a Long Rest.", 15)],
    16: [f("warlock-asi-16", "Ability Score Improvement", ASI_DESC, 16)],
    17: [f("mystic-arcanum-9", "Mystic Arcanum (level 9 spell)", "Choose one level 9 Warlock spell as your arcanum. You can cast it once without expending a spell slot, regaining the ability when you finish a Long Rest.", 17)],
    18: [],
    19: [f("warlock-epic-boon-19", "Epic Boon", EPIC_BOON_DESC, 19)],
    20: [f("eldritch-master", "Eldritch Master", "When you use your Magical Cunning feature, you regain all your expended Pact Magic spell slots.", 20)],
}

# Warlock classSpecific updates (invocations changed)
WARLOCK_CLASS_SPECIFIC = {
    1:  {"slotLevel": 1, "invocationsKnown": 1},
    2:  {"slotLevel": 1, "invocationsKnown": 3},
    3:  {"slotLevel": 2, "invocationsKnown": 3},
    4:  {"slotLevel": 2, "invocationsKnown": 3},
    5:  {"slotLevel": 3, "invocationsKnown": 5},
    6:  {"slotLevel": 3, "invocationsKnown": 5},
    7:  {"slotLevel": 4, "invocationsKnown": 6},
    8:  {"slotLevel": 4, "invocationsKnown": 6},
    9:  {"slotLevel": 5, "invocationsKnown": 7},
    10: {"slotLevel": 5, "invocationsKnown": 7},
    11: {"slotLevel": 5, "invocationsKnown": 7},
    12: {"slotLevel": 5, "invocationsKnown": 8},
    13: {"slotLevel": 5, "invocationsKnown": 8},
    14: {"slotLevel": 5, "invocationsKnown": 8},
    15: {"slotLevel": 5, "invocationsKnown": 9},
    16: {"slotLevel": 5, "invocationsKnown": 9},
    17: {"slotLevel": 5, "invocationsKnown": 9},
    18: {"slotLevel": 5, "invocationsKnown": 10},
    19: {"slotLevel": 5, "invocationsKnown": 10},
    20: {"slotLevel": 5, "invocationsKnown": 10},
}

WARLOCK_SUBCLASS = {
    "id": "fiend-patron",
    "name": "Fiend Patron",
    "description": "Your pact draws on the Lower Planes, the realms of perdition. You might forge a bargain with a demon lord, an archdevil, or another fiend. That patron's aims are evil — the corruption or destruction of all things — and your path is defined by the extent to which you strive against those aims.",
    "features": [
        f("dark-ones-blessing", "Dark One's Blessing", "When you reduce an enemy to 0 Hit Points, you gain Temporary Hit Points equal to your Charisma modifier plus your Warlock level (minimum 1 Temporary Hit Point). You also gain this benefit if someone else reduces an enemy within 10 feet of you to 0 Hit Points.", 3),
        f("fiend-spells", "Fiend Spells", "The magic of your patron ensures certain spells are ready; when you reach a Warlock level specified in the Fiend Spells table, you thereafter always have the listed spells prepared.", 3),
        f("dark-ones-own-luck", "Dark One's Own Luck", "You can call on your fiendish patron to alter fate in your favor. When you make an ability check or a saving throw, you can use this feature to add 1d10 to your roll. You can use this feature a number of times equal to your Charisma modifier (minimum once), and you regain all expended uses when you finish a Long Rest.", 6),
        f("fiendish-resilience", "Fiendish Resilience", "Choose one damage type, other than Force. Whenever you finish a Short or Long Rest, you have Resistance to that damage type until you choose a different one with this feature.", 10),
        f("hurl-through-hell", "Hurl Through Hell", "Once per turn when you hit a creature with an attack roll, you can try to instantly transport the target through the Lower Planes. The target must succeed on a Charisma saving throw against your spell save DC, or the target disappears and hurtles through a nightmare landscape. It takes 8d10 Psychic damage if it isn't a Fiend and has the Incapacitated condition until the end of your next turn.", 14),
    ],
}

# ─── WIZARD ─────────────────────────────────────────────────────────

WIZARD_FEATURES = {
    1: [
        f("spellcasting-wizard", "Spellcasting", "As a student of arcane magic, you have learned to cast spells. See the Wizard spell list.", 1),
        f("ritual-adept", "Ritual Adept", "You can cast any spell as a Ritual if that spell has the Ritual tag and the spell is in your spellbook. You needn't have the spell prepared, but you must read from the book to cast it this way.", 1),
        f("arcane-recovery", "Arcane Recovery", "You can regain some of your magical energy by studying your spellbook. When you finish a Short Rest, you can choose expended spell slots to recover. The spell slots can have a combined level equal to no more than half your Wizard level (round up), and none of the slots can be level 6 or higher. Once you use this feature, you can't do so again until you finish a Long Rest.", 1),
    ],
    2: [f("scholar", "Scholar", "While studying magic, you also specialized in another field of study. Choose one of the following skills in which you have proficiency: Arcana, History, Investigation, Medicine, Nature, or Religion. You have Expertise in the chosen skill.", 2)],
    3: [f("wizard-subclass", "Wizard Subclass", "You gain a Wizard subclass of your choice. The Evoker subclass is detailed after this class's description.", 3)],
    4: [f("wizard-asi-4", "Ability Score Improvement", ASI_DESC, 4)],
    5: [f("memorize-spell", "Memorize Spell", "Whenever you finish a Short Rest, you can study your spellbook and replace one of the level 1+ Wizard spells you have prepared for your Spellcasting feature with another level 1+ spell from the book.", 5)],
    6: [],  # Subclass feature
    7: [],
    8: [f("wizard-asi-8", "Ability Score Improvement", ASI_DESC, 8)],
    9: [],
    10: [],  # Subclass feature
    11: [],
    12: [f("wizard-asi-12", "Ability Score Improvement", ASI_DESC, 12)],
    13: [],
    14: [],  # Subclass feature
    15: [],
    16: [f("wizard-asi-16", "Ability Score Improvement", ASI_DESC, 16)],
    17: [],
    18: [f("spell-mastery", "Spell Mastery", "You have achieved such mastery over certain spells that you can cast them at will. Choose a level 1 and a level 2 spell in your spellbook that have a casting time of an action. You always have those spells prepared, and you can cast them at their lowest level without expending a spell slot. To cast either spell at a higher level, you must expend a spell slot.", 18)],
    19: [f("wizard-epic-boon-19", "Epic Boon", EPIC_BOON_DESC, 19)],
    20: [f("signature-spells", "Signature Spells", "Choose two level 3 spells in your spellbook as your signature spells. You always have these spells prepared, and you can cast each of them once at level 3 without expending a spell slot. When you do so, you can't cast them this way again until you finish a Short or Long Rest. To cast either spell at a higher level, you must expend a spell slot.", 20)],
}

WIZARD_SUBCLASS = {
    "id": "evoker",
    "name": "Evoker",
    "description": "Your studies focus on magic that creates powerful elemental effects such as bitter cold, searing flame, rolling thunder, crackling lightning, and burning acid.",
    "features": [
        f("evocation-savant", "Evocation Savant", "Choose two Wizard spells from the Evocation school, each of which must be no higher than level 2, and add them to your spellbook for free. In addition, whenever you gain access to a new level of spell slots, you can add one Wizard spell from the Evocation school to your spellbook for free.", 3),
        f("potent-cantrip", "Potent Cantrip", "Your damaging cantrips affect even creatures that avoid the brunt of the effect. When a creature succeeds on a saving throw against your cantrip, the creature takes half the cantrip's damage (if any) but suffers no additional effect from the cantrip.", 3),
        f("sculpt-spells", "Sculpt Spells", "You can create pockets of relative safety within the effects of your evocations. When you cast an Evocation spell that affects other creatures that you can see, you can choose a number of them equal to 1 + the spell's level. The chosen creatures automatically succeed on their saving throws against the spell, and they take no damage if they would normally take half damage on a success.", 6),
        f("empowered-evocation", "Empowered Evocation", "Whenever you cast a Wizard spell from the Evocation school, you can add your Intelligence modifier to one damage roll of that spell.", 10),
        f("overchannel", "Overchannel", "You can increase the power of your spells. When you cast a Wizard spell with a spell slot of levels 1-5 that deals damage, you can deal maximum damage with that spell on the turn you cast it. The first time you do so, you suffer no adverse effect. Each subsequent time you use this feature before finishing a Long Rest, you take 2d12 Necrotic damage per spell level immediately after casting. This damage ignores Resistance and Immunity.", 14),
    ],
}

# ─── Master lookup tables ──────────────────────────────────────────

ALL_FEATURES = {
    "barbarian": BARBARIAN_FEATURES,
    "bard": BARD_FEATURES,
    "cleric": CLERIC_FEATURES,
    "druid": DRUID_FEATURES,
    "fighter": FIGHTER_FEATURES,
    "monk": MONK_FEATURES,
    "paladin": PALADIN_FEATURES,
    "ranger": RANGER_FEATURES,
    "rogue": ROGUE_FEATURES,
    "sorcerer": SORCERER_FEATURES,
    "warlock": WARLOCK_FEATURES,
    "wizard": WIZARD_FEATURES,
}

ALL_SUBCLASSES = {
    "barbarian": BARBARIAN_SUBCLASS,
    "bard": BARD_SUBCLASS,
    "cleric": CLERIC_SUBCLASS,
    "druid": DRUID_SUBCLASS,
    "fighter": FIGHTER_SUBCLASS,
    "monk": MONK_SUBCLASS,
    "paladin": PALADIN_SUBCLASS,
    "ranger": RANGER_SUBCLASS,
    "rogue": ROGUE_SUBCLASS,
    "sorcerer": SORCERER_SUBCLASS,
    "warlock": WARLOCK_SUBCLASS,
    "wizard": WIZARD_SUBCLASS,
}

CLASS_SPECIFIC_UPDATES = {
    "monk": MONK_CLASS_SPECIFIC,
    "warlock": WARLOCK_CLASS_SPECIFIC,
}

# ─── Apply updates ─────────────────────────────────────────────────

def main():
    with open(CLASSES_PATH) as fh:
        classes = json.load(fh)

    for cls in classes:
        cid = cls["id"]

        # Update progression features
        if cid in ALL_FEATURES:
            feat_map = ALL_FEATURES[cid]
            for prog in cls["progression"]:
                lvl = prog["level"]
                if lvl in feat_map:
                    new_feats = feat_map[lvl]
                    # For druid L14, add Improved Elemental Fury alongside subclass
                    if cid == "druid" and lvl == 14:
                        new_feats = [DRUID_L14_EXTRA] + new_feats
                    prog["features"] = new_feats

        # Update classSpecific
        if cid in CLASS_SPECIFIC_UPDATES:
            cs_map = CLASS_SPECIFIC_UPDATES[cid]
            for prog in cls["progression"]:
                lvl = prog["level"]
                if lvl in cs_map:
                    prog["classSpecific"] = cs_map[lvl]

        # Update subclass
        if cid in ALL_SUBCLASSES:
            sub_data = ALL_SUBCLASSES[cid]
            if cls.get("subclasses"):
                old_sub = cls["subclasses"][0]
                old_sub["id"] = sub_data["id"]
                old_sub["name"] = sub_data["name"]
                old_sub["description"] = sub_data["description"]
                old_sub["features"] = sub_data["features"]

    # Write back
    with open(CLASSES_PATH, "w") as fh:
        json.dump(classes, fh, indent=2, ensure_ascii=False)
        fh.write("\n")

    # Verify
    with open(CLASSES_PATH) as fh:
        verify = json.load(fh)

    print(f"Updated {len(verify)} classes successfully.")
    for cls in verify:
        feat_count = sum(len(p["features"]) for p in cls["progression"])
        sub_feats = sum(len(s["features"]) for s in cls.get("subclasses", []))
        sub_names = [s["name"] for s in cls.get("subclasses", [])]
        print(f"  {cls['id']}: {feat_count} class features, subclass: {sub_names} ({sub_feats} features)")

        # Verify all subclass features are at level 3+
        for sub in cls.get("subclasses", []):
            min_lvl = min(f["level"] for f in sub["features"])
            if min_lvl < 3:
                print(f"    WARNING: {sub['name']} has features below level 3 (min: {min_lvl})")

if __name__ == "__main__":
    main()
