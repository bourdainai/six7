export interface PokemonCard {
  id: string;
  name: string;
  supertype: string;
  subtypes: string[];
  hp?: string;
  types?: string[];
  set: {
    id: string;
    name: string;
    series: string;
    printedTotal: number;
    total: number;
    legalities: {
      unlimited: string;
      standard?: string;
      expanded?: string;
    };
    ptcgoCode?: string;
    releaseDate: string;
    updatedAt: string;
    images: {
      symbol: string;
      logo: string;
    };
  };
  number: string;
  artist?: string;
  rarity?: string;
  nationalPokedexNumbers?: number[];
  legalities: {
    unlimited: string;
    standard?: string;
    expanded?: string;
  };
  images: {
    small: string;
    large: string;
  };
  tcgplayer?: {
    url: string;
    updatedAt: string;
    prices: {
      normal?: {
        low: number;
        mid: number;
        high: number;
        market: number;
        directLow?: number;
      };
      holofoil?: {
        low: number;
        mid: number;
        high: number;
        market: number;
        directLow?: number;
      };
      reverseHolofoil?: {
        low: number;
        mid: number;
        high: number;
        market: number;
        directLow?: number;
      };
      [key: string]: unknown;
    };
  };
  cardmarket?: {
    url: string;
    updatedAt: string;
    prices: {
      averageSellPrice: number;
      lowPrice: number;
      trendPrice: number;
      germanProLow: number;
      suggestedPrice: number;
      reverseHoloSell: number;
      reverseHoloLow: number;
      reverseHoloTrend: number;
      lowPriceExPlus: number;
      avg1: number;
      avg7: number;
      avg30: number;
      reverseHoloAvg1: number;
      reverseHoloAvg7: number;
      reverseHoloAvg30: number;
    };
  };
}

export interface PokemonSet {
  id: string;
  name: string;
  series: string;
  printedTotal: number;
  total: number;
  legalities: {
    unlimited: string;
    standard?: string;
    expanded?: string;
  };
  ptcgoCode?: string;
  releaseDate: string;
  updatedAt: string;
  images: {
    symbol: string;
    logo: string;
  };
}

const API_URL = 'https://api.pokemontcg.io/v2';

export class PokemonTCGClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${API_URL}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString(), {
      headers: {
        'X-Api-Key': this.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Pokemon TCG API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  }

  async getCard(id: string): Promise<PokemonCard> {
    const data = await this.fetch<{ data: PokemonCard }>(`/cards/${id}`);
    return data.data;
  }

  async searchCards(query: string, page: number = 1, pageSize: number = 250): Promise<{ data: PokemonCard[]; count: number; totalCount: number }> {
    const data = await this.fetch<{ data: PokemonCard[]; count: number; totalCount: number }>(`/cards`, {
      q: query,
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    return data;
  }

  async getSet(id: string): Promise<PokemonSet> {
    const data = await this.fetch<{ data: PokemonSet }>(`/sets/${id}`);
    return data.data;
  }

  async getAllSets(): Promise<PokemonSet[]> {
    const data = await this.fetch<{ data: PokemonSet[] }>('/sets');
    return data.data;
  }
}

export const createTCGClient = (apiKey?: string) => {
  // In a real app, you'd probably get this from env vars, 
  // but allowing injection for flexibility
  const key = apiKey || import.meta.env.VITE_POKEMON_TCG_API_KEY || '';
  return new PokemonTCGClient(key);
};

