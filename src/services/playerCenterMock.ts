/**
 * player-center 领域本地 Mock 数据 + Mock store + 广播机制。
 *
 * 真实链路:
 * - 玩家 / 关系 / 备注 / 描述 / 标签 / 关系状态 → 企业微信 API
 * - 自定义字段 → ChatFlow 自维护
 * - 会话与消息 → 反查 chat-workbench 会话存档(本领域不重存)
 *
 * V1 全部走本文件 + 内存事件流;ChatFlow 端为权威源。
 */
import type {
  ConversationIndexEntry,
  ConversationRoundEntry,
  PlayerCenterEvent,
  PlayerCenterEventListener,
  PlayerNoteEditPayload,
  PlayerProfile,
  PlayerRelation,
  RelationEditPayload,
  RelationStatus,
  TagDef,
} from '../types/playerCenter'
import type { Conversation, Message } from '../types/chat'
import { findAccount, players } from './chatflowMock'
import { getWorkbenchRuntime } from './workbenchRuntimeMock'

// ─────────────────────────────────────────────────────────────────────────────
// 标签库(标签 + 分组;deprecated 样例供边界场景演示)
// ─────────────────────────────────────────────────────────────────────────────

export const tagLibrary: TagDef[] = [
  { id: 'tag_vip_a', label: 'VIP-A', groupLabel: '等级' },
  { id: 'tag_vip_b', label: 'VIP-B', groupLabel: '等级' },
  { id: 'tag_vip_c', label: 'VIP-C', groupLabel: '等级' },
  { id: 'tag_high_value', label: '高消费', groupLabel: '行为' },
  { id: 'tag_churn_risk', label: '流失风险', groupLabel: '行为' },
  { id: 'tag_new_user', label: '新增', groupLabel: '行为' },
  { id: 'tag_focus', label: '重点跟进', groupLabel: '关注' },
  { id: 'tag_complaint', label: '投诉', groupLabel: '关注', deprecated: true },
]

// ─────────────────────────────────────────────────────────────────────────────
// 真人身份唯一来自 chatflowMock.players；本领域只保存性别与自定义信息扩展，避免复制昵称/头像。
// ─────────────────────────────────────────────────────────────────────────────

const profileDetails: Record<string, Pick<PlayerProfile, 'gender' | 'customNote'>> = {}

// 微信性别(企微好友资料;缺省 unknown)
const genderSeed: Record<string, PlayerProfile['gender']> = {
  p_xiaoqi: 'female',
  p_xiaobai: 'male',
  p_xiaolin: 'female',
  p_xiaohe: 'male',
  p_xiaomei: 'female',
  p_xiaotao: 'female',
  p_axian: 'male',
  p_dahai: 'male',
  p_xiaowu: 'male',
  p_kaikai: 'unknown',
}

players.forEach((p) => {
  profileDetails[p.id] = {
    gender: genderSeed[p.id] ?? 'unknown',
    customNote: '',
  }
})

// 给部分玩家挂自定义信息(单一文本字段)
profileDetails.p_xiaoqi.customNote = '游戏 UID 10086001;S101 烽火;钻石档'
profileDetails.p_xiaobai.customNote = '游戏 UID 10086002;首充活动关注'
profileDetails.p_xiaolin.customNote = '高消费;近期投诉到账延迟,需重点跟进'
profileDetails.p_xiaotao.customNote = '老客;稳定续费'
profileDetails.p_axian.customNote = '广告渠道试客,首日未成交'
profileDetails.p_dahai.customNote = '充值大户;倾向私域专属客服;直接对接'
profileDetails.p_xiaowu.customNote = '业务调整后下线,无效关系'
profileDetails.p_kaikai.customNote = '已被玩家拉黑;主动发起会被禁'

// ─────────────────────────────────────────────────────────────────────────────
// 关系记录(玩家×企微号);覆盖 normal / removed_by_agent / removed_by_player 三态
// ─────────────────────────────────────────────────────────────────────────────

interface RelationSeed extends Omit<PlayerRelation, 'updatedAt' | 'addedAt' | 'deletedAt' | 'corpId' | 'externalUserId' | 'syncVersion' | 'syncStatus' | 'lastSyncedAt'> {
  addedAt: string
  updatedAt?: string
  deletedAt?: string
}

