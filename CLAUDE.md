# VIP Starter 协作入口

默认直接进入 `guide-agent` 总控模式工作。

## 机器入口

1. 每次进入对话后,先读取 `.claude/agents/guide-agent.md`。
2. 规范只从 `product-design-kit/` 读取。
3. 项目级默认设计规范只从 `project/ui-brand.md` 读取。
4. 项目级调研从 `project/research/` 读取;项目级研发设计从 `project/tech/` 读取。
5. 项目状态从 `project/overview.md` 和 `project/domains/<domain>/` 读取 / 回写。
6. 版本级对外交付产物写到 `project/delivery/v1.x/`,由 `/deliver` 从领域 PRD 组装,不手动编辑。
7. 代码实现只落到 `src/`。

目录结构细节以 [README.md](README.md) 的「项目固定分层」为准,本文件不重复列出。

## 约束

1. 围绕单个领域推进,不把多个领域混成一份文档。
2. 不在 skill、规则文件或 `project/overview.md` 里重复维护规范正文。
3. 不要重新引入并行的旧流程目录。
4. 业务领域的 `design.md` 只装产品设计;跨领域的调研和研发设计放项目级目录。
5. 领域 PRD 是权威源,版本 `release-prd.md` 是组装产物,不要手动同步两边。
