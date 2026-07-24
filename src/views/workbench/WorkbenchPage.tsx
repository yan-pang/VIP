import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import { App as AntdApp } from 'antd'
import type { ShellOutletContext } from '../../components/layouts/NavigationLayout'
import AssignDialog from './components/AssignDialog'
import ConversationList from './components/ConversationList'
import ConversationView from './components/ConversationView'
import FailureDrawer from './components/FailureDrawer'
import PlayerAside from './components/PlayerAside'
import {
  findAgent,
  simulateReconciliation,
  simulateSendOutcome,
  wechatAccounts,
} from '../../services/chatflowMock'
import { mockGames, mockWechatGameMap } from '../../services/gameCatalogMock'
import {
  assessOutboundDelivery,
  detectForbiddenWords,
  recordOutboundDeliveryResult,
  useOpsAdminRevision,
} from '../../services/opsAdminMock'
import { getAssignableAgents, usePermissionSession } from '../../services/permissionMock'
import {
  getRelation,
  setRelationStatusFromWechat,
  subscribePlayerCenter,
} from '../../services/playerCenterMock'
import type { Conversation, ConversationTag, Message, MessageAttachment } from '../../types/chat'
import type { SystemMessageEvent } from '../../types/chat'
import {
  makeConversationId,
  saveProactivePersisted,
} from '../../services/proactiveStore'
import {
  getWorkbenchRuntime,
  setWorkbenchRuntime,
} from '../../services/workbenchRuntimeMock'
import '../../styles/Workbench.scss'

