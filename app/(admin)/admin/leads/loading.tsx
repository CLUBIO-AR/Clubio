import { T } from "@/lib/theme";

function Skeleton({ w, h, className }: { w?: string; h?: string; className?: string }) {
  return (
    <div
      className={className}
      style={{ width: w, height: h, borderRadius: 10, background: T.card, border: `1px solid ${T.border}` }}
    />
  );
}

export default function AdminLeadsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <Skeleton h="36px" w="160px" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} h="100px" />)}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <Skeleton h="36px" w="280px" />
        <Skeleton h="36px" w="160px" />
        <Skeleton h="36px" w="160px" />
      </div>
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="px-5 py-3 flex items-center gap-4 border-b"
            style={{ borderColor: T.borderSub, background: i % 2 === 0 ? T.bgDeep : T.card }}
          >
            <Skeleton h="14px" w="160px" />
            <Skeleton h="14px" w="120px" />
            <div className="flex-1" />
            <Skeleton h="14px" w="90px" />
            <Skeleton h="24px" w="90px" />
          </div>
        ))}
      </div>
    </div>
  );
}
