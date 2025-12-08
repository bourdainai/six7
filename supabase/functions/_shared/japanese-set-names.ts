/**
 * Complete Japanese Set Name to English Translation Mapping
 * IMPORTANT: Only sets with VERIFIED API data should be in this list
 * 
 * Last verified: December 2024
 * Many TCGdex API sets return empty card arrays - this list only includes
 * sets that are confirmed to have actual card data.
 */

export const JAPANESE_SET_ENGLISH_NAMES: Record<string, string> = {
  // ===== SCARLET & VIOLET ERA (2023-Present) =====
  'SV11W': 'White Flare',
  'SV10': 'Team Rocket Glory',
  'SV9a': 'Hot Wind Arena',
  'SV9': 'Battle Partners',
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
  'SV1V': 'Violet ex',
  'SV1S': 'Scarlet ex',
  'SVK': 'Stellar Miracle Deck Build Box',
  'SVLS': 'Starter Set Stellar Ceruledge ex',
  'SVLN': 'Starter Set Stellar Sylveon ex',
  
  // ===== SWORD & SHIELD ERA (Only sets with API data) =====
  'S12a': 'VSTAR Universe',
  'S12': 'Paradigm Trigger',
  'S9a': 'Battle Region',
  'S9': 'Star Birth',
  
  // ===== PCG ERA (EX Series) =====
  'PCG1': 'Clash of the Blue Sky',
  'PCG2': 'Flight of Legends',
  'PCG3': 'Rocket Gang Strikes Back',
  'PCG4': 'Golden Sky, Silvery Ocean',
  'PCG5': 'Mirage Forest',
  'PCG6': 'Holon Research Tower',
  'PCG7': 'Holon Phantom',
  'PCG8': 'Miracle Crystal',
  'PCG9': 'Offense and Defense of the Furthest Ends',
  
  // ===== E-CARD ERA =====
  'E1': 'Base Expansion Pack',
  'E2': 'The Town on No Map',
  'E3': 'Wind from the Sea',
  'E4': 'Split Earth',
  'E5': 'Mysterious Mountains',
  
  // ===== VS ERA =====
  'VS1': 'Pokemon Card VS',
  'web1': 'Pokemon Card e-web',
  
  // ===== NEO ERA =====
  'neo1': 'Neo Genesis',
  'neo2': 'Neo Discovery',
  'neo3': 'Neo Revelation',
  'neo4': 'Neo Destiny',
  
  // ===== CLASSIC / PMCG ERA =====
  'PMCG1': 'Expansion Pack (Base Set)',
  'PMCG2': 'Pokemon Jungle',
  'PMCG3': 'Mystery of the Fossils',
  'PMCG4': 'Team Rocket',
  'PMCG5': 'Leaders Stadium',
  'PMCG6': 'Challenge from the Darkness',
};

/**
 * Get English name for a Japanese set (case-insensitive)
 */
export function getEnglishSetName(setCode: string): string | null {
  // Try exact match first
  if (JAPANESE_SET_ENGLISH_NAMES[setCode]) {
    return JAPANESE_SET_ENGLISH_NAMES[setCode];
  }
  
  // Try case-insensitive match
  const upperCode = setCode.toUpperCase();
  for (const [key, value] of Object.entries(JAPANESE_SET_ENGLISH_NAMES)) {
    if (key.toUpperCase() === upperCode) {
      return value;
    }
  }
  
  return null;
}

/**
 * Check if a set code has an English translation
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
