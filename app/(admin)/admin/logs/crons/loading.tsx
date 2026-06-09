import { T } from "@/lib/theme";

function Skeleton({ w, h, className }: { w?: string; h?: string; className?: string }) {
  return (
    <div
      className={className}
      style={{ width: w, height: h, borderRadius: 10, background: T.card, border: `1px solid ${T.border}` }}
    />
  );
}

export default function AdminLogsCronsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <Skeleton h="36px" w="220px" />
        <Skeleton h="36px" w="320px" />
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <Skeleton h="36px" w="160px" />
        <Skeleton h="36px" w="160px" />
        <Skeleton h="36px" w="160px" />
        <Skeleton h="36px" w="140px" />
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
            <Skeleton h="20px" w="70px" />
            <div className="flex-1" />
            <Skeleton h="14px" w="60px" />
            <Skeleton h="14px" w="60px" />
            <Skeleton h="20px" w="20px" />
          </div>
        ))}
      </div>
    </div>
  );
}
