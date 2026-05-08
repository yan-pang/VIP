import fs from 'node:fs'
import path from 'node:path'

const cwd = process.cwd()
const args = process.argv.slice(2)

const getArgValue = (flag) => {
  const direct = args.find((arg) => arg.startsWith(`${flag}=`))
  if (direct) {
    return direct.slice(flag.length + 1)
  }

  const index = args.indexOf(flag)
  if (index >= 0) {
    return args[index + 1]
  }

  return undefined
}

const hasFlag = (flag) => args.includes(flag)

const rawName = getArgValue('--name') || args.find((arg) => !arg.startsWith('--'))
if (!rawName) {
  console.error('用法：npm run new:domain -- <domain-name> [--delivery]')
  process.exit(1)
}

const includeDelivery = hasFlag('--delivery')
const slug = rawName
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

if (!slug) {
  console.error('领域名必须包含英文字母或数字。')
  process.exit(1)
}

const title = slug
  .split('-')
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ')

const readTemplate = (relativePath) => {
  return fs.readFileSync(path.join(cwd, relativePath), 'utf8')
}

const writeIfMissing = (relativePath, content) => {
  const targetPath = path.join(cwd, relativePath)
  if (fs.existsSync(targetPath)) {
    console.warn(`跳过 ${relativePath}（文件已存在）`)
    return
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true })
  fs.writeFileSync(targetPath, content)
  console.log(`创建 ${relativePath}`)
}

const ensureDir = (relativePath) => {
  const targetPath = path.join(cwd, relativePath)
  if (fs.existsSync(targetPath)) {
    console.warn(`跳过 ${relativePath}（目录已存在）`)
    return
  }

  fs.mkdirSync(targetPath, { recursive: true })
  console.log(`创建 ${relativePath}/`)
}

const renderTemplate = (template, heading) => {
  return template.replace(/^# .*/u, `# ${heading}`)
}

const designTemplate = readTemplate('product-design-kit/design/design-doc-template.md')
const prdTemplate = readTemplate('product-design-kit/design/external-prd.md')
const testStrategyTemplate = readTemplate('product-design-kit/design/test-strategy.md')
const testCasesTemplate = readTemplate('product-design-kit/design/test-cases.md')

writeIfMissing(`project/domains/${slug}/design.md`, designTemplate)

if (includeDelivery) {
  writeIfMissing(`project/domains/${slug}/delivery/prd.md`, renderTemplate(prdTemplate, `${title} 对外 PRD`))
  writeIfMissing(
    `project/domains/${slug}/delivery/test/strategy.md`,
    renderTemplate(testStrategyTemplate, `${title} 测试策略`),
  )
  writeIfMissing(
    `project/domains/${slug}/delivery/test/cases.md`,
    renderTemplate(testCasesTemplate, `${title} 测试用例`),
  )
}

console.log('')
console.log('下一步:')
console.log('1. 先阅读 product-design-kit/design/design-init.md')
console.log('2. 如项目已有品牌或视觉默认规范,先补 project/ui-brand.md')
console.log(`3. 在 project/domains/${slug}/design.md 中完成设计初始化内容和详细设计`)
console.log('4. 跨领域的调研写到 project/research/, 跨领域的研发设计写到 project/tech/')
console.log(`5. 直接对话说明需求或说"继续 ${slug}",由 guide-agent 自动判断当前阶段`)
if (includeDelivery) {
  console.log(`6. 领域级 PRD 和测试用例持续维护在 project/domains/${slug}/delivery/`)
  console.log('7. 发版时 release-prd 由 /deliver 自动生成到 project/delivery/v1.x/')
}
