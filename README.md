> **从 template 新建项目?** 先按 [TEMPLATE-SETUP.md](TEMPLATE-SETUP.md) 走完初始化清单,然后删掉那份文件和本行提示。

# VIP Starter

`VIP Starter` 是一个中文优先、文档驱动的前端原型长期模板。

## 这个项目怎么用

1. 运行 `npm install`
2. 运行 `npm run dev`
3. 直接告诉 Claude 你要做什么,或说"继续 `<domain>`"
4. 如果要新建领域,运行 `npm run new:domain -- <domain-name>`
5. 如果一开始就确定要产出交付物,再加 `--delivery`

AI 的阶段编排、读取顺序和冲突裁决统一由 `.claude/agents/guide-agent.md` 负责。规则细节见 `CLAUDE.md`。

## 项目固定分层

```text
product-design-kit/   规范库(AI 读,回答"应该怎么做")
project/              项目状态与领域文档(回答"当前做到哪了")
  ui-brand.md         项目级默认设计规范(长期稳定)
  overview.md         项目总览与状态
  research/           项目级调研(跨领域、按迭代版本)
  tech/               项目级研发设计(跨领域、按迭代版本)
  delivery/           版本级对外交付产物(v1.x/,AI 生成不手改)
  domains/<domain>/   业务领域长期资产
src/                  前端代码实现
.claude/              machine-only 总控与阶段 skills
scripts/              本地脚手架
```

## 领域目录怎么放

```text
project/domains/<domain>/
  design.md                 产品设计(给 AI / demo 实现)
  delivery/                 领域长期交付资产
    prd.md                  领域 PRD(权威源,持续演进)
    test/
      strategy.md
      cases.md
```

业务领域只放产品设计和领域长期资产。跨领域的调研放 `project/research/`,跨领域的研发设计放 `project/tech/`。

## 版本交付怎么走

日常维护领域 PRD,发版时让 AI 基于 git diff 自动识别变更、组装 release-prd。

### 工作流

1. **日常**:在各领域 `delivery/prd.md` 里持续加 / 改条目,每条用稳定编号 `P-XXX`、二级标题格式 `## P-XXX <标题>`,标题下第一行是 `**状态**:` 行(`新增@v1.x` / `修订@v1.x` / `废弃@v1.x`)。详细格式见 `product-design-kit/design/external-prd.md` 的「条目编号规范」。
2. **发版**:`/deliver v1.1`
   - AI 用 `git describe --tags --match 'release/v*'` 找上版 tag
   - 对每个领域 `delivery/prd.md`,用 `git show <base>:<path>` 拿到 base 版本,按 `## P-XXX` 切分对比
   - 识别本版的新增 / 修订 / 废弃条目,按领域聚合
   - 把清单反向确认给你看
3. **确认**后,AI 生成 `project/delivery/v1.1/release-prd.md` 和 `test-plan.md`,内容为完整条目摘录(自包含对外文档)
4. **打 tag**:`git tag release/v1.1`,作为下一版的 base

### 关键约束

- release-prd 是**生成产物**,不要手动编辑。改动请回到领域 PRD 再重新触发 `/deliver`。
- 废弃条目**不要删**,打 `废弃@v1.x` 标记保留;删除会让下一版 diff 失去锚点。
- 首版发布没有上版 tag,所有现有条目都会被识别为"新增@本版"。

## 常用命令

```bash
npm run new:domain -- <domain-name> [--delivery]
npm run check
```

## 当前状态入口

- 项目总览:`project/overview.md`
- 项目级视觉规范:`project/ui-brand.md`

`/catalog` 只保留为通用列表页业务示例,用来演示 starter 当前的页面骨架。
