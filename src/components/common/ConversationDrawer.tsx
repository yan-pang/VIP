/**
 * 会话只读 Drawer(D3-1)— 三处宿主共用同一组件实例。
 * build 阶段第 2 轮:
 *   - 复用共享 MessageStream(readOnly),继承 chat-workbench 消息记录展示口径(日期分割线 / 悬停完整时间)
 *   - 二级筛选条:消息时间(范围) / 消息内容(模糊)
 *   - 系统消息(轮次分隔)直接渲染,不被筛选过滤
 *   - 底部"去工作台接待"按宿主上下文走两条 query
 */
import { CopyOutlined } from '@ant-design/icons'
import {
  Button,
  DatePicker,
  Drawer,
  Empty,
  Input,
  Space,
  Spin,
  Tag,
  Typography,
  message as antdMessage,
} from 'antd'
import type { Dayjs } from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { findAccount, findPlayer } from '../../services/chatflowMock'
import {
  getConversationIndexById,
  getConversationMessages,
  getLatestConversationByRelation,
  getRelation,
  getRoundMessages,
} from '../../services/playerCenterMock'
import type { Message } from '../../types/chat'
import MessageStream from './MessageStream'

const { Text } = Typography
const { RangePicker } = DatePicker

export type ConversationDrawerContext =
  // roundIndex 可选:来自 /messages 的轮次行时只看该轮;玩家详情页 / 深链不传 → 整会话
  | { kind: 'conversation'; conversationId: string; roundIndex?: number }
  | { kind: 'relation'; playerId: string; accountId: string }

export interface ConversationDrawerProps {
  open: boolean
  onClose: () => void
  context: ConversationDrawerContext | null
}

interface ResolvedContext {
  conversationId: string | null
  playerId: string
  accountId: string
  /** 仅看某一轮(1-based);undefined = 整会话 */
  roundIndex?: number
}

function resolveContext(ctx: ConversationDrawerContext): ResolvedContext | null {
  if (ctx.kind === 'conversation') {
    const entry = getConversationIndexById(ctx.conversationId)
    if (!entry) return null
    return {
      conversationId: entry.conversationId,
      playerId: entry.playerId,
      accountId: entry.accountId,
      roundIndex: ctx.roundIndex,
    }
  }
  const latest = getLatestConversationByRelation(ctx.playerId, ctx.accountId)
  return {
    conversationId: latest?.conversationId ?? null,
    playerId: ctx.playerId,
    accountId: ctx.accountId,
  }
}

function ConversationDrawer({ open, onClose, context }: ConversationDrawerProps) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [resolved, setResolved] = useState<ResolvedContext | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [allConvMessages, setAllConvMessages] = useState<Message[]>([])

  // 二级筛选条
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null)
  const [content, setContent] = useState('')

  useEffect(() => {
    if (!open || !context) return
    setLoading(true)
    setError(null)
    setAllConvMessages([])
    setDateRange(null)
    setContent('')
    const next = resolveContext(context)
    if (!next) {
      setError('会话不可见或不存在,请确认链接或联系管理员授权。')
      setLoading(false)
      return
    }
    setResolved(next)
    if (next.conversationId) {
      // 有 roundIndex → 只加载该轮消息(/messages 轮次行);否则整会话(玩家详情页 / 深链)
      const list =
        next.roundIndex != null
          ? getRoundMessages(next.conversationId, next.roundIndex)
          : getConversationMessages(next.conversationId)
      setAllConvMessages(list)
    }
    setLoading(false)
  }, [open, context])

  const player = resolved ? findPlayer(resolved.playerId) : undefined
  const account = resolved ? findAccount(resolved.accountId) : undefined
  const relation = resolved ? getRelation(resolved.playerId, resolved.accountId) : undefined

  const isEmpty = useMemo(() => Boolean(resolved && !resolved.conversationId), [resolved])

  const filteredMessages = useMemo(() => {
    return allConvMessages.filter((m) => {
      // 系统消息(轮次分隔)始终显示,不参与筛选
      if (m.direction === 'system') return true
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
  }, [allConvMessages, dateRange, content])

  const headerTitle = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, lineHeight: 1.4 }}>
      <span>
        {player?.nickname ?? '玩家'}
        {relation?.remark ? ` / ${relation.remark}` : ''}
        <Tag color="green" style={{ marginLeft: 8 }}>
          📱 {account?.shortName ?? '管家'}
        </Tag>
      </span>
      {resolved?.conversationId ? (
        <Text style={{ fontFamily: 'SF Mono, Menlo, monospace', fontSize: 12, color: '#8C8C8C' }}>
          {resolved.roundIndex != null
            ? `${resolved.conversationId}#${resolved.roundIndex}`
            : resolved.conversationId}{' '}
          <CopyOutlined
            style={{ cursor: 'pointer', marginLeft: 4 }}
            onClick={async () => {
              try {
                const idText =
                  resolved.roundIndex != null
                    ? `${resolved.conversationId}#${resolved.roundIndex}`
                    : resolved.conversationId!
                await navigator.clipboard?.writeText(idText)
                antdMessage.success('已复制会话标识')
              } catch {
                antdMessage.warning('请手动复制')
              }
            }}
          />
        </Text>
      ) : null}
    </div>
  )

  const handleGoToWorkbench = () => {
    if (!resolved) return
    // 注意:跳转后不要再调 onClose()。
    // 在 /messages 宿主里 onClose 会 setSearchParams 删掉 ?conversationId,与这里的
    // navigate 竞态导致跳转 query 被覆盖、工作台收不到 conversationId(定位不到会话)。
    // navigate 已切换路由,宿主页(及本 Drawer)随之卸载,无需手动关闭。
    if (resolved.conversationId) {
      navigate(`/workbench?conversationId=${encodeURIComponent(resolved.conversationId)}`)
    } else {
      navigate(
        `/workbench?playerId=${encodeURIComponent(resolved.playerId)}&accountId=${encodeURIComponent(resolved.accountId)}`,
      )
    }
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
              {isEmpty ? '去工作台主动发起 →' : '去工作台接待 →'}
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
      ) : isEmpty ? (
        <Empty description="该玩家与该企微号暂无会话记录" />
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
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{ width: 200 }}
            />
            {(dateRange || content) && (
              <Button
                size="small"
                type="link"
                onClick={() => {
                  setDateRange(null)
                  setContent('')
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
              <MessageStream messages={filteredMessages} readOnly />
            )}
          </div>
        </div>
      )}
    </Drawer>
  )
}

export default ConversationDrawer
