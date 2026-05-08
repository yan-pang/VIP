---
name: breakdown
description: 当领域刚开始、材料还很散,或有新文档需要先吸收进现有文档体系时使用。
argument-hint: <domain>
---

# /breakdown

1. 先阅读 `project/overview.md`、`project/ui-brand.md`、`project/domains/<domain>/design.md`(如存在)和 `product-design-kit/design/design-init.md`。
2. 以 `design-init.md` 为**唯一阶段规范**,判断当前领域是否仍处于设计初始化或材料吸收阶段,并按其中「吸收规则」分发新材料。不要在本 skill 里另写一套分发规则。
3. 如有变化,同步 `project/overview.md` 的领域清单、当前阶段或项目级内容入口。
4. 如果业务领域目录不存在,交回总控先完成骨架初始化后再继续(新骨架只有 `design.md`,没有 `research.md` 和 `tech/`)。
5. 如果初始化仍未完成,或当前目标就是整理新增的交付参考,停在本阶段并明确缺口与阻塞项。
6. 如果初始化已经完成,且新增材料只影响交付 / 测试、不阻塞设计或实现,返回"可进入下一阶段"的判断,由总控决定是否顺延 `design` 或 `build`。
