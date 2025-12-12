/**
 * Utility to get the best display name for a card.
 * Always prefers English name over Japanese.
 * Falls back to the original name if no English name exists.
 */

/**
 * Pokemon name mapping for common Japanese to English translations.
 * This covers the most common Pokémon that appear in Japanese-only sets.
 */
const POKEMON_NAME_MAP: Record<string, string> = {
  // Common Pokémon names (Japanese → English)
  'ピカチュウ': 'Pikachu',
  'リザードン': 'Charizard',
  'ガブリアス': 'Garchomp',
  'ミュウツー': 'Mewtwo',
  'ミュウ': 'Mew',
  'ルカリオ': 'Lucario',
  'ゲッコウガ': 'Greninja',
  'イーブイ': 'Eevee',
  'ブースター': 'Flareon',
  'シャワーズ': 'Vaporeon',
  'サンダース': 'Jolteon',
  'エーフィ': 'Espeon',
  'ブラッキー': 'Umbreon',
  'リーフィア': 'Leafeon',
  'グレイシア': 'Glaceon',
  'ニンフィア': 'Sylveon',
  'レックウザ': 'Rayquaza',
  'ギラティナ': 'Giratina',
  'ディアルガ': 'Dialga',
  'パルキア': 'Palkia',
  'アルセウス': 'Arceus',
  'ゲンガー': 'Gengar',
  'カビゴン': 'Snorlax',
  'ラプラス': 'Lapras',
  'フシギバナ': 'Venusaur',
  'カメックス': 'Blastoise',
  'マリルリ': 'Azumarill',
  'ドラゴナイト': 'Dragonite',
  'カイリュー': 'Dragonite',
  'サーナイト': 'Gardevoir',
  'エルレイド': 'Gallade',
  'バンギラス': 'Tyranitar',
  'ボーマンダ': 'Salamence',
  'メタグロス': 'Metagross',
  'ゴウカザル': 'Infernape',
  'エンペルト': 'Empoleon',
  'ドダイトス': 'Torterra',
  'ゼクロム': 'Zekrom',
  'レシラム': 'Reshiram',
  'キュレム': 'Kyurem',
  'ゼルネアス': 'Xerneas',
  'イベルタル': 'Yveltal',
  'ソルガレオ': 'Solgaleo',
  'ルナアーラ': 'Lunala',
  'ネクロズマ': 'Necrozma',
  'ザシアン': 'Zacian',
  'ザマゼンタ': 'Zamazenta',
  'コライドン': 'Koraidon',
  'ミライドン': 'Miraidon',
  'リーリエ': "Lillie",
  'シロナ': 'Cynthia',
  'マリィ': 'Marnie',
  'ナンジャモ': 'Iono',
  'デンボク': 'Adaman',
  'ヨルノズク': 'Noctowl',
  'ドジョッチ': 'Barboach',
  'シマボシ': 'Shellos',
  'アブソル': 'Absol',
  'ナゾノクサ': 'Oddish',
  'クサイハナ': 'Gloom',
  'ラフレシア': 'Vileplume',
  'ストライク': 'Scyther',
  'ヘラクロス': 'Heracross',
  'ロゼリア': 'Roselia',
  'ダイケンキ': 'Samurott',
  'ヒスイ': 'Hisuian',
  'バクフーン': 'Typhlosion',
  'ジュナイパー': 'Decidueye',
  'フワンテ': 'Drifloon',
  'フワライド': 'Drifblim',
  'ロトム': 'Rotom',
  'テラスタル': 'Terastal',
  'パルデア': 'Paldean',
  'ケンタロス': 'Tauros',
  // Card types/suffixes
  'ex': 'ex',
  'EX': 'EX',
  'GX': 'GX',
  'V': 'V',
  'VMAX': 'VMAX',
  'VSTAR': 'VSTAR',
  'ホウオウ': 'Ho-Oh',
  'ヒビキ': 'Ethan',
};

/**
 * Check if a string contains Japanese characters
 */
function containsJapanese(str: string): boolean {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(str);
}

/**
 * Attempt to translate a Japanese Pokemon name to English
 * using our known mappings
 */
function translateJapaneseName(japaneseName: string): string | null {
  // Try direct lookup first
  if (POKEMON_NAME_MAP[japaneseName]) {
    return POKEMON_NAME_MAP[japaneseName];
  }
  
  // Try to match parts of the name (for names like "ガブリアスV" → "Garchomp V")
  let translatedParts: string[] = [];
  let remaining = japaneseName;
  let foundAny = false;
  
  // Sort keys by length (longest first) to match longer names first
  const sortedKeys = Object.keys(POKEMON_NAME_MAP).sort((a, b) => b.length - a.length);
  
  for (const jpName of sortedKeys) {
    if (remaining.includes(jpName)) {
      remaining = remaining.replace(jpName, `{{${POKEMON_NAME_MAP[jpName]}}}`);
      foundAny = true;
    }
  }
  
  if (foundAny) {
    // Clean up the result
    let result = remaining
      .replace(/\{\{/g, '')
      .replace(/\}\}/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // If we still have Japanese characters, it wasn't fully translated
    if (!containsJapanese(result)) {
      return result;
    }
  }
  
  return null;
}

/**
 * Get the best display name for a card.
 * Priority:
 * 1. name_en (English name from database)
 * 2. Translated Japanese name (if name is Japanese and we can translate it)
 * 3. Original name (fallback)
 * 
 * @param card - Card object with name and optional name_en
 * @returns The best available display name
 */
export function getCardDisplayName(card: { name?: string | null; name_en?: string | null }): string {
  // Priority 1: Use English name if available
  if (card.name_en && card.name_en.trim()) {
    return card.name_en;
  }
  
  // Priority 2: Try to translate Japanese name
  if (card.name && containsJapanese(card.name)) {
    const translated = translateJapaneseName(card.name);
    if (translated) {
      return translated;
    }
  }
  
  // Priority 3: Fall back to original name
  return card.name || 'Unknown';
}

/**
 * Get the display set name, preferring English
 */
export function getSetDisplayName(card: { set_name?: string | null; set_name_en?: string | null }): string {
  if (card.set_name_en && card.set_name_en.trim()) {
    return card.set_name_en;
  }
  return card.set_name || 'Unknown Set';
}

/**
 * Check if a card has only Japanese name (no English translation available)
 */
export function hasOnlyJapaneseName(card: { name?: string | null; name_en?: string | null }): boolean {
  const hasEnglishName = card.name_en && card.name_en.trim();
  const hasJapaneseName = card.name && containsJapanese(card.name);
  
  if (hasEnglishName) return false;
  if (!hasJapaneseName) return false;
  
  // Check if we can translate it
  const translated = translateJapaneseName(card.name!);
  return !translated;
}
