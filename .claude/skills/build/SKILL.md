---
name: build
description: 当 design.md 已经足够稳定,可以开始改 starter 代码时使用。
argument-hint: <domain>
---

# /build

1. 先阅读 `project/ui-brand.md` 和 `project/domains/<domain>/design.md`。
2. 再阅读 `product-design-kit/coding/react-list-page.md`、`product-design-kit/coding/react-tabs-page.md` 和 `product-design-kit/coding/consistency.md`。
3. `project/tech/` 默认不是本阶段必读输入;只有用户明确说明某份项目级技术设计会改变 demo 页面、交互或 Mock 行为时,才先同步到 `design.md` 或据此调整实现。
4. 如果当前消息带来了新的研发约束、需求补充或会议结论,先判断它是否会改变 demo 页面、交互或 Mock 行为;如果会,先更新 `design.md` 或回到 `design` 阶段;如果只影响交付 / 测试口径,按需更新领域 `delivery/prd.md` 或 `project/research/`,不阻塞实现。
5. 如果 `design.md` 的 `功能详细描述` 仍缺关键决策,先回到 `design` 阶段,不勉强进入实现。
6. 实现时优先更新 `src/views/`、`src/router/`、`src/services/`,并按需更新 `src/components/`、`src/styles/`。页面默认继承 `project/ui-brand.md`,不要在代码里临时发明新的项目级视觉规范。
7. 如果领域引入了新的共享能力或代码入口,同步更新 `project/overview.md`。
8. 改动完成后运行 `npm run check`。
