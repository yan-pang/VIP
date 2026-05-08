---
name: deliver
description: 当一个领域或版本已经明确需要对外交付文档时使用。
argument-hint: <domain-or-version>
---

# /deliver

本阶段有两类产物,走两套路径。先看参数判断:

- 参数是版本号(如 `v1.1`、`release/v1.1`)→ 走 **B 路径**(版本级对外交付,自动组装)
- 参数是领域名 → 走 **A 路径**(领域级长期 PRD / 测试用例)

## A. 领域级 PRD / 测试用例(长期资产)

1. 先阅读该领域的 `design.md`、`project/ui-brand.md`;如 `project/research/` 或 `project/tech/` 下有相关版本文件,按需阅读。
2. 再阅读 `product-design-kit/design/external-prd.md`、`product-design-kit/design/test-strategy.md`、`product-design-kit/design/test-cases.md` 和 `product-design-kit/tools/prd-checklist.md`。
3. 在 `project/domains/<domain>/delivery/` 下产出或补全:
   - `prd.md`:领域长期 PRD,条目使用 `P-XXX` 稳定编号(按 `external-prd.md` 的「条目标题格式」)
   - `test/strategy.md`:领域测试策略
   - `test/cases.md`:领域测试用例,复用 PRD 的条目编号
4. 领域 PRD 是**权威源**;以后修订直接改这里。
5. 对照 `prd-checklist.md` 执行交付前自查,并同步更新 `project/overview.md` 的 G2 状态。

## B. 版本级对外交付(release-prd / test-plan,自动组装)

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

### B.5 生成 release-prd.md

结构:

```markdown
# 版本 v1.1 对外 PRD

> 本文件由 /deliver 生成,请勿手动编辑。改动请回到对应领域 PRD 再重新触发 /deliver。

## 版本摘要

- 发布版本:v1.1
- 对比基线:release/v1.0(或 首版)
- 涉及领域:用户管理、订单
- 条目统计:新增 2 / 修订 1 / 废弃 1

## 新增条目

### 用户管理 · P-102 新增角色审批流

<完整摘录该条目所有内容,包括 业务规则、页面与交互、边界与异常、验收标准 等>

### 订单 · P-215 重构 refund 规则

...

## 修订条目

### 用户管理 · P-107 角色分页默认值调整

**修订说明**:<本版相对 base 的关键差异,一两句>

<完整摘录当前版本该条目所有内容>

## 废弃条目

### 用户管理 · P-098 旧的单步审批入口

**废弃说明**:本版起不再生效。对接方如仍在引用,需迁移到 P-102。
```

关键要求:
- **完整摘录**,不用链接。对方拿到这份 md 就是自包含交付。
- 修订条目在摘录前加一段「修订说明」,说明本版相对 base 的关键差异。
- 顶部第一行警告"本文件由 /deliver 生成,请勿手动编辑"。
- 按领域分组,领域内按编号排序。

### B.6 生成 test-plan.md

从各涉及领域的 `delivery/test/strategy.md` 提炼本版集成测试范围:

```markdown
# 版本 v1.1 集成测试计划

> 本文件由 /deliver 生成,请勿手动编辑。

## 版本摘要

<复用 release-prd 的版本摘要>

## 新增 / 修订条目的测试重点

### P-102(用户管理)
- 参考 `project/domains/user-management/delivery/test/strategy.md` 和 `test/cases.md`
- 本版重点观察面:<从对应策略提炼,如果对应策略里明确了本条的观察面>

### P-215(订单)
...

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
- 需求 / 规则编号以 `delivery/prd.md` 为准,`test/strategy.md` 和 `test/cases.md` 复用同一套编号。
- 不要在版本 `release-prd.md` 或 `test-plan.md` 里手动追加新内容;新内容应先进领域 PRD,再重新触发 `/deliver`。
- 如果用户说"本版还涉及 P-XXX 但 diff 没识别到",可能是该条目内容没在 base..HEAD 之间变化,但确实是本版首次对外披露——此时按用户指示把它当"新增"或"修订"纳入。
