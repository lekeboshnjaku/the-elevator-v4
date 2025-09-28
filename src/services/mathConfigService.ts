// src/services/mathConfigService.ts
export interface GameMode {
  name: string;
  cost: number;
  events: string;
  weights: string;
}

interface IndexJson {
  modes: GameMode[];
}

let cachedIndex: IndexJson | null = null;

async function fetchIndex(): Promise<IndexJson> {
  if (cachedIndex) return cachedIndex;
  try {
    const res = await fetch('/math/index.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as IndexJson;
    cachedIndex = data;
    return data;
  } catch (e) {
    console.warn('[mathConfigService] Failed to load /math/index.json; falling back', e);
    /*  Fallback mirrors the canonical files shipped in stake_engine_upload/math
        Base mode uses normal lookup; Elevate is now premium-priced at 3.0 (200 % surcharge). */
    return {
      modes: [
        {
          name: 'base',
          cost: 1.0,
          events: 'game_logic.jsonl.zst',
          weights: 'lookup_table_base.csv',
        },
        {
          name: 'elevate',
          cost: 3.0,
          events: 'game_logic.jsonl.zst',
          weights: 'lookup_table_elevate.csv',
        },
      ],
    };
  }
}

export async function getElevateCost(): Promise<number> {
  const idx = await fetchIndex();
  const m = idx.modes.find(m => m.name.toLowerCase() === 'elevate');
  // Default to 3.0 if index.json is unavailable or missing elevate mode entry
  return m?.cost ?? 3.0;
}

export async function getBaseCost(): Promise<number> {
  const idx = await fetchIndex();
  const m = idx.modes.find(m => m.name.toLowerCase() === 'base');
  return m?.cost ?? 1.0;
}
