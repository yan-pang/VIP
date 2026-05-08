# Template Setup

> 从 VIP Starter template 新建项目后,**一次性**按本清单做完所有改动,然后删掉本文件。

## 前置:GitHub Template Repository

如果你是 template 仓库的维护者,**第一次**需要在 GitHub 仓库 Settings → General → Template repository 勾选框上打勾。以后每次建新项目直接点仓库主页右上的 **Use this template** 按钮即可。

## 从 Template 创建新仓库

1. 在 template 仓库主页点 **Use this template** → **Create a new repository**
2. 填新项目名字 / 描述 / public or private → **Create repository**

新仓库会有一个干净初始 commit,不带 template 的历史。

## 本地 clone

```bash
git clone <新仓库 url>
cd <新项目目录>
npm install
```

## 一次性改动清单

- [ ] `package.json` `"name"` 改为新项目 slug
- [ ] `README.md` 顶部的 template 提示行删掉,标题 + 简介改成新项目
- [ ] `CLAUDE.md` 第一行标题改掉
- [ ] `project/overview.md` 整段「项目概况」重写(名称 / 定位 / 技术栈 / 当前阶段);「当前优先级」和「当前下一步」改成你的第一个目标;领域清单保持"暂无"
- [ ] `project/ui-brand.md` 「当前 starter 默认值」段替换成你项目的品牌值,或清空等对齐后再填
- [ ] `src/views/catalog/`(可选):如果业务示例页对新项目无用,删掉它和 `src/router/index.tsx` 里的对应路由

## 首次 commit

```bash
git add -A
git commit -m "chore: initialize from VIP Starter template"
git push
```

## 第一个领域

```bash
npm run new:domain -- <你的第一个领域名>
```

然后直接跟 Claude 对话,或者说"继续 `<领域名>`",由 `guide-agent` 接管。

## 首版发布提醒

新项目第一次 `/deliver v1.0` 时,仓库里还没有 `release/v*` tag,所有 PRD 条目会被识别为"新增@v1.0",这是正常的首版行为。发完记得:

```bash
git tag release/v1.0
```

作为下一版的变更识别基线。

## 清理本文件

做完以上所有步骤后,删掉本文件:

```bash
rm TEMPLATE-SETUP.md
git add -A
git commit -m "chore: remove template setup doc"
```
