export interface FileStorageSettings {
  basePath: string; endpoint: string; region: string; bucket: string;
  accessKeyEnv: string; secretKeyEnv: string; pathStyle: boolean; baseUrl: string;
}
export interface FileConfig {
  id: number; name: string; storage: number; master: number; remark: string | null;
  config: FileStorageSettings | null; valid: boolean;
}
export interface FileConfigForm {
  id?: number; name: string; storage: number; master: number; remark: string;
  config: FileStorageSettings;
}
export const emptySettings = (): FileStorageSettings => ({ basePath: "", endpoint: "", region: "", bucket: "", accessKeyEnv: "", secretKeyEnv: "", pathStyle: false, baseUrl: "" });
export const emptyForm = (): FileConfigForm => ({ name: "", storage: 0, master: 0, remark: "", config: emptySettings() });
export function editForm(record: FileConfig): FileConfigForm {
  return { id: record.id, name: record.name, storage: record.storage, master: record.master, remark: record.remark ?? "", config: { ...emptySettings(), ...record.config } };
}
/** Never submit invisible settings left over from another backend. */
export function saveBody(form: FileConfigForm) {
  const raw = form.config; const config = emptySettings();
  config.baseUrl = raw.baseUrl.trim();
  if (form.storage === 0) config.basePath = raw.basePath.trim();
  else {
    config.endpoint = raw.endpoint.trim(); config.region = raw.region.trim(); config.bucket = raw.bucket.trim();
    config.accessKeyEnv = raw.accessKeyEnv.trim(); config.secretKeyEnv = raw.secretKeyEnv.trim(); config.pathStyle = raw.pathStyle;
  }
  return { ...form, name: form.name.trim(), remark: form.remark.trim() || null, config };
}
