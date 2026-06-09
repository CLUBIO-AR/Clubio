import { Loader2 } from "lucide-react";
import { T } from "@/lib/theme";

export default function Loading() {
  return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: T.textDim }} />
    </div>
  );
}
