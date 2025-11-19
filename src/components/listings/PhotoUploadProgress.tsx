import { Progress } from "@/components/ui/progress";

export function PhotoUploadProgress({ progress }: { progress: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Uploading photos...</span>
        <span>{progress}%</span>
      </div>
      <Progress value={progress} />
    </div>
  );
}

