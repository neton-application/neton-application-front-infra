"use client";
import * as React from "react";
import { ApiError, apiFetch, apiWrite } from "@neton/application-front-runtime/client";
import { useMutation, usePermission, useQuery, useQueryClient } from "@neton/application-front-runtime/client-context";
import { useDescribeError } from "@neton/application-front-runtime/errors";
import { useT } from "@neton/application-front-runtime/i18n";
import type { PageResponse } from "@neton/application-front-runtime/types";
import { Button, ConfirmDialog, DataTable, Drawer, Field, FilterPanel, Input, PageHeader, Pagination, RowActions, Select, StatusBadge, Textarea, type DataColumn } from "@neton/application-front-kit";
import { editForm, emptyForm, saveBody, storageProvider, type FileConfig, type FileConfigForm, type FileStorageSettings } from "./file-config-model";

const endpoint = "/admin/infra/file-config";
type Action = { type: "test" | "master" | "enable" | "disable"; record: FileConfig };
const emptyFilters = { name: "", storage: "", status: "" };
const actionCopy = {
  test: { title: "test", description: "confirmTest" },
  master: { title: "activate", description: "confirm" },
  enable: { title: "enable", description: "confirmEnable" },
  disable: { title: "disable", description: "confirmDisable" },
};

export default function FileConfigPage() {
  const t = useT("infra"); const describeError = useDescribeError("infra"); const client = useQueryClient();
  const canCreate = usePermission("infra:file-config:create"); const canUpdate = usePermission("infra:file-config:update");
  const [page, setPage] = React.useState(1); const [pageSize, setPageSize] = React.useState(20);
  const [draft, setDraft] = React.useState(emptyFilters);
  const [filters, setFilters] = React.useState(emptyFilters);
  const params = new URLSearchParams({ pageNo: String(page), pageSize: String(pageSize) });
  Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
  const [form, setForm] = React.useState<FileConfigForm | null>(null);
  const [testResult, setTestResult] = React.useState<{ name: string; activated: boolean } | null>(null);
  const testDialog = React.useRef<HTMLDialogElement>(null);
  const testTitleId = React.useId();
  const testDescriptionId = React.useId();
  React.useEffect(() => {
    if (testResult && !testDialog.current?.open) testDialog.current?.showModal();
  }, [testResult]);
  const [pending, setPending] = React.useState<Action | null>(null);
  const [error, setError] = React.useState<string | null>(null); const [notice, setNotice] = React.useState<string | null>(null);
  const query = useQuery({ queryKey: ["infra-file-config", page, pageSize, filters], queryFn: () => apiFetch<PageResponse<FileConfig>>(`${endpoint}/page?${params}`) });
  const edit = useMutation({ mutationFn: (id: number) => apiFetch<FileConfig>(`${endpoint}/get/${id}`), onSuccess: (record) => { setError(null); setForm(editForm(record)); }, onError: (e: Error) => setError(describeError(e)) });
  const save = useMutation({
    mutationFn: (value: FileConfigForm) => apiWrite(`${endpoint}/${value.id ? "update" : "create"}`, value.id ? "PUT" : "POST", saveBody(value)),
    onSuccess: async () => { setForm(null); setError(null); setNotice(t("fileConfig.draftSaved")); await client.invalidateQueries({ queryKey: ["infra-file-config"] }); },
    onError: (e: Error) => setError(describeError(e)),
  });
  const action = useMutation({
    mutationFn: ({ type, record }: Action) => {
      if (type === "test") return apiWrite(`${endpoint}/test/${record.id}`, "POST");
      if (type === "master") return apiWrite(`${endpoint}/update-master/${record.id}`, "PUT");
      return apiWrite(`${endpoint}/update-status/${record.id}?status=${type === "enable" ? 1 : 0}`, "PUT");
    },
    onSuccess: async (_, value) => {
      setPending(null);
      if (value.type === "test" || value.type === "master") {
        setTestResult({ name: value.record.name, activated: value.type === "master" });
      } else {
        setNotice(t(value.type === "enable" ? "fileConfig.enabledNotice" : "fileConfig.disabledNotice"));
      }
      await client.invalidateQueries({ queryKey: ["infra-file-config"] });
    },
    onError: async (_, value) => {
      if (value.type === "test" || value.type === "master") await client.invalidateQueries({ queryKey: ["infra-file-config"] });
    },
  });
  function actionError(cause: unknown, current: Action | null): string {
    const code = cause instanceof ApiError ? cause.machineCode : undefined;
    const denied = code && /^FILE_STORAGE_(WRITE|READ|DELETE)_DENIED$/.exec(code);
    if (denied && (current?.type === "test" || current?.type === "master")) {
      const operation = denied[1].toLowerCase();
      const provider = storageProvider(current.record);
      return t(provider === "local" ? "fileConfig.localDenied" : "fileConfig.remoteDenied", {
        source: t(`fileConfig.source.${provider}`),
        operation: t(`fileConfig.operation.${operation}`),
        permission: operation === "write" ? "PutObject" : operation === "read" ? "GetObject" : "DeleteObject",
        code,
      });
    }
    const description = describeError(cause);
    if (!code) return t("fileConfig.requestError", { description });
    if (description === code) return t("fileConfig.requestCode", { code });
    return t("fileConfig.requestErrorWithCode", { description, code });
  }

  const busy = save.isPending || action.isPending || edit.isPending;
  const begin = (value: Action) => { action.reset(); setNotice(null); setPending(value); };
  const columns: DataColumn<FileConfig>[] = [
    { key: "name", header: t("fileConfig.field.name"), cell: (r) => <strong>{r.name}</strong> },
    { key: "storage", header: t("fileConfig.field.storage"), cell: (r) => t(r.storage === 0 ? "fileConfig.storage.local" : r.storage === 1 ? "fileConfig.storage.s3" : "fileConfig.unsupported") },
    { key: "master", header: t("fileConfig.field.master"), cell: (r) => t(r.master === 1 ? "fileConfig.master.yes" : "fileConfig.master.no") },
    { key: "status", header: t("field.status"), cell: (row) => (
      <StatusBadge active={row.status !== 0}>{t(row.status === 0 ? "fileConfig.status.disabled" : "job.status.enabled")}</StatusBadge>
    ) },
    { key: "valid", header: t("fileConfig.field.config"), cell: (row) => {
      if (!row.valid) return t("fileConfig.needsRepair");
      if (row.testPassed == null) return t("fileConfig.untested");
      return <StatusBadge active={row.testPassed}>{t(row.testPassed ? "fileConfig.passed" : "fileConfig.failed")}</StatusBadge>;
    } },
    { key: "actions", header: t("fileConfig.actions"), headerClassName: "text-right", className: "text-right", cell: (record) => <RowActions primary={canUpdate ? [
      { label: t("fileConfig.edit"), kind: "edit", disabled: busy, onClick: () => edit.mutate(record.id) },
      { label: t("fileConfig.test"), kind: "retry", disabled: busy || !record.valid, onClick: () => begin({ type: "test", record }) },
    ] : []} more={[
      ...(canUpdate ? [
        { label: t("fileConfig.activate"), kind: "enable" as const, disabled: busy || !record.valid || record.master === 1 || record.status === 0, onClick: () => begin({ type: "master", record }) },
        {
          label: t(record.master === 1 ? "fileConfig.switchBeforeDisable" : record.status === 0 ? "fileConfig.enable" : "fileConfig.disable"),
          kind: record.status === 0 ? "enable" as const : "disable" as const,
          disabled: busy || record.master === 1,
          onClick: () => begin({ type: record.status === 0 ? "enable" : "disable", record }),
        },
      ] : []),
    ]} /> },
  ];
  function setting(key: keyof FileStorageSettings, value: string | boolean) {
    setForm((current) => current ? { ...current, config: { ...current.config, [key]: value } } : null);
  }
  function textField(key: "basePath" | "endpoint" | "region" | "bucket" | "accessKeyEnv" | "secretKeyEnv" | "baseUrl", required = true) {
    return <Field key={key} label={t(`fileConfig.field.${key}`)}><Input required={required} maxLength={1024} value={form!.config[key]} onChange={(e) => setting(key, e.target.value)} /></Field>;
  }
  const currentCopy = pending ? actionCopy[pending.type] : actionCopy.test;
  return <div className="space-y-4">
    <PageHeader eyebrow={t("eyebrow.objectStorage")} title={t("fileConfig.title")} description={t("fileConfig.description")} actions={<>
      {canCreate && <Button disabled={busy} onClick={() => { setError(null); setNotice(null); setForm(emptyForm()); }}>{t("fileConfig.create")}</Button>}
      <Button variant="outline" onClick={() => query.refetch()}>{t("fileConfig.refresh")}</Button>
    </>} />
    {notice && <p role="status">{notice}</p>}{error && !form && <p role="alert">{error}</p>}
    <FilterPanel onSubmit={(event) => {
      event.preventDefault();
      setPage(1);
      setFilters({ ...draft, name: draft.name.trim() });
    }}>
      <div className="admin-filter-grid">
        <Field label={t("fileConfig.field.name")}><Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field>
        <Field label={t("fileConfig.field.storage")}><Select value={draft.storage} onChange={(event) => setDraft({ ...draft, storage: event.target.value })}>
          <option value="">{t("job.status.all")}</option><option value="0">{t("fileConfig.storage.local")}</option><option value="1">{t("fileConfig.storage.s3")}</option>
        </Select></Field>
        <Field label={t("field.status")}><Select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
          <option value="">{t("job.status.all")}</option><option value="1">{t("job.status.enabled")}</option><option value="0">{t("fileConfig.status.disabled")}</option>
        </Select></Field>
        <div className="flex items-end gap-2">
          <Button type="button" variant="ghost" onClick={() => { setDraft(emptyFilters); setFilters(emptyFilters); setPage(1); }}>{t("job.action.reset")}</Button>
          <Button type="submit">{t("job.action.search")}</Button>
        </div>
      </div>
    </FilterPanel>
    <section className="front-surface overflow-hidden rounded-xl">
      <DataTable columns={columns} rows={query.data?.list ?? []} rowKey={(r) => r.id} loading={query.isPending} error={query.error ? describeError(query.error) : null} />
      <Pagination page={page} pageSize={pageSize} total={query.data?.total ?? 0} loading={query.isFetching} onPageChange={setPage} onPageSizeChange={(n) => { setPage(1); setPageSize(n); }} />
    </section>
    <Drawer open={Boolean(form)} onClose={() => { if (!save.isPending) setForm(null); }} title={t(form?.id ? "fileConfig.edit" : "fileConfig.create")} footer={<>{error && form && <p role="alert" className="mr-auto text-sm text-red-600 dark:text-red-400">{error}</p>}<Button disabled={save.isPending} variant="ghost" onClick={() => setForm(null)}>{t("fileConfig.cancel")}</Button><Button disabled={save.isPending} type="submit" form="file-config-form">{t("fileConfig.save")}</Button></>}>
      {form && <form id="file-config-form" className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!save.isPending) save.mutate(form); }}>
        <p className="text-sm text-[var(--muted-foreground)]">{t("fileConfig.help")}</p>
        <Field label={t("fileConfig.field.name")}><Input required maxLength={64} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label={t("fileConfig.field.storage")}><Select value={form.storage} onChange={(e) => setForm({ ...form, storage: Number(e.target.value) })}><option value={0}>{t("fileConfig.storage.local")}</option><option value={1}>{t("fileConfig.storage.s3")}</option>{![0, 1].includes(form.storage) && <option value={form.storage}>{t("fileConfig.unsupported")}</option>}</Select></Field>
        {form.storage === 0 && textField("basePath")}
        {form.storage === 1 && <>{textField("endpoint")}{textField("region")}{textField("bucket")}{textField("accessKeyEnv")}{textField("secretKeyEnv")}<Field label={t("fileConfig.field.pathStyle")}><Select value={String(form.config.pathStyle)} onChange={(e) => setting("pathStyle", e.target.value === "true")}><option value="false">{t("fileConfig.master.no")}</option><option value="true">{t("fileConfig.master.yes")}</option></Select></Field></>}
        {textField("baseUrl", false)}
        <Field label={t("fileConfig.field.remark")}><Textarea maxLength={255} value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></Field>
      </form>}
    </Drawer>
    <dialog ref={testDialog} onClose={() => setTestResult(null)} aria-labelledby={testTitleId} aria-describedby={testDescriptionId}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 text-[var(--foreground)] shadow-xl backdrop:bg-black/40">
      <h2 id={testTitleId} className="text-lg font-bold">{t("fileConfig.passed")}</h2>
      <p id={testDescriptionId} className="mt-2 text-sm text-[var(--muted-foreground)]">
        {testResult && t(testResult.activated ? "fileConfig.testPassedAndActivated" : "fileConfig.testPassedFor", { name: testResult.name })}
      </p>
      <form method="dialog" className="mt-6 flex justify-end">
        <Button type="submit" autoFocus>{t("fileConfig.confirmAction")}</Button>
      </form>
    </dialog>
    <ConfirmDialog open={Boolean(pending)} title={t(`fileConfig.${currentCopy.title}`)}
      description={action.error ? actionError(action.error, pending) : t(`fileConfig.${currentCopy.description}`)}
      confirmLabel={t("fileConfig.confirmAction")} pending={action.isPending}
      onCancel={() => { if (!action.isPending) setPending(null); }}
      onConfirm={() => pending && !action.isPending && action.mutate(pending)} />
  </div>;
}
