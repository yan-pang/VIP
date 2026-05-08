---
name: status
description: 用于总结当前项目或某个领域的状态,并推荐下一步最具体的动作。
argument-hint: [optional-scope]
---

# /status

1. 先阅读 `project/overview.md` 和 `project/ui-brand.md`。
2. 扫描项目级内容:`project/research/`、`project/tech/`、`project/delivery/`(按需逐个读取,不一次读全)。
3. 如果给了具体领域,再优先阅读 `project/domains/<domain>/design.md`、`delivery/prd.md`(如存在)、`delivery/test/*.md`(如存在)。
4. 按"材料吸收、项目级调研、项目级研发设计、设计初始化、功能详细描述、项目品牌规范、实现、领域交付资产、版本对外交付"九个维度总结当前进度。
5. 优先按领域汇总,并特别标出:
   - `project/research/` 中是否有新调研未同步到对应领域或 `delivery/`
   - `project/tech/` 中是否有需要进入交付物的关键约束、接口、依赖或异常路径
   - `project/delivery/v1.x/` 中最新版本是否与当前领域 PRD 一致(领域 PRD 改过而 release-prd 未重新生成就是漂移)
   - `design.md` 的前 3 段是否已完成
   - `功能详细描述` 是否已补齐并具备进入实现的条件
   - `project/ui-brand.md` 是否已建立,并被领域设计默认继承
   - 领域 `delivery/prd.md` 是否已建立长期 PRD 库
   - G0 / G1 / G2 当前状态
6. 最后给出一个最有价值、最具体的下一步动作。
