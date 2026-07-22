import { useMemo, useSyncExternalStore } from 'react'
import { wechatAccounts } from './chatflowMock'
import { mockGames, mockWechatGameMap } from './gameCatalogMock'
import type { WechatAccount, WechatAccountStatus } from '../types/chat'

export type WechatRiskStatus = 'normal' | 'ip_unverified' | 'ip_mismatch' | 'frequency_limited'
export type DesktopConnectionStatus = 'connected' | 'disconnected' | 'fault'
export type RpaExecutionStatus = 'running' | 'offline' | 'fault'
export type RpaTaskStatus = 'running' | 'paused' | 'failed'
export type ProjectionMode = 'observe' | 'takeover'
export type OpsAlertSeverity = 'high' | 'medium' | 'low'
export type OpsAlertStatus = 'open' | 'acknowledged' | 'resolved'
export type OpsAuditResult = 'success' | 'rejected' | 'failed'

export interface CloudRpaResource {
  id: string
  cloudDesktopId: string
  robotId: string
  robotName: string
  desktopStatus: DesktopConnectionStatus
  rpaStatus: RpaExecutionStatus
  /** 阿里云分配的可信公网 IP，作为合规基线。 */
  assignedPublicIp?: string
  currentPublicIp?: string
  ipCheckedAt?: string
  boundAccountId?: string
  updatedAt: string
  version: number
}

export interface OpsWechatAccount extends WechatAccount {
  gameId: string
  resourceId?: string
  expectedPublicIp?: string
  riskStatus: WechatRiskStatus
  configVersion: number
}

export interface SaveOpsWechatAccountInput {
  id?: string
  accountId: string
  shortName: string
  corpId: string
  gameId: string
  resourceId: string
  expectedVersion?: number
}

export interface RpaTask {
  id: string
  resourceId: string
  name: string
  status: RpaTaskStatus
  updatedAt: string
  pauseReason?: string
  pauseCode?: 'robot_offline' | 'account_disabled' | 'account_banned' | 'risk_block' | 'manual'
}

export interface ForbiddenWordRule {
  id: string
  gameId: string
  words: string[]
  enabled: boolean
  updatedAt: string
  version: number
}

export interface SaveForbiddenWordRuleInput {
  id?: string
  gameId: string
  words: string[]
  enabled: boolean
  expectedVersion?: number
}

export interface ForbiddenWordHit {
  ruleId: string
  word: string
}

export interface ProjectionSession {
  desktopId: string
  accountId: string
  browserId: string
  mode: ProjectionMode
  startedAt: string
}

export interface ProjectionSessionState {
  session?: ProjectionSession
  state: 'idle' | 'active' | 'evicted'
  isOwner: boolean
}

export interface OpsRiskAlert {
  id: string
  title: string
  detail: string
  severity: OpsAlertSeverity
  status: OpsAlertStatus
  accountId?: string
  resourceId?: string
  triggeredAt: string
  handledBy?: string
  resolvedAt?: string
}

export interface OpsRiskPolicy {
  id: string
  accountId: string
  hourlySendLimit: number
  hardHourlyCap: number
  consecutiveFailureLimit: number
  hardFailureCap: number
  version: number
  updatedAt: string
  updatedBy: string
  changeReason: string
}

export interface SaveOpsRiskPolicyInput {
  id: string
  hourlySendLimit: number
  consecutiveFailureLimit: number
  changeReason: string
  expectedVersion: number
}

export interface OpsActor {
  authenticated: boolean
  agentId: string
  name: string
  roleId: 'system_admin' | 'operations_supervisor' | 'customer_agent'
  visibleAccountIds: string[]
}

export type OutboundDeliveryAssessment =
  | { disposition: 'ready' }
  | { disposition: 'queued'; code: string; message: string }
  | { disposition: 'blocked'; code: string; message: string }

export interface OpsAuditRecord {
  id: string
  operator: string
  action: string
  targetType: 'account' | 'resource' | 'rule' | 'alert' | 'policy' | 'projection'
  targetId: string
  result: OpsAuditResult
  summary: string
  occurredAt: string
  correlationId: string
}

interface AccountConfig {
  gameId: string
  resourceId?: string
  expectedPublicIp?: string
  riskStatus: WechatRiskStatus
  version: number
}

const resources: CloudRpaResource[] = [
  {
    id: 'ali_resource_001',
    cloudDesktopId: 'desk_001',
    robotId: 'rpa_robot_001',
    robotName: 'VIP 一号机器人',
    desktopStatus: 'connected',
    rpaStatus: 'running',
    assignedPublicIp: '203.0.113.10',
    currentPublicIp: '203.0.113.10',
    ipCheckedAt: '2026-07-22T09:32:00+08:00',
    boundAccountId: 'wx_xiaoqin',
    updatedAt: '2026-07-22T09:32:00+08:00',
    version: 1,
  },
  {
    id: 'ali_resource_002',
    cloudDesktopId: 'desk_002',
    robotId: 'rpa_robot_002',
    robotName: 'VIP 二号机器人',
    desktopStatus: 'connected',
    rpaStatus: 'offline',
    assignedPublicIp: '203.0.113.20',
    currentPublicIp: '203.0.113.87',
    ipCheckedAt: '2026-07-22T08:48:00+08:00',
    boundAccountId: 'wx_xiaobei',
    updatedAt: '2026-07-22T08:50:00+08:00',
    version: 2,
  },
  {
    id: 'ali_resource_003',
    cloudDesktopId: 'desk_003',
    robotId: 'rpa_robot_003',
    robotName: 'VIP 三号机器人',
    desktopStatus: 'connected',
    rpaStatus: 'fault',
    assignedPublicIp: '203.0.113.30',
    currentPublicIp: '203.0.113.30',
    ipCheckedAt: '2026-07-22T08:15:00+08:00',
    boundAccountId: 'wx_xiaojuan',
    updatedAt: '2026-07-22T08:15:00+08:00',
    version: 1,
  },
  {
    id: 'ali_resource_004',
    cloudDesktopId: 'desk_004',
    robotId: 'rpa_robot_004',
    robotName: 'VIP 备用机器人',
    desktopStatus: 'connected',
    rpaStatus: 'offline',
    assignedPublicIp: '203.0.113.40',
    updatedAt: '2026-07-22T07:45:00+08:00',
    version: 1,
  },
]

