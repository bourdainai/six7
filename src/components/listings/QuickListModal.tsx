import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function QuickListModal({ open, onOpenChange }: any) {
  const [step, setStep] = useState('upload'); // upload, analyzing, review
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>AI Quick List</DialogTitle>
        </DialogHeader>
        <div className="py-8 text-center">
          {step === 'upload' && (
            <div className="border-2 border-dashed rounded-lg p-8">
              <p>Drag and drop photos here</p>
              <Button className="mt-4" onClick={() => setStep('analyzing')}>Select Photos</Button>
            </div>
          )}
          {step === 'analyzing' && (
            <div>
              <p>Analyzing card...</p>
              {/* PhotoUploadProgress here */}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

