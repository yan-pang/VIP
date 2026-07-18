---
name: deliver
description: 当一个领域或版本已经明确需要对外交付文档时使用。
argument-hint: <domain-or-version>
---

# /deliver

本阶段有两类产物,走两套路径。先看参数判断:

- 参数是版本号(如 `v1.1`、`release/v1.1`)→ 走 **B 路径**(版本级对外交付,自动组装快照 + 本版变更摘要)
- 参数是领域名 → 走 **A 路径**(领域级长期 PRD / 测试用例;也可生成「当前态」交付物快照)

## A. 领域级 PRD / 测试用例(长期资产)

1. 先读 `project/TASKS.md`(现状);该领域 `design.md` **先看 `## 章节索引` 再按需读相关小节**、`project/ui-brand.md`;如需"为什么这样定"可查该领域 `decisions.md`;如 `project/research/` 或 `project/tech/` 下有相关版本文件,按需阅读。
2. 再阅读 `product-design-kit/design/external-prd.md`、`product-design-kit/design/release-prd-spec.md`、`product-design-kit/design/test-strategy.md`、`product-design-kit/design/test-cases.md` 和 `product-design-kit/tools/prd-checklist.md`。
3. 在 `project/domains/<domain>/delivery/` 下产出或补全:
   - `prd.md`:领域长期 PRD。
     - framing 段(名词解释 / 领域背景 / 核心目标 / 长期稳定角色 / NFR / 非目标)按 `external-prd.md`「领域 framing」填写。
     - 需求条目使用 `P-XXX` 稳定编号,内部结构按 `external-prd.md`「条目内部结构」(对齐 `release-prd-spec.md` §7 富结构)。
     - **单一事实源**:调研只链接 `project/research/`、产品设计与流程图只链接 `design.md`,不复制正文。
   - `test/strategy.md`:领域测试策略
   - `test/cases.md`:领域测试用例,复用 PRD 的条目编号(可引用 `R-XXX-NN` 规则编号增强可追溯)
4. 领域 PRD 是**需求条目的唯一事实源**;以后修订直接改这里。
5. 对照 `prd-checklist.md` 执行交付前自查,并同步更新 `project/TASKS.md` 的状态与最近动态(`project/overview.md` 仅地图变化时更新)。

> **生成「当前态」交付物快照(可选)**:需要给研发看「现在最新长什么样」时,可按 B.5 的组装逻辑生成一份当前全量 `release-prd` 全文(不打 tag、不限定版本),无需先发版。

## B. 版本级对外交付(release-prd / test-plan,组装快照 + 变更摘要)

> 交付物 = **完整快照(当前全量态)+ 顶部本版变更摘要**。研发打开一份文件即可掌握当前全貌与本版改动。
> 结构严格按 `product-design-kit/design/release-prd-spec.md`;各章节从单一事实源组装,不手动追加正文。

### B.1 前置确认

- 参数是版本号,例如 `v1.1`。对应 git tag 命名 `release/v1.1`。
- 目标输出:`project/delivery/<version>/release-prd.md` 和 `project/delivery/<version>/test-plan.md`。
- 如果 `project/delivery/<version>/` 已经存在,**先警告用户**这是重新生成(会覆盖 release-prd.md);用户确认后继续。

### B.2 识别基线(上一版 tag)

按顺序尝试:

1. `git describe --tags --abbrev=0 --match 'release/v*' HEAD` → 如果成功,拿到最近的 `release/v*` 作为 base。
2. 如果仓库里没有任何 `release/v*` tag,视为**首版发布**:所有现有 `P-XXX` 都视为"新增@本版"。
3. 如果用户在消息里显式给出 base(例如「对比 release/v0.9」),用用户指定的。

把 base tag 明确告诉用户:"本次对比基线:`release/v1.0`(或 `首版`)"。

### B.3 扫描变更范围

对每个 `project/domains/*/delivery/prd.md`(含当前不存在但 base 里有的):

1. 当前内容:直接 Read。
2. base 内容:`git show <base>:project/domains/<domain>/delivery/prd.md`(文件在 base 不存在则视为空)。
3. 按 `## P-XXX ` 二级标题切分两版,得到两个 `编号 -> 完整条目内容` 的映射。
4. 对齐后分三类:
   - **新增**:base 没有、当前有
   - **修订**:两边都有、但内容不同(忽略空白差异)
   - **废弃**:base 有、当前没有;或当前状态行含 `废弃@<本版>`
5. 跳过状态行是 `废弃@<历史版>` 且内容未变的条目(已在历史版本退场,本版无关)。

