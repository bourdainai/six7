/**
 * Unified Image Resolution Service
 * 
 * Provides multi-source fallback for Pokemon card images.
 * Validates image URLs and returns the first working one.
 */

const IMAGE_SOURCES = {
  TCGDEX: 'tcgdex',
  POKEMON_TCG_CDN: 'pokemontcg_cdn',
  POKEMON_TCG_API: 'pokemontcg_api',
} as const;

type ImageSource = typeof IMAGE_SOURCES[keyof typeof IMAGE_SOURCES];

interface ResolvedImage {
  small: string;
  large: string;
  source: ImageSource;
}

interface CardInfo {
  set_code: string;
  number: string;
  card_id?: string;
  sync_source?: string;
  language?: string;
}

/**
 * Validate if an image URL is accessible and returns an image
 */
export async function validateImageUrl(url: string, timeoutMs = 5000): Promise<boolean> {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': '6Seven-ImageResolver/1.0',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return false;
    }

    const contentType = response.headers.get('content-type') || '';
    return contentType.startsWith('image/');
  } catch {
    return false;
  }
}

/**
 * Generate all possible image URLs for a card
 */
function generateImageUrls(card: CardInfo): Array<{ small: string; large: string; source: ImageSource }> {
  const urls: Array<{ small: string; large: string; source: ImageSource }> = [];
  const language = card.language || 'ja';
  const setCode = card.set_code;
  const number = card.number;
  
  // Normalize number - remove leading zeros for some sources, keep for others
  const numberNormalized = number.replace(/^0+/, '') || number;
  const numberPadded = number.padStart(3, '0');
  
  // 1. TCGdex URLs (primary for Japanese cards)
  // Format: https://assets.tcgdex.net/{lang}/{setCode}/{number}/high.webp
  urls.push({
    small: `https://assets.tcgdex.net/${language}/${setCode}/${number}/low.webp`,
    large: `https://assets.tcgdex.net/${language}/${setCode}/${number}/high.webp`,
    source: IMAGE_SOURCES.TCGDEX,
  });
  
  // Try with lowercase set code
  if (setCode !== setCode.toLowerCase()) {
    urls.push({
      small: `https://assets.tcgdex.net/${language}/${setCode.toLowerCase()}/${number}/low.webp`,
      large: `https://assets.tcgdex.net/${language}/${setCode.toLowerCase()}/${number}/high.webp`,
      source: IMAGE_SOURCES.TCGDEX,
    });
  }
  
  // Try English TCGdex
  if (language !== 'en') {
    urls.push({
      small: `https://assets.tcgdex.net/en/${setCode}/${number}/low.webp`,
      large: `https://assets.tcgdex.net/en/${setCode}/${number}/high.webp`,
      source: IMAGE_SOURCES.TCGDEX,
    });
  }
  
  // 2. Pokemon TCG Images CDN
  // Format: https://images.pokemontcg.io/{setCode}/{number}.png
  // For Japanese sets, we need to map to English set codes
  const pokemonTcgSetCode = mapToEnglishSetCode(setCode);
  if (pokemonTcgSetCode) {
    urls.push({
      small: `https://images.pokemontcg.io/${pokemonTcgSetCode}/${numberNormalized}.png`,
      large: `https://images.pokemontcg.io/${pokemonTcgSetCode}/${numberNormalized}_hires.png`,
      source: IMAGE_SOURCES.POKEMON_TCG_CDN,
    });
    
    // Try with padded number
    if (numberNormalized !== numberPadded) {
      urls.push({
        small: `https://images.pokemontcg.io/${pokemonTcgSetCode}/${numberPadded}.png`,
        large: `https://images.pokemontcg.io/${pokemonTcgSetCode}/${numberPadded}_hires.png`,
        source: IMAGE_SOURCES.POKEMON_TCG_CDN,
      });
    }
  }
  
  return urls;
}

/**
 * Map Japanese/TCGdex set codes to Pokemon TCG API set codes
 */
function mapToEnglishSetCode(setCode: string): string | null {
  // Common mappings for Scarlet & Violet era
  const mappings: Record<string, string> = {
    // SV Japanese to English
    'sv1': 'sv1',
    'sv2': 'sv2',
    'sv3': 'sv3',
    'sv4': 'sv4',
    'sv4a': 'sv4pt5', // Paldea Evolved
    'sv5': 'sv5',
    'sv6': 'sv6',
    'sv7': 'sv7',
    'sv8': 'sv08',
    // Special sets
    'sv2a': 'sv3pt5', // 151
    'sv4K': 'sv4',
    'sv4M': 'sv4',
    // Promos
    'svp': 'svp',
    'sv-p': 'svp',
  };
  
  const lowerCode = setCode.toLowerCase();
  return mappings[lowerCode] || mappings[setCode] || null;
}

/**
 * Resolve the best available image for a card
 * Tries multiple sources and returns the first valid one
 */
export async function resolveCardImage(card: CardInfo): Promise<ResolvedImage | null> {
  const urlCandidates = generateImageUrls(card);
  
  // Try each URL in order
  for (const candidate of urlCandidates) {
    const isValid = await validateImageUrl(candidate.large);
    if (isValid) {
      return {
        small: candidate.small,
        large: candidate.large,
        source: candidate.source,
      };
    }
  }
  
  return null;
}

/**
 * Batch resolve images for multiple cards
 * Uses parallel validation for efficiency
 */
export async function batchResolveCardImages(
  cards: CardInfo[],
  concurrency = 5
): Promise<Map<string, ResolvedImage | null>> {
  const results = new Map<string, ResolvedImage | null>();
  
  // Process in batches for rate limiting
  for (let i = 0; i < cards.length; i += concurrency) {
    const batch = cards.slice(i, i + concurrency);
    const promises = batch.map(async (card) => {
      const key = card.card_id || `${card.set_code}-${card.number}`;
      const resolved = await resolveCardImage(card);
      return { key, resolved };
    });
    
    const batchResults = await Promise.all(promises);
    for (const { key, resolved } of batchResults) {
      results.set(key, resolved);
    }
    
    // Small delay between batches
    if (i + concurrency < cards.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

/**
 * Fix a TCGdex image URL that's missing the file extension
 */
export function fixTcgdexImageUrl(url: string): { small: string; large: string } | null {
  if (!url) return null;
  
  // Check if URL already has extension
  if (url.endsWith('.webp') || url.endsWith('.png') || url.endsWith('.jpg')) {
    return { small: url, large: url };
  }
  
  // Check if it's a TCGdex URL
  if (url.includes('assets.tcgdex.net')) {
    // Remove trailing slash if present
    const baseUrl = url.replace(/\/$/, '');
    return {
      small: `${baseUrl}/low.webp`,
      large: `${baseUrl}/high.webp`,
    };
  }
  
  return null;
}
