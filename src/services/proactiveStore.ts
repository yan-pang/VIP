/**
 * 主动发起会话的本地持久化(mock demo)—— chat-workbench 与 player-center 共享单一来源。
 *
 * chatflowMock 的会话/消息是模块级 seed,刷新即重置。玩家中心"主动发起"创建的会话
 * 只有"首条消息发送成功(已落库)"才需要跨刷新保留;占位未发送 / 发送失败的不持久化。
 * 落库判定 = 该「非 seed」会话至少有一条 sent 的 outgoing 消息。
 *
 * player-center「反查会话存档」应见到工作台同款会话集合(seed + 已落库主动发起),
 * 因此读取逻辑抽到本模块,两域共用,避免会话数据对不上。
 */
import { conversations as conversationsSeed } from './chatflowMock'
import type { Conversation, Message } from '../types/chat'

export const PROACTIVE_STORAGE_KEY = 'cf_proactive_v2'
const LEGACY_PROACTIVE_PREFIX = 'c_proactive_'
export const SEED_CONV_IDS = new Set(conversationsSeed.map((c) => c.id))

/**
 * 新会话 ID:沿用 seed 的 `c_NNN` 规律 —— 取当前所有会话里最大的数字序号 +1。
 * 每次新建都不同、不内嵌 player/account(同一玩家×企微号可先后产生不同会话 ID)。
 */
export function makeConversationId(existing: Conversation[]): string {
  const maxN = existing.reduce((max, c) => {
    const m = /^c_(\d+)$/.exec(c.id)
    return m ? Math.max(max, Number(m[1])) : max
  }, 0)
  return `c_${String(maxN + 1).padStart(3, '0')}`
}

export function loadProactivePersisted(): { conversations: Conversation[]; messages: Message[] } {
  try {
    const raw = localStorage.getItem(PROACTIVE_STORAGE_KEY)
    if (!raw) return { conversations: [], messages: [] }
    const parsed = JSON.parse(raw)
    const conversations: Conversation[] = Array.isArray(parsed.conversations)
      ? parsed.conversations
      : []
    const messages: Message[] = Array.isArray(parsed.messages) ? parsed.messages : []
    // 丢弃历史遗留的复合格式会话(c_proactive_<pid>_<acc>):早期版本落过库,且会被新的保存逻辑
    // 再次写回,必须在加载时一次性清掉,否则刷新仍会复现这条不符合 c_NNN 规律的旧 ID。
    const legacyIds = new Set(
      conversations.filter((c) => c.id.startsWith(LEGACY_PROACTIVE_PREFIX)).map((c) => c.id),
    )
    return {
      conversations: conversations.filter((c) => !legacyIds.has(c.id)),
      messages: messages.filter((m) => !legacyIds.has(m.conversationId)),
    }
  } catch {
    return { conversations: [], messages: [] }
  }
}

export function saveProactivePersisted(conversations: Conversation[], messages: Message[]): void {
  try {
    const landedConvs = conversations.filter(
      (c) =>
        !SEED_CONV_IDS.has(c.id) &&
        messages.some(
          (m) =>
            m.conversationId === c.id && m.direction === 'outgoing' && m.status === 'sent',
        ),
    )
    const ids = new Set(landedConvs.map((c) => c.id))
    const landedMsgs = messages.filter(
      (m) => ids.has(m.conversationId) && m.status !== 'sending',
    )
    localStorage.setItem(
      PROACTIVE_STORAGE_KEY,
      JSON.stringify({ conversations: landedConvs, messages: landedMsgs }),
    )
  } catch {
    // 隐私模式 / 配额满等:忽略持久化失败,不阻塞接待
  }
}
