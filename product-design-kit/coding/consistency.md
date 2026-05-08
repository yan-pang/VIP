# 文档与代码一致性规则

这份规则只回答一个问题：如何避免设计文档、交付物和页面实现越做越不一致。

## 一致性原则

1. 领域名称、模块名称和关键术语在 `project/overview.md`、`design.md` 和代码里保持一致。
2. 项目级视觉规范只维护在 `project/ui-brand.md`；`design.md` 只写领域特有设计和项目默认规则的例外说明。
3. 需求 / 规则编号一旦进入 `project/domains/<domain>/delivery/prd.md`，后续测试策略和测试用例都沿用同一套编号；如果某条编号也出现在 `design.md`，两边保持一致。
4. 如果页面结构或关键流程改了，先更新 `project/domains/<domain>/design.md`，再改代码。
5. 如果新增共享组件、共享规则或公共约定，必须同步 `project/overview.md`。
6. 交付文档以 `design.md`、`project/research/` 和 `project/tech/` 中已经确认的内容为参考整理,不允许相互矛盾。

## 命名建议

- 领域目录:`project/domains/<domain-slug>/`
- 项目级设计规范:`project/ui-brand.md`
- 项目级调研目录:`project/research/`
- 项目级研发设计目录:`project/tech/`
- 版本级对外交付目录:`project/delivery/v1.x/`
- 领域长期交付目录:`project/domains/<domain-slug>/delivery/`
- 页面、路由、Mock 和设计文档中的术语保持同一中文叫法

## 修改顺序

1. 先确认 `project/ui-brand.md`
2. 再确认 `design.md`
3. 再改 `src/`
4. 需要对外交付时，最后补 `project/domains/<domain>/delivery/`

## 审查重点

- 页面是否默认继承了 `project/ui-brand.md` 中的项目级设计规范
- 页面是否实现了 `design.md` 中的关键流程和规则
- 文案是否与设计和交付物一致
- 项目总览是否同步了阶段状态和共享能力
- 交付文档是否仍然能回溯到领域设计、交付参考和技术设计约束
