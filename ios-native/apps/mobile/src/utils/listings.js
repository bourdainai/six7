// Utility functions for listing operations
import { supabase } from './supabaseClient';

/**
 * Convert image URI to blob for upload
 */
export async function uriToBlob(uri) {
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob;
}

/**
 * Upload images to Supabase storage
 */
export async function uploadListingImages(listingId, imageUris) {
  if (!imageUris || imageUris.length === 0) {
    return [];
  }

  const uploadedUrls = [];

  for (let i = 0; i < imageUris.length; i++) {
    const uri = imageUris[i];
    
    try {
      // Convert URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Extract file extension from URI or default to jpg
      const extension = uri.split('.').pop()?.split('?')[0] || 'jpg';
      const fileName = `${listingId}/${Date.now()}-${i}.${extension}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(fileName, blob, {
          contentType: blob.type || 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error(`Error uploading image ${i}:`, uploadError);
        continue;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('listing-images')
        .getPublicUrl(fileName);

      uploadedUrls.push(publicUrl);
    } catch (error) {
      console.error(`Error processing image ${i}:`, error);
      continue;
    }
  }

  return uploadedUrls;
}

/**
 * Create listing images records in database
 */
export async function createListingImages(listingId, imageUrls, aiAnalysis = null) {
  if (!imageUrls || imageUrls.length === 0) {
    return [];
  }

  const imageRecords = imageUrls.map((url, index) => ({
    listing_id: listingId,
    image_url: url,
    display_order: index,
    ai_analysis: aiAnalysis || {},
  }));

  const { data, error } = await supabase
    .from('listing_images')
    .insert(imageRecords)
    .select();

  if (error) {
    console.error('Error creating listing images:', error);
    throw error;
  }

  return data || [];
}

/**
 * Analyze images using AI Edge Function
 * Returns null if analysis fails (allows manual entry)
 */
export async function analyzeImages(imageUris) {
  try {
    // Convert local URIs to base64 for Edge Function
    const base64Images = [];
    
    for (const uri of imageUris) {
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        
        // Convert blob to base64
        // Note: FileReader should work in React Native when using expo
        const base64 = await new Promise((resolve, reject) => {
          // Use global FileReader or polyfill
          const reader = typeof FileReader !== 'undefined' 
            ? new FileReader() 
            : global.FileReader ? new global.FileReader() : null;
            
          if (!reader) {
            reject(new Error('FileReader not available'));
            return;
          }
          
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        
        if (base64) {
          base64Images.push(base64);
        }
      } catch (err) {
        console.error('Error converting image to base64:', err);
        // Continue with other images
      }
    }

    if (base64Images.length === 0) {
      console.warn('No images converted to base64');
      return null;
    }

    const { data, error } = await supabase.functions.invoke('analyze-listing-images', {
      body: { images: base64Images },
    });

    if (error) {
      console.error('Edge Function error:', error);
      return null; // Return null to allow manual entry
    }

    if (data && data.success) {
      return data.data;
    }

    return null; // Allow manual entry if analysis fails
  } catch (error) {
    console.error('Error analyzing images:', error);
    return null; // Return null instead of throwing - allows manual entry
  }
}

/**
 * Create a listing in Supabase
 */
export async function createListing(listingData) {
  const { data, error } = await supabase
    .from('listings')
    .insert(listingData)
    .select()
    .single();

  if (error) {
    console.error('Error creating listing:', error);
    throw error;
  }

  return data;
}

