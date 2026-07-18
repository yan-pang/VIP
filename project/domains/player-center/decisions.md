# player-center 决策记录

> 本领域的决策/迭代历史(倒序,新在上)。从 `overview.md` 迭代日志与 `design.md` 演进史抽出,按需读取。
> `design.md` 只保留**当前**稳定设计;此处保留**为什么这样定 / 变过什么**。

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
