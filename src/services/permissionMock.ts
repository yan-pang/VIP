import { useSyncExternalStore } from 'react'
import { agents, wechatAccounts } from './chatflowMock'
import { mockGames, mockWechatGameMap } from './gameCatalogMock'
import { subscribeOpsAdmin, type OpsActor } from './opsAdminMock'

export type PermissionRoleId = 'system_admin' | 'operations_supervisor' | 'customer_agent'
export type PermissionAgentStatus = 'active' | 'disabled'

export type { MockGame } from './gameCatalogMock'
export { mockGames, mockWechatGameMap } from './gameCatalogMock'

export interface MockFeishuUser {
  id: string
  name: string
  employmentStatus: 'active' | 'inactive'
  boundAgentId?: string
}

export interface PermissionAgentRecord {
  id: string
  feishuUserId: string
  name: string
  roleId: PermissionRoleId
  status: PermissionAgentStatus
  gameIds: string[]
  accountIds: string[]
  updatedAt: string
  updatedBy: string
}

export interface PermissionSession {
  authenticated: boolean
  agent: PermissionAgentRecord
  visibleGameIds: string[]
  visibleAccountIds: string[]
  manageableGameIds: string[]
  canOpenControl: boolean
  canOperateControl: boolean
  canManageAgents: boolean
  canAssignOthers: boolean
  canViewRoleDefinitions: boolean
  canViewOps: boolean
  canManageOps: boolean
  canRecallTeamMessages: boolean
}

export interface SavePermissionAgentInput {
  id?: string
  feishuUserId: string
  roleId: PermissionRoleId
  status: PermissionAgentStatus
  gameIds: string[]
  accountIds: string[]
  expectedUpdatedAt?: string
}

export const roleMeta: Record<PermissionRoleId, { label: string; description: string }> = {
  system_admin: {
    label: '系统管理员',
    description: '维护全平台客服账号、授权、企微配置、资源与风控策略。',
  },
  operations_supervisor: {
    label: '运营主管',
    description: '协调接待与运维处置,不可修改账号、角色或授权。',
  },
  customer_agent: {
    label: '客服',
    description: '在已授权企微号范围内接待玩家,不可进入云桌面。',
  },
}

let records: PermissionAgentRecord[] = [
  {
    id: 'agent_admin',
    feishuUserId: 'ou_admin',
    name: 'yan.pang',
    roleId: 'system_admin',
    status: 'active',
    gameIds: ['20173', '20174', '20175'],
    accountIds: ['wx_xiaoqin', 'wx_xiaobei', 'wx_xiaojuan'],
    updatedAt: '2026-07-18T09:00:00+08:00',
    updatedBy: 'agent_admin',
  },
  {
    id: 'agent_supervisor',
    feishuUserId: 'ou_supervisor',
    name: 'li.ming',
    roleId: 'operations_supervisor',
    status: 'active',
    gameIds: ['20173', '20174'],
    accountIds: ['wx_xiaoqin', 'wx_xiaobei'],
    updatedAt: '2026-07-17T16:20:00+08:00',
    updatedBy: 'agent_admin',
  },
  {
    id: 'agent_self',
    feishuUserId: 'ou_linyue',
    name: 'lin.yue',
    roleId: 'customer_agent',
    status: 'active',
    gameIds: ['20173'],
    accountIds: ['wx_xiaoqin'],
    updatedAt: '2026-07-16T13:10:00+08:00',
    updatedBy: 'agent_admin',
  },
  {
    id: 'agent_zhang',
    feishuUserId: 'ou_zhangsan',
    name: 'zhang.san',
    roleId: 'customer_agent',
    status: 'active',
    gameIds: ['20173'],
    accountIds: ['wx_xiaoqin'],
    updatedAt: '2026-07-16T11:00:00+08:00',
    updatedBy: 'agent_admin',
  },
  {
    id: 'agent_li',
    feishuUserId: 'ou_lisi',
    name: 'li.si',
    roleId: 'customer_agent',
    status: 'active',
    gameIds: ['20174'],
    accountIds: ['wx_xiaobei'],
    updatedAt: '2026-07-15T10:30:00+08:00',
    updatedBy: 'agent_admin',
  },
  {
    id: 'agent_wang',
    feishuUserId: 'ou_wangwu',
    name: 'wang.wu',
    roleId: 'customer_agent',
    status: 'disabled',
    gameIds: ['20175'],
    accountIds: [],
    updatedAt: '2026-07-12T15:00:00+08:00',
    updatedBy: 'agent_admin',
  },
]

