# Player Center 测试用例

> 默认保存为 `project/domains/<domain>/delivery/test/cases.md`。  
> 与 `test/strategy.md` 配套使用,默认复用领域 `delivery/prd.md` 中的需求 / 规则编号(`P-XXX`)。  
> 如 `project/tech/` 下有相关版本文件,可结合其中的技术设计补齐前置条件、依赖关系、异常路径和恢复路径。

## 用例说明

- 对应 PRD:`project/domains/<domain>/delivery/prd.md`
- 对应测试策略:`project/domains/<domain>/delivery/test/strategy.md`
- 对应项目级研发设计:`project/tech/` 下相关版本文件(按需)
- 用例粒度:
- 参考材料:

## 用例列表

| 用例 ID | 关联需求 ID | 场景 | 前置条件 | 操作步骤 | 预期结果 | 优先级 | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-001 | P-101 |  |  |  |  | P0 |  |
| TC-203 | P-203 | 玩家管理列表标签全展示 | `/players` 有标签数 >3 的玩家 | 查看玩家标签列 | 该列全部标签展示、**不折叠为 +N**(wrap 换行);`/messages`/详情页/slot 仍按 +N 折叠 | P1 | 玩家管理列表 |
| TC-211 | P-211/P-122 | `/messages` 最后消息展示实际客服 + 完整日期时间 | `/messages` 存在最后消息由客服发出的轮次 | 查看「对话管家」列与「最后消息」列 | 「对话管家」列显示回复的企微号名称;「最后消息」在 agent 时显示**实际回复客服姓名**(非"客服")、player 时显示"玩家",时间为完整 `YYYY-MM-DD HH:MM` | P1 | 消息管理 |
| TC-207 | P-207/P-122 | 只读 Drawer 继承消息记录展示口径 | 任一有跨天消息的会话 | 行操作"查看对话消息"打开 Drawer;悬停气泡时间 | 出现日期分割线;气泡显示实际客服/玩家名 + `HH:MM`,悬停时间原地展开为完整日期时间(无 Tooltip);企微号在 Drawer 头部徽标不逐条重复 | P1 | 会话只读 Drawer |

## 冒烟用例

- 

## 主流程用例

- 

## 边界 / 异常用例

- 
