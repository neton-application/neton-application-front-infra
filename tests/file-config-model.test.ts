import { test } from "node:test";
import assert from "node:assert/strict";
import { editForm, emptyForm, saveBody } from "../src/pages/file-config-model.ts";
import zh from "../src/locales/zh-CN.ts";
import en from "../src/locales/en-US.ts";

test("local save removes invisible S3 settings and normalizes input", () => {
  const form = emptyForm(); form.name = " photos "; form.config.basePath = " photos "; form.config.secretKeyEnv = "NETON_STORAGE_SECRET";
  const body = saveBody(form);
  assert.equal(body.name, "photos"); assert.equal(body.config.basePath, "photos"); assert.equal(body.config.secretKeyEnv, ""); assert.equal(body.remark, null);
});
test("S3 edit keeps typed settings and never modifies cached server state", () => {
  const form = emptyForm(); form.storage = 1; form.config.bucket = "media"; form.config.basePath = "old-local";
  const record = { ...form, id: 1, master: 1, valid: true };
  const editing = editForm(record); editing.config.bucket = "new";
  assert.equal("master" in saveBody(editing), false);
  assert.equal(record.config.bucket, "media"); assert.equal(saveBody(editing).config.basePath, ""); assert.equal(saveBody(editing).config.bucket, "new");
});
test("invalid legacy records can be repaired without exposing raw config", () => {
  const editing = editForm({ id: 1, name: "legacy", storage: 0, master: 0, remark: null, config: null, valid: false });
  assert.equal(editing.config.basePath, ""); assert.equal(editing.id, 1);
});
test("module languages declare identical keys and storage errors", () => {
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort());
  for (const key of ["fileConfig.field.endpoint", "fileConfig.help", "error.FILE_CONFIG_IN_USE", "error.FILE_STORAGE_TEST_FAILED"]) assert.ok(zh[key] && en[key]);
});
