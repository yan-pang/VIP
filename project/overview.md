# 项目总览

> 默认保存为 `project/overview.md`。**小而稳的项目地图**;当前状态/最近动态/下一步见 [TASKS.md](TASKS.md),各领域决策史见 `domains/<domain>/decisions.md`。

## 项目概况

- 项目名称:vip(产品代号 **ChatFlow**)
- 项目定位:VIP 私域运营客服后台(企微消息聚合 + 多号统一回复 + 运营协作)
- 技术栈:React + Vite + Ant Design + 本地 Mock
- 数据策略:本地 Mock(真实链路走阿里云 RPA + 无影云 + 企微会话存档 API)
- 项目目标:v1.0 产出可交付给运营试用的客服工作台 MVP;整体路线见 [roadmap.md](roadmap.md)

## 领域清单

> 各领域**当前阶段**见 [TASKS.md](TASKS.md) 的领域状态清单;迭代/决策史见各领域 `decisions.md`。

| 领域 | 启用版本 | 设计文档 | 当前交付物 | 定位 |
| --- | --- | --- | --- | --- |
| [chat-workbench](domains/chat-workbench/) | v1.0 | [design.md](domains/chat-workbench/design.md) · [decisions.md](domains/chat-workbench/decisions.md) | 本阶段暂不产出 | 客服工作台;V1 核心;代码在 `src/views/workbench` + `src/views/control` |
| [player-center](domains/player-center/) | v1.0 | [design.md](domains/player-center/design.md) · [decisions.md](domains/player-center/decisions.md) | 本阶段暂不产出 | 玩家中心;`/players` `/players/:id` `/messages` + Drawer + 工作台 slot |
| [ops-admin](domains/ops-admin/) | v1.0 | [design.md](domains/ops-admin/design.md) · [decisions.md](domains/ops-admin/decisions.md) | 本阶段暂不产出 | 运营管理(企微号与资源绑定、RPA 运行、违禁词、风控与审计) |
| [permission](domains/permission/) | v1.0 | [design.md](domains/permission/design.md) · [decisions.md](domains/permission/decisions.md) | 本阶段暂不产出 | 权限管理(客服账号、角色、游戏关联、企微号授权);ChatFlow 自维护 |
| automation | v1.1+ | - | - | 智能路由、自动分配、下班自动回复(未启) |
| knowledge | v1.2+ | - | - | FAQ、Quick Reply、表情包(未启) |
| monitor | v1.3+ | - | - | 客服监控、数据看板、报表(未启) |
| review | v1.4+ | - | - | 评价管理、内容质检(未启) |

## 项目级约定

| 内容类型 | 位置 | 组织方式 |
| --- | --- | --- |
| 运行时状态(当前/下一步) | `project/TASKS.md` | 单一事实源,有界 |
| 领域决策/迭代史 | `project/domains/<domain>/decisions.md` | 追加式,倒序,按需读 |
| 项目级视觉规范 | `project/ui-brand.md` | 长期稳定 |
| 项目级调研 | `project/research/` | 按版本命名,如 `v1.0-market-scan.md` |
| 项目级研发设计 | `project/tech/` | 按版本命名,如 `v1.0-architecture.md` |
| 版本对外交付 | `project/delivery/v1.x/` | 每版一子目录,`release-prd.md` 由 `/deliver` 按 `release-prd-spec.md` 组装(快照 + 变更摘要) |
| 规范来源 | `product-design-kit/` | 只读 |
| 领域资产 | `project/domains/<domain>/` | `design.md` 保存稳定设计，`decisions.md` 保存取舍；正式交付目录按需生成 |

## 公共能力

- 现有页面骨架:`NavigationLayout`、`TablePageLayout`
- 现有通用组件:`SearchBar`、`DataTable`、`Pagination`、`DialogWrapper`
- 现有示例页面:`/catalog`

## 当前优先级

| 优先级 | 领域 / 模块 | 原因 |
| --- | --- | --- |
| P0 | chat-workbench | V1 主战场:消息收发、会话管理、一机多开 |
| P0 | player-center | V1 核心:玩家档案、企微关系、备注/标签 |
| P0 | ops-admin | V1 基础:违禁词、企微号-云桌面绑定、初始化 |
| P0 | permission | V1 基础:客服账号、角色、企微号授权(ChatFlow 自维护) |
| P1 | 外部依赖对齐 | 企微会话存档 API / 无影云 API+视频流 / SCRM 互通(见 roadmap.md) |

## 已沉淀调研与规划

| 版本 | 文件 | 主题 | 状态 |
| --- | --- | --- | --- |
| 总览 | [roadmap.md](roadmap.md) | ChatFlow 产品路线图(领域拆分、V1 条目、版本规划) | v1.0 规划已定 |
| v1.0 | [v1.0-qiwei-rpa.md](research/v1.0-qiwei-rpa.md) | 企业微信 RPA 方案调研(通信选型与风控建议) | 已提炼 |