const relationSeeds: RelationSeed[] = [
  {
    playerId: 'p_xiaoqi',
    accountId: 'wx_xiaoqin',
    remark: '小琪 / VIP-001',
    description: '常玩三国题材;周末活跃,对新版本敏感',
    tagIds: ['tag_vip_a', 'tag_high_value', 'tag_focus'],
    relationStatus: 'normal',
    addedAt: '2026-03-12T10:00:00+08:00',
    updatedAt: '2026-05-18T14:30:00+08:00',
  },
  {
    playerId: 'p_xiaobai',
    accountId: 'wx_xiaoqin',
    remark: '小白 / 新客 0518',
    description: '通过老客介绍加入;关心首充活动',
    tagIds: ['tag_vip_b', 'tag_new_user'],
    relationStatus: 'normal',
    addedAt: '2026-05-18T11:00:00+08:00',
    updatedAt: '2026-05-18T11:55:00+08:00',
  },
  {
    playerId: 'p_xiaobai',
    accountId: 'wx_xiaobei',
    remark: '小白 / 备号关注',
    description: '备号管理时联系;主号在小琴号',
    tagIds: ['tag_new_user'],
    relationStatus: 'normal',
    addedAt: '2026-05-18T11:30:00+08:00',
    updatedAt: '2026-05-18T11:55:00+08:00',
  },
  {
    playerId: 'p_xiaolin',
    accountId: 'wx_xiaoqin',
    remark: '小琳 / 高消费',
    description: '上月充值 5000+;偶发投诉到账延迟',
    tagIds: ['tag_vip_a', 'tag_high_value', 'tag_focus'],
    relationStatus: 'normal',
    addedAt: '2026-02-08T18:20:00+08:00',
    updatedAt: '2026-05-18T15:38:00+08:00',
  },
  {
    playerId: 'p_xiaohe',
    accountId: 'wx_xiaobei',
    remark: '小贺',
    description: '老客;玩家曾删除好友,最近一次会话已结束',
    tagIds: ['tag_vip_c'],
    relationStatus: 'removed_by_player',
    addedAt: '2026-04-01T09:00:00+08:00',
    updatedAt: '2026-05-17T16:30:00+08:00',
    deletedAt: '2026-05-17T16:30:00+08:00',
  },
  {
    playerId: 'p_xiaomei',
    accountId: 'wx_xiaoqin',
    remark: '小梅 / 待回访',
    description: '等下次活动通知',
    tagIds: ['tag_vip_b', 'tag_focus'],
    relationStatus: 'normal',
    addedAt: '2026-04-22T15:00:00+08:00',
    updatedAt: '2026-05-18T13:00:00+08:00',
  },
  {
    playerId: 'p_xiaotao',
    accountId: 'wx_xiaoqin',
    remark: '小桃 / 老客',
    description: '稳定续费;偶尔发图文反馈',
    tagIds: ['tag_vip_a', 'tag_high_value'],
    relationStatus: 'normal',
    addedAt: '2025-12-15T10:00:00+08:00',
    updatedAt: '2026-05-16T11:20:00+08:00',
  },
  {
    playerId: 'p_axian',
    accountId: 'wx_xiaoqin',
    remark: '阿弦 / 试客',
    description: '通过广告进入;首日有过咨询但未成交',
    tagIds: ['tag_new_user', 'tag_churn_risk'],
    relationStatus: 'normal',
    addedAt: '2026-05-10T20:00:00+08:00',
    updatedAt: '2026-05-12T19:30:00+08:00',
  },
  {
    playerId: 'p_axian',
    accountId: 'wx_xiaojuan',
    remark: '阿弦 / 备号添加',
    description: '在小娟号也加了好友;号已封禁,无法发起',
    tagIds: ['tag_new_user'],
    relationStatus: 'normal',
    addedAt: '2026-05-11T08:00:00+08:00',
    updatedAt: '2026-05-11T08:00:00+08:00',
  },
  {
    playerId: 'p_dahai',
    accountId: 'wx_xiaoqin',
    remark: '大海 / 高消费',
    description: '充值大户;直接对接;倾向私域专属客服',
    tagIds: ['tag_vip_a', 'tag_high_value', 'tag_focus'],
    relationStatus: 'normal',
    addedAt: '2025-11-02T09:30:00+08:00',
    updatedAt: '2026-05-19T10:00:00+08:00',
  },
  {
    playerId: 'p_dahai',
    accountId: 'wx_xiaobei',
    remark: '大海 / 备号',
    description: '备号触达;主联系仍在小琴号',
    tagIds: ['tag_high_value'],
    relationStatus: 'normal',
    addedAt: '2026-01-08T14:00:00+08:00',
    updatedAt: '2026-04-22T11:00:00+08:00',
  },
  {
    playerId: 'p_dahai',
    accountId: 'wx_xiaojuan',
    remark: '大海 / 旧号(已弃)',
    description: '旧管家小娟号上的备份关系;已被该号管家主动删除',
    tagIds: ['tag_high_value'],
    relationStatus: 'removed_by_agent',
    addedAt: '2025-08-12T09:00:00+08:00',
    updatedAt: '2026-04-18T10:30:00+08:00',
    deletedAt: '2026-04-18T10:30:00+08:00',
  },
  {
    playerId: 'p_xiaowu',
    accountId: 'wx_xiaobei',
    remark: '小武 / 已下线',
    description: '业务调整;管家主动清理无效关系',
    tagIds: ['tag_churn_risk'],
    relationStatus: 'removed_by_agent',
    addedAt: '2025-09-22T16:00:00+08:00',
    updatedAt: '2026-03-05T17:30:00+08:00',
    deletedAt: '2026-03-05T17:30:00+08:00',
  },
  {
    playerId: 'p_kaikai',
    accountId: 'wx_xiaoqin',
    remark: '凯凯 / 拉黑警示',
    description: '玩家侧主动删除好友;尝试主动发起会作为受限路径',
    tagIds: ['tag_churn_risk', 'tag_complaint'],
    relationStatus: 'removed_by_player',
    addedAt: '2026-02-14T11:00:00+08:00',
    updatedAt: '2026-04-30T20:10:00+08:00',
    deletedAt: '2026-04-30T20:10:00+08:00',
  },
]

