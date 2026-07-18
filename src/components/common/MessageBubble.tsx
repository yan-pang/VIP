/**
 * 共享消息气泡(chat-workbench / player-center Drawer 共用)
 * 视觉延续 chat-workbench 设计例外:气泡 8px 圆角 / 行高 1.55 / 状态图标。
 *
 * 通过 `readOnly` 切换交互:
 *   - readOnly=false(默认 / chat-workbench):支持失败 Tooltip+ rpa_exception 类失败可点击 / 悬停出「撤回」按钮
 *   - readOnly=true (player-center 会话只读 Drawer):仅 Tooltip,失败不可点击,无撤回入口
 *
 * 样式 class(`cf-msg__*`)在 src/styles/Workbench.scss 中定义,全局生效。
 */
import {
  CheckOutlined,
  ExclamationCircleFilled,
  FileOutlined,
  LoadingOutlined,
  RollbackOutlined,
} from '@ant-design/icons'
import { Image, Modal, Tooltip } from 'antd'
import type { Message, MessageAttachment } from '../../types/chat'
import { findAgent, findPlayer } from '../../services/chatflowMock'
import { formatFullDateTime } from './messageTime'

interface MessageBubbleProps {
  message: Message
  /** 失败气泡(rpa_exception)点击 → 打开失败详情抽屉(仅 chat-workbench 用) */
  onClickFailed?: (msg: Message) => void
  /** 悬停出「撤回」按钮 → 撤回(仅 chat-workbench 用,readOnly 时禁用) */
  onRecall?: (msg: Message) => void
  /** 只读模式:无右键菜单、失败气泡不可点 */
  readOnly?: boolean
}

function MessageBubble({
  message,
  onClickFailed,
  onRecall,
  readOnly = false,
}: MessageBubbleProps) {
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
  const isClickableFailed = !readOnly && failureCat === 'rpa_exception'
  // 悬停出「撤回」按钮:仅自己发出、已送达、未撤回的消息
  const canRecall =
    !readOnly &&
    message.direction === 'outgoing' &&
    message.status === 'sent' &&
    !message.recalled &&
    !!onRecall

  const handleRecall = () => {
    if (!canRecall || !onRecall) return
    Modal.confirm({
      title: '撤回消息',
      content:
        'V1 阶段撤回需要在云桌面手动操作。点击确认将跳转到企微号控制台,你可以在那里的云桌面里手动撤回该条消息。',
      okText: '前往控制台',
      cancelText: '取消',
      onOk: () => onRecall(message),
    })
  }

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
    // 图文/多附件合并消息:图片网格 + 文件/视频卡片 + 文字同框
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
          {message.text && <div className="cf-msg__text">{message.text}</div>}
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
    return message.text
  }

  return (
    <div className={`cf-msg cf-msg--${message.direction}`}>
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
        {/* 悬停操作条:目前仅「撤回」,后续可在此追加更多消息级图标交互 */}
        {canRecall && (
          <div className="cf-msg__actions">
            <Tooltip title="撤回">
              <button
                type="button"
                className="cf-msg__action"
                onClick={handleRecall}
                aria-label="撤回"
              >
                <RollbackOutlined />
              </button>
            </Tooltip>
          </div>
        )}
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
