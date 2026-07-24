/**
 * 共享消息气泡(chat-workbench / player-center Drawer 共用)
 * 视觉延续 chat-workbench 设计例外:气泡 8px 圆角 / 行高 1.55 / 状态图标。
 *
 * 通过 `readOnly` 切换交互:
 *   - readOnly=false(默认 / chat-workbench):支持失败 Tooltip + 可诊断类失败(RPA 异常 / 回捞比对失败)可点击打开失败详情
 *   - readOnly=true (player-center 会话只读 Drawer):仅 Tooltip,失败不可点击
 *
 * V1 不提供撤回入口(P-117 暂缓);`message.recalled` 由后端会话存档回查后回传,前端只读展示占位。
 *
 * 样式 class(`cf-msg__*`)在 src/styles/Workbench.scss 中定义,全局生效。
 */
import {
  CheckOutlined,
  ExclamationCircleFilled,
  FileOutlined,
  LoadingOutlined,
} from '@ant-design/icons'
import { Image, Tooltip } from 'antd'
import type { ReactNode } from 'react'
import type { Message, MessageAttachment } from '../../types/chat'
import { findAgent, findPlayer } from '../../services/chatflowMock'
import { formatFullDateTime } from './messageTime'

interface MessageBubbleProps {
  message: Message
  /** 综合搜索跳转后的目标态 */
  highlighted?: boolean
  /** 只读消息筛选时需要高亮的正文关键词 */
  highlightText?: string
  /** 可诊断失败(rpa_exception / delivery_reconciliation_failed)点击 → 打开失败详情抽屉(仅 chat-workbench 用) */
  onClickFailed?: (msg: Message) => void
  /** 只读模式:失败气泡不可点 */
  readOnly?: boolean
}

