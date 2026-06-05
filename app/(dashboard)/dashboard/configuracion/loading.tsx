import { T } from "@/lib/theme";

function Skeleton({ h, w, full }: { h?: string; w?: string; full?: boolean }) {
  return (
    <div style={{ width: full ? "100%" : w, height: h, borderRadius: 10, background: T.bgDeep, border: `1px solid ${T.border}` }} />
  );
}

export default function ConfiguracionLoading() {
  return (
    <div className="space-y-6 animate-pulse max-w-2xl">
      <Skeleton h="36px" w="200px" />
      <div className="rounded-xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.border}` }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: T.borderSub }}>
          <Skeleton h="14px" w="140px" />
        </div>
        <div className="p-5 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton h="12px" w="100px" />
              <Skeleton h="38px" full />
            </div>
          ))}
          <Skeleton h="38px" w="120px" />
        </div>
      </div>
    </div>
  );
}