let accountConfigs: Record<string, AccountConfig> = {
  wx_xiaoqin: { gameId: '20173', resourceId: 'ali_resource_001', expectedPublicIp: '203.0.113.10', riskStatus: 'normal', version: 1 },
  wx_xiaobei: { gameId: '20174', resourceId: 'ali_resource_002', expectedPublicIp: '203.0.113.20', riskStatus: 'ip_mismatch', version: 2 },
  wx_xiaojuan: { gameId: '20173', resourceId: 'ali_resource_003', expectedPublicIp: '203.0.113.30', riskStatus: 'normal', version: 1 },
}

const rpaTasks: RpaTask[] = [
  { id: 'rpa_send_001', resourceId: 'ali_resource_001', name: '机器人常驻发送任务', status: 'running', updatedAt: '2026-07-22T09:32:00+08:00' },
  { id: 'rpa_send_002', resourceId: 'ali_resource_002', name: '机器人常驻发送任务', status: 'paused', updatedAt: '2026-07-22T08:50:00+08:00', pauseReason: '机器人已下线，等待人工接管结束', pauseCode: 'robot_offline' },
  { id: 'rpa_send_003', resourceId: 'ali_resource_003', name: '机器人常驻发送任务', status: 'failed', updatedAt: '2026-07-22T08:15:00+08:00', pauseReason: '企微账号封禁，已停止执行', pauseCode: 'account_banned' },
]

let forbiddenWordRules: ForbiddenWordRule[] = [
  { id: 'forbidden_001', gameId: '20173', words: ['退款承诺', '保证最低价'], enabled: true, updatedAt: '2026-07-22T09:00:00+08:00', version: 1 },
  { id: 'forbidden_002', gameId: '20174', words: ['官方授权'], enabled: true, updatedAt: '2026-07-22T09:00:00+08:00', version: 1 },
]

const riskAlerts: OpsRiskAlert[] = [
  {
    id: 'alert_001',
    title: '企微号封禁，自动化已停止',
    detail: '小娟号已从可接待范围移除，关联机器人保持故障状态。',
    severity: 'high',
    status: 'open',
    accountId: 'wx_xiaojuan',
    resourceId: 'ali_resource_003',
    triggeredAt: '2026-07-22T08:15:00+08:00',
  },
  {
    id: 'alert_002',
    title: '机器人下线等待人工接管',
    detail: 'VIP 二号机器人已下线，运行中任务已暂停。',
    severity: 'medium',
    status: 'acknowledged',
    accountId: 'wx_xiaobei',
    resourceId: 'ali_resource_002',
    triggeredAt: '2026-07-22T08:50:00+08:00',
    handledBy: 'yan.pang',
  },
  {
    id: 'alert_003',
    title: '出口 IP 与合规基准不一致',
    detail: 'VIP 二号机器人当前出口 IP 为 203.0.113.87，合规基准为 203.0.113.20；已禁止机器人上线和人工接管。',
    severity: 'high',
    status: 'open',
    accountId: 'wx_xiaobei',
    resourceId: 'ali_resource_002',
    triggeredAt: '2026-07-22T08:48:00+08:00',
  },
]

let riskPolicies: OpsRiskPolicy[] = [
  {
    id: 'policy_wx_xiaoqin',
    accountId: 'wx_xiaoqin',
    hourlySendLimit: 300,
    hardHourlyCap: 1000,
    consecutiveFailureLimit: 5,
    hardFailureCap: 20,
    version: 3,
    updatedAt: '2026-07-22T09:10:00+08:00',
    updatedBy: 'yan.pang',
    changeReason: '按试运行账号量调整安全余量',
  },
  {
    id: 'policy_wx_xiaobei',
    accountId: 'wx_xiaobei',
    hourlySendLimit: 200,
    hardHourlyCap: 1000,
    consecutiveFailureLimit: 5,
    hardFailureCap: 20,
    version: 2,
    updatedAt: '2026-07-22T08:30:00+08:00',
    updatedBy: 'yan.pang',
    changeReason: '新接入账号采用保守阈值',
  },
  {
    id: 'policy_wx_xiaojuan',
    accountId: 'wx_xiaojuan',
    hourlySendLimit: 100,
    hardHourlyCap: 1000,
    consecutiveFailureLimit: 3,
    hardFailureCap: 20,
    version: 1,
    updatedAt: '2026-07-22T08:00:00+08:00',
    updatedBy: 'system',
    changeReason: '封禁风险账号保持低阈值',
  },
]

