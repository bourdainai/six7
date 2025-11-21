/**
 * Script to verify completeness of Pokemon card sets in the database
 * 
 * This script queries the database to check which sets are complete
 * and reports on any missing cards or data quality issues.
 * 
 * Usage:
 * - Check all sets: await verifySetCompleteness()
 * - Check specific set: await verifySetCompleteness('sv4a')
 * - Check with details: await verifySetCompleteness(null, true)
 */

import { supabase } from '../src/integrations/supabase/client';

interface SetStats {
  setCode: string;
  setName: string;
  expectedTotal: number | null;
  actualCount: number;
  isComplete: boolean;
  completionPercentage: number;
  sources: string[];
  missingNumbers?: string[];
  hasImages: number;
  hasNoImages: number;
}

export async function verifySetCompleteness(
  setCode?: string,
  showDetails: boolean = false
): Promise<SetStats[]> {
  console.log('🔍 Verifying set completeness...\n');

  try {
    // Build query
    let query = supabase
      .from('pokemon_card_attributes')
      .select('set_code, set_name, number, display_number, printed_total, sync_source, images');

    if (setCode) {
      query = query.eq('set_code', setCode);
    }

    const { data: cards, error } = await query;

    if (error) {
      console.error('❌ Error fetching cards:', error);
      return [];
    }

    if (!cards || cards.length === 0) {
      console.log('⚠️  No cards found in database');
      return [];
    }

    // Group cards by set
    const setGroups = cards.reduce((acc, card) => {
      if (!acc[card.set_code]) {
        acc[card.set_code] = [];
      }
      acc[card.set_code].push(card);
      return acc;
    }, {} as Record<string, any[]>);

    const results: SetStats[] = [];

    for (const [code, setCards] of Object.entries(setGroups)) {
      const setName = setCards[0].set_name;
      const expectedTotal = setCards[0].printed_total;
      const actualCount = setCards.length;
      
      // Get unique sources for this set
      const sources = [...new Set(setCards.map(c => c.sync_source))];
      
      // Count cards with/without images
      const hasImages = setCards.filter(c => 
        c.images && (c.images.small || c.images.large)
      ).length;
      const hasNoImages = actualCount - hasImages;
      
      // Check completeness
      const isComplete = expectedTotal ? actualCount >= expectedTotal : false;
      const completionPercentage = expectedTotal 
        ? Math.round((actualCount / expectedTotal) * 100)
        : 100;

      const stats: SetStats = {
        setCode: code,
        setName,
        expectedTotal,
        actualCount,
        isComplete,
        completionPercentage,
        sources,
        hasImages,
        hasNoImages
      };

      // Find missing numbers if showing details and we know the expected total
      if (showDetails && expectedTotal) {
        const existingNumbers = new Set(
          setCards.map(c => c.display_number || c.number)
        );
        const missingNumbers: string[] = [];
        
        for (let i = 1; i <= expectedTotal; i++) {
          const numStr = i.toString();
          const paddedNum = numStr.padStart(3, '0');
          
          if (!existingNumbers.has(numStr) && !existingNumbers.has(paddedNum)) {
            missingNumbers.push(numStr);
          }
        }
        
        if (missingNumbers.length > 0) {
          stats.missingNumbers = missingNumbers;
        }
      }

      results.push(stats);
    }

    // Sort by completion percentage (incomplete sets first)
    results.sort((a, b) => a.completionPercentage - b.completionPercentage);

    // Print results
    console.log('📊 Set Completeness Report\n');
    console.log('═'.repeat(80));

    for (const stat of results) {
      const statusIcon = stat.isComplete ? '✅' : '⚠️';
      console.log(`\n${statusIcon} ${stat.setName} (${stat.setCode})`);
      console.log(`   Cards: ${stat.actualCount}${stat.expectedTotal ? `/${stat.expectedTotal}` : ''} (${stat.completionPercentage}%)`);
      console.log(`   Sources: ${stat.sources.join(', ')}`);
      console.log(`   Images: ${stat.hasImages} with images, ${stat.hasNoImages} missing`);
      
      if (stat.missingNumbers && stat.missingNumbers.length > 0) {
        console.log(`   ⚠️  Missing cards: ${stat.missingNumbers.slice(0, 20).join(', ')}${stat.missingNumbers.length > 20 ? '...' : ''}`);
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log(`\n📈 Summary:`);
    console.log(`   Total sets: ${results.length}`);
    console.log(`   Complete sets: ${results.filter(s => s.isComplete).length}`);
    console.log(`   Incomplete sets: ${results.filter(s => !s.isComplete).length}`);
    console.log(`   Total cards: ${results.reduce((sum, s) => sum + s.actualCount, 0)}`);

    return results;

  } catch (err) {
    console.error('❌ Error:', err);
    return [];
  }
}

// Example usage - uncomment to run:

// Check all sets
// verifySetCompleteness();

// Check specific set with details
// verifySetCompleteness('sv4a', true);

// Check just sv4a
// verifySetCompleteness('sv4a');
