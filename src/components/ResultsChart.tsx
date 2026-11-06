import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
export default function ResultsChart({
  data,
}: {
  data: { name: string; count: number; percentage: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 50)}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 24 }}>
        <XAxis type="number" allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={140}
          tick={{ fontSize: 12 }}
        />
        <Tooltip />
        <Bar dataKey="count" fill="#315c4d" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