let auditRecords: OpsAuditRecord[] = [
  {
    id: 'audit_008',
    operator: 'system',
    action: '执行 RPA 发送批次',
    targetType: 'resource',
    targetId: 'ali_resource_003',
    result: 'failed',
    summary: '客户端识别失败，已保留受控录屏与日志引用',
    occurredAt: '2026-07-22T08:16:00+08:00',
    correlationId: 'corr_rpa_failed_008',
  },
  {
    id: 'audit_007',
    operator: 'yan.pang (agent_admin)',
    action: '上线 RPA 机器人',
    targetType: 'resource',
    targetId: 'ali_resource_002',
    result: 'rejected',
    summary: '出口 IP 与阿里云分配基线不一致，已拒绝上线',
    occurredAt: '2026-07-22T08:55:00+08:00',
    correlationId: 'corr_rpa_rejected_007',
  },
  {
    id: 'audit_006',
    operator: 'yan.pang',
    action: '编辑企微号配置',
    targetType: 'account',
    targetId: 'wx_xiaoqin',
    result: 'success',
    summary: '确认所属游戏 20173，保持绑定资源 ali_resource_001',
    occurredAt: '2026-07-22T09:28:00+08:00',
    correlationId: 'corr_account_006',
  },
  {
    id: 'audit_005',
    operator: 'yan.pang',
    action: '启用违禁词规则',
    targetType: 'rule',
    targetId: 'forbidden_001',
    result: 'success',
    summary: '游戏 20173 的出站违禁词规则已启用',
    occurredAt: '2026-07-22T09:20:00+08:00',
    correlationId: 'corr_rule_005',
  },
  {
    id: 'audit_004',
    operator: 'yan.pang',
    action: '结束人工接管',
    targetType: 'projection',
    targetId: 'desk_002',
    result: 'success',
    summary: '投屏会话已关闭，企微与 RPA 状态保持不变',
    occurredAt: '2026-07-22T09:15:00+08:00',
    correlationId: 'corr_projection_004',
  },
  {
    id: 'audit_001',
    operator: 'system',
    action: '触发风控告警',
    targetType: 'alert',
    targetId: 'alert_001',
    result: 'success',
    summary: '企微号 wx_xiaojuan 封禁，自动化停止',
    occurredAt: '2026-07-22T08:15:00+08:00',
    correlationId: 'corr_alert_001',
  },
  {
    id: 'audit_002',
    operator: 'yan.pang',
    action: '下线 RPA 机器人',
    targetType: 'resource',
    targetId: 'ali_resource_002',
    result: 'success',
    summary: '暂停运行中任务，云电脑保持可连接',
    occurredAt: '2026-07-22T08:50:00+08:00',
    correlationId: 'corr_rpa_002',
  },
  {
    id: 'audit_003',
    operator: 'yan.pang',
    action: '更新风控策略',
    targetType: 'policy',
    targetId: 'policy_wx_xiaoqin',
    result: 'success',
    summary: '发送频率调整为 300 条/小时，连续失败阈值为 5 次',
    occurredAt: '2026-07-22T09:10:00+08:00',
    correlationId: 'corr_policy_003',
  },
]

const listeners = new Set<() => void>()
const projectionListeners = new Set<() => void>()
const PROJECTION_STORAGE_KEY = 'chatflow.mock.projection-session'
const PROJECTION_CHANNEL_NAME = 'chatflow.mock.projection'
let revision = 0
let projectionChannel: BroadcastChannel | undefined

function now() {
  return new Date().toISOString()
}

function correlationId(prefix: string) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)
}

function recordAudit(input: Omit<OpsAuditRecord, 'id' | 'occurredAt' | 'correlationId'> & { correlationId?: string }) {
  auditRecords = [
    {
      ...input,
      id: 'audit_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      occurredAt: now(),
      correlationId: input.correlationId ?? correlationId('corr'),
    },
    ...auditRecords,
  ]
}

function normalizeForbiddenText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[\uFF01-\uFF5E]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
    .replace(/\u3000/g, ' ')
    .replace(/\s+/g, '')
}

function emit() {
  revision += 1
  listeners.forEach((listener) => listener())
}

function emitProjection() {
  projectionListeners.forEach((listener) => listener())
}

function activeGameIds() {
  return new Set(mockGames.filter((game) => game.enabled).map((game) => game.id))
}

function getResource(resourceId?: string) {
  return resources.find((resource) => resource.id === resourceId)
}

function hasPublicIpDrift(resource: CloudRpaResource, expectedPublicIp?: string) {
  return !!resource.currentPublicIp && !!expectedPublicIp && resource.currentPublicIp !== expectedPublicIp
}

function getConfig(accountId: string): AccountConfig {
  return accountConfigs[accountId] ?? {
    gameId: mockWechatGameMap[accountId] ?? '',
    expectedPublicIp: undefined,
    riskStatus: 'ip_unverified',
    version: 0,
  }
}

function assertOpsActor(actor: OpsActor, allowedRoles: OpsActor['roleId'][], accountId?: string) {
  if (!actor.authenticated) throw new Error('登录会话已失效，请重新登录')
  if (!allowedRoles.includes(actor.roleId)) throw new Error('当前身份无权执行该运营操作')
  if (accountId && actor.roleId !== 'system_admin' && !actor.visibleAccountIds.includes(accountId)) {
    throw new Error('当前身份无权操作该企微号')
  }
}

function actorName(actor: OpsActor) {
  return `${actor.name} (${actor.agentId})`
}

function syncChatAccount(account: WechatAccount, config: AccountConfig) {
  const resource = getResource(config.resourceId)
  account.desktopId = resource?.cloudDesktopId
  mockWechatGameMap[account.id] = config.gameId
}

function pauseResourceTasks(resourceId: string, reason: string, pauseCode: NonNullable<RpaTask['pauseCode']>) {
  let count = 0
  rpaTasks.forEach((task) => {
    if (task.resourceId !== resourceId || task.status !== 'running') return
    task.status = 'paused'
    task.pauseReason = reason
    task.pauseCode = pauseCode
    task.updatedAt = now()
    count += 1
  })
  return count
}

function resumeResourceTasks(resourceId: string) {
  let count = 0
  rpaTasks.forEach((task) => {
    if (task.resourceId !== resourceId || task.status !== 'paused' || task.pauseCode !== 'robot_offline') return
    task.status = 'running'
    task.pauseReason = undefined
    task.pauseCode = undefined
    task.updatedAt = now()
    count += 1
  })
  return count
}

const deliveryTelemetry = new Map<string, { sentAt: string[]; consecutiveFailures: number }>()

function getTelemetry(accountId: string) {
  const existing = deliveryTelemetry.get(accountId)
  if (existing) return existing
  const next = { sentAt: [], consecutiveFailures: 0 }
  deliveryTelemetry.set(accountId, next)
  return next
}

