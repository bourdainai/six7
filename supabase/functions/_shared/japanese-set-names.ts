/**
 * Japanese Set Name to English Translation Mapping
 * Used to display Japanese sets with English names in the UI
 */

export const JAPANESE_SET_ENGLISH_NAMES: Record<string, string> = {
  // ===== CLASSIC ERA (1996-2001) =====
  // Pocket Monsters Card Game (PMCG) - Original Japanese sets
  'PMCG1': 'Expansion Pack (Base Set)',
  'PMCG2': 'Pokemon Jungle',
  'PMCG3': 'Mystery of the Fossils',
  'PMCG4': 'Team Rocket',
  'PMCG5': 'Leaders Stadium',
  'PMCG6': 'Challenge from the Darkness',
  
  // Neo Series
  'neo1': 'Neo Genesis',
  'neo2': 'Neo Discovery',
  'neo3': 'Neo Revelation',
  'neo4': 'Neo Destiny',
  
  // VS Series
  'VS1': 'Pokemon Card VS',
  'VS2': 'Pokemon Card e-web',
  
  // e-Card Series
  'e1': 'Expedition Base Set',
  'e2': 'Aquapolis',
  'e3': 'Skyridge',
  
  // ADV Series (Ruby & Sapphire era Japan)
  'ADV1': 'ADV Expansion Pack',
  'ADV2': 'Desert Expansion',
  'ADV3': 'Miracle of the Desert',
  
  // ===== Scarlet & Violet Era =====
  'sv8a': 'Terastal Fest ex',
  'sv8': 'Super Electric Breaker',
  'sv7a': 'Stellar Miracle',
  'sv7': 'Stellar Crown',
  'sv6a': 'Night Wanderer',
  'sv6': 'Mask of Change',
  'sv5a': 'Crimson Haze',
  'sv5M': 'Cyber Judge',
  'sv5K': 'Wild Force',
  'sv4a': 'Shiny Treasure ex',
  'sv4M': 'Future Flash',
  'sv4K': 'Ancient Roar',
  'sv4': 'Ancient Roar / Future Flash',
  'sv3a': 'Raging Surf',
  'sv3': 'Ruler of the Black Flame',
  'sv2a': 'Pokemon Card 151',
  'sv2P': 'Clay Burst',
  'sv2D': 'Snow Hazard',
  'sv2': 'Snow Hazard / Clay Burst',
  'sv1a': 'Triplet Beat',
  'sv1V': 'Violet ex',
  'sv1S': 'Scarlet ex',
  'sv1': 'Scarlet ex / Violet ex',

  // Sword & Shield Era
  's12a': 'VSTAR Universe',
  's12': 'Paradigm Trigger',
  's11a': 'Incandescent Arcana',
  's11': 'Lost Abyss',
  's10a': 'Dark Fantasma',
  's10P': 'Space Juggler',
  's10D': 'Time Gazer',
  's10': 'Time Gazer / Space Juggler',
  's9a': 'Battle Region',
  's9': 'Star Birth',
  's8b': 'VMAX Climax',
  's8a': '25th Anniversary Collection',
  's8': 'Fusion Arts',
  's7R': 'Blue Sky Stream',
  's7D': 'Skyscraping Perfect',
  's7': 'Blue Sky Stream / Skyscraping Perfect',
  's6a': 'Eevee Heroes',
  's6H': 'Silver Lance',
  's6K': 'Jet Black Spirit',
  's6': 'Silver Lance / Jet Black Spirit',
  's5a': 'Matchless Fighters',
  's5R': 'Rapid Strike Master',
  's5I': 'Single Strike Master',
  's5': 'Single Strike / Rapid Strike Master',
  's4a': 'Shiny Star V',
  's4': 'Astonishing Volt Tackle',
  's3a': 'Legendary Heartbeat',
  's3': 'Infinity Zone',
  's2a': 'Explosive Walker',
  's2': 'Rebellion Crash',
  's1a': 'VMAX Rising',
  's1H': 'Shield',
  's1W': 'Sword',
  's1': 'Sword / Shield',

  // Sun & Moon Era
  'sm12a': 'Tag All Stars',
  'sm12': 'Alter Genesis',
  'sm11b': 'Dream League',
  'sm11a': 'Remix Bout',
  'sm11': 'Miracle Twins',
  'sm10b': 'Sky Legend',
  'sm10a': 'GG End',
  'sm10': 'Double Blaze',
  'sm9a': 'Night Unison',
  'sm9b': 'Full Metal Wall',
  'sm9': 'Tag Bolt',
  'sm8b': 'GX Ultra Shiny',
  'sm8a': 'Dark Order',
  'sm8': 'Super Burst Impact',
  'sm7b': 'Fairy Rise',
  'sm7a': 'Thunderclap Spark',
  'sm7': 'Charisma of the Wrecked Sky',
  'sm6b': 'Champion Road',
  'sm6a': 'Dragon Storm',
  'sm6': 'Forbidden Light',
  'sm5S': 'Ultra Sun',
  'sm5M': 'Ultra Moon',
  'sm5': 'Ultra Sun / Ultra Moon',
  'sm4S': 'Awakened Heroes',
  'sm4A': 'Ultradimensional Beasts',
  'sm4': 'The Best of XY',
  'sm3N': 'Darkness that Consumes Light',
  'sm3H': 'Shining Legends',
  'sm3': 'To Have Seen the Battle Rainbow',
  'sm2L': 'Alolan Moonlight',
  'sm2K': 'Facing a New Trial',
  'sm2': 'Islands Await You',
  'sm1S': 'Sun',
  'sm1M': 'Moon',
  'sm1': 'Collection Sun / Collection Moon',

  // XY Era
  'xy11': 'Cruel Traitor',
  'xy10': 'Awakening Psychic King',
  'xy9': 'Rage of the Broken Heavens',
  'xy8': 'Blue Shock / Red Flash',
  'xy7': 'Bandit Ring',
  'xy6': 'Emerald Break',
  'xy5': 'Gaia Volcano / Tidal Storm',
  'xy4': 'Phantom Gate',
  'xy3': 'Rising Fist',
  'xy2': 'Wild Blaze',
  'xy1': 'Collection X / Collection Y',

  // Black & White Era
  'bw11': 'Spiral Force / Thunder Knuckle',
  'bw10': 'Plasma Gale',
  'bw9': 'Megalo Cannon',
  'bw8': 'Spiral Force / Thunder Knuckle',
  'bw7': 'Plasma Gale',
  'bw6': 'Cold Flare / Freeze Bolt',
  'bw5': 'Dragon Blade / Dragon Blast',
  'bw4': 'Dark Rush',
  'bw3': 'Psycho Drive / Hail Blizzard',
  'bw2': 'Red Collection',
  'bw1': 'Black Collection / White Collection',
};

/**
 * Get English name for a Japanese set
 * @param setCode The Japanese set code (e.g., 'sv4a')
 * @returns English name or the original code if not found
 */
export function getEnglishSetName(setCode: string): string {
  return JAPANESE_SET_ENGLISH_NAMES[setCode] || setCode;
}

/**
 * Check if a set code is a Japanese set
 * @param setCode The set code to check
 * @returns true if it's a known Japanese set
 */
export function isJapaneseSet(setCode: string): boolean {
  // Japanese sets typically use 's' prefix (Sword & Shield) or 'sm' (Sun & Moon)
  // or 'sv' with 'a' suffix for Japanese exclusives
  return setCode in JAPANESE_SET_ENGLISH_NAMES || 
         /^s\d/.test(setCode) || 
         setCode.endsWith('a') && setCode.startsWith('sv');
}