### B.4 反向确认

输出给用户看的识别结果:

```text
本次基线:release/v1.0
识别到 v1.1 变更:

新增:
  - P-102 新增角色审批流          (用户管理)
  - P-215 重构 refund 规则         (订单)
修订:
  - P-107 角色分页默认值调整      (用户管理)
废弃:
  - P-098 旧的单步审批入口         (用户管理)

未识别到变更的领域:<列出>

请确认以上清单是否完整 / 有无误判。确认后我会生成 release-prd.md。
```

**必须等用户确认**,不直接写文件。如果用户补充 / 修正,按新清单重新组装。

### B.5 生成 release-prd.md(组装完整快照)

严格按 `release-prd-spec.md` 的 12 章结构组装。各章节按其「章节组装来源」从单一事实源拉取:

| 章节 | 组装方式 |
| --- | --- |
| 顶部「本版变更摘要」+ §1 变更日志 | 由 B.3/B.4 的 diff 结果生成:本版新增 / 修订 / 废弃清单 + 一行差异说明 |
| §2 名词解释、§3.1 背景、§4 核心目标、§8 NFR | 摘录各涉及领域 `prd.md` 的 framing 段 |
| §3.2 前期调研 | 摘要 + 链接 `project/research/` 对应文件 |
| §3.3 优先级、§5.1 功能清单 | 由条目 `优先级` / `需求总览表` 汇总 |
| §5.2 不在本期范围 | 领域 `prd.md` 非目标 + 本版补充 |
| §6 设计概述 | 链接 + 关键图引用 `design.md`(不重绘) |
| §7 详细需求 | **完整摘录当前全部生效(非废弃)`P-XXX` 条目**,按领域分组、领域内按编号排序;条目状态行带 `新增@vX/修订@vX` 标记 |
| §9 规划 / §10 交付材料 / §11 评审记录 / §12 检查项 | 版本级:生成时填 / 取 `overview.md` / 引用 `prd-checklist.md` |

关键要求:
- **完整快照**:§7 摘录当前**全部生效条目**(不止本版变更的),让研发看到当前全貌;本版改了哪些靠状态标记 + 顶部摘要区分。
- **完整摘录,不用链接**(§7 条目正文)。对方拿到这份 md 就是自包含交付。
- **修订条目**在条目前加一段「修订说明」,说明本版相对 base 的关键差异。
- 顶部第一行警告"本文件由 /deliver 生成,请勿手动编辑"。
- 各章节正文来自单一事实源,**不在 release-prd 里手写新增正文**。

### B.6 生成 test-plan.md

从各涉及领域的 `delivery/test/strategy.md` 提炼本版集成测试范围:

```markdown
# 版本 v1.1 集成测试计划

> 本文件由 /deliver 生成,请勿手动编辑。

## 版本摘要

<复用 release-prd 的本版变更摘要>

## 新增 / 修订条目的测试重点

### P-102(用户管理)
- 参考 `project/domains/user-management/delivery/test/strategy.md` 和 `test/cases.md`
- 本版重点观察面:<从对应策略提炼>

## 回归范围

- 涉及领域的 P0 用例默认进入回归集
- 历史缺陷相关用例:<列出>
- 跨领域联动用例:<列出>

## 废弃条目的影响

- P-098 废弃后,验证旧入口已下线、用户被引导到 P-102 的新入口
```

### B.7 打 tag(可选,需用户确认)

生成完毕后,建议用户打 tag:

```
现在可以打 git tag release/v1.1 锁死本次发版基线吗?
(这会让下一版 /deliver 自动用 v1.1 作为 base)
```

用户同意后:`git tag release/v1.1`。不自动 push。

## 公共约束

- 领域 PRD 条目编号必须稳定,以它作为版本 release-prd 的组装锚点。
- **单一事实源**:每个事实只有一个 home。调研在 `research/`、产品设计与流程图在 `design.md`、需求条目在领域 `prd.md`;release-prd 是这些源 + 版本框架的**组装产物**,不引入新的事实源。
- 需求 / 规则编号以 `delivery/prd.md` 为准,`test/strategy.md` 和 `test/cases.md` 复用同一套编号。
- 不要在版本 `release-prd.md` 或 `test-plan.md` 里手动追加新内容;新内容应先进对应事实源,再重新触发 `/deliver`。
- 如果用户说"本版还涉及 P-XXX 但 diff 没识别到",可能是该条目内容没在 base..HEAD 之间变化,但确实是本版首次对外披露——此时按用户指示把它当"新增"或"修订"纳入。
