import { T } from "@/lib/theme";

function Skeleton({ h, w, className }: { h?: string; w?: string; className?: string }) {
  return (
    <div
      className={className}
      style={{ width: w, height: h, borderRadius: 10, background: T.card, border: `1px solid ${T.border}` }}
    />
  );
}

export default function AlumnosLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton h="36px" w="160px" />
        <Skeleton h="36px" w="120px" />
      </div>
      <div className="flex gap-3">
        <Skeleton h="38px" w="260px" />
        <Skeleton h="38px" w="160px" />
      </div>
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="px-5 py-3 flex items-center gap-4 border-b"
            style={{ borderColor: T.borderSub, background: i % 2 === 0 ? T.bgDeep : T.card }}
          >
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: T.card, border: `1px solid ${T.border}`, flexShrink: 0 }} />
            <Skeleton h="16px" w="180px" />
            <Skeleton h="14px" w="120px" className="ml-auto" />
            <Skeleton h="24px" w="64px" />
          </div>
        ))}
      </div>
    </div>
  );
}
