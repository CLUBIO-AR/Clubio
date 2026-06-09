import { T } from "@/lib/theme";

function Skeleton({ w, h, className }: { w?: string; h?: string; className?: string }) {
  return (
    <div
      className={className}
      style={{ width: w, height: h, borderRadius: 10, background: T.card, border: `1px solid ${T.border}` }}
    />
  );
}

export default function AdminLogsPagosLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <Skeleton h="36px" w="200px" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} h="100px" />)}
        <Skeleton h="80px" className="sm:col-span-3" />
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <Skeleton h="36px" w="280px" />
        <Skeleton h="36px" w="100px" />
        <Skeleton h="36px" w="160px" />
        <Skeleton h="36px" w="160px" />
        <Skeleton h="36px" w="200px" />
      </div>
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="px-5 py-3 flex items-center gap-4 border-b"
            style={{ borderColor: T.borderSub, background: i % 2 === 0 ? T.bgDeep : T.card }}
          >
            <Skeleton h="14px" w="120px" />
            <Skeleton h="14px" w="120px" />
            <Skeleton h="14px" w="100px" />
            <div className="flex-1" />
            <Skeleton h="14px" w="80px" />
            <Skeleton h="20px" w="100px" />
          </div>
        ))}
      </div>
    </div>
  );
}
