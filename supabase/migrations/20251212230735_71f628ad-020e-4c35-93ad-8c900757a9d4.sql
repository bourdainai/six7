-- base5 (Team Rocket) has 83 cards
UPDATE pokemon_card_attributes 
SET printed_total = 83
WHERE set_code = 'base5' 
  AND card_id NOT LIKE 'tcgdex_ja_%'
  AND printed_total IS NULL;

-- basep (Wizards Black Star Promos) has 53 cards
UPDATE pokemon_card_attributes 
SET printed_total = 53
WHERE set_code = 'basep' 
  AND card_id NOT LIKE 'tcgdex_ja_%'
  AND printed_total IS NULL;