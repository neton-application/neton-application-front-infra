"use client";

import * as React from "react";
import { apiFetch, apiWrite } from "@neton/application-front-runtime/client";
import { useMutation, usePermission, useQuery, useQueryClient } from "@neton/application-front-runtime/client-context";
import type { PageResponse } from "@neton/application-front-runtime/types";
import {
  Button,
  ConfirmDialog,
  DataTable,
  Drawer,
  Field,
  FilterPanel,
  Input,
  PageHeader,
  Pagination,
  Select,
  Textarea,
  type DataColumn,
} from "@neton/application-front-kit";

interface ConfigItem {
  id: number;
  category?: string | null;
  configKey?: string | null;
  value?: string | null;
  type?: number | null;
  name?: string | null;
  remark?: string | null;
}

interface ConfigFormState {
  id?: number;
  category: string;
  configKey: string;
  value: string;
  type: number;
  name: string;
  remark: string;
}

const emptyConfig: ConfigFormState = { category: "", configKey: "", value: "", type: 0, name: "", remark: "" };

export default function InfraConfigListPage() {
  const queryClient = useQueryClient();
  const canCreate = usePermission("infra:config:create");
  const canUpdate = usePermission("infra:config:update");
  const canDelete = usePermission("infra:config:delete");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [draft, setDraft] = React.useState({ name: "", configKey: "", category: "", type: "" });
  const [filters, setFilters] = React.useState(draft);
  const [form, setForm] = React.useState<ConfigFormState | null>(null);
  const [deleting, setDeleting] = React.useState<ConfigItem | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const params = new URLSearchParams({ pageNo: String(page), pageSize: String(pageSize) });
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);

  const query = useQuery({
    queryKey: ["infra", "configs", page, pageSize, filters],
    queryFn: () => apiFetch<PageResponse<ConfigItem>>(`/admin/infra/config/page?${params}`),
  });

  const saveMutation = useMutation({
    mutationFn: (value: ConfigFormState) => apiWrite<void>(
      value.id ? "/admin/infra/config/update" : "/admin/infra/config/create",
      value.id ? "PUT" : "POST",
      { ...value, remark: value.remark || null },
    ),
    onSuccess: async () => {
      setForm(null);
      await queryClient.invalidateQueries({ queryKey: ["infra", "configs"] });
    },
    onError: (error: Error) => setFormError(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (item: ConfigItem) => apiWrite<void>(`/admin/infra/config/delete/${item.id}`, "DELETE"),
    onSuccess: async () => {
      setDeleting(null);
      await queryClient.invalidateQueries({ queryKey: ["infra", "configs"] });
    },
  });

  const columns: DataColumn<ConfigItem>[] = [
    { key: "id", header: "ID", cell: (item) => <span className="font-mono text-xs">{item.id}</span> },
    { key: "category", header: "分类", cell: (item) => item.category || "-" },
    { key: "name", header: "参数名称", cell: (item) => <span className="font-semibold text-[var(--foreground)]">{item.name || "-"}</span> },
    { key: "configKey", header: "参数键", cell: (item) => <code className="rounded bg-[var(--muted)] px-2 py-1 text-xs text-[var(--primary)]">{item.configKey || "-"}</code> },
    { key: "value", header: "参数值", cell: (item) => <span className="block max-w-72 truncate" title={item.value ?? ""}>{item.value || "-"}</span> },
    { key: "type", header: "来源", cell: (item) => <span className="rounded-full bg-[var(--muted)] px-2.5 py-1 text-xs font-bold text-[var(--muted-foreground)]">{item.type === 1 ? "系统内置" : "业务配置"}</span> },
    { key: "remark", header: "备注", cell: (item) => item.remark || "-" },
    {
      key: "actions",
      header: "操作",
      headerClassName: "text-right",
      className: "text-right",
      cell: (item) => <div className="flex justify-end gap-1">
        {canUpdate && <Button size="sm" variant="ghost" onClick={() => { setFormError(null); setForm({ id: item.id, category: item.category ?? "", configKey: item.configKey ?? "", value: item.value ?? "", type: item.type ?? 0, name: item.name ?? "", remark: item.remark ?? "" }); }}>编辑</Button>}
        {canDelete && item.type !== 1 && <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setDeleting(item)}>删除</Button>}
      </div>,
    },
  ];

  function submitFilters(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
    setFilters(Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim()])) as typeof draft);
  }

  function submitConfig(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    if (!form.category.trim() || !form.name.trim() || !form.configKey.trim() || !form.value.trim()) {
      setFormError("分类、名称、参数键和参数值均不能为空");
      return;
    }
    setFormError(null);
    saveMutation.mutate({ ...form, category: form.category.trim(), name: form.name.trim(), configKey: form.configKey.trim(), value: form.value.trim(), remark: form.remark.trim() });
  }

  return (
    <div className="space-y-4">
      <PageHeader eyebrow="RUNTIME CONFIGURATION" title="配置管理" description="维护应用运行参数。系统内置配置默认禁止在界面中删除。" actions={<>{canCreate && <Button onClick={() => { setFormError(null); setForm({ ...emptyConfig }); }}>新增配置</Button>}<Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>刷新</Button></>} />
      <FilterPanel onSubmit={submitFilters}>
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_160px_auto] lg:items-end">
          <Field label="参数名称"><Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="输入名称" /></Field>
          <Field label="参数键"><Input value={draft.configKey} onChange={(event) => setDraft({ ...draft, configKey: event.target.value })} placeholder="例如 app.feature.enabled" /></Field>
          <Field label="分类"><Input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="输入分类" /></Field>
          <Field label="来源"><Select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}><option value="">全部</option><option value="0">业务配置</option><option value="1">系统内置</option></Select></Field>
          <div className="flex gap-2"><Button type="button" variant="ghost" onClick={() => { const next = { name: "", configKey: "", category: "", type: "" }; setDraft(next); setFilters(next); setPage(1); }}>重置</Button><Button type="submit">查询</Button></div>
        </div>
      </FilterPanel>
      <section className="front-surface overflow-hidden rounded-xl">
        <DataTable columns={columns} rows={query.data?.list ?? []} rowKey={(item) => item.id} loading={query.isPending} error={query.error?.message} minWidth={1150} emptyTitle="暂无配置" emptyDescription="可以创建第一条运行参数" />
        <Pagination page={page} pageSize={pageSize} total={query.data?.total ?? 0} loading={query.isFetching} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />
      </section>

      <Drawer open={Boolean(form)} onClose={() => setForm(null)} title={form?.id ? "编辑配置" : "新增配置"} footer={<><Button variant="ghost" onClick={() => setForm(null)}>取消</Button><Button type="submit" form="config-form" disabled={saveMutation.isPending}>{saveMutation.isPending ? "保存中…" : "保存配置"}</Button></>}>
        {form && <form id="config-form" onSubmit={submitConfig} className="space-y-4">
          {formError && <div className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{formError}</div>}
          <Field label="参数分类"><Input value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="例如 system" /></Field>
          <Field label="参数名称"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
          <Field label="参数键"><Input value={form.configKey} onChange={(event) => setForm({ ...form, configKey: event.target.value })} placeholder="app.feature.enabled" /></Field>
          <Field label="参数值"><Textarea value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} className="min-h-32 font-mono" /></Field>
          <Field label="来源类型"><Select value={form.type} onChange={(event) => setForm({ ...form, type: Number(event.target.value) })}><option value="0">业务配置</option><option value="1">系统内置</option></Select></Field>
          <Field label="备注"><Textarea value={form.remark} onChange={(event) => setForm({ ...form, remark: event.target.value })} /></Field>
        </form>}
      </Drawer>
      <ConfirmDialog open={Boolean(deleting)} title="删除配置" description={`确定删除“${deleting?.name ?? deleting?.configKey ?? ""}”吗？依赖该参数的功能可能立即受到影响。`} confirmLabel="确认删除" pending={deleteMutation.isPending} onCancel={() => setDeleting(null)} onConfirm={() => deleting && deleteMutation.mutate(deleting)} />
    </div>
  );
}
