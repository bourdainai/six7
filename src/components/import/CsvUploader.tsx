import { useState, useCallback } from "react";
import Papa from "papaparse";
import { Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { validateCsvHeaders, mapCsvRowToListing, type CollectrCsvRow } from "./utils/csvMapper";
import { ImportProgress } from "./ImportProgress";
import { ImportSummary } from "./ImportSummary";
import { logger } from "@/lib/logger";

interface CsvUploaderProps {
  onClose: () => void;
}

export function CsvUploader({ onClose }: CsvUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [summary, setSummary] = useState<{ success: number; failed: number } | null>(null);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === "text/csv") {
      setFile(droppedFile);
      setError(null);
    } else {
      setError("Please drop a valid CSV file");
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const processImport = async () => {
    if (!file) return;

    setImporting(true);
    setError(null);
    setSummary(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      Papa.parse<CollectrCsvRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            // Validate headers
            const headerValidation = validateCsvHeaders(results.meta.fields || []);
            if (!headerValidation.valid) {
              setError(headerValidation.message || "Invalid CSV format");
              setImporting(false);
              return;
            }

            // Create import job
            const { data: importJob, error: jobError } = await supabase
              .from("import_jobs")
              .insert({
                user_id: user.id,
                source: "csv",
                total_items: results.data.length,
                metadata: { filename: file.name }
              })
              .select()
              .single();

            if (jobError || !importJob) throw jobError;

            // Process rows in batches
            const BATCH_SIZE = 50;
            let successCount = 0;
            let failedCount = 0;
            const totalRows = results.data.length;

            for (let i = 0; i < totalRows; i += BATCH_SIZE) {
              const batch = results.data.slice(i, i + BATCH_SIZE);
              const listings = [];

              for (const row of batch) {
                const mapped = mapCsvRowToListing({
                  portfolioName: row["Portfolio Name"] || "",
                  category: row["Category"] || "",
                  set: row["Set"] || "",
                  productName: row["Product Name"] || "",
                  cardNumber: row["Card Number"] || "",
                  rarity: row["Rarity"] || "",
                  variance: row["Variance"] || "",
                  grade: row["Grade"] || "",
                  cardCondition: row["Card Condition"] || "",
                  averageCostPer: row["Average Cost Paid"] || "",
                  quantity: row["Quantity"] || "1",
                  marketPrice: row["Market Price (As of 2025-10-15)"] || row["Market Price"] || "",
                  watchlist: row["Watchlist"] || "",
                  dateAdded: row["Date Added"] || "",
                  note: row["Notes"] || row["Note"] || ""
                }, user.id);

                // Import all cards, even if some fields are missing
                // Only skip if absolutely critical data is missing (title)
                if (mapped.listing.title) {
                  // Create N listings for quantity > 1
                  for (let q = 0; q < mapped.quantity; q++) {
                    listings.push({ ...mapped.listing, import_job_id: importJob.id });
                  }
                } else {
                  failedCount++;
                }
              }

              // Bulk insert
              if (listings.length > 0) {
                const { error: insertError } = await supabase
                  .from("listings")
                  .insert(listings);

                if (insertError) {
                  logger.error("Insert error:", insertError);
                  failedCount += listings.length;
                } else {
                  successCount += listings.length;
                }
              }

              // Update progress
              setProgress({ current: Math.min(i + BATCH_SIZE, totalRows), total: totalRows });
            }

            // Update import job
            await supabase
              .from("import_jobs")
              .update({
                status: "completed",
                processed_items: successCount,
                failed_items: failedCount,
                completed_at: new Date().toISOString()
              })
              .eq("id", importJob.id);

            setSummary({ success: successCount, failed: failedCount });
            toast({
              title: "Import complete",
              description: `Successfully imported ${successCount} cards`
            });

          } catch (err) {
            logger.error("Import error:", err);
            setError(err instanceof Error ? err.message : "Import failed");
          } finally {
            setImporting(false);
          }
        },
        error: (err) => {
          setError(`CSV parsing error: ${err.message}`);
          setImporting(false);
        }
      });

    } catch (err) {
      logger.error("Import error:", err);
      setError(err instanceof Error ? err.message : "Import failed");
      setImporting(false);
    }
  };

  if (summary) {
    return <ImportSummary success={summary.success} failed={summary.failed} onClose={onClose} />;
  }

  if (importing) {
    return <ImportProgress current={progress.current} total={progress.total} />;
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging ? "border-primary bg-primary/5" : "border-border"}
          ${file ? "bg-muted/50" : ""}
        `}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
          id="csv-upload"
        />
        
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        
        {file ? (
          <div>
            <p className="font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          </div>
        ) : (
          <div>
            <p className="font-medium mb-2">Drop your Collectr CSV here</p>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse
            </p>
            <label htmlFor="csv-upload">
              <Button variant="outline" className="cursor-pointer" asChild>
                <span>Select CSV File</span>
              </Button>
            </label>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
        <p className="font-medium">Expected CSV format:</p>
        <ul className="list-disc list-inside text-muted-foreground space-y-1">
          <li>15 columns: Portfolio Name, Category, Set, Product Name, etc.</li>
          <li>Export directly from Collectr app (Settings → Export Collection)</li>
          <li>All listings will be created as drafts</li>
          <li>Cards with Quantity &gt; 1 will create multiple listings</li>
          <li>You can add photos after import</li>
        </ul>
      </div>

      <div className="flex gap-3">
        <Button onClick={onClose} variant="outline" className="flex-1">
          Cancel
        </Button>
        <Button onClick={processImport} disabled={!file || importing} className="flex-1">
          Import CSV
        </Button>
      </div>
    </div>
  );
}
