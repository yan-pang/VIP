/**
 * 会话只读 Drawer(D3-1)— 玩家详情与消息管理共用同一组件。
 * build 阶段第 2 轮:
 *   - 复用共享 MessageStream(readOnly),继承 chat-workbench 消息记录展示口径(日期分割线 / 悬停完整时间)
 *   - 二级筛选条:消息时间(范围) / 消息内容(模糊)
 *   - 系统消息(轮次分隔)直接渲染,不被筛选过滤
 *   - 底部"去工作台接待"携带当前 conversationId 跳工作台
 */
import { CopyOutlined } from '@ant-design/icons'
import {
  Button,
  DatePicker,
  Drawer,
  Empty,
  Input,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message as antdMessage,
} from 'antd'
import type { Dayjs } from 'dayjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { findAccount, findPlayer } from '../../services/chatflowMock'
import { useWorkbenchRuntime } from '../../services/workbenchRuntimeMock'
import {
  getConversationIndexById,
  getConversationMessages,
  getRelation,
  getRoundMessages,
} from '../../services/playerCenterMock'
import type { Message } from '../../types/chat'
import MessageStream from './MessageStream'

const { Text } = Typography
const { RangePicker } = DatePicker

export type ConversationDrawerContext =
  // roundIndex 可选:来自 /messages 的轮次行时只看该轮;玩家详情页 / 深链不传 → 整会话
  { kind: 'conversation'; conversationId: string; roundIndex?: number }

export interface ConversationDrawerProps {
  open: boolean
  onClose: () => void
  context: ConversationDrawerContext | null
  visibleAccountIds?: string[]
}

interface ResolvedContext {
  conversationId: string
  playerId: string
  accountId: string
  /** 仅看某一轮(1-based);undefined = 整会话 */
  roundIndex?: number
}

function resolveContext(ctx: ConversationDrawerContext): ResolvedContext | null {
  const entry = getConversationIndexById(ctx.conversationId)
  if (!entry) return null
  return {
    conversationId: entry.conversationId,
    playerId: entry.playerId,
    accountId: entry.accountId,
    roundIndex: ctx.roundIndex,
  }
}

