import { T } from "@/lib/theme";

function Skeleton({ w, h, className }: { w?: string; h?: string; className?: string }) {
  return (
    <div
      className={className}
      style={{ width: w, height: h, borderRadius: 12, background: T.card, border: `1px solid ${T.border}` }}
    />
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <Skeleton h="36px" w="220px" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} h="120px" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton h="280px" />
        <Skeleton h="280px" />
      </div>
    </div>
  );
}
