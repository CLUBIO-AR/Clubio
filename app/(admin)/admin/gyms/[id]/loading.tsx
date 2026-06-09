import { T } from "@/lib/theme";

function Skeleton({ w, h, className }: { w?: string; h?: string; className?: string }) {
  return (
    <div
      className={className}
      style={{ width: w, height: h, borderRadius: 12, background: T.card, border: `1px solid ${T.border}` }}
    />
  );
}

export default function AdminGymDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton h="36px" w="240px" />
        <Skeleton h="36px" w="120px" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} h="100px" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton h="220px" />
        <Skeleton h="220px" />
      </div>
      <Skeleton h="200px" />
    </div>
  );
}
