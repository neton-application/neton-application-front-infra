"use client";
import { apiFetch } from "@neton/application-front-runtime/client";
import { useQuery } from "@neton/application-front-runtime/client-context";
import { useDescribeError } from "@neton/application-front-runtime/errors";
import { useFormat, useT } from "@neton/application-front-runtime/i18n";
import { Button, DataTable, PageHeader, type DataColumn } from "@neton/application-front-kit";
interface Stat { command: string; calls: number; usec: number }
interface Monitor { info: Record<string, string>; dbSize: number; commandStats: Stat[] }
export default function RedisMonitorPage() {
  const t = useT("infra"); const fmt = useFormat(); const describeError = useDescribeError();
  const query = useQuery({ queryKey: ["infra-redis"], queryFn: () => apiFetch<Monitor>("/admin/infra/redis/get-monitor-info"), refetchInterval: 30_000 });
  const info = query.data?.info ?? {};
  const cards = [[t("redis.card.version"), info.redis_version || "N/A"], [t("redis.card.keys"), String(query.data?.dbSize ?? 0)], [t("redis.card.clients"), info.connected_clients || "0"], [t("redis.card.memory"), info.used_memory_human || "0B"], [t("redis.card.uptimeDays"), info.uptime_in_days || "0"], [t("redis.card.mode"), info.redis_mode || "-"]];
  const columns: DataColumn<Stat>[] = [{ key: "command", header: t("redis.column.command"), cell: (row) => <code>{row.command}</code> }, { key: "calls", header: t("redis.column.calls"), cell: (row) => fmt.number(row.calls) }, { key: "usec", header: t("redis.column.usec"), cell: (row) => fmt.number(row.usec) }];
  return <div className="space-y-4"><PageHeader eyebrow={t("eyebrow.cacheHealth")} title={t("redis.title")} description={t("redis.description")} actions={<Button variant="outline" onClick={() => query.refetch()}>{t("redis.action.refresh")}</Button>} />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label, value]) => <section key={label} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"><div className="text-xs font-semibold text-[var(--muted-foreground)]">{label}</div><div className="mt-3 text-2xl font-bold">{value}</div></section>)}</div>
    <section className="front-surface overflow-hidden rounded-xl"><DataTable columns={columns} rows={query.data?.commandStats ?? []} rowKey={(row) => row.command} loading={query.isPending} error={query.error ? describeError(query.error) : null} /></section>
  </div>;
}
