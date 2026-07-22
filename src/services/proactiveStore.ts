/**
 * 主动发起会话的本地持久化(mock demo)—— chat-workbench 与 player-center 共享单一来源。
 *
 * chatflowMock 的会话/消息是模块级 seed,刷新即重置。玩家中心"主动发起"创建的会话
 * 已成功落库的主动会话与待发队列需要跨刷新恢复；纯空白占位和失败草稿不持久化。
 *
 * player-center「反查会话存档」应见到工作台同款会话集合(seed + 已落库主动发起),
 * 因此读取逻辑抽到本模块,两域共用,避免会话数据对不上。
 */
import { conversations as conversationsSeed } from './chatflowMock'
import type { Conversation, Message } from '../types/chat'

export const PROACTIVE_STORAGE_KEY = 'cf_proactive_v2'
export const SEED_CONV_IDS = new Set(conversationsSeed.map((c) => c.id))

const CANONICAL_CONVERSATION_ID = /^c_(\d+)$/

function nextCanonicalConversationId(existingIds: Iterable<string>): string {
  let maxSequence = 0
  for (const id of existingIds) {
    const matched = CANONICAL_CONVERSATION_ID.exec(id)
    if (matched) maxSequence = Math.max(maxSequence, Number(matched[1]))
  }
  return `c_${String(maxSequence + 1).padStart(3, '0')}`
}

/**
 * Mock 会话使用与种子一致的 `c_NNN` 业务编号，避免把技术 UUID 暴露给客服。
 * 生产环境应由服务端原子分配此编号；本地 Mock 仅在当前运行态内按现有最大序号递增。
 */
export function makeConversationId(existing: Conversation[]): string {
  return nextCanonicalConversationId(existing.map((conversation) => conversation.id))
}

export function loadProactivePersisted(): { conversations: Conversation[]; messages: Message[] } {
  try {
    const raw = localStorage.getItem(PROACTIVE_STORAGE_KEY)
    if (!raw) return { conversations: [], messages: [] }
    const parsed = JSON.parse(raw)
    const rawConversations: Array<Conversation & { playerHasDeletedFriendship?: boolean }> =
      Array.isArray(parsed.conversations) ? parsed.conversations : []
    const usedIds = new Set(SEED_CONV_IDS)
    const idMigration = new Map<string, string>()
    let migrated = false
    const conversations: Conversation[] = rawConversations.map((raw) => {
      const { playerHasDeletedFriendship, ...conversation } = raw
      const hasCanonicalUnusedId = CANONICAL_CONVERSATION_ID.test(conversation.id) && !usedIds.has(conversation.id)
      const id = hasCanonicalUnusedId ? conversation.id : nextCanonicalConversationId(usedIds)
      if (id !== conversation.id) {
        idMigration.set(conversation.id, id)
        migrated = true
      }
      usedIds.add(id)
      return {
        ...conversation,
        id,
        relationStatus: conversation.relationStatus
          ?? (playerHasDeletedFriendship ? 'removed_by_player' : 'normal'),
      }
    })
    const messages: Message[] = Array.isArray(parsed.messages)
      ? parsed.messages.map((message: Message) => {
          const conversationId = idMigration.get(message.conversationId) ?? message.conversationId
          if (conversationId !== message.conversationId) migrated = true
          return conversationId === message.conversationId ? message : { ...message, conversationId }
        })
      : []
    if (migrated) {
      localStorage.setItem(PROACTIVE_STORAGE_KEY, JSON.stringify({ conversations, messages }))
    }
    return { conversations, messages }
  } catch {
    return { conversations: [], messages: [] }
  }
}

export function saveProactivePersisted(conversations: Conversation[], messages: Message[]): void {
  try {
    const persistedConvs = conversations.filter(
      (c) =>
        !SEED_CONV_IDS.has(c.id) &&
        messages.some(
          (m) =>
            m.conversationId === c.id && m.direction === 'outgoing' && (m.status === 'sent' || m.status === 'queued'),
        ),
    )
    const ids = new Set(persistedConvs.map((c) => c.id))
    const persistedMsgs = messages.filter(
      (m) => (ids.has(m.conversationId) || m.status === 'queued') && m.status !== 'sending',
    )
    localStorage.setItem(
      PROACTIVE_STORAGE_KEY,
      JSON.stringify({ conversations: persistedConvs, messages: persistedMsgs }),
    )
  } catch {
    // 隐私模式 / 配额满等:忽略持久化失败,不阻塞接待
  }
}