function formatStamp(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function makeSystemMessage(
  conversationId: string,
  text: string,
  iso: string,
  suffix = 'sys',
  systemEvent: SystemMessageEvent = 'notice',
): Message {
  return {
    id: `m_sys_${Date.now()}_${suffix}`,
    conversationId,
    direction: 'system',
    contentType: 'system',
    text,
    senderId: 'system',
    createdAt: iso,
    status: 'sent',
    systemEvent,
  }
}

const selectedConversationByAgent = new Map<string, string | null>()
const accountFilterByAgent = new Map<string, string[]>()
let runtimeAsideCollapsed = false
let runtimeReactivatingIds = new Set<string>()

function WorkbenchPage() {
  const { message } = AntdApp.useApp()
  const session = usePermissionSession()
  const opsRevision = useOpsAdminRevision()
  const currentAgentId = session.agent.id
  const visibleAccountIds = session.visibleAccountIds
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { openSearch } = useOutletContext<ShellOutletContext>()

  const [conversations, setConversations] = useState<Conversation[]>(
    () => getWorkbenchRuntime().conversations,
  )
  const [messages, setMessages] = useState<Message[]>(
    () => getWorkbenchRuntime().messages,
  )

  // 路由切换时保留整个 SPA 会话内的运行态；只有已落库的主动发起会话跨刷新保留。
  useEffect(() => {
    setWorkbenchRuntime({ conversations, messages })
    saveProactivePersisted(conversations, messages)
    wechatAccounts.forEach((account) => {
      account.unreadCount = conversations
        .filter((conversation) => !conversation.isProvisional && conversation.accountId === account.id)
        .reduce((sum, conversation) => sum + conversation.unreadCount, 0)
    })
  }, [conversations, messages])

  const [selectedId, setSelectedId] = useState<string | null>(
    () => selectedConversationByAgent.get(currentAgentId) ?? null,
  )
  // 多选筛选:默认勾选全部企微号 = 不筛选
  const [accountFilter, setAccountFilter] = useState<string[]>(() =>
    accountFilterByAgent.get(currentAgentId)
      ?? wechatAccounts.filter((account) => visibleAccountIds.includes(account.id)).map((account) => account.id),
  )
  const [asideCollapsed, setAsideCollapsed] = useState(runtimeAsideCollapsed)
  // 已结束会话的“重新联系”临时态 id 集合；成功发送一条后自动清除
  const [reactivatingIds, setReactivatingIds] = useState<Set<string>>(
    () => new Set(runtimeReactivatingIds),
  )

  // 弹层状态
  const [failureForMessageId, setFailureForMessageId] = useState<string | null>(null)
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null)
  const [assignFor, setAssignFor] = useState<{ conversationId: string; mode: 'assign' | 'transfer' } | null>(null)

  useEffect(() => {
    const cachedFilter = accountFilterByAgent.get(currentAgentId)
    setAccountFilter(
      cachedFilter
        ? cachedFilter.filter((accountId) => visibleAccountIds.includes(accountId))
        : visibleAccountIds,
    )
    setSelectedId(selectedConversationByAgent.get(currentAgentId) ?? null)
    setFailureForMessageId(null)
    setHighlightedMessageId(null)
  }, [currentAgentId, visibleAccountIds])

  useEffect(() => {
    selectedConversationByAgent.set(currentAgentId, selectedId)
  }, [currentAgentId, selectedId])

  useEffect(() => {
    accountFilterByAgent.set(currentAgentId, accountFilter)
  }, [accountFilter, currentAgentId])

  useEffect(() => {
    runtimeAsideCollapsed = asideCollapsed
  }, [asideCollapsed])

  useEffect(() => {
    runtimeReactivatingIds = new Set(reactivatingIds)
  }, [reactivatingIds])

  // ref 保留最新值给定时器,避免每次 state 变化重置 setInterval
  const liveRef = useRef({ conversations, selectedId, reactivatingIds })
  liveRef.current = { conversations, selectedId, reactivatingIds }

  // 好友关系的权威源是 player-center 的 (playerId, accountId)。
  // 初始加载与后续企微事件都将其投影到会话，避免“玩家重新加好友后输入区仍锁定”。
  useEffect(() => {
    setConversations((prev) =>
      prev.map((conversation) => {
        const relationStatus = getRelation(conversation.playerId, conversation.accountId)?.relationStatus ?? 'normal'
        return conversation.relationStatus === relationStatus
          ? conversation
          : { ...conversation, relationStatus }
      }),
    )

    return subscribePlayerCenter((event) => {
      if (event.type !== 'relation_status_changed') return
      const { playerId, accountId, relationStatus } = event.payload
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.playerId === playerId && conversation.accountId === accountId
            ? conversation.relationStatus === relationStatus
              ? conversation
              : { ...conversation, relationStatus }
            : conversation,
        ),
      )

      // 关系断开时取消已结束会话的临时“重新联系态”；恢复好友后仍须由客服显式操作。
      if (relationStatus !== 'normal') {
        const affectedConversationIds = new Set(
          liveRef.current.conversations
            .filter((conversation) => conversation.playerId === playerId && conversation.accountId === accountId)
            .map((conversation) => conversation.id),
        )
        if (affectedConversationIds.size > 0) {
          setReactivatingIds((prev) => {
            const next = new Set(prev)
            affectedConversationIds.forEach((id) => next.delete(id))
            return next
          })
        }
      }
    })
  }, [])

  // 主动发起占位幂等:记住本次挂载已为某 (playerId::accountId) 创建的会话 id。
  // 会话 ID 改为每次唯一后,StrictMode 下 effect 双调用会各生成一个 id,
  // 必须按 (玩家×企微号) 去重,否则同一次主动发起会建出两条占位。
  const proactiveCreatedRef = useRef<Map<string, string>>(new Map())

  // 接收 URL query 跳转(来自搜索面板 / 控制台 / 玩家中心)
  useEffect(() => {
    const cid = searchParams.get('conversationId')
    const mid = searchParams.get('messageId')
    const pid = searchParams.get('playerId')
    const acc = searchParams.get('accountId')

    // ① 已存在会话定位(来自玩家中心 / 消息管理"去工作台接待" / 搜索面板)
    //    定位会话只展示历史；已结束会话必须由客服显式点击“重新联系”。
    {
      const target = cid ? conversations.find((c) => c.id === cid) : undefined
      if (target) {
        if (!visibleAccountIds.includes(target.accountId)) {
          const next = new URLSearchParams(searchParams)
          next.delete('conversationId')
          next.delete('messageId')
          setSearchParams(next, { replace: true })
          return
        }
        setSelectedId(target.id)
        setHighlightedMessageId(
          mid && messages.some(
            (message) => message.id === mid && message.conversationId === target.id,
          )
            ? mid
            : null,
        )
        const next = new URLSearchParams(searchParams)
        next.delete('conversationId')
        next.delete('messageId')
        setSearchParams(next, { replace: true })
        return
      }
    }

    // ② 玩家中心"主动发起":带 playerId + accountId。
    //    无会话 → 创建仅工作台可见的临时草稿；首条消息成功后才转为正式会话。
    //    有会话 → 只定位，已结束时仍需客服显式点击“重新联系”。
    if (pid && acc) {
      if (!visibleAccountIds.includes(acc)) {
        const next = new URLSearchParams(searchParams)
        next.delete('playerId')
        next.delete('accountId')
        setSearchParams(next, { replace: true })
        return
      }
      const existing = conversations.find((c) => c.playerId === pid && c.accountId === acc)
      if (existing) {
        setSelectedId(existing.id)
      } else {
        const key = `${pid}::${acc}`
        const alreadyCreated = proactiveCreatedRef.current.get(key)
        if (alreadyCreated) {
          // StrictMode effect 双调用 / 依赖重跑:本次挂载已建过该占位,直接选中,不重复创建
          setSelectedId(alreadyCreated)
        } else {
          const now = new Date().toISOString()
          const placeholderId = makeConversationId(conversations)
          proactiveCreatedRef.current.set(key, placeholderId)
          const placeholder: Conversation = {
            id: placeholderId,
            accountId: acc,
            playerId: pid,
            status: 'active',
            assigneeId: currentAgentId,
            assigneeHistory: [
              { agentId: currentAgentId, changedAt: now, reason: 'explicit', note: '客服主动发起' },
            ],
            pinned: false,
            tag: null,
            unreadCount: 0,
            lastMessagePreview: '(主动发起会话,待首条消息送达)',
            lastMessageAt: now,
            createdAt: now,
            relationStatus: getRelation(pid, acc)?.relationStatus ?? 'normal',
            isProvisional: true,
          }
          setConversations((prev) =>
            prev.some((c) => c.playerId === pid && c.accountId === acc)
              ? prev
              : [placeholder, ...prev],
          )
          setSelectedId(placeholderId)
        }
      }
      // 把对应企微号纳入筛选可见集合(避免被 accountFilter 过滤掉)
      setAccountFilter((prev) => (prev.includes(acc) ? prev : [...prev, acc]))
      const next = new URLSearchParams(searchParams)
      next.delete('playerId')
      next.delete('accountId')
      setSearchParams(next, { replace: true })
      return
    }

    // ③ 仅 accountId(来自控制台 focus):设企微号筛选
    if (acc && visibleAccountIds.includes(acc)) {
      setAccountFilter([acc])
      const next = new URLSearchParams(searchParams)
      next.delete('accountId')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams, conversations, messages, currentAgentId, visibleAccountIds])

  useEffect(() => {
    if (!highlightedMessageId) return
    const timer = window.setTimeout(() => setHighlightedMessageId(null), 8000)
    return () => window.clearTimeout(timer)
  }, [highlightedMessageId])

  const visibleConversations = useMemo(
    () => conversations.filter((c) => visibleAccountIds.includes(c.accountId) && accountFilter.includes(c.accountId)),
    [accountFilter, conversations, visibleAccountIds],
  )

  const selected = useMemo(
    () => {
      const selected = selectedId ? conversations.find((conversation) => conversation.id === selectedId) ?? null : null
      return selected && visibleAccountIds.includes(selected.accountId) ? selected : null
    },
    [conversations, selectedId, visibleAccountIds],
  )

  const failureMessage = useMemo(
    () => (failureForMessageId ? messages.find((m) => m.id === failureForMessageId) ?? null : null),
    [failureForMessageId, messages],
  )
  const failureConversation = useMemo(
    () => failureMessage
      ? conversations.find((conversation) => conversation.id === failureMessage.conversationId) ?? null
      : null,
    [conversations, failureMessage],
  )

  const assignableAgents = useMemo(() => {
    if (!selected) return []
    let candidates = getAssignableAgents(selected.accountId)
    if (assignFor?.mode === 'transfer' && selected.assigneeId) {
      candidates = candidates.filter((agent) => agent.id !== selected.assigneeId)
    }
    if (assignFor?.mode === 'assign' && !session.canAssignOthers) {
      return candidates.filter((agent) => agent.id === currentAgentId)
    }
    return candidates
  }, [assignFor?.mode, currentAgentId, selected, session.canAssignOthers])

  // 玩家定时模拟回复:每 25s 随机挑一个非已结束会话推一条 incoming
  useEffect(() => {
    const incomingPool = [
      '在吗',
      '客服你好',
      '我想问下',
      '这个怎么处理?',
      '什么时候能解决',
      '我充了 648 还没到',
      '好的谢谢',
      '没收到回复啊',
      '能帮我看下吗',
      '?',
    ]
    const tick = () => {
      const { conversations: cs, selectedId: sel } = liveRef.current
      // 90% 选未结束会话推消息;10% 选已结束会话激活回排队
      const useEnded = Math.random() < 0.1
      const pool = cs.filter((c) => {
        const account = wechatAccounts.find((item) => item.id === c.accountId)
        if (!account?.enabled || account.status !== 'online' || c.relationStatus !== 'normal' || c.isProvisional) return false
        return useEnded ? c.status === 'ended' : c.status !== 'ended'
      })
      if (pool.length === 0) return
      const conv = pool[Math.floor(Math.random() * pool.length)]
      const text = incomingPool[Math.floor(Math.random() * incomingPool.length)]
      const now = new Date().toISOString()
      const msgId = `m_${Date.now()}_in`
      const wasEnded = conv.status === 'ended'
      setMessages((prev) => {
        const next = [...prev]
        // 已结束被玩家重新激活 → 在新消息前插入系统分割条
        if (wasEnded) {
          const sysAt = new Date(new Date(now).getTime() - 1000).toISOString()
          next.push(
            makeSystemMessage(
              conv.id,
              `玩家于 ${formatStamp(now)} 重新发起会话`,
              sysAt,
              'reopen',
              'player_reopened',
            ),
          )
        }
        next.push({
          id: msgId,
          conversationId: conv.id,
          direction: 'incoming',
          contentType: 'text',
          text,
          senderId: conv.playerId,
          createdAt: now,
          status: 'sent',
        })
        return next
      })
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== conv.id) return c
          // 已结束 → 重新激活到排队中,清空指派
          if (c.status === 'ended') {
            return {
              ...c,
              status: 'queueing',
              assigneeId: null,
              assigneeHistory: [
                ...c.assigneeHistory,
                { agentId: null, changedAt: now, reason: 'reactivate' },
              ],
              lastMessagePreview: text.slice(0, 20),
              lastMessageAt: now,
              unreadCount: c.id === sel ? 0 : c.unreadCount + 1,
            }
          }
          return {
            ...c,
            lastMessagePreview: text.slice(0, 20),
            lastMessageAt: now,
            unreadCount: c.id === sel ? 0 : c.unreadCount + 1,
          }
        }),
      )
    }
    const timer = window.setInterval(tick, 25_000)
    return () => window.clearInterval(timer)
  }, [])

  /* ============== 操作回调 ============== */

  const handleSelectConv = useCallback((id: string) => {
    setHighlightedMessageId(null)
    setSelectedId(id)
    // 切入即清未读
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c)),
    )
  }, [])

  const updateConv = useCallback((id: string, patch: Partial<Conversation>) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }, [])

  const handleTogglePin = useCallback(
    (id: string) => {
      const c = conversations.find((x) => x.id === id)
      if (!c) return
      // 置顶上限 20(PRD R-111-03):新增置顶前校验,取消置顶不受限。
      if (!c.pinned && conversations.filter((x) => x.pinned).length >= 20) {
        message.warning('最多置顶 20 个会话，请先取消其他置顶')
        return
      }
      updateConv(id, { pinned: !c.pinned })
    },
    [conversations, message, updateConv],
  )

  const handleEndConv = useCallback(
    (id: string) => {
      const now = new Date().toISOString()
      // 结束只改状态:左列预览保留最后一条真实消息,不覆盖成"会话已结束"(已结束语义由分组 + 会话内系统分隔条体现)
      updateConv(id, { status: 'ended' })
      setReactivatingIds((prev) => {
        if (!prev.has(id)) return prev
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      setMessages((prev) => [
        ...prev,
        makeSystemMessage(id, `本次会话已结束 · ${formatStamp(now)}`, now, 'end', 'conversation_ended'),
      ])
    },
    [updateConv],
  )

  const handleStartReactivate = useCallback((id: string) => {
    setReactivatingIds((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [])

  const handleCancelReactivate = useCallback((id: string) => {
    setReactivatingIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const clearReactivating = useCallback((id: string) => {
    setReactivatingIds((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  // 会话标记:个人视角单选三值,选新值替换旧值,传 null 清除(PRD R-110-03)。
  const handleSetTag = useCallback(
    (id: string, tag: ConversationTag | null) => {
      updateConv(id, { tag })
    },
    [updateConv],
  )

  const handleAssign = useCallback(
    (conversationId: string, agentId: string) => {
      const now = new Date().toISOString()
      const conv = conversations.find((c) => c.id === conversationId)
      if (!conv) return
      // 并发冲突:以指派模式打开,但提交前会话已被他人接入(assigneeId 已落位)。
      if (assignFor?.mode === 'assign' && conv.assigneeId !== null) {
        message.warning(`会话已由${findAgent(conv.assigneeId)?.name ?? '其他人'}处理，请刷新后重试`)
        setAssignFor(null)
        return
      }
      const isTransfer = !!conv.assigneeId
      if (isTransfer) {
        if (conv.assigneeId === agentId) return
        if (conv.assigneeId !== currentAgentId && !session.canAssignOthers) return
      } else if (!session.canAssignOthers && agentId !== currentAgentId) {
        return
      }
      updateConv(conversationId, {
        assigneeId: agentId,
        status: 'active',
        assigneeHistory: [
          ...conv.assigneeHistory,
          {
            agentId,
            changedAt: now,
            reason: isTransfer ? 'transfer' : 'explicit',
          },
        ],
      })
      setAssignFor(null)
    },
    [assignFor?.mode, conversations, currentAgentId, message, session.canAssignOthers, updateConv],
  )

  const deliveriesInFlightRef = useRef(new Set<string>())
  const activatedConversationRef = useRef(new Set<string>())

  const activateConversationAfterFirstSuccess = useCallback((conversationId: string) => {
    if (activatedConversationRef.current.has(conversationId)) return
    const current = liveRef.current.conversations.find((conversation) => conversation.id === conversationId)
    const shouldActivate = !!current && (
      current.isProvisional
      || (current.status === 'ended' && liveRef.current.reactivatingIds.has(conversationId))
    )
    if (!current || !shouldActivate) return
    activatedConversationRef.current.add(conversationId)
    const ts = new Date().toISOString()
    const wasProvisional = !!current.isProvisional
    setConversations((prev) => prev.map((conversation) => {
      if (conversation.id !== conversationId) return conversation
      return {
        ...conversation,
        isProvisional: false,
        status: 'active',
        assigneeId: currentAgentId,
        assigneeHistory: conversation.isProvisional
          ? conversation.assigneeHistory
          : [
              ...conversation.assigneeHistory,
              { agentId: currentAgentId, changedAt: ts, reason: 'explicit', note: '客服重新联系' },
            ],
      }
    }))
    setMessages((prev) => [
      ...prev,
      makeSystemMessage(
        conversationId,
        wasProvisional
          ? `客服于 ${formatStamp(ts)} 主动发起会话`
          : `客服于 ${formatStamp(ts)} 重新联系`,
        new Date(new Date(ts).getTime() - 2_000).toISOString(),
        'proactive',
        'agent_reopened',
      ),
    ])
    clearReactivating(conversationId)
  }, [clearReactivating, currentAgentId])

  const dispatchMessages = useCallback((conversation: Conversation, candidates: Message[]) => {
    const deliverable = candidates.filter((candidate) => {
      if (deliveriesInFlightRef.current.has(candidate.id)) return false
      deliveriesInFlightRef.current.add(candidate.id)
      return true
    })
    if (!deliverable.length) return
    const attemptedAt = new Date().toISOString()
    setMessages((prev) => prev.map((message) =>
      deliverable.some((candidate) => candidate.id === message.id)
        ? {
            ...message,
            status: 'sending',
            failure: undefined,
            attemptCount: (message.attemptCount ?? 0) + 1,
            lastAttemptAt: attemptedAt,
          }
        : message,
    ))
    window.setTimeout(() => {
      const outcomes = new Map(
        deliverable.map((message) => [message.id, simulateSendOutcome(message.contentType)]),
      )
      deliverable.forEach((message) => deliveriesInFlightRef.current.delete(message.id))
      setMessages((prev) => prev.map((message) => {
        const outcome = outcomes.get(message.id)
        return outcome
          ? {
              ...message,
              status: outcome.status,
              failure: outcome.status === 'failed' ? outcome.failure : undefined,
            }
          : message
      }))
      outcomes.forEach((outcome) => recordOutboundDeliveryResult(conversation.accountId, outcome.status))
      if (Array.from(outcomes.values()).some((outcome) => outcome.status === 'sent')) {
        activateConversationAfterFirstSuccess(conversation.id)
      }
      if (Array.from(outcomes.values()).some(
        (outcome) => outcome.status === 'failed' && outcome.failure.category === 'player_deleted_friendship',
      )) {
        setRelationStatusFromWechat(conversation.playerId, conversation.accountId, 'removed_by_player')
      }

      // 回捞比对核实(PRD 6.3):对刚乐观标「已送达」的消息,延时从企微存档回捞比对,
      // 小概率比对失败 → 把「已送达」修正为失败「回捞比对失败」,不自动重发。
      const sentIds = deliverable
        .filter((message) => outcomes.get(message.id)?.status === 'sent')
        .map((message) => message.id)
      if (sentIds.length) {
        window.setTimeout(() => {
          const reconciliations = new Map(sentIds.map((id) => [id, simulateReconciliation()]))
          setMessages((prev) => prev.map((message) => {
            const reconciliation = reconciliations.get(message.id)
            // 仅当消息仍停留在「已送达」时才修正,避免覆盖后续状态变化。
            if (!reconciliation?.failed || message.status !== 'sent') return message
            return { ...message, status: 'failed', failure: reconciliation.failure }
          }))
        }, 2_500 + Math.random() * 1_500)
      }
    }, 1_000 + Math.random() * 500)
  }, [activateConversationAfterFirstSuccess])

  // PRD 无「待发送」自动重排队:发送前依赖不可用一律直接失败,由客服手动重发。
  // 保留对 opsRevision 的订阅(企微号状态实时刷新可用性),但不再驱动排队重发。
  void opsRevision

  const handleSendMessage = useCallback(
    (
      conversationId: string,
      payload: { text?: string; attachments?: MessageAttachment[] },
    ): boolean => {
      const conv = conversations.find((c) => c.id === conversationId)
      if (!conv) return false
      const text = payload.text?.trim() || undefined
      const attachments = payload.attachments?.length ? payload.attachments : undefined
      if (!text && !attachments) return false
      if (conv.relationStatus !== 'normal') {
        message.error('玩家已删除该企微号，请重新添加好友后再联系')
        return false
      }

      const delivery = assessOutboundDelivery(conv.accountId)
      if (delivery.disposition === 'blocked') {
        message.error(delivery.message)
        return false
      }

      const gameId = mockWechatGameMap[conv.accountId]
      const forbiddenHits = text ? detectForbiddenWords(text, gameId) : []

      const now = new Date().toISOString()
      // V1 取消隐式指派:排队中会话不渲染输入区,能走到这里发消息的会话
      // 必然是「已指派给自己的会话中」或「已结束的重新联系态」，发送前不再改指派人。
      // 重新联系态（已结束 + 客服显式点过“重新联系”）：状态机和指派人不在发送前变更，
      // 只有发送成功后才改 active + 指派给当前客服。
      // 编辑区允许一次组合文字与附件：整批只生成一个发送批次，结果按文字 / 单个附件拆分展示。
      const batchKey = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      const sendBatchId = `send_batch_${batchKey}`
      const baseTime = Date.now()
      const matchedWords = forbiddenHits.map((hit) => `“${hit.word}”`).join('、')
      const game = mockGames.find((item) => item.id === gameId)
      const forbiddenFailure = forbiddenHits.length
        ? {
            category: 'forbidden_word_backend' as const,
            code: 'FORBIDDEN_WORD',
            message: `消息命中${game ? `游戏「${game.id}-${game.name}」` : '当前游戏'}的违禁词 ${matchedWords}，未发送`,
            executedAt: now,
          }
        : undefined
      // 临时执行依赖不可用:PRD 无待发送,直接置失败,由客服手动重发。
      const dependencyFailure = delivery.disposition === 'failed'
        ? {
            category: 'other' as const,
            code: delivery.code,
            message: delivery.message,
            executedAt: now,
          }
        : undefined

      const outgoingMessages: Message[] = []
      if (text) {
        outgoingMessages.push({
          id: `m_${batchKey}_text`,
          conversationId,
          direction: 'outgoing',
          contentType: 'text',
          text,
          senderId: currentAgentId,
          createdAt: new Date(baseTime).toISOString(),
          status: forbiddenFailure || dependencyFailure ? 'failed' : 'sending',
          failure: forbiddenFailure ?? dependencyFailure,
          clientRequestId: `client_${batchKey}_text`,
          sendBatchId,
          attemptCount: 0,
        })
      }
      attachments?.forEach((attachment, index) => {
        outgoingMessages.push({
          id: `m_${batchKey}_attachment_${index}`,
          conversationId,
          direction: 'outgoing',
          contentType: attachment.type,
          mediaUrl: attachment.url,
          mediaName: attachment.name,
          mediaSizeBytes: attachment.sizeBytes,
          senderId: currentAgentId,
          createdAt: new Date(baseTime + outgoingMessages.length).toISOString(),
          status: dependencyFailure ? 'failed' : 'sending',
          failure: dependencyFailure,
          clientRequestId: `client_${batchKey}_attachment_${index}`,
          sendBatchId,
          attemptCount: 0,
        })
      })
      setMessages((prev) => [...prev, ...outgoingMessages])

      const lastMessage = outgoingMessages.at(-1)
      const preview = lastMessage?.contentType === 'text'
        ? lastMessage.text?.slice(0, 20) ?? ''
        : lastMessage?.contentType === 'image'
          ? '[图片]'
          : lastMessage?.contentType === 'video'
            ? '[视频]'
            : lastMessage?.contentType === 'file'
              ? `[文件] ${lastMessage.mediaName}`
              : ''
      updateConv(conversationId, { lastMessagePreview: preview, lastMessageAt: now })

      // 一个发送批次执行混发内容，但每个子消息独立返回结果；允许出现部分失败。
      const pendingMessages = outgoingMessages.filter((message) => message.status === 'sending')
      if (pendingMessages.length > 0) dispatchMessages(conv, pendingMessages)
      if (dependencyFailure) message.error(dependencyFailure.message)
      return true
    },
    [conversations, currentAgentId, dispatchMessages, message, updateConv],
  )

  const handleClickFailedMessage = useCallback((msg: Message) => {
    // 可诊断类失败(RPA 异常 / 回捞比对失败)才打开失败详情抽屉。
    if (msg.failure?.category === 'rpa_exception' || msg.failure?.category === 'delivery_reconciliation_failed') {
      setFailureForMessageId(msg.id)
    }
  }, [])

  const handleInterveneFromFailure = useCallback(() => {
    if (!failureMessage || !session.canOpenControl) return
    const conv = conversations.find((c) => c.id === failureMessage.conversationId)
    setFailureForMessageId(null)
    if (conv && visibleAccountIds.includes(conv.accountId)) navigate(`/control?focus=${conv.accountId}`)
  }, [failureMessage, conversations, navigate, session.canOpenControl, visibleAccountIds])

  const handleRetryFailedMessage = useCallback(() => {
    if (!failureMessage || failureMessage.senderId !== currentAgentId) return
    const conversation = conversations.find((item) => item.id === failureMessage.conversationId)
    if (!conversation || conversation.relationStatus !== 'normal') {
      message.error('好友关系已断开，无法重试')
      return
    }
    const assessment = assessOutboundDelivery(conversation.accountId)
    if (assessment.disposition === 'blocked') {
      message.error(assessment.message)
      return
    }
    // 依赖仍不可用 → 重试仍直接失败(不排队);可执行 → 重新进入发送中。
    const retryMessage: Message = {
      ...failureMessage,
      status: assessment.disposition === 'ready' ? 'sending' : 'failed',
      failure: assessment.disposition === 'failed'
        ? { category: 'other', code: assessment.code, message: assessment.message, executedAt: new Date().toISOString() }
        : undefined,
      clientRequestId: failureMessage.clientRequestId ?? `retry_${failureMessage.id}`,
    }
    setMessages((prev) => prev.map((message) => message.id === retryMessage.id ? retryMessage : message))
    setFailureForMessageId(null)
    if (assessment.disposition === 'ready') dispatchMessages(conversation, [retryMessage])
    else message.error(assessment.message)
  }, [conversations, currentAgentId, dispatchMessages, failureMessage, message])

  /* ============== render ============== */

  return (
    <div className="cf-workbench">
      <aside className="cf-workbench__left">
        <ConversationList
          conversations={visibleConversations}
          selectedId={selectedId}
          currentAgentId={currentAgentId}
          visibleAccountIds={visibleAccountIds}
          accountFilter={accountFilter}
          onSelect={handleSelectConv}
          onAccountFilterChange={(next) => {
            setAccountFilter(next)
            // 当前会话所属号不在新筛选集合 → 直接关闭中列,不打断
            if (selected && !next.includes(selected.accountId)) {
              setSelectedId(null)
            }
          }}
          onOpenSearch={openSearch}
        />
      </aside>

      <section className="cf-workbench__center">
        <ConversationView
          key={`${currentAgentId}:${selected?.id ?? 'empty'}`}
          conversation={selected}
          currentAgentId={currentAgentId}
          messages={messages}
          highlightMessageId={highlightedMessageId}
          isReactivating={selected ? reactivatingIds.has(selected.id) : false}
          onSend={handleSendMessage}
          onStartReactivate={handleStartReactivate}
          onCancelReactivate={handleCancelReactivate}
          onAssignClick={() =>
            selected && setAssignFor({ conversationId: selected.id, mode: 'assign' })
          }
          onTransferClick={() =>
            selected && setAssignFor({ conversationId: selected.id, mode: 'transfer' })
          }
          onTogglePin={handleTogglePin}
          onEnd={handleEndConv}
          onSetTag={handleSetTag}
          onClickFailed={handleClickFailedMessage}
          canAssignOthers={session.canAssignOthers}
        />
      </section>

      <aside
        className={`cf-workbench__right ${asideCollapsed ? 'is-collapsed' : ''}`}
      >
        <PlayerAside
          conversation={selected}
          collapsed={asideCollapsed}
          onToggle={() => setAsideCollapsed((v) => !v)}
        />
      </aside>

      <FailureDrawer
        message={failureMessage}
        conversation={failureConversation}
        onClose={() => setFailureForMessageId(null)}
        onIntervene={handleInterveneFromFailure}
        canIntervene={
          session.canOpenControl
          && !!failureConversation
          && visibleAccountIds.includes(failureConversation.accountId)
        }
        canRetry={failureMessage?.senderId === currentAgentId}
        onRetry={handleRetryFailedMessage}
      />

      <AssignDialog
        state={assignFor}
        agents={assignableAgents}
        currentAgentId={currentAgentId}
        currentAssigneeName={
          assignFor?.mode === 'transfer' && selected?.assigneeId
            ? findAgent(selected.assigneeId)?.name
            : undefined
        }
        onClose={() => setAssignFor(null)}
        onSubmit={handleAssign}
      />
    </div>
  )
}

export default WorkbenchPage
