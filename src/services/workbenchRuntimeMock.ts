import { useSyncExternalStore } from 'react'
import type { Conversation, Message } from '../types/chat'
import {
  conversations as conversationSeeds,
  messages as messageSeeds,
} from './chatflowMock'
import { SEED_CONV_IDS, loadProactivePersisted } from './proactiveStore'

export interface WorkbenchRuntimeSnapshot {
  conversations: Conversation[]
  messages: Message[]
}

let snapshot: WorkbenchRuntimeSnapshot | null = null
const listeners = new Set<() => void>()

function conversationRelationKey(conversation: Conversation) {
  return `${conversation.playerId}::${conversation.accountId}`
}

function dedupeConversations(conversations: Conversation[]): Conversation[] {
  const byRelation = new Map<string, Conversation>()
  conversations.forEach((conversation) => {
    const key = conversationRelationKey(conversation)
    const existing = byRelation.get(key)
    if (!existing || (conversation.lastMessageAt ?? conversation.createdAt) > (existing.lastMessageAt ?? existing.createdAt)) {
      byRelation.set(key, conversation)
    }
  })
  return Array.from(byRelation.values())
}

export function assertUniqueConversationRelations(conversations: Conversation[]) {
  const keys = conversations.map(conversationRelationKey)
  if (new Set(keys).size !== keys.length) throw new Error('同一玩家与企微号只能存在一条会话记录')
}

function createInitialSnapshot(): WorkbenchRuntimeSnapshot {
  const persisted = loadProactivePersisted()
  const seedMessageIds = new Set(messageSeeds.map((message) => message.id))
  return {
    conversations: dedupeConversations([
      ...persisted.conversations.filter(
        (conversation) => !SEED_CONV_IDS.has(conversation.id),
      ),
      ...conversationSeeds,
    ]),
    messages: [
      ...messageSeeds,
      ...persisted.messages.filter((message) => !seedMessageIds.has(message.id)),
    ],
  }
}

/**
 * chat-workbench 的 SPA 运行态单一来源。
 * 工作台负责写入，顶栏综合搜索等跨路由消费者只读订阅；浏览器刷新仍按 Mock
 * 约定仅恢复已经成功落库的主动发起会话。
 */
export function getWorkbenchRuntime(): WorkbenchRuntimeSnapshot {
  if (!snapshot) snapshot = createInitialSnapshot()
  return snapshot
}

export function setWorkbenchRuntime(next: WorkbenchRuntimeSnapshot): void {
  if (
    snapshot?.conversations === next.conversations
    && snapshot.messages === next.messages
  ) {
    return
  }
  assertUniqueConversationRelations(next.conversations)
  snapshot = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useWorkbenchRuntime(): WorkbenchRuntimeSnapshot {
  return useSyncExternalStore(subscribe, getWorkbenchRuntime, getWorkbenchRuntime)
}
