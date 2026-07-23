# 设计初始化规范

> 用于 `breakdown` 阶段。  
> 这份文件只定义阶段边界、输入输出和退出条件,不展开写作教程。

## 适用范围

- 新领域刚开始
- 收到新材料,需要先吸收再继续推进
- `design.md` 的初始化内容仍未完成

## 固定输入

- `product-design-kit/design/design-doc-template.md`
- `project/ui-brand.md`
- `project/domains/<domain>/design.md`
- 如相关:`project/research/` 下与本领域有关的版本文件
- 如相关:`project/tech/` 下与本领域有关的版本文件
- 当前新增材料

## 约束对象

- `design.md`:由使用者自行维护;本规范只约束其初始化完成条件。初始化阶段关注模板中的前 3 个一级章节:
  - `需求业务背景`
  - `功能现状`
  - `功能梳理`
- `project/ui-brand.md`:项目级默认设计规范,用于提供长期稳定的品牌与视觉规则
- `project/research/`:项目级调研工作台,按迭代版本命名,记录材料来源、前期规划、会议增量、交付参考和待确认问题
- `project/tech/`:项目级研发技术设计,按迭代版本命名
- `project/overview.md`:用于同步领域清单、当前阶段、G 状态和项目级内容入口

## 文档边界

- `design.md` 承接当前有效的稳定业务、页面和交互设计，是领域长期 PRD 的生成事实源；不直接堆原始材料。
- `design.md` 默认继承 `project/ui-brand.md`;只有领域特有的设计例外才写进 `design.md`。
- 业务领域下**不再**放 `research.md` 或 `tech/`。跨领域的调研、研发设计放 `project/research/` 和 `project/tech/`。
- `project/research/` 作为材料与结论来源；其中已经确认且影响产品行为的内容必须回写 `design.md` 后才能进入长期 PRD。
- `project/tech/` 中只有会改变用户可感知行为、业务限制或异常结果的结论需要以业务语言回写 `design.md`。
- 如果页面结构、交互或 Mock 方案变化,直接更新 `design.md`。
- 如果新增结论属于项目级默认设计规范,应更新 `project/ui-brand.md`,而不是分散写进多个领域文档。
- `project/research/` 不替代 `design.md` 当前事实源，也不替代由 Design 生成的领域长期 PRD 和版本快照。
- 初始化阶段保留 `# 功能详细描述` 标题,但不提前展开正文。

## 吸收规则

1. 记录来源和用途
2. 提炼对 PRD / 测试有用的规则、约束、场景和风险
3. 标记待确认项和后续动作
4. 如果结论直接影响 demo 设计,直接更新 `design.md`
5. 需要对外交付时，先把已确认且影响产品行为的参考点更新到 `design.md`，再生成领域长期 PRD；版本 release-prd 由 `/deliver` 组装

- 如果材料已经明确只影响某个领域的 demo 设计,可以直接由使用者更新 `design.md`;除非还需要保留交付或测试参考,否则 `project/research/` 无需重复登记。
- 如果材料属于项目级默认视觉或品牌规范,优先补到 `project/ui-brand.md`。
- 如果材料主要影响交付规则、测试依据或评审口径,留在 `project/research/` 即可,不阻塞 `design` 或 `build`。
- 如果材料是跨领域的研发技术设计,放 `project/tech/`,不挤进某个业务领域目录。
- 如果材料同时影响 demo 设计和交付表达,可以直接更新 `design.md`,并在 `project/research/` 中保留简短摘要供后续交付使用。

## 阶段退出条件

同时满足以下条件后,才进入 `design` 阶段:

- `design.md` 前 3 个一级章节已基本完整
- 会直接影响 demo 设计的新增结论已反映到 `design.md`
- 需要留痕的交付 / 测试参考材料已按需整理到 `project/research/`
- 剩余待确认项已明确记录,且不会阻塞详细设计继续推进

## 后续去向

- 继续补 `功能详细描述`:`product-design.md`
- 如项目默认设计规范还未收口,先补 `project/ui-brand.md`
