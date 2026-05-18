import { Modal } from 'antd'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom'
import type { ShellOutletContext } from '../../components/layouts/NavigationLayout'
import AssignDialog from './components/AssignDialog'
import ConversationList from './components/ConversationList'
import ConversationView from './components/ConversationView'
import FailureDrawer from './components/FailureDrawer'
import PlayerAside from './components/PlayerAside'
import {
  agents,
  conversations as conversationsSeed,
  currentAgentId,
  findAccount,
  findPlayer,
  messages as messagesSeed,
  simulateSendOutcome,
} from '../../services/chatflowMock'
import type { Conversation, ConversationTag, Message } from '../../types/chat'
import '../../styles/Workbench.scss'

function WorkbenchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { openSearch } = useOutletContext<ShellOutletContext>()

  const [conversations, setConversations] = useState<Conversation[]>(conversationsSeed)
  const [messages, setMessages] = useState<Message[]>(messagesSeed)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [accountFilter, setAccountFilter] = useState<string>('all')
  const [asideCollapsed, setAsideCollapsed] = useState(false)

  // 弹层状态
  const [failureForMessageId, setFailureForMessageId] = useState<string | null>(null)
  const [assignFor, setAssignFor] = useState<{ conversationId: string; mode: 'assign' | 'transfer' } | null>(null)

  // ref 保留最新值给定时器,避免每次 state 变化重置 setInterval
  const liveRef = useRef({ conversations, selectedId })
  liveRef.current = { conversations, selectedId }

  // 接收 URL query 跳转(来自搜索面板 / 控制台)
  useEffect(() => {
    const cid = searchParams.get('conversationId')
    if (cid && conversations.find((c) => c.id === cid)) {
      setSelectedId(cid)
      // 清掉 query 防止重复跳
      const next = new URLSearchParams(searchParams)
      next.delete('conversationId')
      next.delete('messageId')
      setSearchParams(next, { replace: true })
    }
    const acc = searchParams.get('accountId')
    if (acc) {
      setAccountFilter(acc)
      const next = new URLSearchParams(searchParams)
      next.delete('accountId')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams, conversations])

  const visibleConversations = useMemo(() => {
    if (accountFilter === 'all') return conversations
    return conversations.filter((c) => c.accountId === accountFilter)
  }, [accountFilter, conversations])

  const selected = useMemo(
    () => (selectedId ? conversations.find((c) => c.id === selectedId) ?? null : null),
    [conversations, selectedId],
  )

  const failureMessage = useMemo(
    () => (failureForMessageId ? messages.find((m) => m.id === failureForMessageId) ?? null : null),
    [failureForMessageId, messages],
  )

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
      const pool = cs.filter((c) =>
        useEnded ? c.status === 'ended' : c.status !== 'ended',
      )
      if (pool.length === 0) return
      const conv = pool[Math.floor(Math.random() * pool.length)]
      const text = incomingPool[Math.floor(Math.random() * incomingPool.length)]
      const now = new Date().toISOString()
      const msgId = `m_${Date.now()}_in`
      setMessages((prev) => [
        ...prev,
        {
          id: msgId,
          conversationId: conv.id,
          direction: 'incoming',
          contentType: 'text',
          text,
          senderId: conv.playerId,
          createdAt: now,
          status: 'sent',
        },
      ])
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
      updateConv(id, { pinned: !c.pinned })
    },
    [conversations, updateConv],
  )

  const handleEndConv = useCallback(
    (id: string) => {
      updateConv(id, { status: 'ended', lastMessagePreview: '会话已结束' })
    },
    [updateConv],
  )

  const handleToggleTag = useCallback(
    (id: string, tag: ConversationTag) => {
      const c = conversations.find((x) => x.id === id)
      if (!c) return
      const exists = c.tags.includes(tag)
      updateConv(id, {
        tags: exists ? c.tags.filter((t) => t !== tag) : [...c.tags, tag],
      })
    },
    [conversations, updateConv],
  )

  const handleAssign = useCallback(
    (conversationId: string, agentId: string, note?: string) => {
      const now = new Date().toISOString()
      const conv = conversations.find((c) => c.id === conversationId)
      if (!conv) return
      const isTransfer = !!conv.assigneeId
      updateConv(conversationId, {
        assigneeId: agentId,
        status: 'active',
        assigneeHistory: [
          ...conv.assigneeHistory,
          {
            agentId,
            changedAt: now,
            reason: isTransfer ? 'transfer' : 'explicit',
            note,
          },
        ],
      })
      setAssignFor(null)
    },
    [conversations, updateConv],
  )

  const handleSendMessage = useCallback(
    (
      conversationId: string,
      payload:
        | { type: 'text'; text: string }
        | { type: 'image' | 'video' | 'file'; mediaUrl: string; mediaName: string; mediaSizeBytes: number },
    ) => {
      const conv = conversations.find((c) => c.id === conversationId)
      if (!conv) return

      const now = new Date().toISOString()
      const isImplicitFirst = conv.assigneeId === null

      // 隐式指派同步发生
      if (isImplicitFirst) {
        updateConv(conversationId, {
          assigneeId: currentAgentId,
          status: 'active',
          assigneeHistory: [
            ...conv.assigneeHistory,
            { agentId: currentAgentId, changedAt: now, reason: 'implicit_first_message' },
          ],
        })
      }

      // 追加 sending 消息
      const msgId = `m_${Date.now()}`
      const sendingMsg: Message =
        payload.type === 'text'
          ? {
              id: msgId,
              conversationId,
              direction: 'outgoing',
              contentType: 'text',
              text: payload.text,
              senderId: currentAgentId,
              createdAt: now,
              status: 'sending',
            }
          : {
              id: msgId,
              conversationId,
              direction: 'outgoing',
              contentType: payload.type,
              mediaUrl: payload.mediaUrl,
              mediaName: payload.mediaName,
              mediaSizeBytes: payload.mediaSizeBytes,
              senderId: currentAgentId,
              createdAt: now,
              status: 'sending',
            }
      setMessages((prev) => [...prev, sendingMsg])

      // 1-1.5s 后随机决定结果
      const delay = 1000 + Math.random() * 500
      window.setTimeout(() => {
        const outcome = simulateSendOutcome()
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  status: outcome.status,
                  failure: outcome.status === 'failed' ? outcome.failure : undefined,
                }
              : m,
          ),
        )

        // 隐式指派首条失败 → 回滚
        if (outcome.status === 'failed' && isImplicitFirst) {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === conversationId
                ? {
                    ...c,
                    assigneeId: null,
                    status: 'queueing',
                    assigneeHistory: [
                      ...c.assigneeHistory,
                      { agentId: null, changedAt: new Date().toISOString(), reason: 'rollback' },
                    ],
                  }
                : c,
            ),
          )
        }

        // 删好友标记
        if (
          outcome.status === 'failed' &&
          outcome.failure.category === 'player_deleted_friendship'
        ) {
          updateConv(conversationId, { playerHasDeletedFriendship: true })
        }

        // 更新会话 lastMessagePreview
        const preview =
          payload.type === 'text'
            ? payload.text.slice(0, 20)
            : payload.type === 'image'
              ? '[图片]'
              : payload.type === 'video'
                ? '[视频]'
                : `[文件] ${payload.mediaName}`
        updateConv(conversationId, {
          lastMessagePreview: preview,
          lastMessageAt: new Date().toISOString(),
        })
      }, delay)
    },
    [conversations, updateConv],
  )

  const handleClickFailedMessage = useCallback((msg: Message) => {
    if (msg.failure?.category === 'rpa_exception') {
      setFailureForMessageId(msg.id)
    }
  }, [])

  const handleInterveneFromFailure = useCallback(() => {
    if (!failureMessage) return
    const conv = conversations.find((c) => c.id === failureMessage.conversationId)
    setFailureForMessageId(null)
    if (conv) navigate(`/control?focus=${conv.accountId}`)
  }, [failureMessage, conversations, navigate])

  const handleRecallFromMessage = useCallback(
    (msg: Message) => {
      const conv = conversations.find((c) => c.id === msg.conversationId)
      if (!conv) return
      // 简化:直接跳转(实际应该弹一个文字提示再跳)
      navigate(`/control?focus=${conv.accountId}`)
    },
    [conversations, navigate],
  )

  /* ============== render ============== */

  return (
    <div className="cf-workbench">
      <aside className="cf-workbench__left">
        <ConversationList
          conversations={visibleConversations}
          selectedId={selectedId}
          accountFilter={accountFilter}
          onSelect={handleSelectConv}
          onAccountFilterChange={(next) => {
            // 切到的筛选范围会让当前打开的会话从左列消失 → 二次确认
            if (
              next !== 'all' &&
              selected &&
              selected.accountId !== next
            ) {
              const player = findPlayer(selected.playerId)
              const targetAcc = findAccount(next)
              Modal.confirm({
                title: '切换号筛选',
                content: `当前打开的会话(${player?.remark ?? player?.nickname ?? '玩家'})不属于「${targetAcc?.shortName ?? '该号'}」,筛选后中列会关闭。确认继续?`,
                okText: '继续筛选',
                cancelText: '取消',
                onOk: () => {
                  setAccountFilter(next)
                  setSelectedId(null)
                },
              })
            } else {
              setAccountFilter(next)
            }
          }}
          onTogglePin={handleTogglePin}
          onOpenSearch={openSearch}
        />
      </aside>

      <section className="cf-workbench__center">
        <ConversationView
          conversation={selected}
          currentAgentId={currentAgentId}
          messages={messages}
          onSend={handleSendMessage}
          onAssignClick={() =>
            selected && setAssignFor({ conversationId: selected.id, mode: 'assign' })
          }
          onTransferClick={() =>
            selected && setAssignFor({ conversationId: selected.id, mode: 'transfer' })
          }
          onTogglePin={handleTogglePin}
          onEnd={handleEndConv}
          onToggleTag={handleToggleTag}
          onClickFailed={handleClickFailedMessage}
          onRecall={handleRecallFromMessage}
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
        onClose={() => setFailureForMessageId(null)}
        onIntervene={handleInterveneFromFailure}
      />

      <AssignDialog
        state={assignFor}
        agents={agents}
        currentAgentId={currentAgentId}
        onClose={() => setAssignFor(null)}
        onSubmit={handleAssign}
      />
    </div>
  )
}

export default WorkbenchPage
