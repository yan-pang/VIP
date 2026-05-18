# 项目总览

> 默认保存为 `project/overview.md`。

## 项目概况

- 项目名称:vip(产品代号 **ChatFlow**)
- 项目定位:VIP 私域运营客服后台(企微消息聚合 + 多号统一回复 + 运营协作)
- 技术栈:React + Vite + Ant Design + 本地 Mock
- 数据策略:本地 Mock(真实链路走阿里云 RPA + 无影云 + 企微会话存档 API)
- 当前阶段:V1 领域 breakdown
- 项目目标:v1.0 产出可交付给运营试用的客服工作台 MVP;整体路线见 [roadmap.md](roadmap.md)

## 领域清单


| 领域 | 当前阶段 | 启用版本 | 设计文档 | 长期 PRD | 备注 |
| --- | --- | --- | --- | --- | --- |
| [chat-workbench](domains/chat-workbench/) | breakdown 已完成,待 design | v1.0 | [design.md](domains/chat-workbench/design.md) | [prd.md](domains/chat-workbench/delivery/prd.md) | 客服工作台;V1 核心;design.md 前 3 章已填,共 19 条事项待进入 design 阶段后细化 |
| [player-center](domains/player-center/) | breakdown | v1.0 | [design.md](domains/player-center/design.md) | [prd.md](domains/player-center/delivery/prd.md) | 玩家中心;V1 核心 |
| [ops-admin](domains/ops-admin/) | breakdown | v1.0 | [design.md](domains/ops-admin/design.md) | [prd.md](domains/ops-admin/delivery/prd.md) | 运营管理(违禁词、企微号-云桌面绑定、初始化配置) |
| [permission](domains/permission/) | breakdown | v1.0 | [design.md](domains/permission/design.md) | [prd.md](domains/permission/delivery/prd.md) | 权限管理(客服账号、角色、企微号授权);ChatFlow 自维护 |
| automation | 未启 | v1.1+ | - | - | 智能路由、自动分配、下班自动回复 |
| knowledge | 未启 | v1.2+ | - | - | FAQ、Quick Reply、表情包 |
| monitor | 未启 | v1.3+ | - | - | 客服监控、数据看板、报表 |
| review | 未启 | v1.4+ | - | - | 评价管理、内容质检 |


## 项目级约定


| 内容类型    | 位置                          | 组织方式                             |
| ------- | --------------------------- | -------------------------------- |
| 项目级视觉规范 | `project/ui-brand.md`       | 长期稳定                             |
| 项目级调研   | `project/research/`         | 按版本命名,如 `v1.0-market-scan.md`    |
| 项目级研发设计 | `project/tech/`             | 按版本命名,如 `v1.0-architecture.md`   |
| 版本对外交付  | `project/delivery/v1.x/`    | 每版一个子目录,`release-prd.md` 由 AI 生成 |
| 规范来源    | `product-design-kit/`       | 只读                               |
| 领域资产    | `project/domains/<domain>/` | 长期 PRD 和测试用例累积                   |


## 公共能力

- 现有页面骨架:`NavigationLayout`、`TablePageLayout`
- 现有通用组件:`SearchBar`、`DataTable`、`Pagination`、`DialogWrapper`
- 现有示例页面:`/catalog`
- 待补公共能力:-

## 当前优先级


| 优先级 | 领域 / 模块 | 原因 |
| --- | --- | --- |
| P0 | chat-workbench(breakdown) | V1 主战场:消息收发、会话管理、一机多开 |
| P0 | player-center(breakdown) | V1 核心:玩家档案、企微关系、备注/标签 |
| P0 | ops-admin(breakdown) | V1 基础:违禁词、企微号-云桌面绑定、初始化 |
| P0 | permission(breakdown) | V1 基础:客服账号、角色、企微号授权(ChatFlow 自维护) |
| P1 | 外部依赖对齐 | 企微会话存档 API / 无影云 API+视频流 / SCRM 互通(见 roadmap.md) |


## 已沉淀调研与规划

| 版本 | 文件 | 主题 | 状态 |
| --- | --- | --- | --- |
| 总览 | [roadmap.md](roadmap.md) | ChatFlow 产品路线图(领域拆分、V1 条目、版本规划) | v1.0 规划已定 |
| v1.0 | [v1.0-qiwei-rpa.md](research/v1.0-qiwei-rpa.md) | 企业微信 RPA 方案调研(通信选型与风控建议) | 已提炼 |

## 当前下一步

- **chat-workbench 进入 design 阶段**:按 `product-design-kit/design/product-design.md` 在 `design.md` 的 `功能详细描述` 章节补齐领域结构、页面清单、业务流程图、共享规则、页面详设、关键交互。建议分 D1 骨架 → D2 主页面 → D3 辅助页面三步。
- 先做 chat-workbench 的 design,再按同样节奏推 `player-center` 与 `ops-admin`(当前都在 `breakdown`)。
- 把 `project/research/v1.0-qiwei-rpa.md` 的合规与风控约束(IP 一致性、频率限制、脱敏、应急预案)在 design 进展到 ops-admin 时回写到该领域。
- 跟进外部依赖对齐:企微会话存档 API 开通、无影云 API + 视频流契约、SCRM 数据互通协议。

