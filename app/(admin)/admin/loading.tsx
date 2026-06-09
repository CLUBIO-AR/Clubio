import { T } from "@/lib/theme";

function Skeleton({ w, h, className }: { w?: string; h?: string; className?: string }) {
  return (
    <div
      className={className}
      style={{ width: w, height: h, borderRadius: 12, background: T.card, border: `1px solid ${T.border}` }}
    />
  );
}

export default function AdminDashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <Skeleton h="36px" w="220px" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <Skeleton key={i} h="120px" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} h="180px" />)}
      </div>
    </div>
  );
}
