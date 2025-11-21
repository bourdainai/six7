-- Fix Japanese cards with empty images by constructing URLs from TCGdex CDN
UPDATE pokemon_card_attributes
SET images = jsonb_build_object(
  'small', 'https://assets.tcgdex.net/ja/' || 
    CASE 
      WHEN set_code LIKE 'SV%' THEN 'sv'
      WHEN set_code LIKE 'S%' THEN 'swsh'
      WHEN set_code LIKE 'SM%' THEN 'sm'
      WHEN set_code LIKE 'XY%' THEN 'xy'
      WHEN set_code LIKE 'BW%' THEN 'bw'
      WHEN set_code LIKE 'neo%' THEN 'neo'
      WHEN set_code LIKE 'E%' THEN 'ecard'
      WHEN set_code LIKE 'PCG%' THEN 'dp'
      WHEN set_code LIKE 'PMCG%' THEN 'base'
      WHEN set_code = 'VS1' THEN 'base'
      WHEN set_code = 'web1' THEN 'base'
      ELSE LOWER(set_code)
    END || '/' || set_code || '/' || number,
  'large', 'https://assets.tcgdex.net/ja/' || 
    CASE 
      WHEN set_code LIKE 'SV%' THEN 'sv'
      WHEN set_code LIKE 'S%' THEN 'swsh'
      WHEN set_code LIKE 'SM%' THEN 'sm'
      WHEN set_code LIKE 'XY%' THEN 'xy'
      WHEN set_code LIKE 'BW%' THEN 'bw'
      WHEN set_code LIKE 'neo%' THEN 'neo'
      WHEN set_code LIKE 'E%' THEN 'ecard'
      WHEN set_code LIKE 'PCG%' THEN 'dp'
      WHEN set_code LIKE 'PMCG%' THEN 'base'
      WHEN set_code = 'VS1' THEN 'base'
      WHEN set_code = 'web1' THEN 'base'
      ELSE LOWER(set_code)
    END || '/' || set_code || '/' || number,
  'tcgdex', 'https://assets.tcgdex.net/ja/' || 
    CASE 
      WHEN set_code LIKE 'SV%' THEN 'sv'
      WHEN set_code LIKE 'S%' THEN 'swsh'
      WHEN set_code LIKE 'SM%' THEN 'sm'
      WHEN set_code LIKE 'XY%' THEN 'xy'
      WHEN set_code LIKE 'BW%' THEN 'bw'
      WHEN set_code LIKE 'neo%' THEN 'neo'
      WHEN set_code LIKE 'E%' THEN 'ecard'
      WHEN set_code LIKE 'PCG%' THEN 'dp'
      WHEN set_code LIKE 'PMCG%' THEN 'base'
      WHEN set_code = 'VS1' THEN 'base'
      WHEN set_code = 'web1' THEN 'base'
      ELSE LOWER(set_code)
    END || '/' || set_code || '/' || number
)
WHERE sync_source = 'tcgdex'
  AND metadata->>'language' = 'ja'
  AND (images = '{}' OR images->>'small' IS NULL OR images->>'small' = '');