export function assessOutboundDelivery(accountId: string): OutboundDeliveryAssessment {
  const account = wechatAccounts.find((item) => item.id === accountId)
  if (!account) return { disposition: 'blocked', code: 'ACCOUNT_NOT_FOUND', message: '企微号不存在' }
  if (!account.enabled) return { disposition: 'blocked', code: 'ACCOUNT_DISABLED', message: '企微号接入已禁用' }
  if (account.status === 'banned') return { disposition: 'blocked', code: 'ACCOUNT_BANNED', message: '企微号已封禁' }
  const config = getConfig(accountId)
  const resource = getResource(config.resourceId)
  if (!resource) return { disposition: 'blocked', code: 'RESOURCE_MISSING', message: '企微号未绑定云电脑与 RPA 资源' }
  if (!config.expectedPublicIp || !resource.currentPublicIp) {
    return { disposition: 'blocked', code: 'IP_UNVERIFIED', message: '出口 IP 尚未完成校验' }
  }
  if (hasPublicIpDrift(resource, config.expectedPublicIp)) {
    return { disposition: 'blocked', code: 'IP_MISMATCH', message: '当前出口 IP 与阿里云分配的合规基线不一致' }
  }
  if (config.riskStatus === 'frequency_limited') {
    return { disposition: 'blocked', code: 'FREQUENCY_LIMITED', message: '该企微号已被发送频率或连续失败策略限制' }
  }
  const policy = riskPolicies.find((item) => item.accountId === accountId)
  const telemetry = getTelemetry(accountId)
  const cutoff = Date.now() - 60 * 60 * 1000
  telemetry.sentAt = telemetry.sentAt.filter((value) => new Date(value).getTime() >= cutoff)
  if (policy && telemetry.sentAt.length >= policy.hourlySendLimit) {
    return { disposition: 'blocked', code: 'HOURLY_LIMIT', message: `已达到每小时 ${policy.hourlySendLimit} 条发送上限` }
  }
  if (account.status !== 'online') {
    return { disposition: 'queued', code: 'ACCOUNT_OFFLINE', message: '企微号离线，消息已进入待发队列' }
  }
  if (resource.desktopStatus !== 'connected') {
    return { disposition: 'queued', code: 'DESKTOP_UNAVAILABLE', message: '云电脑暂不可用，消息已进入待发队列' }
  }
  if (resource.rpaStatus !== 'running') {
    return { disposition: 'queued', code: 'RPA_UNAVAILABLE', message: 'RPA 暂不可用，消息已进入待发队列' }
  }
  return { disposition: 'ready' }
}

export function recordOutboundDeliveryResult(accountId: string, result: 'sent' | 'failed') {
  const telemetry = getTelemetry(accountId)
  if (result === 'sent') {
    telemetry.sentAt.push(now())
    telemetry.consecutiveFailures = 0
    return
  }
  telemetry.consecutiveFailures += 1
  const policy = riskPolicies.find((item) => item.accountId === accountId)
  if (!policy || telemetry.consecutiveFailures < policy.consecutiveFailureLimit) return
  const config = getConfig(accountId)
  if (config.riskStatus !== 'frequency_limited') {
    config.riskStatus = 'frequency_limited'
    const id = `alert_delivery_${accountId}_${Date.now()}`
    riskAlerts.unshift({
      id,
      title: '连续发送失败达到阈值',
      detail: `连续失败 ${telemetry.consecutiveFailures} 次，已暂停自动发送。`,
      severity: 'high',
      status: 'open',
      accountId,
      resourceId: config.resourceId,
      triggeredAt: now(),
    })
    recordAudit({
      operator: 'system',
      action: '触发风控告警',
      targetType: 'alert',
      targetId: id,
      result: 'success',
      summary: `企微号 ${accountId} 连续发送失败达到阈值，已阻断后续发送`,
    })
    emit()
  }
}

function getProjectionBrowserId() {
  if (typeof window === 'undefined') return 'server'
  const key = 'chatflow.mock.browser-id'
  const existing = window.sessionStorage.getItem(key)
  if (existing) return existing
  const next = `browser_${Math.random().toString(36).slice(2, 10)}`
  window.sessionStorage.setItem(key, next)
  return next
}

function readProjectionSessions(): ProjectionSession[] {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(PROJECTION_STORAGE_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as ProjectionSession | ProjectionSession[]
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    window.localStorage.removeItem(PROJECTION_STORAGE_KEY)
    return []
  }
}

function readProjectionSession(desktopId: string) {
  return readProjectionSessions().find((session) => session.desktopId === desktopId)
}

function ensureProjectionChannel() {
  if (typeof window === 'undefined' || projectionChannel || !('BroadcastChannel' in window)) return
  projectionChannel = new BroadcastChannel(PROJECTION_CHANNEL_NAME)
  projectionChannel.onmessage = () => emitProjection()
}

function publishProjectionChange() {
  ensureProjectionChannel()
  projectionChannel?.postMessage({ type: 'projection-changed' })
  emitProjection()
}

function writeProjectionSessions(sessions: ProjectionSession[]) {
  if (typeof window === 'undefined') return
  if (sessions.length) window.localStorage.setItem(PROJECTION_STORAGE_KEY, JSON.stringify(sessions))
  else window.localStorage.removeItem(PROJECTION_STORAGE_KEY)
  publishProjectionChange()
}

function ensureResourceForAccount(accountId: string) {
  const account = listOpsWechatAccounts().find((item) => item.id === accountId)
  if (!account) throw new Error('企微号不存在或已停用')
  if (!account.enabled) throw new Error('企微号接入已禁用')
  const resource = getResource(account.resourceId)
  if (!resource) throw new Error('该企微号尚未绑定云电脑与 RPA 机器人')
  if (resource.desktopStatus !== 'connected') throw new Error('云电脑当前不可连接，请先处理资源异常')
  return { account, resource }
}

function assertTakeoverReady(accountId: string) {
  const { account, resource } = ensureResourceForAccount(accountId)
  if (account.status === 'banned') throw new Error('企微号处于封禁状态，暂不可人工接管')
  if (!account.expectedPublicIp || !resource.currentPublicIp) throw new Error('企微号与云电脑尚未完成出口 IP 校验，暂不可人工接管')
  if (hasPublicIpDrift(resource, account.expectedPublicIp)) throw new Error('云电脑出口 IP 不符合该企微号的合规要求，暂不可人工接管')
  if (resource.rpaStatus !== 'offline') throw new Error('请先在“云电脑 & RPA机器人管理”将机器人下线，再开始人工接管')
  return { account, resource }
}

export function listCloudRpaResources(): CloudRpaResource[] {
  return resources.map((resource) => ({ ...resource }))
}

