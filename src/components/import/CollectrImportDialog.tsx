import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUp, Link2 } from "lucide-react";
import { CsvUploader } from "./CsvUploader";
import { PortfolioUrlInput } from "./PortfolioUrlInput";

interface CollectrImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CollectrImportDialog({ open, onOpenChange }: CollectrImportDialogProps) {
  const [activeTab, setActiveTab] = useState<"csv" | "url">("csv");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import from Collectr</DialogTitle>
          <DialogDescription>
            Choose how you want to import your Collectr collection
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "csv" | "url")} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="csv" className="flex items-center gap-2">
              <FileUp className="h-4 w-4" />
              Upload CSV
            </TabsTrigger>
            <TabsTrigger value="url" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Portfolio URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="csv" className="mt-6">
            <CsvUploader onClose={() => onOpenChange(false)} />
          </TabsContent>

          <TabsContent value="url" className="mt-6">
            <PortfolioUrlInput onClose={() => onOpenChange(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