const feishuUsers: MockFeishuUser[] = [
  { id: 'ou_admin', name: 'yan.pang', employmentStatus: 'active', boundAgentId: 'agent_admin' },
  { id: 'ou_supervisor', name: 'li.ming', employmentStatus: 'active', boundAgentId: 'agent_supervisor' },
  { id: 'ou_linyue', name: 'lin.yue', employmentStatus: 'active', boundAgentId: 'agent_self' },
  { id: 'ou_zhangsan', name: 'zhang.san', employmentStatus: 'active', boundAgentId: 'agent_zhang' },
  { id: 'ou_lisi', name: 'li.si', employmentStatus: 'active', boundAgentId: 'agent_li' },
  { id: 'ou_wangwu', name: 'wang.wu', employmentStatus: 'active', boundAgentId: 'agent_wang' },
  { id: 'ou_zhaoliu', name: 'zhao.liu', employmentStatus: 'active' },
  { id: 'ou_sunqi', name: 'sun.qi', employmentStatus: 'active' },
  { id: 'ou_leaver', name: 'zhou.li', employmentStatus: 'inactive' },
]

let currentAgentId = 'agent_admin'
let authenticated = true
const listeners = new Set<() => void>()

function ensureChatAgent(record: PermissionAgentRecord) {
  const existing = agents.find((agent) => agent.id === record.id)
  if (existing) {
    existing.name = record.name
    // 当前 Mock 身份代表一条有效的飞书会话，因此切换到该身份时必须能成为可指派候选。
    // 其他种子客服的在线状态继续作为“其他人在岗”的演示数据保留；停用账号则始终离线。
    existing.online = record.status === 'active' && (existing.online || record.id === currentAgentId)
    return
  }
  agents.push({
    id: record.id,
    name: record.name,
    online: record.status === 'active' && record.id === currentAgentId,
    activeConversationCount: 0,
  })
}

records.forEach(ensureChatAgent)

function normalizeAccountIds(gameIds: string[], accountIds: string[]) {
  const allowedGames = new Set(gameIds)
  return Array.from(
    new Set(
      accountIds.filter((accountId) => {
        const account = wechatAccounts.find((item) => item.id === accountId)
        return !!account && allowedGames.has(mockWechatGameMap[accountId])
      }),
    ),
  )
}

function buildSession(): PermissionSession {
  const agent = records.find((record) => record.id === currentAgentId) ?? records[0]
  const active = authenticated && agent.status === 'active'
  const isAdmin = active && agent.roleId === 'system_admin'
  const visibleGameIds = active
    ? isAdmin
      ? mockGames.filter((game) => game.enabled).map((game) => game.id)
      : agent.gameIds.filter((id) => mockGames.some((game) => game.id === id && game.enabled))
    : []
  const visibleAccountIds = active
    ? isAdmin
      ? wechatAccounts.filter((account) => visibleGameIds.includes(mockWechatGameMap[account.id])).map((account) => account.id)
      : normalizeAccountIds(visibleGameIds, agent.accountIds)
    : []
  const canOpenControl = active && agent.roleId !== 'customer_agent'
  const canOperateControl = canOpenControl
  return {
    authenticated,
    agent: { ...agent, gameIds: [...agent.gameIds], accountIds: [...agent.accountIds] },
    visibleGameIds,
    visibleAccountIds,
    manageableGameIds: isAdmin ? visibleGameIds : [],
    canOpenControl,
    canOperateControl,
    canManageAgents: isAdmin,
    canAssignOthers: active && agent.roleId !== 'customer_agent',
    canViewRoleDefinitions: active,
    canViewOps: canOpenControl,
    canManageOps: isAdmin,
    canRecallTeamMessages: active && agent.roleId !== 'customer_agent',
  }
}

let snapshot = buildSession()

function emit() {
  records.forEach(ensureChatAgent)
  if (records.find((record) => record.id === currentAgentId)?.status !== 'active') authenticated = false
  snapshot = buildSession()
  listeners.forEach((listener) => listener())
}

subscribeOpsAdmin(emit)