function ConversationDrawer({ open, onClose, context, visibleAccountIds }: ConversationDrawerProps) {
  const navigate = useNavigate()
  const runtime = useWorkbenchRuntime()
  const [loading, setLoading] = useState(false)
  const [resolved, setResolved] = useState<ResolvedContext | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [allConvMessages, setAllConvMessages] = useState<Message[]>([])

  // 二级筛选条
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [contentInput, setContentInput] = useState('')
  const [content, setContent] = useState('')
  const [senderType, setSenderType] = useState<'all' | 'player' | 'agent'>('all')
  const messageStreamRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contentInput === content) return
    const timer = window.setTimeout(() => setContent(contentInput), 300)
    return () => window.clearTimeout(timer)
  }, [content, contentInput])

  useEffect(() => {
    if (!open || !context) return
    setLoading(true)
    setResolved(null)
    setError(null)
    setAllConvMessages([])
    setDateRange(null)
    setContentInput('')
    setContent('')
    setSenderType('all')
    const next = resolveContext(context)
    if (!next || (visibleAccountIds && !visibleAccountIds.includes(next.accountId))) {
      setError('会话不可见或不存在,请确认链接或联系管理员授权。')
      setLoading(false)
      return
    }
    setResolved(next)
    // 有 roundIndex → 只加载该轮消息(/messages 轮次行);否则整会话(玩家详情页 / 深链)
    const list =
      next.roundIndex != null
        ? getRoundMessages(next.conversationId, next.roundIndex)
        : getConversationMessages(next.conversationId)
    setAllConvMessages(list)
    setLoading(false)
  }, [open, context, visibleAccountIds])

  // Drawer 打开期间继续订阅工作台运行态；新收 / 新发消息无需关闭重开即可出现。
  useEffect(() => {
    if (!open || !resolved?.conversationId) return
    const list =
      resolved.roundIndex != null
        ? getRoundMessages(resolved.conversationId, resolved.roundIndex)
        : getConversationMessages(resolved.conversationId)
    setAllConvMessages(list)
  }, [
    open,
    resolved?.conversationId,
    resolved?.roundIndex,
    runtime.conversations,
    runtime.messages,
  ])

  const player = resolved ? findPlayer(resolved.playerId) : undefined
  const account = resolved ? findAccount(resolved.accountId) : undefined
  const relation = resolved ? getRelation(resolved.playerId, resolved.accountId) : undefined

  const filteredMessages = useMemo(() => {
    return allConvMessages.filter((m) => {
      // 系统消息(轮次分隔)始终显示,不参与筛选
      if (m.direction === 'system') return true
      if (senderType === 'player' && m.direction !== 'incoming') return false
      if (senderType === 'agent' && m.direction !== 'outgoing') return false
      if (dateRange) {
        const created = new Date(m.createdAt).getTime()
        const start = dateRange[0].startOf('day').valueOf()
        const end = dateRange[1].endOf('day').valueOf()
        if (created < start || created > end) return false
      }
      if (content) {
        const text = m.text ?? m.mediaName ?? ''
        if (!text.toLowerCase().includes(content.toLowerCase())) return false
      }
      return true
    })
  }, [allConvMessages, dateRange, content, senderType])

  useEffect(() => {
    if (!open || allConvMessages.length === 0) return
    const frame = requestAnimationFrame(() => {
      const stream = messageStreamRef.current
      if (stream) stream.scrollTop = content ? 0 : stream.scrollHeight
    })
    return () => cancelAnimationFrame(frame)
  }, [allConvMessages.length, content, open, resolved?.conversationId, resolved?.roundIndex])

  const playerDisplayName = relation?.remark?.trim() || player?.nickname || '玩家'

  const headerTitle = resolved ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, lineHeight: 1.4 }}>
      <span>
        {playerDisplayName}
        <Tag
          color={account?.status === 'banned' ? 'red' : account?.status === 'offline' ? 'orange' : 'green'}
          style={{ marginLeft: 8 }}
        >
          📱 {account?.shortName ?? '管家'}
        </Tag>
      </span>
      <Text style={{ fontFamily: 'SF Mono, Menlo, monospace', fontSize: 12, color: '#8C8C8C' }}>
        {resolved.roundIndex != null
          ? `${resolved.conversationId}#${resolved.roundIndex}`
          : resolved.conversationId}
        <CopyOutlined
          style={{ cursor: 'pointer', marginLeft: 4 }}
          onClick={async () => {
            try {
              const roundId = resolved.roundIndex != null
                ? `${resolved.conversationId}#${resolved.roundIndex}`
                : resolved.conversationId
              await navigator.clipboard?.writeText(roundId)
              antdMessage.success('已复制会话轮次')
            } catch {
              antdMessage.warning('请手动复制')
            }
          }}
        />
      </Text>
    </div>
  ) : '会话记录'

  const handleGoToWorkbench = () => {
    if (!resolved) return
    // 注意:跳转后不要再调 onClose()。
    // 在 /messages 宿主里 onClose 会 setSearchParams 删掉 ?conversationId,与这里的
    // navigate 竞态导致跳转 query 被覆盖、工作台收不到 conversationId(定位不到会话)。
    // navigate 已切换路由,宿主页(及本 Drawer)随之卸载,无需手动关闭。
    navigate(`/workbench?conversationId=${encodeURIComponent(resolved.conversationId)}`)
  }

  return (
    <Drawer
      title={headerTitle}
      open={open}
      onClose={onClose}
      width={780}
      destroyOnHidden
      footer={
        error || !resolved ? null : (
          <div style={{ textAlign: 'right' }}>
            <Button type="primary" onClick={handleGoToWorkbench}>
              去工作台接待 →
            </Button>
          </div>
        )
      }
    >
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : error ? (
        <Empty description={error} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
          {/* 二级筛选条 */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              padding: 8,
              background: '#FAFAFA',
              borderRadius: 6,
            }}
          >
            <RangePicker
              size="small"
              value={dateRange}
              onChange={(v) => setDateRange(v as [Dayjs, Dayjs] | null)}
              placeholder={['消息时间起', '消息时间止']}
            />
            <Input
              size="small"
              placeholder="消息内容(模糊)"
              allowClear
              value={contentInput}
              onChange={(e) => setContentInput(e.target.value)}
              style={{ width: 200 }}
            />
            <Select
              size="small"
              value={senderType}
              options={[
                { label: '发送方：全部', value: 'all' },
                { label: '发送方：玩家', value: 'player' },
                { label: '发送方：客服', value: 'agent' },
              ]}
              onChange={setSenderType}
              style={{ width: 140 }}
            />
            {(dateRange || contentInput || senderType !== 'all') && (
              <Button
                size="small"
                type="link"
                onClick={() => {
                  setDateRange(null)
                  setContentInput('')
                  setContent('')
                  setSenderType('all')
                }}
              >
                清空筛选
              </Button>
            )}
            <Space style={{ marginLeft: 'auto' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                共 {filteredMessages.filter((m) => m.direction !== 'system').length} 条消息
                {content ? ` · ${filteredMessages.filter((m) => m.direction !== 'system' && (m.text ?? '').toLowerCase().includes(content.toLowerCase())).length} 条命中` : ''}
              </Text>
            </Space>
          </div>

          {/* 消息列表:flex column 让 .cf-msg 的 align-self(outgoing 贴右 / incoming 贴左)生效 */}
          <div
            className="cf-msg-stream"
            ref={messageStreamRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '4px 0',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {filteredMessages.length === 0 ? (
              <Empty description="该筛选下无消息" />
            ) : (
              <MessageStream messages={filteredMessages} readOnly highlightText={content} />
            )}
          </div>
        </div>
      )}
    </Drawer>
  )
}

export default ConversationDrawer
