# Chat Workbench

- 当前稳定设计：[design.md](design.md)
- 长期对外交付 PRD：[delivery/prd.md](delivery/prd.md)（由 Design 生成，禁止直接编辑）
- 决策与覆盖关系：[decisions.md](decisions.md)
- 实现入口：`src/views/workbench/`
- 跨领域出口：运营管理控制台仍位于 `/control`，完整产品设计见 [`../ops-admin/design.md`](../ops-admin/design.md)；当前代码位置不因本次文档归属调整而迁移。

业务变化先更新 `design.md`，再按 [`product-design-kit/design/external-prd.md`](../../../product-design-kit/design/external-prd.md) 重新生成长期 PRD；版本快照最后冻结到 `project/delivery/v1.x/`。
