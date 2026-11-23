import React from "react";
import { createRoot } from "react-dom/client";
import { FrontClientProvider } from "@neton/application-front-runtime/client-context";
import { I18nProvider } from "@neton/application-front-runtime/i18n";
import FileConfigPage from "../src/pages/file-config-list";
import zh from "../src/locales/zh-CN";
import en from "../src/locales/en-US";

const params = new URLSearchParams(location.search);
const language = params.get("lang") === "en" ? "en-US" : "zh-CN";
createRoot(document.getElementById("root")!).render(
  <I18nProvider config={{ locales: ["zh-CN", "en-US"], defaultLocale: language }} userLocale={language} catalogs={{ infra: { "zh-CN": zh, "en-US": en } }}>
    <FrontClientProvider user={{ id: 1, nickname: "fixture" } as never} menus={[]} roles={[]} permissions={params.has("readonly") ? ["infra:file-config:query"] : ["infra:file-config:query", "infra:file-config:create", "infra:file-config:update", "infra:file-config:delete"]}>
      <FileConfigPage />
    </FrontClientProvider>
  </I18nProvider>,
);
