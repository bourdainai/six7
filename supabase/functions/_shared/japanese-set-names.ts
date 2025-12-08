/**
 * Complete Japanese Set Name to English Translation Mapping
 * Used to display Japanese sets with English names in the UI
 * 
 * IMPORTANT: Only sets in this mapping will be shown in the Set Manager
 * This ensures users only see sets with proper English names
 */

export const JAPANESE_SET_ENGLISH_NAMES: Record<string, string> = {
  // ===== SCARLET & VIOLET ERA (2023-Present) =====
  'SV8a': 'Terastal Fest ex',
  'SV8': 'Super Electric Breaker',
  'SV7a': 'Paradise Dragona',
  'SV7': 'Stellar Miracle',
  'SV6a': 'Night Wanderer',
  'SV6': 'Mask of Change',
  'SV5a': 'Crimson Haze',
  'SV5M': 'Cyber Judge',
  'SV5K': 'Wild Force',
  'SV4a': 'Shiny Treasure ex',
  'SV4M': 'Future Flash',
  'SV4K': 'Ancient Roar',
  'SV3a': 'Raging Surf',
  'SV3': 'Ruler of the Black Flame',
  'SV2a': 'Pokemon Card 151',
  'SV2P': 'Snow Hazard',
  'SV2D': 'Clay Burst',
  'SV1a': 'Triplet Beat',
  'SV1V': 'Violet ex',
  'SV1S': 'Scarlet ex',
  
  // ===== SWORD & SHIELD ERA (2019-2023) =====
  'S12a': 'VSTAR Universe',
  'S12': 'Paradigm Trigger',
  'S11a': 'Incandescent Arcana',
  'S11': 'Lost Abyss',
  'S10b': 'Pokemon GO',
  'S10a': 'Dark Fantasma',
  'S10P': 'Space Juggler',
  'S10D': 'Time Gazer',
  'S9a': 'Battle Region',
  'S9': 'Star Birth',
  'S8b': 'VMAX Climax',
  'S8a': '25th Anniversary Collection',
  'S8': 'Fusion Arts',
  'S7R': 'Blue Sky Stream',
  'S7D': 'Skyscraping Perfect',
  'S6a': 'Eevee Heroes',
  'S6H': 'Silver Lance',
  'S6K': 'Jet Black Spirit',
  'S5a': 'Matchless Fighters',
  'S5R': 'Rapid Strike Master',
  'S5I': 'Single Strike Master',
  'S4a': 'Shiny Star V',
  'S4': 'Astonishing Volt Tackle',
  'S3a': 'Legendary Heartbeat',
  'S3': 'Infinity Zone',
  'S2a': 'Explosive Walker',
  'S2': 'Rebellion Crash',
  'S1a': 'VMAX Rising',
  'S1H': 'Shield',
  'S1W': 'Sword',
  
  // ===== SUN & MOON ERA (2016-2019) =====
  'SM12a': 'Tag All Stars',
  'SM12': 'Alter Genesis',
  'SM11b': 'Dream League',
  'SM11a': 'Remix Bout',
  'SM11': 'Miracle Twins',
  'SM10b': 'Sky Legend',
  'SM10a': 'GG End',
  'SM10': 'Double Blaze',
  'SM9b': 'Full Metal Wall',
  'SM9a': 'Night Unison',
  'SM9': 'Tag Bolt',
  'SM8b': 'GX Ultra Shiny',
  'SM8a': 'Dark Order',
  'SM8': 'Super Burst Impact',
  'SM7b': 'Fairy Rise',
  'SM7a': 'Thunderclap Spark',
  'SM7': 'Charisma of the Wrecked Sky',
  'SM6b': 'Champion Road',
  'SM6a': 'Dragon Storm',
  'SM6': 'Forbidden Light',
  'SM5S': 'Ultra Sun',
  'SM5M': 'Ultra Moon',
  'SM5+': 'Ultra Force',
  'SM4A': 'Ultra Beast',
  'SM4S': 'Awakened Heroes',
  'SM4+': 'GX Battle Boost',
  'SM3N': 'Darkness Consumes Light',
  'SM3H': 'To Have Seen the Battle Rainbow',
  'SM3+': 'Shining Legends',
  'SM2L': 'Alolan Moonlight',
  'SM2K': 'Islands Await You',
  'SM1S': 'Collection Sun',
  'SM1M': 'Collection Moon',
  'SM1+': 'Strengthening Expansion Pack Sun & Moon',
  'SM0': 'Pikachu and New Friends',
  
  // ===== XY ERA (2013-2016) =====
  'XY11': 'Cruel Traitor',
  'XY10': 'Awakening Psychic King',
  'XY9': 'Rage of the Broken Heavens',
  'XY8a': 'Blue Shock',
  'XY8b': 'Red Flash',
  'XY7': 'Bandit Ring',
  'XY6': 'Emerald Break',
  'XY5a': 'Tidal Storm',
  'XY5b': 'Gaia Volcano',
  'XY4': 'Phantom Gate',
  'XY3': 'Rising Fist',
  'XY2': 'Wild Blaze',
  'XY1a': 'Collection X',
  'XY1b': 'Collection Y',
  'CP1': 'Double Crisis',
  'CP2': 'Legendary Shine Collection',
  'CP3': 'Pokekyun Collection',
  'CP4': 'Premium Champion Pack',
  'CP5': 'Mythical & Legendary Dream Shine Collection',
  'CP6': '20th Anniversary Expansion Pack',
  
  // ===== BLACK & WHITE ERA (2010-2013) =====
  'BW11': 'Spiral Force / Thunder Knuckle',
  'BW10': 'Plasma Gale',
  'BW9': 'Megalo Cannon',
  'BW8': 'Spiral Force',
  'BW7': 'Plasma Gale',
  'BW6': 'Cold Flare / Freeze Bolt',
  'BW5': 'Dragon Blade / Dragon Blast',
  'BW4': 'Dark Rush',
  'BW3': 'Psycho Drive / Hail Blizzard',
  'BW2': 'Red Collection',
  'BW1': 'Black Collection / White Collection',
  
  // ===== HGSS / LEGEND ERA (2009-2010) =====
  'L3': 'Clash at the Summit',
  'LL': 'Lost Link',
  'L2': 'Reviving Legends',
  'L1a': 'HeartGold Collection',
  'L1b': 'SoulSilver Collection',
  
  // ===== DIAMOND & PEARL ERA (2006-2009) =====
  'DP1': 'Space-Time Creation',
  'DP2': 'Secret of the Lakes',
  'DP3': 'Shining Darkness',
  'DP4': 'Moon Hunting / Night Dashing',
  'DP5': 'Temple of Anger',
  
  // ===== EX ERA / PCG (2004-2006) =====
  'PCG1': 'Clash of the Blue Sky',
  'PCG2': 'Flight of Legends',
  'PCG3': 'Rocket Gang Strikes Back',
  'PCG4': 'Golden Sky, Silvery Ocean',
  'PCG5': 'Mirage Forest',
  'PCG6': 'Holon Research Tower',
  'PCG7': 'Holon Phantom',
  'PCG8': 'Miracle Crystal',
  'PCG9': 'Offense and Defense of the Furthest Ends',
  'PCG10': 'World Champions Pack',
  
  // ===== ADV ERA (2003-2004) =====
  'ADV1': 'Expansion Pack',
  'ADV2': 'Miracle of the Desert',
  'ADV3': 'Rulers of the Heavens',
  'ADV4': 'Magma vs Aqua: Two Ambitions',
  'ADV5': 'Undone Seal',
  
  // ===== E-CARD ERA (2001-2003) =====
  'E1': 'Base Expansion Pack',
  'E2': 'The Town on No Map',
  'E3': 'Wind from the Sea',
  'E4': 'Split Earth',
  'E5': 'Mysterious Mountains',
  
  // ===== VS ERA (2001) =====
  'VS1': 'Pokemon Card VS',
  'web1': 'Pokemon Card e-web',
  
  // ===== NEO ERA (1999-2001) =====
  'neo1': 'Neo Genesis',
  'neo2': 'Neo Discovery',
  'neo3': 'Neo Revelation',
  'neo4': 'Neo Destiny',
  
  // ===== CLASSIC / PMCG ERA (1996-1999) =====
  'PMCG1': 'Expansion Pack (Base Set)',
  'PMCG2': 'Pokemon Jungle',
  'PMCG3': 'Mystery of the Fossils',
  'PMCG4': 'Team Rocket',
  'PMCG5': 'Leaders Stadium',
  'PMCG6': 'Challenge from the Darkness',
};

/**
 * Get English name for a Japanese set
 * @param setCode The Japanese set code (e.g., 'SV4a')
 * @returns English name or null if not mapped (don't show unmapped sets)
 */
export function getEnglishSetName(setCode: string): string | null {
  // Try exact match first
  if (JAPANESE_SET_ENGLISH_NAMES[setCode]) {
    return JAPANESE_SET_ENGLISH_NAMES[setCode];
  }
  
  // Try case-insensitive match
  const upperCode = setCode.toUpperCase();
  const lowerCode = setCode.toLowerCase();
  
  for (const [key, value] of Object.entries(JAPANESE_SET_ENGLISH_NAMES)) {
    if (key.toUpperCase() === upperCode || key.toLowerCase() === lowerCode) {
      return value;
    }
  }
  
  return null; // Not mapped - don't show this set
}

/**
 * Check if a set code has an English translation
 * @param setCode The set code to check
 * @returns true if English translation exists
 */
export function hasEnglishTranslation(setCode: string): boolean {
  return getEnglishSetName(setCode) !== null;
}

/**
 * Get all mapped set codes
 */
export function getMappedSetCodes(): string[] {
  return Object.keys(JAPANESE_SET_ENGLISH_NAMES);
}
