# 项目级版本化交付

按迭代版本组织的对外交付产物。

## 目录结构

```
v1.0/
  release-prd.md       本版完整对外 PRD(自包含摘录)
  test-plan.md         本版集成测试范围与回归说明
v1.1/
  ...
```

## 职责边界

- 本目录只装"按版本发"的产物;每个 `v1.x/` 是该版本对外交付的快照。
- 领域事实源在 `project/domains/<domain>/design.md` 与 `decisions.md`，可执行契约由自动化测试补充；历史 `delivery/` 只作快照。
- `release-prd.md` 由 `/deliver` 从稳定设计、决策和测试结果**组装而成**；内容修订请回到事实源，再重新生成。
- 打包完版本后建议打 git tag:`release/v1.0`,作为下一版变更识别的基线。

## 单点权威

- 权威源：领域 `design.md` + `decisions.md` + 自动化契约测试
- 本目录:发版冻结的历史快照,**不要手动编辑 release-prd.md**
- 改动规则:改源 → 重新触发 `/deliver <version>` → 重新打 tag
