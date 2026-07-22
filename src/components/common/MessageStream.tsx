/**
 * 共享消息流(chat-workbench 主视图 / player-center 会话只读 Drawer 共用)
 *
 * 在 MessageBubble 之上叠加「按自然日插入日期分割线」的展示口径
 * (见 chat-workbench design「消息记录展示口径」)。企微号为会话级固定值,
 * 由各宿主在头部展示,本组件不逐条重复。
 *
 * system 轮次分隔消息(「本次会话已结束」等)按原样渲染,不参与日期分组;
 * 日期分割线只在**非 system 消息**跨自然日时插入。
 *
 * 轮次边界合并：相邻的「本次会话已结束」+「玩家重新发起 / 客服重新联系」两条系统条
 * 合成一条边界(`会话已结束 HH:MM · 玩家 MM-DD HH:MM 重新发起`);合并条已内联新一轮
 * 日期,后续同日消息不再重复插日期线。单独出现的重开条同理内联日期、抑制紧随日期线。
 */
import type { Message } from '../../types/chat'
import MessageBubble from './MessageBubble'
import { dayKey, formatDateLabel, formatMonthDayTime } from './messageTime'

interface MessageStreamProps {
  messages: Message[]
  /** 综合搜索跳转时需要定位并短暂高亮的消息 */
  highlightMessageId?: string | null
  /** 只读消息筛选命中词 */
  highlightText?: string
  /** 只读模式透传给 MessageBubble(player-center Drawer 用) */
  readOnly?: boolean
  onClickFailed?: (msg: Message) => void
  onRecall?: (msg: Message) => void
  canRecallMessage?: (msg: Message) => boolean
}

/** 「本次会话已结束」边界条 */
function isEndedBoundary(m: Message): boolean {
  return m.direction === 'system' && (
    m.systemEvent === 'conversation_ended'
    || (!m.systemEvent && typeof m.text === 'string' && m.text.includes('本次会话已结束'))
  )
}

/** 「玩家重新发起 / 客服主动发起或重新联系」重开条 → 提取发起方与动作短语；非重开条返回 null */
function reopenKind(m: Message): { actor: string; action: string } | null {
  if (m.direction !== 'system' || typeof m.text !== 'string') return null
  if (m.systemEvent === 'player_reopened') return { actor: '玩家', action: '重新发起' }
  if (m.systemEvent === 'agent_reopened') {
    if (m.text.includes('主动发起')) return { actor: '客服', action: '主动发起' }
    return { actor: '客服', action: '重新联系' }
  }
  if (m.systemEvent) return null
  if (m.text.includes('重新发起')) return { actor: '玩家', action: '重新发起' }
  if (m.text.includes('重新联系')) return { actor: '客服', action: '重新联系' }
  if (m.text.includes('主动发起')) return { actor: '客服', action: '主动发起' }
  return null
}

function MessageStream({
  messages,
  highlightMessageId,
  highlightText,
  readOnly,
  onClickFailed,
  onRecall,
  canRecallMessage,
}: MessageStreamProps) {
  const nodes: React.ReactNode[] = []
  let lastDay = ''

  const renderBubble = (m: Message) => (
    <MessageBubble
      key={m.id}
      message={m}
      highlighted={m.id === highlightMessageId}
      highlightText={highlightText}
      readOnly={readOnly}
      onClickFailed={onClickFailed}
      onRecall={onRecall}
      canRecallMessage={canRecallMessage}
    />
  )

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]

    // 轮次边界合并:「已结束」+ 紧随「重开」→ 合成一条边界,并用重开日承载后续日期
    if (isEndedBoundary(m)) {
      const next = messages[i + 1]
      const kind = next ? reopenKind(next) : null
      if (next && kind) {
        const label = `会话已于${formatMonthDayTime(m.createdAt)}结束 · ${kind.actor}${formatMonthDayTime(next.createdAt)}${kind.action}`
        nodes.push(
          <div key={`boundary-${m.id}`} className="cf-msg-divider cf-msg-divider--boundary" role="separator">
            <span className="cf-msg-divider__text">{label}</span>
          </div>,
        )
        const nd = dayKey(next.createdAt)
        if (nd) lastDay = nd
        i++ // 跳过被合并的重开条
        continue
      }
      // 末轮已结束、其后无重开条 → 原样渲染
      nodes.push(renderBubble(m))
      continue
    }

    // 单独出现的重开条(默认视图:最新一轮开头,前面无「已结束」):
    // 原文已含完整日期,记 lastDay 抑制紧随的冗余日期线
    if (reopenKind(m)) {
      nodes.push(renderBubble(m))
      const nd = dayKey(m.createdAt)
      if (nd) lastDay = nd
      continue
    }

    if (m.direction !== 'system') {
      const day = dayKey(m.createdAt)
      if (day && day !== lastDay) {
        nodes.push(
          <div key={`date-${day}-${m.id}`} className="cf-msg-divider cf-msg-divider--date" role="separator">
            <span className="cf-msg-divider__text">{formatDateLabel(m.createdAt)}</span>
          </div>,
        )
        lastDay = day
      }
    }
    nodes.push(renderBubble(m))
  }
  return <>{nodes}</>
}

export default MessageStream
