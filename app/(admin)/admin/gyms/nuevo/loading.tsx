import { T } from "@/lib/theme";

function Skeleton({ w, h, className }: { w?: string; h?: string; className?: string }) {
  return (
    <div
      className={className}
      style={{ width: w, height: h, borderRadius: 12, background: T.card, border: `1px solid ${T.border}` }}
    />
  );
}

export default function AdminNuevoGymLoading() {
  return (
    <div className="space-y-6 animate-pulse max-w-2xl">
      <Skeleton h="36px" w="220px" />
      <Skeleton h="48px" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} h="56px" />)}
      </div>
      <div className="flex justify-end gap-2">
        <Skeleton h="40px" w="100px" />
        <Skeleton h="40px" w="100px" />
      </div>
    </div>
  );
}