const relationKey = (playerId: string, accountId: string) => `${playerId}::${accountId}`

function externalUserIdFor(playerId: string): string {
  return `external_${playerId}`
}

const duplicateRelationKeys = relationSeeds
  .map((seed) => relationKey(seed.playerId, seed.accountId))
  .filter((key, index, all) => all.indexOf(key) !== index)
if (duplicateRelationKeys.length) {
  throw new Error(`玩家关系种子存在重复复合键：${duplicateRelationKeys.join('、')}`)
}

const relationStore = new Map<string, PlayerRelation>(
  relationSeeds.map((seed) => [
    relationKey(seed.playerId, seed.accountId),
    {
      ...seed,
      corpId: findAccount(seed.accountId)?.corpId ?? 'unknown_corp',
      externalUserId: externalUserIdFor(seed.playerId),
      updatedAt: seed.updatedAt ?? seed.addedAt,
      syncVersion: 1,
      syncStatus: 'synced',
      lastSyncedAt: seed.updatedAt ?? seed.addedAt,
    },
  ]),
)

// ─────────────────────────────────────────────────────────────────────────────
// 会话索引(本领域反查 chat-workbench 的会话与消息;不重存)
// ─────────────────────────────────────────────────────────────────────────────

/** 会话 / 轮次的回落字段(取自 Conversation,用于无有效消息时兜底) */
interface SummaryFallback {
  lastMessagePreview?: string
  lastMessageAt?: string
  createdAt: string
}

/**
 * 从一组消息汇总 lastMessage / messageCount / firstMessageAt。
 * 口径:只排除 system;发送中 / 失败消息也是会话历史的一部分,必须计数且参与最后消息判断。
 * 既用于整会话(buildConversationIndex),也用于单轮(buildConversationRounds)。
 */
