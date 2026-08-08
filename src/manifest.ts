import { defineFrontModule } from "@neton/application-front-contract";

export default defineFrontModule({
  id: "infra",
  contractVersion: "1.0.0",
  pages: [
    { key: "infra/file/index", path: "/infra/file", entry: "file-list", rendering: "client" },
    { key: "infra/fileConfig/index", path: "/infra/file-config", entry: "file-config-list", rendering: "client" },
    { key: "infra/job/index", path: "/infra/job", entry: "job-list", rendering: "client" },
    { key: "infra/job/logger/index", path: "/infra/job-log", entry: "job-log", rendering: "client", standalone: true },
    { key: "infra/apiAccessLog/index", path: "/infra/api-access-log", entry: "api-access-log", rendering: "client" },
    { key: "infra/apiErrorLog/index", path: "/infra/api-error-log", entry: "api-error-log", rendering: "client" },
    { key: "infra/redis/index", path: "/infra/redis", entry: "redis-monitor", rendering: "client" },
  ],
});
