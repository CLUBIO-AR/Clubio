import { T } from "@/lib/theme";

function Skeleton({ h, w }: { h?: string; w?: string }) {
  return (
    <div style={{ width: w, height: h, borderRadius: 10, background: T.card, border: `1px solid ${T.border}` }} />
  );
}

export default function CuotasLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton h="36px" w="140px" />
        <Skeleton h="36px" w="140px" />
      </div>
      <div className="flex gap-3 flex-wrap">
        <Skeleton h="38px" w="200px" />
        <Skeleton h="38px" w="130px" />
        <Skeleton h="38px" w="130px" />
        <Skeleton h="38px" w="130px" />
      </div>
      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.border}` }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <div
            key={i}
            className="px-5 py-3 flex items-center gap-4 border-b"
            style={{ borderColor: T.borderSub, background: i % 2 === 0 ? T.bgDeep : T.card }}
          >
            <Skeleton h="40px" w="40px" />
            <div className="flex-1 space-y-1.5">
              <Skeleton h="14px" w="160px" />
              <Skeleton h="12px" w="100px" />
            </div>
            <Skeleton h="14px" w="80px" />
            <Skeleton h="24px" w="80px" />
            <Skeleton h="28px" w="28px" />
          </div>
        ))}
      </div>
    </div>
  );
}