function summarizeMessages(
  msgs: Message[],
  fallback: SummaryFallback,
): Pick<ConversationIndexEntry, 'lastMessage' | 'messageCount' | 'firstMessageAt'> {
  const nonSystem = [...msgs]
    .filter((m) => m.contentType !== 'system')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const last = nonSystem[nonSystem.length - 1]
  const first = nonSystem[0]
  return {
    lastMessage: {
      senderType: last?.direction === 'outgoing' ? 'agent' : 'player',
      senderId: last?.senderId ?? '',
      sentAt: last?.createdAt ?? fallback.lastMessageAt ?? fallback.createdAt,
      contentPreview:
        last?.text?.slice(0, 30) ??
        fallback.lastMessagePreview ??
        (last?.contentType === 'image'
          ? '[图片]'
          : last?.contentType === 'video'
            ? '[视频]'
            : last?.contentType === 'file'
              ? `[文件] ${last.mediaName ?? ''}`
              : ''),
    },
    messageCount: nonSystem.length,
    firstMessageAt: first?.createdAt ?? fallback.createdAt,
  }
}

/**
 * 会话/消息的反查源 = chat-workbench 的 SPA 运行态单一来源。
 * player-center 不重存，因此既能看到 seed / 已落库主动发起会话，也能在不刷新页面时
 * 看到本次运行中新收、新发及状态变化后的会话。
 */
function allConversations(): Conversation[] {
  return getWorkbenchRuntime().conversations.filter((conversation) => !conversation.isProvisional)
}

function allMessages(): Message[] {
  return getWorkbenchRuntime().messages
}

function buildConversationIndex(): ConversationIndexEntry[] {
  const msgs = allMessages()
  return allConversations().map((c) => ({
    conversationId: c.id,
    accountId: c.accountId,
    playerId: c.playerId,
    ...summarizeMessages(
      msgs.filter((m) => m.conversationId === c.id),
      c,
    ),
  }))
}

/**
 * 按 system「本次会话已结束」边界把一条会话的消息切成多轮(含 system 消息)。
 * 规则与 chat-workbench `splitRoundsByEnded` 一致:先 push 再判断结束边界、末尾空轮丢弃。
 * 这里独立实现一份,避免改动已 review 的 chat-workbench。
 */
function splitConversationRounds(conversationId: string): Message[][] {
  const msgs = allMessages()
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  if (msgs.length === 0) return []
  const rounds: Message[][] = [[]]
  for (const m of msgs) {
    rounds[rounds.length - 1].push(m)
    if (m.direction === 'system' && (m.systemEvent === 'conversation_ended' || (!m.systemEvent && typeof m.text === 'string' && m.text.includes('本次会话已结束')))) {
      rounds.push([])
    }
  }
  if (rounds[rounds.length - 1].length === 0) rounds.pop()
  return rounds
}

/** 每个会话按轮次展开为多个条目(`/messages` 以此为最小展示单位) */
function buildConversationRounds(): ConversationRoundEntry[] {
  const entries: ConversationRoundEntry[] = []
  allConversations().forEach((c) => {
    const rounds = splitConversationRounds(c.id)
    // 无消息的会话仍出一行(回落 conversation 预览)
    if (rounds.length === 0) {
      entries.push({
        conversationId: c.id,
        accountId: c.accountId,
        playerId: c.playerId,
        ...summarizeMessages([], c),
        roundId: `${c.id}#1`,
        roundIndex: 1,
        roundCount: 1,
      })
      return
    }
    const roundCount = rounds.length
    rounds.forEach((roundMsgs, i) => {
      const roundIndex = i + 1
      entries.push({
        conversationId: c.id,
        accountId: c.accountId,
        playerId: c.playerId,
        ...summarizeMessages(roundMsgs, c),
        roundId: `${c.id}#${roundIndex}`,
        roundIndex,
        roundCount,
      })
    })
  })
  return entries
}

// ─────────────────────────────────────────────────────────────────────────────
// 广播机制(简易事件总线)
// ─────────────────────────────────────────────────────────────────────────────

const listeners = new Set<PlayerCenterEventListener>()

