import { Loader2 } from "lucide-react";
import React from "react";

export function LoadingOverlay() {
  return (
    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <Loader2 className="animate-spin h-8 w-8 text-white" />
    </div>
  );
}