export function listSelectableCloudRpaResources(accountId?: string): CloudRpaResource[] {
  return listCloudRpaResources().filter((resource) => !resource.boundAccountId || resource.boundAccountId === accountId)
}

export function getCloudRpaResourceForAccount(accountId?: string) {
  const resource = resources.find((item) => item.boundAccountId === accountId)
  return resource ? { ...resource } : undefined
}

export function listOpsWechatAccounts(): OpsWechatAccount[] {
  return wechatAccounts.map((account) => {
    const config = getConfig(account.id)
    const resource = getResource(config.resourceId)
    return {
      ...account,
      desktopId: resource?.cloudDesktopId,
      gameId: config.gameId,
      resourceId: config.resourceId,
      expectedPublicIp: config.expectedPublicIp,
      configVersion: config.version,
      riskStatus:
        !config.expectedPublicIp || !resource?.currentPublicIp
          ? 'ip_unverified'
          : hasPublicIpDrift(resource, config.expectedPublicIp)
            ? 'ip_mismatch'
            : config.riskStatus === 'frequency_limited'
              ? 'frequency_limited'
              : 'normal',
    }
  })
}

export function listRpaTasks(resourceId?: string): RpaTask[] {
  return rpaTasks.filter((task) => !resourceId || task.resourceId === resourceId).map((task) => ({ ...task }))
}

/** 控制台仅列出当前身份有号权限、已绑定资源的离线企微号。 */
export function listLoginReadyWechatAccounts(manageableGameIds: string[], visibleAccountIds: string[]): OpsWechatAccount[] {
  const manageableGames = new Set(manageableGameIds)
  const visibleAccounts = new Set(visibleAccountIds)
  return listOpsWechatAccounts().filter((account) => {
    const resource = getResource(account.resourceId)
    return account.enabled
      && account.status === 'offline'
      && resource?.desktopStatus === 'connected'
      && !!resource.currentPublicIp
      && !!account.expectedPublicIp
      && !hasPublicIpDrift(resource, account.expectedPublicIp)
      && resource.rpaStatus === 'offline'
      && activeGameIds().has(account.gameId)
      && manageableGames.has(account.gameId)
      && visibleAccounts.has(account.id)
  })
}

