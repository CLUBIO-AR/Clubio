import { T } from "@/lib/theme";

function Skeleton({ h, w }: { h?: string; w?: string }) {
  return (
    <div style={{ width: w, height: h, borderRadius: 10, background: T.card, border: `1px solid ${T.border}` }} />
  );
}

export default function PagosLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton h="36px" w="120px" />
        <Skeleton h="36px" w="160px" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => <div key={i} style={{ height: 100, borderRadius: 12, background: T.card, border: `1px solid ${T.border}` }} />)}
      </div>
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="px-5 py-3 flex items-center gap-4 border-b"
            style={{ borderColor: T.borderSub, background: i % 2 === 0 ? T.bgDeep : T.card }}
          >
            <Skeleton h="14px" w="100px" />
            <Skeleton h="14px" w="140px" />
            <div className="flex-1" />
            <Skeleton h="14px" w="80px" />
            <Skeleton h="24px" w="90px" />
          </div>
        ))}
      </div>
    </div>
  );
}