function MessageBubble({
  message,
  highlighted = false,
  highlightText,
  onClickFailed,
  readOnly = false,
}: MessageBubbleProps) {
  const renderHighlightedText = (text: string): ReactNode => {
    const query = highlightText?.trim().toLocaleLowerCase()
    if (!query) return text
    const lowerText = text.toLocaleLowerCase()
    const nodes: ReactNode[] = []
    let cursor = 0
    let matchIndex = lowerText.indexOf(query)
    while (matchIndex >= 0) {
      if (matchIndex > cursor) nodes.push(text.slice(cursor, matchIndex))
      const end = matchIndex + query.length
      nodes.push(
        <mark className="cf-msg__text-highlight" key={`${matchIndex}-${end}`}>
          {text.slice(matchIndex, end)}
        </mark>,
      )
      cursor = end
      matchIndex = lowerText.indexOf(query, cursor)
    }
    if (cursor < text.length) nodes.push(text.slice(cursor))
    return nodes.length ? nodes : text
  }

  // 系统分割消息(跨轮次会话标记):居中无气泡,浅底药丸
  if (message.direction === 'system') {
    return (
      <div className="cf-msg-divider cf-msg-divider--boundary" role="separator">
        <span className="cf-msg-divider__text">{message.text}</span>
      </div>
    )
  }

  const senderName =
    message.direction === 'incoming'
      ? findPlayer(message.senderId)?.nickname ?? '玩家'
      : findAgent(message.senderId)?.name ?? '客服'
  const failureCat = message.failure?.category
  const isClickableFailed =
    !readOnly && (failureCat === 'rpa_exception' || failureCat === 'delivery_reconciliation_failed')

  const renderNonImageAttachment = (a: MessageAttachment, i: number) => {
    if (a.type === 'video') {
      return <video key={i} src={a.url} controls className="cf-msg__video" />
    }
    return (
      <a
        key={i}
        href={a.url}
        target="_blank"
        rel="noreferrer"
        download={a.name}
        className="cf-msg__file"
      >
        <FileOutlined />
        <span className="cf-msg__file-info">
          <span className="cf-msg__file-name">{a.name}</span>
          <span className="cf-text-tertiary">
            {a.sizeBytes ? `${(a.sizeBytes / 1024 / 1024).toFixed(2)} MB` : ''}
          </span>
        </span>
      </a>
    )
  }

  const renderContent = () => {
    if (message.recalled) return <span className="cf-text-tertiary">消息已撤回</span>
    // 兼容历史图文/多附件合并消息；新发送已按单条消息拆分。
    if (message.attachments?.length) {
      const images = message.attachments.filter((a) => a.type === 'image')
      const others = message.attachments.filter((a) => a.type !== 'image')
      return (
        <div className="cf-msg__mixed">
          {images.length > 0 && (
            <div className="cf-msg__images">
              <Image.PreviewGroup>
                {images.map((a, i) => (
                  <Image key={i} src={a.url} alt={a.name} className="cf-msg__image" />
                ))}
              </Image.PreviewGroup>
            </div>
          )}
          {others.map(renderNonImageAttachment)}
          {message.text && (
            <div className="cf-msg__text">{renderHighlightedText(message.text)}</div>
          )}
        </div>
      )
    }
    if (message.contentType === 'image') {
      return (
        <a href={message.mediaUrl} target="_blank" rel="noreferrer">
          <img
            src={message.mediaUrl}
            alt={message.mediaName ?? '图片'}
            className="cf-msg__image"
          />
        </a>
      )
    }
    if (message.contentType === 'video') {
      return <video src={message.mediaUrl} controls className="cf-msg__video" />
    }
    if (message.contentType === 'file') {
      return (
        <a
          href={message.mediaUrl}
          target="_blank"
          rel="noreferrer"
          download={message.mediaName}
          className="cf-msg__file"
        >
          <FileOutlined />
          <span>
            <div>{message.mediaName}</div>
            <div className="cf-text-tertiary">
              {message.mediaSizeBytes
                ? `${(message.mediaSizeBytes / 1024 / 1024).toFixed(2)} MB`
                : ''}
            </div>
          </span>
        </a>
      )
    }
    if (message.contentType === 'link' && message.text) {
      return <a href={message.text} target="_blank" rel="noreferrer">{renderHighlightedText(message.text)}</a>
    }
    if (message.contentType === 'unsupported') {
      return <span className="cf-text-tertiary">[暂不支持的消息类型：{message.unsupportedLabel ?? '未知'}]</span>
    }
    return renderHighlightedText(message.text ?? '')
  }

  return (
    <div
      className={`cf-msg cf-msg--${message.direction}${highlighted ? ' is-highlighted' : ''}`}
      data-message-id={message.id}
      aria-current={highlighted ? 'true' : undefined}
    >
      <div className="cf-msg__sender">
        <span>{senderName}</span>
        {/* 悬停时原地把 HH:MM 换成完整日期时间(不用 Tooltip) */}
        <span className="cf-msg__time">
          <span className="cf-msg__time-short">
            {new Date(message.createdAt).toTimeString().slice(0, 5)}
          </span>
          <span className="cf-msg__time-full">{formatFullDateTime(message.createdAt)}</span>
        </span>
      </div>
      <div className="cf-msg__bubble-wrap">
        <div className="cf-msg__bubble">
          {renderContent()}
        </div>
        <div className="cf-msg__status">
          {message.direction === 'outgoing' && message.status === 'sending' && <LoadingOutlined />}
          {message.direction === 'outgoing' && message.status === 'sent' && (
            <CheckOutlined style={{ color: '#8C8C8C' }} />
          )}
          {message.status === 'failed' && (
            <Tooltip title={message.failure?.message ?? '发送失败'}>
              <span
                className={`cf-msg__failed ${isClickableFailed ? 'is-clickable' : ''}`}
                role={isClickableFailed ? 'button' : undefined}
                tabIndex={isClickableFailed ? 0 : -1}
                onClick={() => isClickableFailed && onClickFailed?.(message)}
              >
                <ExclamationCircleFilled style={{ color: '#FF4D4F' }} />
              </span>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  )
}

export default MessageBubble
