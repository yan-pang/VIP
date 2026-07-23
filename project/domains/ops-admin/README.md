# Ops Admin

- 当前稳定设计：[design.md](design.md)
- 长期对外交付 PRD：待从当前 Design 生成
- 决策与覆盖关系：[decisions.md](decisions.md)
- 实现入口：`src/views/ops-admin/`、`src/services/opsAdminMock.ts`
- 控制台归属：`/control` 的投屏、人工接管、登录 / 退出与重启完整归本领域；当前页面代码仍在 `src/views/control/`，本次不迁移实现。

业务变化先更新 `design.md`；长期 PRD 完成后再生成版本快照。