export function subscribePermissionMock(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getPermissionSession() {
  return snapshot
}

export function usePermissionSession() {
  return useSyncExternalStore(subscribePermissionMock, getPermissionSession, getPermissionSession)
}

export function switchMockIdentity(agentId: string) {
  const next = records.find((record) => record.id === agentId && record.status === 'active')
  if (!next) return
  currentAgentId = next.id
  authenticated = true
  emit()
}

export function logoutMockIdentity() {
  authenticated = false
  emit()
}

export function getCurrentOpsActor(): OpsActor {
  return {
    authenticated: snapshot.authenticated,
    agentId: snapshot.agent.id,
    name: snapshot.agent.name,
    roleId: snapshot.agent.roleId,
    visibleAccountIds: [...snapshot.visibleAccountIds],
  }
}

export function getMockIdentityOptions() {
  return records
    .filter((record) => record.status === 'active')
    .map((record) => ({ id: record.id, name: record.name, role: roleMeta[record.roleId].label }))
}

export function getPermissionAgent(id: string) {
  const record = records.find((item) => item.id === id)
  return record ? { ...record, gameIds: [...record.gameIds], accountIds: [...record.accountIds] } : undefined
}

export function listManageablePermissionAgents() {
  const manageableGames = new Set(snapshot.manageableGameIds)
  if (!snapshot.canManageAgents) return []
  return records
    .filter((record) => record.gameIds.every((gameId) => manageableGames.has(gameId)))
    .map((record) => ({ ...record, gameIds: [...record.gameIds], accountIds: [...record.accountIds] }))
}

export function listMockFeishuUsers(keyword = '') {
  const normalized = keyword.trim().toLowerCase()
  return feishuUsers
    .filter((user) => !normalized || user.name.toLowerCase().includes(normalized))
    .map((user) => ({ ...user }))
}

export function getAccountsForGame(gameId: string) {
  return wechatAccounts.filter((account) => account.enabled && mockWechatGameMap[account.id] === gameId)
}

export function getAssignableAgents(accountId: string) {
  // PRD 候选资格 = 启用(active) + 同游戏 + 同号授权;不看登录在线态(V1 无客服在线状态机)。
  return records
    .filter(
      (record) =>
        record.status === 'active' &&
        normalizeAccountIds(record.gameIds, record.accountIds).includes(accountId),
    )
    .map((record) => agents.find((agent) => agent.id === record.id))
    .filter((agent): agent is NonNullable<typeof agent> => !!agent)
}

function assertCanManage() {
  if (!snapshot.canManageAgents) throw new Error('当前身份无权管理客服账号')
}

function assertAdminProtection(target: PermissionAgentRecord, input: SavePermissionAgentInput) {
  if (target.roleId === 'system_admin' && target.status === 'active') {
    const activeAdminCount = records.filter(
      (record) => record.roleId === 'system_admin' && record.status === 'active',
    ).length
    if ((input.status !== 'active' || input.roleId !== 'system_admin') && activeAdminCount <= 1) {
      throw new Error('请先配置另一名有效系统管理员')
    }
  }
}

export function savePermissionAgent(input: SavePermissionAgentInput) {
  assertCanManage()
  if (!roleMeta[input.roleId]) throw new Error('请选择有效的预置角色')
  const manageableGames = new Set(snapshot.manageableGameIds)
  const gameIds = Array.from(new Set(input.gameIds)).filter((id) => manageableGames.has(id))
  if (gameIds.length === 0) throw new Error('至少关联一个当前管理员可管理的游戏')
  if (gameIds.length !== new Set(input.gameIds).size) throw new Error('包含不可管理的游戏')
  const accountIds = normalizeAccountIds(gameIds, input.accountIds)
  if (accountIds.length !== new Set(input.accountIds).size) throw new Error('企微号必须归属已关联游戏且仍有效')

  const now = new Date().toISOString()
  if (input.id) {
    const existing = records.find((record) => record.id === input.id)
    if (!existing) throw new Error('客服账号不存在或已被移除')
    if (input.expectedUpdatedAt !== existing.updatedAt) throw new Error('账号配置已被其他管理员更新，请刷新后重试')
    if (!existing.gameIds.every((gameId) => manageableGames.has(gameId))) throw new Error('当前管理员无权维护该客服账号')
    if (existing.feishuUserId !== input.feishuUserId) throw new Error('编辑账号时不可更换飞书用户')
    const user = feishuUsers.find((item) => item.id === existing.feishuUserId)
    if (input.status === 'active' && user?.employmentStatus !== 'active') throw new Error('绑定飞书用户已离职，无法启用账号')
    assertAdminProtection(existing, input)
    records = records.map((record) =>
      record.id === input.id
        ? {
            ...record,
            roleId: input.roleId,
            status: input.status,
            gameIds,
            accountIds,
            updatedAt: now,
            updatedBy: snapshot.agent.id,
          }
        : record,
    )
  } else {
    const user = feishuUsers.find((item) => item.id === input.feishuUserId)
    if (!user || user.employmentStatus !== 'active') throw new Error('请选择一名在职飞书用户')
    if (user.boundAgentId) throw new Error('该飞书用户已开通客服账号')
    const id = `agent_${Date.now().toString(36)}`
    const record: PermissionAgentRecord = {
      id,
      feishuUserId: user.id,
      name: user.name,
      roleId: input.roleId,
      status: input.status,
      gameIds,
      accountIds,
      updatedAt: now,
      updatedBy: snapshot.agent.id,
    }
    records = [record, ...records]
    user.boundAgentId = id
    ensureChatAgent(record)
  }
  emit()
}

export function setPermissionAgentStatus(id: string, nextStatus: PermissionAgentStatus) {
  const record = records.find((item) => item.id === id)
  if (!record) throw new Error('客服账号不存在')
  savePermissionAgent({
    id: record.id,
    feishuUserId: record.feishuUserId,
    roleId: record.roleId,
    status: nextStatus,
    gameIds: record.gameIds,
    accountIds: record.accountIds,
    expectedUpdatedAt: record.updatedAt,
  })
}
