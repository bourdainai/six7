import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CsvUploader } from "./CsvUploader";

interface CollectrImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CollectrImportDialog({ open, onOpenChange }: CollectrImportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import from Collectr</DialogTitle>
          <DialogDescription>
            Upload your Collectr CSV export to import your collection
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          <CsvUploader onClose={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
