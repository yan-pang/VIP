# 项目级版本化交付

按迭代版本组织的冻结交付产物。本目录不维护当前需求。

## 目录结构

```
v1.x/
  chat-workbench-prd.md  客服工作台独立 PRD
  player-center-prd.md   玩家中心独立 PRD
  ops-admin-prd.md       运营管理独立 PRD
  permission-prd.md      权限管理独立 PRD
  release-prd.md         可选的跨领域完整汇编
  test-plan.md           本版集成测试范围与回归说明
```

## 职责边界

- 每个 `v1.x/` 都是不可反向维护的版本快照；当前四个领域长期 PRD 完成前不生成 V1.0 快照。
- 领域 `design.md` 是当前业务和产品设计事实源；`domains/<domain>/delivery/prd.md` 是由 Design 生成的长期业务化投影。
- 领域版本 PRD 与可选的 `release-prd.md` 从长期 PRD、Design、调研、测试和版本信息组装；业务内容修订必须先回到 Design。
- 打包完版本后建议打 git tag:`release/v1.0`,作为下一版变更识别的基线。

## 单点权威

- 当前事实源：领域 `design.md`
- 编号与历史：既有长期 PRD、Git 历史和 `decisions.md`
- 当前对外投影：领域 `delivery/prd.md`，由 Design 生成并禁止直接编辑
- 本目录：发版冻结的历史快照
- 改动规则：改 Design → 重新生成长期 PRD → 更新测试追溯 → 生成版本快照 → 打 tag
