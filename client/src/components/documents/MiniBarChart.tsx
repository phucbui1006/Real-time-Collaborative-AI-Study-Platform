// components/documents/MiniBarChart.tsx — Biểu đồ dạng cột nhỏ trong chat
import { ChartItem } from "../../services/aiService";

export function MiniBarChart({ data }: { data: ChartItem[] }) {
  return (
    <div className="mt-3 space-y-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
      {data.map((d) => (
        <div key={d.label}>
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span>{d.label}</span>
            <span className="font-semibold text-slate-700">{d.value}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full" style={{ width: `${d.value}%`, background: d.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}
