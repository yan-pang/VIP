# vip 协作入口

默认直接进入 `guide-agent` 总控模式工作。

## 机器入口

1. 每次进入对话后,先读取 `.claude/agents/guide-agent.md`。
2. 规范只从 `product-design-kit/` 读取。
3. 项目级默认设计规范只从 `project/ui-brand.md` 读取。
4. 项目级调研从 `project/research/` 读取;项目级研发设计从 `project/tech/` 读取。
5. **运行时状态(当前 / 下一步 / 最近动态)从 `project/TASKS.md` 读取 / 回写**;`project/overview.md` 只作项目地图;各领域决策/迭代史在 `project/domains/<domain>/decisions.md`。
6. 版本级对外交付产物写到 `project/delivery/v1.x/`,由 `/deliver` 按 `product-design-kit/design/release-prd-spec.md` 从各单一事实源组装(完整快照 + 本版变更摘要),不手动编辑。
7. 代码实现只落到 `src/`。

目录结构细节以 [README.md](README.md) 的「项目固定分层」为准,本文件不重复列出。

## 按需查阅(不整篇吞,先定位再读相关小节)

| 我要… | 读哪里 |
| --- | --- |
| 看现状 / 下一步 / 最近动态 | `project/TASKS.md`(**开局先读它**) |
| 看某领域当前设计 | `project/domains/<domain>/design.md` 顶部 `## 章节索引` → 相关小节(grep `^#` + offset/limit) |
| 查"为什么这样定 / 改过什么" | `project/domains/<domain>/decisions.md` 相关条目 |
| 看长期 PRD / 需求条目 | `project/domains/<domain>/delivery/prd.md`(按 `P-XXX`) |
| 看视觉规范 | `project/ui-brand.md` |
| 看编码 / 设计规范 | `product-design-kit/` 对应文件的相关小节 |
| 看阶段路由 | `.claude/agents/guide-agent.md` |
| 看跨领域调研 / 技术约束 | `project/research/` / `project/tech/` 相关版本 |

## 会话纪律(省 token,最高优先级)

- **一任务一会话**:一个独立任务做完就 `/clear` 再开下一件;不要在一个会话里跨领域、跨阶段连着干(上下文越滚越大 → 触发压缩 → 反复重读)。
- **收尾三步**:① verify(`npm run check` / 需要时 `npm run build`)② 回写 `project/TASKS.md`(最近动态 / 下一步),决策写入领域 `decisions.md` ③ commit(需要时 push),然后 `/clear`。
- **大检索 / 跨文件调研**交给子 agent(Task / Agent),只取结论,别把一堆文件读进主线程。
- **复杂改动**先用 Plan mode 出计划、批准再动手。
- **读大文档先看章节索引 / grep `^#`,再 offset/limit 跳读**,不整篇重读。

## 约束

1. 围绕单个领域推进,不把多个领域混成一份文档。
2. 不在 skill、规则文件或 `project/overview.md` / `project/TASKS.md` 里重复维护规范正文。
3. 不要重新引入并行的旧流程目录。
4. 业务领域的 `design.md` 只装**当前稳定产品设计**;决策 / 迭代 / 待确认写入 `decisions.md`;跨领域的调研和研发设计放项目级目录。
5. 领域 PRD 是权威源,版本 `release-prd.md` 是组装产物,不要手动同步两边。
