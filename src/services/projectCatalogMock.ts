export type ProjectStatus = '需求梳理' | '开发中' | '待交付'

export interface ProjectRecord {
  id: string
  name: string
  domain: string
  owner: string
  status: ProjectStatus
  updatedAt: string
  modules: number
}

export const projectStatusOptions: Array<{ label: string; value: ProjectStatus }> = [
  { label: '需求梳理', value: '需求梳理' },
  { label: '开发中', value: '开发中' },
  { label: '待交付', value: '待交付' },
]

export const projectCatalogSeed: ProjectRecord[] = [
  {
    id: 'starter-001',
    name: '运营控制台',
    domain: '内部工具',
    owner: '林然',
    status: '需求梳理',
    updatedAt: '2026-04-10',
    modules: 3,
  },
  {
    id: 'starter-002',
    name: '合作伙伴门户',
    domain: 'B2B 流程',
    owner: '周可',
    status: '开发中',
    updatedAt: '2026-04-09',
    modules: 6,
  },
  {
    id: 'starter-003',
    name: '质量看板',
    domain: '数据报表',
    owner: '陈露',
    status: '待交付',
    updatedAt: '2026-04-08',
    modules: 4,
  },
  {
    id: 'starter-004',
    name: '活动工作台',
    domain: '增长运营',
    owner: '王诺',
    status: '开发中',
    updatedAt: '2026-04-07',
    modules: 5,
  },
]
