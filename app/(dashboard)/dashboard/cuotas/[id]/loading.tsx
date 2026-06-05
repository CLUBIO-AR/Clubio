import { T } from "@/lib/theme";

function Skeleton({ h, w, full }: { h?: string; w?: string; full?: boolean }) {
  return (
    <div style={{ width: full ? "100%" : w, height: h, borderRadius: 10, background: T.card, border: `1px solid ${T.border}` }} />
  );
}

export default function CuotaDetailLoading() {
  return (
    <div className="space-y-6 max-w-2xl animate-pulse">
      <div className="flex items-center gap-3">
        <Skeleton h="32px" w="32px" />
        <Skeleton h="36px" w="240px" />
      </div>
      <Skeleton h="200px" full />
      <Skeleton h="320px" full />
    </div>
  );
}
