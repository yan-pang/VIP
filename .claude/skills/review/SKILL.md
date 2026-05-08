---
name: review
description: 用于评审领域文档、代码实现或模板本身的结构质量。
argument-hint: [scope]
---

# /review

1. 优先输出评审发现,而不是摘要。
2. 检查是否存在术语不一致、失效引用、阶段缺口、规则缺口、实现偏差、交付覆盖不足,以及"需要进入交付物的参考点仍停留在 `project/research/` 或 `project/tech/`"的问题。
3. 项目级评审时,优先检查 `project/overview.md`、`project/ui-brand.md` 是否与领域文档、代码入口、共享能力、项目级调研 / 研发设计 / 版本交付目录一致。
4. 文档评审时,优先检查:
   - `design.md` 是否仍保留"先设计初始化、再补功能详细描述"的主线
   - `design.md` 是否错误地重复维护了 `project/ui-brand.md` 中已经稳定的项目级设计规范
   - 是否把原始材料直接大段塞进了 `design.md`;跨领域调研应在 `project/research/`,项目级研发设计应在 `project/tech/`
   - 业务领域下是否错误地保留了 `research.md` 或 `tech/`(新规则下这两个应在项目级目录)
   - 领域 `delivery/prd.md` 是否正确使用稳定编号,作为版本 `release-prd` 的组装源
   - `project/delivery/v1.x/release-prd.md` 是否被手动编辑(应当是 `/deliver` 生成产物)
   - `project/delivery/` 最新版本是否与当前领域 PRD 保持一致(漂移要修)
   - 新增材料出现后,是否错误地把仅交付参考的问题当成 `design` / `build` 阻塞,或反过来漏掉了该走 `breakdown` 的整理
5. 代码评审时,指出具体文件和具体行为,并尽量关联到 `design.md` 或 `project/ui-brand.md`。
6. 模板评审时,确认 `README.md`、`.claude/agents/guide-agent.md`、`project/ui-brand.md`、`project/overview.md`、`project/research/README.md`、`project/tech/README.md`、`project/delivery/README.md`、`product-design-kit/design/design-init.md`、`product-design-kit/design/product-design.md`、`product-design-kit/design/external-prd.md`、`product-design-kit/design/test-strategy.md`、`product-design-kit/design/test-cases.md` 和 `.claude/skills/` 是否仍然只指向同一套事实来源。
7. 如果没有发现,明确写出"未发现问题",并补充残余风险或尚未验证项。
