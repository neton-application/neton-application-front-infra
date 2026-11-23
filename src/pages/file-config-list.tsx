"use client";
import * as React from "react";
import { apiFetch, apiWrite } from "@neton/application-front-runtime/client";
import { useMutation, usePermission, useQuery, useQueryClient } from "@neton/application-front-runtime/client-context";
import { useDescribeError } from "@neton/application-front-runtime/errors";
import { useT } from "@neton/application-front-runtime/i18n";
import type { PageResponse } from "@neton/application-front-runtime/types";
import { Button, ConfirmDialog, DataTable, Drawer, Field, FilterPanel, Input, PageHeader, Pagination, RowActions, Select, Textarea, type DataColumn } from "@neton/application-front-kit";
import { editForm, emptyForm, saveBody, type FileConfig, type FileConfigForm, type FileStorageSettings } from "./file-config-model";

const endpoint = "/admin/infra/file-config";
type Action = { type: "test" | "master" | "delete"; record: FileConfig };

export default function FileConfigPage() {
  const t = useT("infra"); const describeError = useDescribeError("infra"); const client = useQueryClient();
  const canCreate = usePermission("infra:file-config:create"); const canUpdate = usePermission("infra:file-config:update"); const canDelete = usePermission("infra:file-config:delete");
  const [page, setPage] = React.useState(1); const [pageSize, setPageSize] = React.useState(20);
  const [draftName, setDraftName] = React.useState(""); const [filterName, setFilterName] = React.useState("");
  const [form, setForm] = React.useState<FileConfigForm | null>(null);
  const [pending, setPending] = React.useState<Action | null>(null);
  const [error, setError] = React.useState<string | null>(null); const [notice, setNotice] = React.useState<string | null>(null);
  const query = useQuery({ queryKey: ["infra-file-config", page, pageSize, filterName], queryFn: () => apiFetch<PageResponse<FileConfig>>(`${endpoint}/page?pageNo=${page}&pageSize=${pageSize}&name=${encodeURIComponent(filterName)}`) });
  const edit = useMutation({ mutationFn: (id: number) => apiFetch<FileConfig>(`${endpoint}/get/${id}`), onSuccess: (record) => { setError(null); setForm(editForm(record)); }, onError: (e: Error) => setError(describeError(e)) });
  const save = useMutation({
    mutationFn: (value: FileConfigForm) => apiWrite(`${endpoint}/${value.id ? "update" : "create"}`, value.id ? "PUT" : "POST", saveBody(value)),
    onSuccess: async () => { setForm(null); setError(null); setNotice(t("fileConfig.saved")); await client.invalidateQueries({ queryKey: ["infra-file-config"] }); },
    onError: (e: Error) => setError(describeError(e)),
  });
  const action = useMutation({
    mutationFn: ({ type, record }: Action) => apiWrite(`${endpoint}/${type === "master" ? "update-master" : type}/${record.id}`, type === "test" ? "POST" : type === "delete" ? "DELETE" : "PUT"),
    onSuccess: async (_, value) => { setPending(null); setNotice(t(value.type === "test" ? "fileConfig.testPassed" : "fileConfig.saved")); await client.invalidateQueries({ queryKey: ["infra-file-config"] }); },
  });
  const busy = save.isPending || action.isPending || edit.isPending;
  const begin = (value: Action) => { action.reset(); setNotice(null); setPending(value); };
  const columns: DataColumn<FileConfig>[] = [
    { key: "name", header: t("fileConfig.field.name"), cell: (r) => r.name },
    { key: "storage", header: t("fileConfig.field.storage"), cell: (r) => t(r.storage === 0 ? "fileConfig.storage.local" : r.storage === 1 ? "fileConfig.storage.s3" : "fileConfig.unsupported") },
    { key: "master", header: t("fileConfig.field.master"), cell: (r) => t(r.master === 1 ? "fileConfig.master.yes" : "fileConfig.master.no") },
    { key: "valid", header: t("fileConfig.field.config"), cell: (r) => t(r.valid ? "fileConfig.configured" : "fileConfig.needsRepair") },
    { key: "actions", header: t("fileConfig.actions"), cell: (record) => <RowActions primary={canUpdate ? [{ label: t("fileConfig.edit"), kind: "edit", disabled: busy, onClick: () => edit.mutate(record.id) }] : []} more={[
      ...(canUpdate ? [
        { label: t("fileConfig.test"), kind: "retry" as const, disabled: busy || !record.valid, onClick: () => begin({ type: "test", record }) },
        { label: t("fileConfig.activate"), kind: "enable" as const, disabled: busy || !record.valid || record.master === 1, onClick: () => begin({ type: "master", record }) },
      ] : []),
      ...(canDelete ? [{ label: t("fileConfig.delete"), kind: "delete" as const, danger: true, disabled: busy || record.master === 1, onClick: () => begin({ type: "delete", record }) }] : []),
    ]} /> },
  ];
  function setting(key: keyof FileStorageSettings, value: string | boolean) {
    setForm((current) => current ? { ...current, config: { ...current.config, [key]: value } } : null);
  }
  function textField(key: "basePath" | "endpoint" | "region" | "bucket" | "accessKeyEnv" | "secretKeyEnv" | "baseUrl", required = true) {
    return <Field key={key} label={t(`fileConfig.field.${key}`)}><Input required={required} maxLength={1024} value={form!.config[key]} onChange={(e) => setting(key, e.target.value)} /></Field>;
  }
  return <div className="space-y-4">
    <PageHeader eyebrow={t("eyebrow.objectStorage")} title={t("fileConfig.title")} description={t("fileConfig.description")} actions={<><Button variant="outline" onClick={() => query.refetch()}>{t("fileConfig.refresh")}</Button>{canCreate && <Button disabled={busy} onClick={() => { setError(null); setNotice(null); setForm(emptyForm()); }}>{t("fileConfig.create")}</Button>}</>} />
    {notice && <p role="status">{notice}</p>}{error && !form && <p role="alert">{error}</p>}
    <FilterPanel onSubmit={(e) => { e.preventDefault(); setPage(1); setFilterName(draftName.trim()); }}><Field label={t("fileConfig.field.name")}><Input value={draftName} onChange={(e) => setDraftName(e.target.value)} /></Field><Button type="submit">{t("job.action.search")}</Button></FilterPanel>
    <DataTable columns={columns} rows={query.data?.list ?? []} rowKey={(r) => r.id} loading={query.isPending} error={query.error ? describeError(query.error) : null} />
    <Pagination page={page} pageSize={pageSize} total={query.data?.total ?? 0} loading={query.isFetching} onPageChange={setPage} onPageSizeChange={(n) => { setPage(1); setPageSize(n); }} />
    <Drawer open={Boolean(form)} onClose={() => { if (!save.isPending) setForm(null); }} title={t(form?.id ? "fileConfig.edit" : "fileConfig.create")} footer={<><Button disabled={save.isPending} variant="ghost" onClick={() => setForm(null)}>{t("fileConfig.cancel")}</Button><Button disabled={save.isPending} type="submit" form="file-config-form">{t("fileConfig.save")}</Button></>}>
      {form && <form id="file-config-form" className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!save.isPending) save.mutate(form); }}>
        {error && <p role="alert">{error}</p>}
        <p className="text-sm text-[var(--muted-foreground)]">{t("fileConfig.help")}</p>
        <Field label={t("fileConfig.field.name")}><Input required maxLength={64} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label={t("fileConfig.field.storage")}><Select value={form.storage} onChange={(e) => setForm({ ...form, storage: Number(e.target.value) })}><option value={0}>{t("fileConfig.storage.local")}</option><option value={1}>{t("fileConfig.storage.s3")}</option>{![0, 1].includes(form.storage) && <option value={form.storage}>{t("fileConfig.unsupported")}</option>}</Select></Field>
        {form.storage === 0 && textField("basePath")}
        {form.storage === 1 && <>{textField("endpoint")}{textField("region")}{textField("bucket")}{textField("accessKeyEnv")}{textField("secretKeyEnv")}<Field label={t("fileConfig.field.pathStyle")}><Select value={String(form.config.pathStyle)} onChange={(e) => setting("pathStyle", e.target.value === "true")}><option value="false">{t("fileConfig.master.no")}</option><option value="true">{t("fileConfig.master.yes")}</option></Select></Field></>}
        {textField("baseUrl", false)}
        <Field label={t("fileConfig.field.master")}><Select value={form.master} onChange={(e) => setForm({ ...form, master: Number(e.target.value) })}><option value={0}>{t("fileConfig.master.no")}</option><option value={1}>{t("fileConfig.master.yes")}</option></Select></Field>
        <Field label={t("fileConfig.field.remark")}><Textarea maxLength={255} value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} /></Field>
      </form>}
    </Drawer>
    <ConfirmDialog open={Boolean(pending)} title={t(pending?.type === "delete" ? "fileConfig.delete" : pending?.type === "master" ? "fileConfig.activate" : "fileConfig.test")} description={action.error ? describeError(action.error) : t("fileConfig.confirm")} confirmLabel={t("fileConfig.confirmAction")} pending={action.isPending} onCancel={() => { if (!action.isPending) setPending(null); }} onConfirm={() => pending && !action.isPending && action.mutate(pending)} />
  </div>;
}
