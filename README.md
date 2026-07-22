# ChatFlow

ChatFlow 是面向游戏 VIP 私域运营的客服后台原型，聚合多个企业微信账号的玩家会话，并提供玩家档案、客服协作、云电脑/RPA 运维、风控和权限管理。

## 当前实现

- React 18、Vite、Ant Design、TypeScript。
- 本地 Mock 覆盖 `/workbench`、`/control`、`/players`、`/messages`、`/ops-admin/*` 和 `/permission/agents`。
- 真实链路预期接入企业微信会话存档 API、阿里云 RPA/无影云、飞书身份和项目数据服务。
- 当前 Mock 已实现硬性风控校验、RPA 待发队列、可逆账号禁用、多 `corpId` 身份键、服务层权限校验与乐观锁示例。

## 本地运行

```bash
npm install
npm run dev
```

默认开发服务监听 `127.0.0.1:1219`。构建单文件演示版：

```bash
npm run build:single
```

## 质量检查

```bash
npm test
npm run check
npm audit
```

`npm run check` 会依次执行 ESLint、Vitest 和生产构建。CI 使用相同入口。

## 文档入口与权威顺序

1. [project/TASKS.md](project/TASKS.md)：当前状态和下一步。
2. [project/overview.md](project/overview.md)：项目地图与领域入口。
3. `project/domains/<domain>/design.md`：当前稳定设计。
4. `project/domains/<domain>/decisions.md`：追加式决策记录；若与设计冲突，以更新日期更晚且明确标注“覆盖”的决定为准。
5. [project/roadmap.md](project/roadmap.md)：版本范围与唯一条目统计。

已退役的领域 `delivery/prd.md` 和手工测试文档不再作为当前事实源；交付版本需要时，从稳定设计、决策记录和自动化测试结果组装到 `project/delivery/v1.x/`。

## 目录

```text
project/                 项目状态、路线图、调研与领域设计
project/domains/         chat-workbench / player-center / ops-admin / permission
src/                     前端与本地 Mock 实现
src/services/*.test.ts   自动化契约测试
scripts/new-domain.mjs   领域目录脚手架
product-design-kit/      通用设计规范库
```

新建领域：

```bash
npm run new:domain -- <domain-name>
```

脚手架会同时创建 `design.md`、`decisions.md` 和领域 README；是否生成交付目录由 `--delivery` 控制。
