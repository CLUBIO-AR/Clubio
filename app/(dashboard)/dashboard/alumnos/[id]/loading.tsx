import { T } from "@/lib/theme";

function Skeleton({ h, w, full }: { h?: string; w?: string; full?: boolean }) {
  return (
    <div style={{ width: full ? "100%" : w, height: h, borderRadius: 10, background: T.card, border: `1px solid ${T.border}` }} />
  );
}

export default function AlumnoDetailLoading() {
  return (
    <div className="space-y-6 max-w-3xl animate-pulse">
      <div className="flex items-center gap-3">
        <Skeleton h="32px" w="32px" />
        <Skeleton h="36px" w="280px" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} h="64px" full />)}
      </div>
      <Skeleton h="280px" full />
      <Skeleton h="360px" full />
    </div>
  );
}
