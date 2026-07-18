---
name: design
description: 当 design.md 已完成设计初始化,需要继续补 `功能详细描述` 时使用。
argument-hint: <domain>
---

# /design

1. 先读紧凑状态 `project/TASKS.md`(现状 / 下一步)与 `project/ui-brand.md`(小、可整篇);该领域 `design.md` **先看顶部 `## 章节索引` 或 grep `^#` 拿大纲,再用 offset/limit 只读要处理的相关小节**,不整篇重读;`product-design-kit/design/design-init.md` 与 `product-design-kit/design/product-design.md` 按需读相关小节。
2. 如果任务涉及跨领域规则或技术约束,按需阅读 `project/research/` 和 `project/tech/` 下相关版本文件的相关小节。
3. 进入本阶段前,先确认 `design-init.md` 的前置条件已经满足;如果初始化内容仍缺,或仍有会直接影响 demo 设计的待确认事项未处理,交回 `breakdown`。
4. 本阶段只围绕 `功能详细描述` 的完整性、设计边界和后续承接关系工作;`project/research/` 和 `project/tech/` 只作为参考,不形成必须回写 `design.md` 的同步欠账。`design.md` 仍由使用者自行维护。只有在用户明确要求协助修订时,才在保持初始化内容延续的前提下处理。项目级默认设计规范默认继承 `project/ui-brand.md`,`design.md` 只写领域特有的设计和例外说明。
5. 复杂页面、多模块关系和共享规则的**当前稳定设计**直接展开在 `design.md`(不拆独立详细设计文档);但**决策记录、迭代历史、待确认项写入该领域 `decisions.md`,不堆进 `design.md`**,保持设计正文纯净、可缓存。新增小节记得更新顶部 `## 章节索引`。
6. 如有变化,同步 `project/TASKS.md` 的当前阶段与最近动态;决策 / 取舍写入领域 `decisions.md`;`project/overview.md` 仅当项目地图(领域清单 / 入口)变化时才更新。
7. 如果详细设计已经可执行且用户目标是落代码,返回"可进入 build"的判断,由总控决定是否顺延。
