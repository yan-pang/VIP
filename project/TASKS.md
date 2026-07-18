# 当前任务状态(单一事实源)

> 会话开局只读这一份即可掌握"现在在哪"。运行时状态集中在此,不要散进各领域 `design.md`。
> 决策历史见各领域 `domains/<domain>/decisions.md`;稳定设计见 `design.md`;整体路线见 `roadmap.md`。

## 当前主线

- V1 目标:产出可交付给运营试用的客服工作台 MVP。
- P0 领域:chat-workbench、player-center(核心)+ ops-admin、permission(基础)。
- P1:外部依赖对齐(企微会话存档 API / 无影云 API+视频流 / SCRM 互通)。

## 领域状态清单

| 领域 | 阶段 | 说明 |
| --- | --- | --- |
| chat-workbench | build demo 完成,待需求方 review | 客服工作台;V1 核心;design 全套(D1+D2+D3)已落,代码在 `src/views/workbench` + `src/views/control` |
| player-center | design 完结 + build 完成,待 review | 玩家中心;`/players` `/players/:id` `/messages` + Drawer + 工作台 slot 全落,tsc/lint 双 0 |
| ops-admin | breakdown(仅骨架) | 违禁词库、企微号-云桌面绑定、初始化配置 |
| permission | breakdown(仅骨架) | 客服账号、角色、企微号授权;ChatFlow 自维护 |

## 最近动态(最多 5 条)

| 日期 | 领域 | 摘要 |
| --- | --- | --- |
| 2026-07-18 | 跨域 | 消息记录展示口径:抽共享 `MessageStream`(按自然日日期分割线),Bubble 悬停完整时间 Tooltip、outgoing 用实际发送客服姓名;`/messages` 显示实际客服姓名+完整时间。新增 `messageTime.ts`;CW 加 P-122/TC-131,PC 补 P-207/P-211/TC-207/TC-211。tsc/lint 双 0 |
| 2026-07-17 | chat-workbench | 会话分配二次迭代:取消隐式指派(须先"指派"接入才解锁回复)、左列"会话中"按指派人拆分出「他人接待中」、移除全部右键菜单(撤回改悬停图标)、置顶收紧为仅自己指派进行中会话。批量指派为新提需求、暂不实现 |
| 2026-07-17 | chat-workbench | 交互迭代:综合搜索最小字符 2→1、输入框自动聚焦+自适应高度、图文合并发送(`attachments[]`/`mixed`)、指派/转接候选仅在线客服 |
| 2026-07-17 | player-center | 玩家管理列表标签列改为全部展示、不折叠(`/messages`/详情/slot 仍 +N 折叠)。P-203/TC-203 |
| 2026-06-03 | player-center | build 收口:工作台 slot 精简档案 + 会话数据一致性修复(共享 `proactiveStore.ts`)+ URL 深链回写 |

> 更早的动态与决策已归档到对应 `domains/<domain>/decisions.md`。

## 当前下一步

- **chat-workbench / player-center**:等需求方 review,按反馈再迭代。
- **ops-admin / permission**:仍在 breakdown,只有领域骨架;`ops-admin` design 阶段需把 `research/v1.0-qiwei-rpa.md` 的合规风控约束(IP 一致性、频率限制、脱敏、应急预案)回写到该领域。
- **批量指派**(chat-workbench):2026-07-17 新提需求,暂不实现,后续单独规划。
- **外部依赖对齐**:企微会话存档 API 开通、无影云 API + 视频流契约、SCRM 历史数据是否需一次性迁移。
