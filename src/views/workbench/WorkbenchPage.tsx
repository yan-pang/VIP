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
  messages as messagesSeed,
  simulateSendOutcome,
  wechatAccounts,
} from '../../services/chatflowMock'
import type { Conversation, ConversationTag, Message, MessageAttachment } from '../../types/chat'
import {
  SEED_CONV_IDS,
  loadProactivePersisted,
  makeConversationId,
  saveProactivePersisted,
} from '../../services/proactiveStore'
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
  }
}

function WorkbenchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { openSearch } = useOutletContext<ShellOutletContext>()

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const { conversations: persisted } = loadProactivePersisted()
    // 已落库的主动发起会话置前(lastMessageAt 较新),seed 在后
    return [...persisted.filter((c) => !SEED_CONV_IDS.has(c.id)), ...conversationsSeed]
  })
  const [messages, setMessages] = useState<Message[]>(() => {
    const { messages: persisted } = loadProactivePersisted()
    const seedMsgIds = new Set(messagesSeed.map((m) => m.id))
    return [...messagesSeed, ...persisted.filter((m) => !seedMsgIds.has(m.id))]
  })

  // 主动发起会话落库后持久化(刷新保留);占位未发送 / 失败的不写入
  useEffect(() => {
    saveProactivePersisted(conversations, messages)
  }, [conversations, messages])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  // 多选筛选:默认勾选全部企微号 = 不筛选
  const [accountFilter, setAccountFilter] = useState<string[]>(() =>
    wechatAccounts.map((a) => a.id),
  )
  const [asideCollapsed, setAsideCollapsed] = useState(false)
  // 已结束会话的"主动发起"临时态 id 集合;成功发送一条后自动清除
  const [reactivatingIds, setReactivatingIds] = useState<Set<string>>(new Set())

  // 弹层状态
  const [failureForMessageId, setFailureForMessageId] = useState<string | null>(null)
  const [assignFor, setAssignFor] = useState<{ conversationId: string; mode: 'assign' | 'transfer' } | null>(null)

  // ref 保留最新值给定时器,避免每次 state 变化重置 setInterval
  const liveRef = useRef({ conversations, selectedId })
  liveRef.current = { conversations, selectedId }

  // 主动发起占位幂等:记住本次挂载已为某 (playerId::accountId) 创建的会话 id。
  // 会话 ID 改为每次唯一后,StrictMode 下 effect 双调用会各生成一个 id,
  // 必须按 (玩家×企微号) 去重,否则同一次主动发起会建出两条占位。
  const proactiveCreatedRef = useRef<Map<string, string>>(new Map())

  // 接收 URL query 跳转(来自搜索面板 / 控制台 / 玩家中心)
  useEffect(() => {
    const cid = searchParams.get('conversationId')
    const pid = searchParams.get('playerId')
    const acc = searchParams.get('accountId')

    // ① 已存在会话定位(来自玩家中心 / 消息管理"去工作台接待" / 搜索面板)
    //    定位会话;若该会话已结束,则与玩家中心入口一致 —— 自动进入主动发起态(输入区解锁可直接接待)。
    {
      const target = cid ? conversations.find((c) => c.id === cid) : undefined
      if (target) {
        setSelectedId(target.id)
        if (target.status === 'ended') {
          setReactivatingIds((prev) => {
            if (prev.has(target.id)) return prev
            const nextSet = new Set(prev)
            nextSet.add(target.id)
            return nextSet
          })
        }
        const next = new URLSearchParams(searchParams)
        next.delete('conversationId')
        next.delete('messageId')
        setSearchParams(next, { replace: true })
        return
      }
    }

    // ② 玩家中心"主动发起":带 playerId + accountId。
    //    无会话 → 创建会话占位,以"会话中"(active)状态 + 指派当前客服显示,
    //      落在左列"会话中"分组、有选中态、按 lastMessageAt 排在非置顶最前(即发起时间)。
    //      首条消息发送成功 = 已送达;失败 = 消息红标可重发(会话保留,不撤销)。刷新页面占位消失。
    //    有会话 → 定位(已结束自动进主动发起态)。
    if (pid && acc) {
      const existing = conversations.find((c) => c.playerId === pid && c.accountId === acc)
      if (existing) {
        setSelectedId(existing.id)
        if (existing.status === 'ended') {
          setReactivatingIds((prev) => {
            if (prev.has(existing.id)) return prev
            const nextSet = new Set(prev)
            nextSet.add(existing.id)
            return nextSet
          })
        }
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
            tags: [],
            unreadCount: 0,
            lastMessagePreview: '(主动发起会话,待发送首条消息)',
            lastMessageAt: now,
            createdAt: now,
            playerHasDeletedFriendship: false,
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
    if (acc) {
      setAccountFilter([acc])
      const next = new URLSearchParams(searchParams)
      next.delete('accountId')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams, conversations])

  const visibleConversations = useMemo(
    () => conversations.filter((c) => accountFilter.includes(c.accountId)),
    [accountFilter, conversations],
  )

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
        makeSystemMessage(id, `本次会话已结束 · ${formatStamp(now)}`, now, 'end'),
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
      payload: { text?: string; attachments?: MessageAttachment[] },
    ) => {
      const conv = conversations.find((c) => c.id === conversationId)
      if (!conv) return
      const text = payload.text?.trim() || undefined
      const attachments = payload.attachments?.length ? payload.attachments : undefined
      if (!text && !attachments) return

      const now = new Date().toISOString()
      // V1 取消隐式指派:排队中会话不渲染输入区,能走到这里发消息的会话
      // 必然是「已指派给自己的会话中」或「已结束的主动发起态」,发送前不再改指派人。
      // 主动发起态(已结束 + 客服点过"主动发起会话"):状态机和指派人不在发送前变更,
      // 只有发送成功后才改 active + 指派给当前客服。
      const isProactiveReactivate =
        conv.status === 'ended' && reactivatingIds.has(conversationId)

      // 追加 sending 消息(一条图文:text + attachments 同框)
      const msgId = `m_${Date.now()}`
      // contentType:仅文字→text;仅单附件→该附件 type;有文字+附件 或 多附件→mixed
      const contentType: Message['contentType'] =
        !attachments
          ? 'text'
          : !text && attachments.length === 1
            ? attachments[0].type
            : 'mixed'
      const sendingMsg: Message = {
        id: msgId,
        conversationId,
        direction: 'outgoing',
        contentType,
        text,
        attachments,
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

        // 主动发起态:发送成功才把会话从 ended 切到 active 并指派给当前客服;失败保持 ended
        if (isProactiveReactivate && outcome.status === 'sent') {
          const ts = new Date().toISOString()
          setConversations((prev) =>
            prev.map((c) =>
              c.id === conversationId
                ? {
                    ...c,
                    status: 'active',
                    assigneeId: currentAgentId,
                    assigneeHistory: [
                      ...c.assigneeHistory,
                      { agentId: currentAgentId, changedAt: ts, reason: 'explicit', note: '客服主动发起' },
                    ],
                    playerHasDeletedFriendship: false,
                  }
                : c,
            ),
          )
          // 在主动发起的首条消息之前(now - 2s)插入系统分割条
          const sysAt = new Date(new Date(now).getTime() - 2000).toISOString()
          setMessages((prev) => [
            ...prev,
            makeSystemMessage(
              conversationId,
              `客服于 ${formatStamp(ts)} 主动发起会话`,
              sysAt,
              'proactive',
            ),
          ])
          clearReactivating(conversationId)
        }

        // 删好友标记
        if (
          outcome.status === 'failed' &&
          outcome.failure.category === 'player_deleted_friendship'
        ) {
          updateConv(conversationId, { playerHasDeletedFriendship: true })
        }

        // 更新会话 lastMessagePreview
        const attachPreview = attachments
          ? text
            ? '[图文]'
            : attachments.length > 1
              ? '[图文]'
              : attachments[0].type === 'image'
                ? '[图片]'
                : attachments[0].type === 'video'
                  ? '[视频]'
                  : `[文件] ${attachments[0].name}`
          : null
        const preview = text ? text.slice(0, 20) : attachPreview ?? ''
        updateConv(conversationId, {
          lastMessagePreview: preview,
          lastMessageAt: new Date().toISOString(),
        })
      }, delay)
    },
    [conversations, updateConv, reactivatingIds, clearReactivating],
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
          currentAgentId={currentAgentId}
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
          conversation={selected}
          currentAgentId={currentAgentId}
          messages={messages}
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