export function subscribePlayerCenter(listener: PlayerCenterEventListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function emit(event: PlayerCenterEvent) {
  listeners.forEach((listener) => {
    try {
      listener(event)
    } catch (err) {
      // 单个订阅者出错不阻塞其他订阅者
      console.error('[playerCenterMock] listener error', err)
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 查询 helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getProfile(playerId: string): PlayerProfile | undefined {
  const player = players.find((item) => item.id === playerId)
  const details = profileDetails[playerId]
  if (!player || !details) return undefined
  return {
    playerId: player.id,
    nickname: player.nickname,
    avatarUrl: player.avatar,
    gender: details.gender,
    customNote: details.customNote,
  }
}

export function getAllRelations(): PlayerRelation[] {
  return Array.from(relationStore.values())
}

export function getRelation(
  playerId: string,
  accountId: string,
): PlayerRelation | undefined {
  return relationStore.get(relationKey(playerId, accountId))
}

export function getRelationsByPlayer(playerId: string): PlayerRelation[] {
  return getAllRelations().filter((r) => r.playerId === playerId)
}

export function getRelationsByAccount(accountId: string): PlayerRelation[] {
  return getAllRelations().filter((r) => r.accountId === accountId)
}

export function getConversationIndex(): ConversationIndexEntry[] {
  return buildConversationIndex()
}

export function getConversationIndexById(
  conversationId: string,
): ConversationIndexEntry | undefined {
  return buildConversationIndex().find((c) => c.conversationId === conversationId)
}

/** 会话轮次条目(`/messages` 以轮次为维度展示) */
export function getConversationRounds(visibleAccountIds?: string[]): ConversationRoundEntry[] {
  const visibleSet = visibleAccountIds ? new Set(visibleAccountIds) : null
  return buildConversationRounds().filter((round) => !visibleSet || visibleSet.has(round.accountId))
}

/** 取某会话某一轮(1-based)的消息(供 `/messages` 消息内容按轮筛选);含 system 消息 */
export function getRoundMessages(conversationId: string, roundIndex: number): Message[] {
  return splitConversationRounds(conversationId)[roundIndex - 1] ?? []
}

/** 取整会话全部消息(seed + 已落库主动发起),按时间升序;供会话只读 Drawer 整会话浏览 */
export function getConversationMessages(conversationId: string): Message[] {
  return allMessages()
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function getLatestConversationByRelation(
  playerId: string,
  accountId: string,
): ConversationIndexEntry | undefined {
  return buildConversationIndex()
    .filter((c) => c.playerId === playerId && c.accountId === accountId)
    .sort((a, b) => b.lastMessage.sentAt.localeCompare(a.lastMessage.sentAt))[0]
}

export function getTagsByIds(tagIds: string[]): TagDef[] {
  return tagIds
    .map((id) => tagLibrary.find((t) => t.id === id))
    .filter((t): t is TagDef => Boolean(t))
}

export function listAccountsAvailable() {
  // 当前客服可见企微号集合(V1 演示假定全部可见;真实 permission 由后端返回)
  const ids = new Set<string>()
  getAllRelations().forEach((r) => ids.add(r.accountId))
  return Array.from(ids)
    .map((id) => findAccount(id))
    .filter((a): a is NonNullable<ReturnType<typeof findAccount>> => Boolean(a))
}

// ─────────────────────────────────────────────────────────────────────────────
// 写入 mutators(写回 store + emit;不区分编辑入口,用于详情页跨号 tab + slot 共用)
// ─────────────────────────────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString()
}

export function updateRelationFields(payload: RelationEditPayload): PlayerRelation | undefined {
  const key = relationKey(payload.playerId, payload.accountId)
  const current = relationStore.get(key)
  if (!current) return undefined
  if (payload.expectedVersion !== undefined && payload.expectedVersion !== current.syncVersion) {
    const conflicted = { ...current, syncStatus: 'conflict' as const }
    relationStore.set(key, conflicted)
    emit({
      type: 'relation_changed',
      payload: { playerId: payload.playerId, accountId: payload.accountId, relation: conflicted },
    })
    throw new Error('玩家关系已被其他同步任务更新，请刷新后重试')
  }
  const changedAt = nowISO()
  const next: PlayerRelation = {
    ...current,
    remark: payload.remark ?? current.remark,
    description: payload.description ?? current.description,
    tagIds: payload.tagIds ?? current.tagIds,
    updatedAt: changedAt,
    syncVersion: current.syncVersion + 1,
    syncStatus: 'synced',
    lastSyncedAt: changedAt,
  }
  relationStore.set(key, next)
  emit({
    type: 'relation_changed',
    payload: { playerId: payload.playerId, accountId: payload.accountId, relation: next },
  })
  return next
}

export function updateCustomNote(
  payload: PlayerNoteEditPayload,
): PlayerProfile | undefined {
  const details = profileDetails[payload.playerId]
  if (!details) return undefined
  profileDetails[payload.playerId] = { ...details, customNote: payload.customNote }
  emit({
    type: 'custom_note_changed',
    payload: { playerId: payload.playerId, customNote: payload.customNote },
  })
  return getProfile(payload.playerId)
}

/**
 * 接收企微侧好友关系状态变更的 mock 入口。
 * 真实环境由服务端消费企微事件后推送；前端只订阅变更，不自行判定好友状态。
 */
export function setRelationStatusFromWechat(
  playerId: string,
  accountId: string,
  relationStatus: RelationStatus,
  deletedAt?: string,
): PlayerRelation | undefined {
  const key = relationKey(playerId, accountId)
  const current = relationStore.get(key)
  if (!current) return undefined
  const next: PlayerRelation = {
    ...current,
    relationStatus,
    deletedAt: relationStatus === 'normal' ? undefined : (deletedAt ?? nowISO()),
    updatedAt: nowISO(),
    syncVersion: current.syncVersion + 1,
    syncStatus: 'synced',
    lastSyncedAt: nowISO(),
  }
  relationStore.set(key, next)
  emit({
    type: 'relation_status_changed',
    payload: {
      playerId,
      accountId,
      relationStatus,
      deletedAt: next.deletedAt,
    },
  })
  emit({
    type: 'relation_changed',
    payload: { playerId, accountId, relation: next },
  })
  return next
}


// ─────────────────────────────────────────────────────────────────────────────
// 玩家维度聚合视图(/players 列表 V1 用)
// ─────────────────────────────────────────────────────────────────────────────

export interface PlayerAggregatedView {
  playerId: string
  profile: PlayerProfile
  /** 该玩家所有可见关系记录(若传入 visibleAccountIds 则按其过滤) */
  relations: PlayerRelation[]
  /** 去重的添加管家 accountId 列表(按字典序) */
  accountIds: string[]
  /** 去重的标签 id 列表(按字典序) */
  tagIds: string[]
  /** 该玩家任一可见关系的最早 addedAt */
  earliestAddedAt: string
  /** 该玩家任一可见关系的最近 updatedAt(列表默认排序基准) */
  latestUpdatedAt: string
  /** 是否至少有一条该状态的可见关系(用于关系状态分类切换) */
  hasRelationStatus: (status: RelationStatus) => boolean
}

export function getPlayersAggregatedView(
  visibleAccountIds?: string[],
): PlayerAggregatedView[] {
  const visibleSet = visibleAccountIds ? new Set(visibleAccountIds) : null
  const grouped = new Map<string, PlayerRelation[]>()
  getAllRelations().forEach((r) => {
    if (visibleSet && !visibleSet.has(r.accountId)) return
    const arr = grouped.get(r.playerId) ?? []
    arr.push(r)
    grouped.set(r.playerId, arr)
  })
  const views: PlayerAggregatedView[] = []
  grouped.forEach((relations, playerId) => {
    const profile = getProfile(playerId)
    if (!profile) return
    const accountIds = Array.from(new Set(relations.map((r) => r.accountId))).sort()
    const tagIds = Array.from(new Set(relations.flatMap((r) => r.tagIds))).sort()
    const sortedByAddedAt = [...relations].sort((a, b) => a.addedAt.localeCompare(b.addedAt))
    const sortedByUpdatedAt = [...relations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    const statuses = new Set<RelationStatus>(relations.map((r) => r.relationStatus))
    views.push({
      playerId,
      profile,
      relations,
      accountIds,
      tagIds,
      earliestAddedAt: sortedByAddedAt[0]?.addedAt ?? '',
      latestUpdatedAt: sortedByUpdatedAt[0]?.updatedAt ?? '',
      hasRelationStatus: (status) => statuses.has(status),
    })
  })
  return views
}
