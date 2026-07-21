"use client";
import { apiFetch } from "@neton/application-front-runtime/client";
import { useQuery } from "@neton/application-front-runtime/client-context";
import { Button, DataTable, PageHeader, type DataColumn } from "@neton/application-front-kit";
interface Stat { command: string; calls: number; usec: number }
interface Monitor { info: Record<string, string>; dbSize: number; commandStats: Stat[] }
export default function RedisMonitorPage() {
  const query = useQuery({ queryKey: ["infra-redis"], queryFn: () => apiFetch<Monitor>("/admin/infra/redis/get-monitor-info"), refetchInterval: 30_000 });
  const info = query.data?.info ?? {};
  const cards = [["Redis 版本", info.redis_version || "N/A"], ["键数量", String(query.data?.dbSize ?? 0)], ["在线客户端", info.connected_clients || "0"], ["内存占用", info.used_memory_human || "0B"], ["运行天数", info.uptime_in_days || "0"], ["运行模式", info.redis_mode || "-"]];
  const columns: DataColumn<Stat>[] = [{ key: "command", header: "命令", cell: (row) => <code>{row.command}</code> }, { key: "calls", header: "调用次数", cell: (row) => row.calls.toLocaleString() }, { key: "usec", header: "总耗时(μs)", cell: (row) => row.usec.toLocaleString() }];
  return <div className="space-y-4"><PageHeader eyebrow="CACHE HEALTH" title="Redis 监控" description="30 秒自动刷新关键健康指标与命令统计，不提供危险的在线命令执行入口。" actions={<Button variant="outline" onClick={() => query.refetch()}>立即刷新</Button>} />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label, value]) => <section key={label} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"><div className="text-xs font-semibold text-[var(--muted-foreground)]">{label}</div><div className="mt-3 text-2xl font-bold">{value}</div></section>)}</div>
    <section className="front-surface overflow-hidden rounded-xl"><DataTable columns={columns} rows={query.data?.commandStats ?? []} rowKey={(row) => row.command} loading={query.isPending} error={query.error?.message} /></section>
  </div>;
}
