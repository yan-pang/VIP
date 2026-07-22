# player-center 决策记录

> 本领域的决策/迭代历史(倒序,新在上)。从 `overview.md` 迭代日志与 `design.md` 演进史抽出,按需读取。
> `design.md` 只保留**当前**稳定设计;此处保留**为什么这样定 / 变过什么**。

## 2026-07-22 — 外部身份、关系与隐私边界（覆盖同日及更早冲突口径）

- 同一自然玩家在多个企业主体下可能拥有不同外部联系人身份；关系记录保存 `corpId` 与 `externalUserId`，外部唯一键为 `corpId + external_userid`，不得只按 `external_userid` 合并。
- `removed_by_agent` 与 `removed_by_player` 都表示当前不是好友，两者都禁止新发 / 重联；只有关系恢复 `normal` 后才能再次发起，且恢复不会自动创建会话或恢复自动化。
- 权限受限时只提示“存在其他不可见关系”，不展示精确数量、账号名、标签或可推导字段，避免侧信道泄露。
- 关系和玩家可编辑字段使用版本校验；冲突不覆盖对方修改，保留用户输入并提示刷新后重试。玩家基础身份由共享玩家源派生，不在 player-center 维护第二份可漂移副本。
- 游戏数据页保持未接入占位，不伪造字段清单；消息历史中的不支持类型使用明确占位，视频失效 / 解码失败展示可恢复错误态。

## 2026-07-22 — 会话 ID 与轮次展示统一

- `conversationId` 是跨轮次不变的业务标识，`roundIndex` 是展示层数字。消息管理表格和只读 Drawer 统一展示并复制复合标识 `roundId = conversationId#roundIndex`（如 `c_002#2`）：`#` 前是会话 ID，`#` 后是轮次。
- `roundCount` 只用于内部统计，不再在复合标识后附加 `/M`，避免 `c_002#2 / 2` 这类重复和歧义。Mock 新会话统一生成 `c_NNN` 业务编号；已持久化的 UUID / 旧复合 ID 在读取时迁移，并同步更新其消息归属。

## 2026-07-22 — V1 Mock 最终验收通过
- 需求方确认 player-center V1 Mock 最终验收通过；玩家维度列表、三 tab 完整档案、关系字段编辑、主动发起拦截、会话轮次检索、只读 Drawer 与工作台 slot 的当前交互冻结。
- 下一阶段先做项目整体 review,再基于稳定设计产出本领域 PRD 与测试用例；企微、会话存档、搜索、权限服务和 SCRM 迁移暂不启动。

## 2026-07-22
- **V1 Mock 收口**:`/players` 继续坚持玩家维度一人一行;`/players/:id` 固定为「基础 / 跨号关系与会话 / 游戏数据占位」三个 tab;会话只读 Drawer 只由玩家详情与消息管理两处复用,`/players` 不再承担会话入口。清理了 design 中旧的「会话记录独立 tab / 三处 Drawer 宿主 / 关系列表展开为 N 行」残留。
- **会话运行态同源**:player-center 改为读取 `workbenchRuntimeMock` 的 conversations / messages,覆盖 seed、已落库主动发起会话及当前 SPA 内新收 / 新发 / 撤回后的状态;详情页、消息轮次列表和 Drawer 不再只读静态 seed。
- **检索与浏览补齐**:`/players` 支持综合搜索标签结果在同一路由回填筛选;两张列表补行选中与空态清筛选;`/messages` 补最后发送方、消息时间、消息内容筛选与 roundId 复制;Drawer 补发送方筛选、内容 debounce + 命中高亮和实时消息刷新。
- **状态与权限边界（历史验收项，隐私口径已更新）**:工作台 slot 的跨号 chip 只展示当前身份可见企微号；详情页当前只返回“存在其他不可见关系”的布尔提示，不再展示精确计数。无会话时，任一方删除好友或企微号离线 / 封禁均直接禁用“主动发起”并说明原因。关系状态保持只读，不与备注 / 描述 / 标签编辑混在一起。
- **历史统计口径**:消息总数与最后消息纳入发送中 / 发送失败记录(仅排除 system 事件),避免失败尝试在消息管理审计视图中消失。
- **验收前验证**:`npm run check` 通过;真实浏览器覆盖标签跳转、三 tab 详情、整会话 / 按轮 Drawer、内容高亮、最后发送方筛选、失败消息、不可用企微号拦截与非法深链错误态,控制台无 error / warning。