export function subscribeOpsAdmin(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getOpsAdminRevision() {
  return revision
}

export function useOpsAdminRevision() {
  return useSyncExternalStore(subscribeOpsAdmin, getOpsAdminRevision, getOpsAdminRevision)
}

export function listOpsRiskAlerts(): OpsRiskAlert[] {
  return riskAlerts.map((alert) => ({ ...alert }))
}

export function updateOpsRiskAlertStatus(id: string, status: OpsAlertStatus, actor: OpsActor) {
  assertOpsActor(actor, ['system_admin'])
  const alert = riskAlerts.find((item) => item.id === id)
  if (!alert) throw new Error('风险告警不存在')
  const allowed =
    (alert.status === 'open' && status === 'acknowledged') ||
    (alert.status === 'acknowledged' && status === 'resolved')
  if (!allowed) throw new Error('告警状态只能按“待处理 → 已确认 → 已解决”推进')
  alert.status = status
  alert.handledBy = actorName(actor)
  alert.resolvedAt = status === 'resolved' ? now() : undefined
  recordAudit({
    operator: actorName(actor),
    action: status === 'acknowledged' ? '确认风险告警' : '解决风险告警',
    targetType: 'alert',
    targetId: alert.id,
    result: 'success',
    summary: alert.title + '：' + (status === 'acknowledged' ? '已确认并开始处理' : '已记录恢复结果'),
  })
  emit()
}

export function listOpsRiskPolicies(): OpsRiskPolicy[] {
  return riskPolicies.map((policy) => ({ ...policy }))
}

export function saveOpsRiskPolicy(input: SaveOpsRiskPolicyInput, actor: OpsActor) {
  assertOpsActor(actor, ['system_admin'])
  const policy = riskPolicies.find((item) => item.id === input.id)
  if (!policy) throw new Error('风控策略不存在')
  assertOpsActor(actor, ['system_admin'], policy.accountId)
  if (input.expectedVersion !== policy.version) throw new Error('风控策略已被其他管理员更新，请刷新后重试')
  const reason = input.changeReason.trim()
  if (!reason || reason.length < 4) throw new Error('请填写至少 4 个字的调整原因')
  if (!Number.isInteger(input.hourlySendLimit) || input.hourlySendLimit < 1 || input.hourlySendLimit > policy.hardHourlyCap) {
    throw new Error('每小时发送上限需在 1-' + policy.hardHourlyCap + ' 之间')
  }
  if (
    !Number.isInteger(input.consecutiveFailureLimit) ||
    input.consecutiveFailureLimit < 1 ||
    input.consecutiveFailureLimit > policy.hardFailureCap
  ) {
    throw new Error('连续失败阈值需在 1-' + policy.hardFailureCap + ' 之间')
  }
  policy.hourlySendLimit = input.hourlySendLimit
  policy.consecutiveFailureLimit = input.consecutiveFailureLimit
  policy.version += 1
  policy.updatedAt = now()
  policy.updatedBy = actorName(actor)
  policy.changeReason = reason
  recordAudit({
    operator: actorName(actor),
    action: '更新风控策略',
    targetType: 'policy',
    targetId: policy.id,
    result: 'success',
    summary:
      '发送频率 ' +
      policy.hourlySendLimit +
      ' 条/小时，连续失败 ' +
      policy.consecutiveFailureLimit +
      ' 次；原因：' +
      reason,
  })
  emit()
}

export function listOpsAuditRecords(): OpsAuditRecord[] {
  return auditRecords.map((record) => ({ ...record }))
}

export function listForbiddenWordRules(): ForbiddenWordRule[] {
  return forbiddenWordRules.map((rule) => ({ ...rule, words: [...rule.words] }))
}

/** 工作台发送时按企微号所属游戏检查，与规则管理页共享同一份 Mock 词库。 */
export function detectForbiddenWords(text: string, gameId?: string): ForbiddenWordHit[] {
  const normalizedText = normalizeForbiddenText(text)
  if (!normalizedText || !gameId) return []
  return forbiddenWordRules
    .filter((rule) => rule.gameId === gameId && rule.enabled)
    .flatMap((rule) => rule.words
      .filter((word) => normalizedText.includes(normalizeForbiddenText(word)))
      .map((word) => ({ ruleId: rule.id, word })))
}

export function saveForbiddenWordRule(input: SaveForbiddenWordRuleInput, actor: OpsActor) {
  assertOpsActor(actor, ['system_admin'])
  const gameId = input.gameId
  const words = Array.from(new Map(
    input.words
      .map((word) => word.trim())
      .filter(Boolean)
      .map((word) => [normalizeForbiddenText(word), word]),
  ).values())
  if (!activeGameIds().has(gameId)) throw new Error('请选择一个启用游戏')
  if (words.length === 0) throw new Error('请至少输入一个违禁词')
  if (words.length > 50) throw new Error('单个游戏最多配置 50 个违禁词')
  if (words.some((word) => word.length > 64)) throw new Error('单个违禁词不超过 64 个字符')
  if (forbiddenWordRules.some((rule) => rule.id !== input.id && rule.gameId === gameId)) throw new Error('该游戏已存在违禁词规则')

  const updatedAt = now()
  if (input.id) {
    const index = forbiddenWordRules.findIndex((rule) => rule.id === input.id)
    if (index < 0) throw new Error('违禁词规则不存在')
    const current = forbiddenWordRules[index]
    if (input.expectedVersion !== current.version) throw new Error('违禁词规则已被其他管理员更新，请刷新后重试')
    forbiddenWordRules[index] = { ...current, gameId, words, enabled: input.enabled, updatedAt, version: current.version + 1 }
  } else {
    forbiddenWordRules = [
      { id: `forbidden_${Date.now()}`, gameId, words, enabled: input.enabled, updatedAt, version: 1 },
      ...forbiddenWordRules,
    ]
  }
  recordAudit({
    operator: actorName(actor),
    action: input.id ? '编辑违禁词规则' : '新建违禁词规则',
    targetType: 'rule',
    targetId: input.id ?? forbiddenWordRules[0].id,
    result: 'success',
    summary: '游戏 ' + gameId + ' 配置 ' + words.length + ' 个词条',
  })
  emit()
}

export function setForbiddenWordRuleEnabled(id: string, enabled: boolean, expectedVersion: number, actor: OpsActor) {
  assertOpsActor(actor, ['system_admin'])
  const rule = forbiddenWordRules.find((item) => item.id === id)
  if (!rule) throw new Error('违禁词规则不存在')
  if (expectedVersion !== rule.version) throw new Error('违禁词规则已被其他管理员更新，请刷新后重试')
  rule.enabled = enabled
  rule.updatedAt = now()
  rule.version += 1
  recordAudit({
    operator: actorName(actor),
    action: enabled ? '启用违禁词规则' : '停用违禁词规则',
    targetType: 'rule',
    targetId: rule.id,
    result: 'success',
    summary: '游戏 ' + rule.gameId + ' 的规则状态已更新',
  })
  emit()
}

export function deleteForbiddenWordRule(id: string, expectedVersion: number, actor: OpsActor) {
  assertOpsActor(actor, ['system_admin'])
  const rule = forbiddenWordRules.find((item) => item.id === id)
  if (!rule) throw new Error('违禁词规则不存在')
  if (expectedVersion !== rule.version) throw new Error('违禁词规则已被其他管理员更新，请刷新后重试')
  forbiddenWordRules = forbiddenWordRules.filter((rule) => rule.id !== id)
  recordAudit({
    operator: actorName(actor),
    action: '删除违禁词规则',
    targetType: 'rule',
    targetId: id,
    result: 'success',
    summary: '删除游戏 ' + rule.gameId + ' 的违禁词规则',
  })
  emit()
}

export function subscribeProjection(listener: () => void) {
  projectionListeners.add(listener)
  if (typeof window !== 'undefined') {
    ensureProjectionChannel()
    const onStorage = (event: StorageEvent) => {
      if (event.key === PROJECTION_STORAGE_KEY) emitProjection()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      projectionListeners.delete(listener)
      window.removeEventListener('storage', onStorage)
    }
  }
  return () => projectionListeners.delete(listener)
}

export function getProjectionSessionState(desktopId?: string): ProjectionSessionState {
  if (!desktopId) return { state: 'idle', isOwner: false }
  const session = readProjectionSession(desktopId)
  if (!session) return { state: 'idle', isOwner: false }
  const isOwner = session.browserId === getProjectionBrowserId()
  return { session, state: isOwner ? 'active' : 'evicted', isOwner }
}

function getProjectionSessionSignature() {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(PROJECTION_STORAGE_KEY) ?? ''
}

export function useProjectionSession(desktopId?: string) {
  const signature = useSyncExternalStore(
    subscribeProjection,
    getProjectionSessionSignature,
    () => '',
  )
  return useMemo(() => {
    if (!desktopId) return { state: 'idle', isOwner: false } satisfies ProjectionSessionState
    if (!signature) return { state: 'idle', isOwner: false } satisfies ProjectionSessionState
    try {
      const parsed = JSON.parse(signature) as ProjectionSession | ProjectionSession[]
      const session = (Array.isArray(parsed) ? parsed : [parsed]).find((item) => item.desktopId === desktopId)
      if (!session) return { state: 'idle', isOwner: false } satisfies ProjectionSessionState
      const isOwner = session.browserId === getProjectionBrowserId()
      return { session, state: isOwner ? 'active' : 'evicted', isOwner }
    } catch {
      return { state: 'idle', isOwner: false } satisfies ProjectionSessionState
    }
  }, [desktopId, signature])
}

/** 新浏览器仅覆盖同一云电脑的旧会话；旧浏览器通过 storage / BroadcastChannel 收到被挤出状态。 */
export function openDesktopProjection(accountId: string, actor: OpsActor) {
  assertOpsActor(actor, ['system_admin', 'operations_supervisor'], accountId)
  const { resource } = ensureResourceForAccount(accountId)
  const session: ProjectionSession = {
    desktopId: resource.cloudDesktopId,
    accountId,
    browserId: getProjectionBrowserId(),
    mode: 'observe',
    startedAt: now(),
  }
  writeProjectionSessions([...readProjectionSessions().filter((item) => item.desktopId !== resource.cloudDesktopId), session])
  return session
}

export function startManualTakeover(accountId: string, actor: OpsActor) {
  assertOpsActor(actor, ['system_admin', 'operations_supervisor'], accountId)
  const { resource } = assertTakeoverReady(accountId)
  const current = readProjectionSession(resource.cloudDesktopId)
  if (!current || current.browserId !== getProjectionBrowserId()) {
    throw new Error('请先在当前浏览器打开该云桌面的只读监控')
  }
  const next: ProjectionSession = { ...current, mode: 'takeover' }
  writeProjectionSessions([...readProjectionSessions().filter((item) => item.desktopId !== resource.cloudDesktopId), next])
  recordAudit({
    operator: actorName(actor),
    action: '开始人工接管',
    targetType: 'projection',
    targetId: resource.cloudDesktopId,
    result: 'success',
    summary: '接管企微号 ' + accountId + ' 的云电脑',
  })
  emit()
  return next
}

export function exitDesktopProjection(desktopId: string, actor: OpsActor) {
  const current = readProjectionSession(desktopId)
  if (!current) return
  assertOpsActor(actor, ['system_admin', 'operations_supervisor'], current.accountId)
  if (current.browserId !== getProjectionBrowserId()) throw new Error('当前浏览器不持有该云桌面的投屏会话')
  writeProjectionSessions(readProjectionSessions().filter((item) => item.desktopId !== desktopId))
  recordAudit({
    operator: actorName(actor),
    action: current.mode === 'takeover' ? '结束人工接管' : '关闭只读投屏',
    targetType: 'projection',
    targetId: desktopId,
    result: 'success',
    summary: '投屏会话已关闭，企微与 RPA 状态保持不变',
  })
  emit()
}

export function saveOpsWechatAccount(input: SaveOpsWechatAccountInput, actor: OpsActor) {
  assertOpsActor(actor, ['system_admin'])
  const accountId = input.accountId.trim()
  const shortName = input.shortName.trim()
  const corpId = input.corpId.trim()
  if (!accountId) throw new Error('请输入企微号 ID')
  if (!shortName) throw new Error('请输入企微号名称')
  if (!corpId) throw new Error('请输入企业微信 corpId')
  if (!activeGameIds().has(input.gameId)) throw new Error('请选择一个启用游戏')
  if (!input.resourceId) throw new Error('请选择云电脑与 RPA 机器人资源')
  if (input.id && input.id !== accountId) throw new Error('编辑时不可修改企微号 ID')

  const resource = getResource(input.resourceId)
  if (!resource) throw new Error('所选云电脑资源不存在')
  if (resource.boundAccountId && resource.boundAccountId !== accountId) throw new Error('所选云电脑资源已绑定其他企微号')

  const existing = wechatAccounts.find((account) => account.id === accountId)
  if (!input.id && existing) throw new Error('该企微号 ID 已存在')
  const oldConfig = existing ? getConfig(accountId) : undefined
  if (existing && input.expectedVersion !== oldConfig?.version) throw new Error('企微号配置已被其他管理员更新，请刷新后重试')
  if (!resource.assignedPublicIp) throw new Error('所选云电脑尚未从阿里云同步分配公网 IP')
  if (!resource.currentPublicIp) throw new Error('所选云电脑尚未完成当前出口 IP 检测')
  if (hasPublicIpDrift(resource, resource.assignedPublicIp)) throw new Error('所选云电脑当前出口 IP 与阿里云分配 IP 不一致')
  const oldResource = getResource(oldConfig?.resourceId)
  if (oldResource && oldResource.id !== resource.id && oldResource.rpaStatus !== 'offline') {
    throw new Error('请先将原绑定机器人下线，再调整云电脑资源')
  }
  if (oldResource && oldResource.id !== resource.id) oldResource.boundAccountId = undefined

  resource.boundAccountId = accountId
  resource.updatedAt = now()
  const nextConfig: AccountConfig = {
    gameId: input.gameId,
    resourceId: resource.id,
    expectedPublicIp: resource.assignedPublicIp,
    riskStatus: oldConfig?.riskStatus ?? 'normal',
    version: (oldConfig?.version ?? 0) + 1,
  }
  accountConfigs = { ...accountConfigs, [accountId]: nextConfig }

  const nextAccount: WechatAccount = existing ?? {
    id: accountId,
    corpId,
    shortName,
    status: 'offline' as WechatAccountStatus,
    enabled: true,
    unreadCount: 0,
    lastActiveAt: now(),
  }
  nextAccount.shortName = shortName
  nextAccount.corpId = corpId
  syncChatAccount(nextAccount, nextConfig)
  if (!existing) {
    wechatAccounts.push(nextAccount)
    riskPolicies = [
      {
        id: 'policy_' + accountId,
        accountId,
        hourlySendLimit: 100,
        hardHourlyCap: 1000,
        consecutiveFailureLimit: 5,
        hardFailureCap: 20,
        version: 1,
        updatedAt: now(),
        updatedBy: actorName(actor),
        changeReason: '新账号采用保守默认值',
      },
      ...riskPolicies,
    ]
  }
  recordAudit({
    operator: actorName(actor),
    action: existing ? '编辑企微号配置' : '新建企微号配置',
    targetType: 'account',
    targetId: accountId,
    result: 'success',
    summary: '游戏 ' + input.gameId + '，绑定资源 ' + resource.id,
  })
  emit()
}

export function setOpsWechatAccountEnabled(accountId: string, enabled: boolean, expectedVersion: number, actor: OpsActor) {
  assertOpsActor(actor, ['system_admin'], accountId)
  const account = wechatAccounts.find((item) => item.id === accountId)
  if (!account) throw new Error('企微号不存在')
  const config = getConfig(accountId)
  if (config.version !== expectedVersion) throw new Error('企微号配置已被其他管理员更新，请刷新后重试')
  if (account.enabled === enabled) return
  account.enabled = enabled
  config.version += 1
  if (!enabled) {
    const resource = getResource(config.resourceId)
    if (resource) {
      pauseResourceTasks(resource.id, '企微号接入已禁用', 'account_disabled')
      resource.rpaStatus = 'offline'
      resource.updatedAt = now()
      resource.version += 1
    }
  } else if (config.resourceId) {
    rpaTasks.forEach((task) => {
      if (task.resourceId !== config.resourceId || task.pauseCode !== 'account_disabled') return
      task.pauseCode = 'robot_offline'
      task.pauseReason = '企微号已重新启用，等待管理员上线机器人'
      task.updatedAt = now()
    })
  }
  recordAudit({
    operator: actorName(actor),
    action: enabled ? '启用企微号配置' : '禁用企微号配置',
    targetType: 'account',
    targetId: accountId,
    result: 'success',
    summary: enabled
      ? '接入配置已恢复；资源绑定保留，机器人需人工上线'
      : '接入配置已禁用；资源绑定、历史会话、任务与审计均保留',
  })
  emit()
}

export function markOpsWechatAccountOnline(accountId: string, actor: OpsActor) {
  assertOpsActor(actor, ['system_admin', 'operations_supervisor'], accountId)
  const account = wechatAccounts.find((item) => item.id === accountId)
  if (!account) throw new Error('企微号不存在或已停用')
  if (!account.enabled) throw new Error('企微号接入已禁用，无法登录')
  if (account.status === 'banned') throw new Error('企微号处于封禁状态，无法登录')
  account.status = 'online'
  account.lastActiveAt = now()
  recordAudit({
    operator: actorName(actor),
    action: '企微号登录',
    targetType: 'account',
    targetId: accountId,
    result: 'success',
    summary: '企微客户端状态更新为在线',
  })
  emit()
}

/**
 * Mock 云桌面内的“退出企业微信”动作。
 * 它只改变企微客户端登录状态；资源绑定、RPA 与浏览器投屏会话保持不变。
 */
export function markOpsWechatAccountOffline(accountId: string, actor: OpsActor) {
  assertOpsActor(actor, ['system_admin', 'operations_supervisor'], accountId)
  const account = wechatAccounts.find((item) => item.id === accountId)
  if (!account) throw new Error('企微号不存在或已停用')
  account.status = 'offline'
  account.lastActiveAt = now()
  recordAudit({
    operator: actorName(actor),
    action: '企微号退出',
    targetType: 'account',
    targetId: accountId,
    result: 'success',
    summary: '企微客户端状态更新为离线',
  })
  emit()
}

export function setRpaResourceOffline(resourceId: string, expectedVersion: number, actor: OpsActor) {
  assertOpsActor(actor, ['system_admin'])
  const resource = getResource(resourceId)
  if (!resource) throw new Error('云电脑资源不存在')
  if (resource.version !== expectedVersion) throw new Error('资源状态已被其他管理员更新，请刷新后重试')
  if (resource.rpaStatus === 'fault') throw new Error('故障中的机器人不可直接下线，请先处理资源异常')
  const pausedCount = pauseResourceTasks(resourceId, '机器人已下线，等待人工接管或运维恢复', 'robot_offline')
  resource.rpaStatus = 'offline'
  resource.updatedAt = now()
  resource.version += 1
  recordAudit({
    operator: actorName(actor),
    action: '下线 RPA 机器人',
    targetType: 'resource',
    targetId: resourceId,
    result: 'success',
    summary: '暂停 ' + pausedCount + ' 个运行中任务，云电脑保持可连接',
  })
  emit()
  return pausedCount
}

export function setRpaResourceRunning(resourceId: string, expectedVersion: number, actor: OpsActor) {
  assertOpsActor(actor, ['system_admin'])
  const resource = getResource(resourceId)
  if (!resource) throw new Error('云电脑资源不存在')
  if (resource.version !== expectedVersion) throw new Error('资源状态已被其他管理员更新，请刷新后重试')
  if (resource.rpaStatus === 'fault') throw new Error('故障中的机器人不可直接上线，请先处理资源异常')
  if (resource.desktopStatus !== 'connected') throw new Error('云电脑不可连接，无法上线机器人')
  if (!resource.boundAccountId) throw new Error('请先绑定企微号，再上线机器人')
  const config = getConfig(resource.boundAccountId)
  if (!config.expectedPublicIp || !resource.currentPublicIp) throw new Error('企微号与云电脑尚未完成出口 IP 校验，无法上线机器人')
  if (hasPublicIpDrift(resource, config.expectedPublicIp)) {
    recordAudit({
      operator: actorName(actor),
      action: '上线 RPA 机器人',
      targetType: 'resource',
      targetId: resourceId,
      result: 'rejected',
      summary: '出口 IP 与合规基准不一致，已拒绝上线',
    })
    emit()
    throw new Error('云电脑出口 IP 不符合该企微号的合规要求，无法上线机器人')
  }
  const account = listOpsWechatAccounts().find((item) => item.id === resource.boundAccountId)
  if (!account) throw new Error('企微号不存在或已停用')
  if (!account.enabled) throw new Error('企微号接入已禁用，无法上线机器人')
  if (account.status === 'banned') throw new Error('企微号处于封禁状态，无法上线机器人')
  if (account.status !== 'online') throw new Error('企微号未登录，无法上线机器人')
  if (readProjectionSession(resource.cloudDesktopId)?.mode === 'takeover') {
    throw new Error('当前云电脑正在人工接管，请先关闭接管会话')
  }
  resource.rpaStatus = 'running'
  resource.updatedAt = now()
  resource.version += 1
  const resumedCount = resumeResourceTasks(resourceId)
  recordAudit({
    operator: actorName(actor),
    action: '上线 RPA 机器人',
    targetType: 'resource',
    targetId: resourceId,
    result: 'success',
    summary: '恢复 ' + resumedCount + ' 个因机器人下线而暂停的任务',
  })
  emit()
  return resumedCount
}