## 2026-07-17
- 玩家管理列表(`/players`)标签列改为**全部展示、不折叠**(运营常按单标签扫读);`/messages`、详情页、slot 仍保留 +N 折叠。已回写 design 页面 1 + prd P-203 + test/cases TC-203。

## 2026-06-03
- **`/messages` 改轮次维度**:以会话轮次为最小展示单位(`roundId = conversationId#N`,单轮也带 #1),同一会话多轮拆多行,按 system「本次会话已结束」切分;会话只读 Drawer 支持按轮过滤(`/messages` 点某轮只看该轮,详情页/深链看整会话);"去工作台接待"仍按整会话 `conversationId` 跳(持久会话模型不变)。
- **build 收口**:工作台 slot 精简档案落地(`src/components/common/PlayerSlotPanel.tsx`,独立组件不复用详情页;接 playerCenterMock 同源 store;身份卡 + 关系状态警示横幅 + 当前管家关系字段内联编辑 + 跨号 chip + 单一 customNote + "在玩家管理打开"深链),替换 `PlayerAside` 占位;同步修订 design 模块 5,slot 自定义字段从"结构化 isSlotKey 2-3 字段"对齐为单一 `customNote`(消除 05-30 简化遗留漂移)。
- **会话数据一致性修复**:此前 player-center 反查会话只读 `chatflowMock` 静态 seed,看不到工作台 localStorage 已落库的主动发起会话。抽共享持久化模块 `src/services/proactiveStore.ts`(两域单一来源),会话索引/轮次/消息反查改懒计算并**合并 seed + 已落库会话**,新增 `getConversationMessages`;Drawer 整会话浏览改用合并消息源。回写 design §3 数据同源。
- **收尾打磨**:`/players`、`/messages` 的筛选/分类/排序/分页态实时 `replaceState` 回写并支持深链/刷新/分享还原;排序改**受控**,顺带修复"固定排序 + 列头只重排当前页 → 跨页排序失效"潜在 bug;列宽对齐设计。

## 2026-05-30
- **build**:mock store + 三页 + Drawer + 共享 readOnly MessageBubble 落地,tsc/lint 双 0。
- **列表粒度反思与回退**:列表粒度从(玩家×企微号)关系记录**回退到玩家(playerId)维度**(SCRM 截图佐证 + 详情页跨号关系 tab 已承载关系级细节,主表展开会冗余);主表只装跨号聚合 chip,行操作只剩"查看完整档案",会话浏览下放到详情页"会话记录" tab。
- **自定义字段简化**:从"字段定义双层抽象 + 3 字段"简化为"单一 `customNote` 文本"。
- **详情页 tab 合并**:"跨号关系" + "会话记录"合并为单 tab(基于 chat-workbench D1"每关系最多 1 个 conversationId"决策)。

## 2026-05-25
- D1 骨架 + D2 三页 + D3 两模块落定。

## 2026-05-22
- 重构 design.md 前 3 章,剥离对 SCRM 形态的强行对齐;**确立三层职责架构**:
  - `/players` 列表 = 玩家维度检索台,纯只读、不展开、跨号字段 chip 聚合;
  - `/players/:id` 详情页 = 真人级容器,tab 化,为 v1.1+ 游戏数据预留,关系字段编辑主入口;
  - chat-workbench slot = 接待专用精简档案,当前管家字段编辑入口。
