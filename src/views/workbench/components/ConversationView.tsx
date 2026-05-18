import {
  CheckOutlined,
  ExclamationCircleFilled,
  FileOutlined,
  LoadingOutlined,
  PaperClipOutlined,
  PictureOutlined,
  SmileOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Dropdown,
  Empty,
  Input,
  Modal,
  Popover,
  Space,
  Tag,
  Tooltip,
} from 'antd'
import { useMemo, useRef, useState } from 'react'
import type {
  Conversation,
  ConversationTag,
  FailureCategory,
  Message,
} from '../../../types/chat'
import {
  findAccount,
  findAgent,
  findPlayer,
  forbiddenWords,
  getMessagesByConversation,
} from '../../../services/chatflowMock'

type SendPayload =
  | { type: 'text'; text: string }
  | { type: 'image' | 'video' | 'file'; mediaUrl: string; mediaName: string; mediaSizeBytes: number }

interface Props {
  conversation: Conversation | null
  currentAgentId: string
  messages: Message[]
  onSend: (conversationId: string, payload: SendPayload) => void
  onAssignClick: () => void
  onTransferClick: () => void
  onTogglePin: (id: string) => void
  onEnd: (id: string) => void
  onToggleTag: (id: string, tag: ConversationTag) => void
  onClickFailed: (msg: Message) => void
  onRecall: (msg: Message) => void
}

const failureLabel: Record<FailureCategory, string> = {
  rpa_exception: 'RPA 异常',
  player_deleted_friendship: '玩家已删好友',
  forbidden_word_backend: '违禁词拦截',
  rate_limit_exceeded: '已达发送上限',
  other: '发送失败',
}

const tagOptions: Array<{ key: ConversationTag; label: string }> = [
  { key: 'follow_up', label: '跟进中' },
  { key: 'important', label: '重要' },
  { key: 'callback', label: '待回访' },
]

const emojiList = ['😀', '😅', '😂', '🤣', '😊', '😍', '🤔', '😎', '😭', '😡', '👍', '👏', '🎉', '🙏', '❤️', '💪']

function ConversationView({
  conversation,
  currentAgentId,
  messages,
  onSend,
  onAssignClick,
  onTransferClick,
  onTogglePin,
  onEnd,
  onToggleTag,
  onClickFailed,
  onRecall,
}: Props) {
  const [draft, setDraft] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const visibleMessages = useMemo(
    () => (conversation ? getMessagesByConversation(messages, conversation.id) : []),
    [conversation, messages],
  )
  const hits = useMemo(() => detectForbidden(draft), [draft])

  if (!conversation) {
    return (
      <div className="cf-conv-view cf-conv-view--empty">
        <Empty description="选择左侧会话开始工作" />
      </div>
    )
  }

  const account = findAccount(conversation.accountId)
  const player = findPlayer(conversation.playerId)
  const assignee = conversation.assigneeId ? findAgent(conversation.assigneeId) : null
  const isMyAssignment = conversation.assigneeId === currentAgentId
  const isAccountOffline = account?.status !== 'online'
  const accountBlocker = account?.status === 'banned'
    ? '该企微号已封禁,所有消息无法发送'
    : account?.status === 'offline'
      ? '该企微号离线,请到控制台重新登录'
      : null
  const isReadOnly =
    (conversation.assigneeId !== null && !isMyAssignment) ||
    conversation.status === 'ended' ||
    isAccountOffline

  const handleSendText = () => {
    const text = draft.trim()
    if (!text || hits.length > 0) return
    onSend(conversation.id, { type: 'text', text })
    setDraft('')
  }

  const handlePickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) {
      Modal.warning({ title: '图片过大', content: '单图限制 20MB' })
      return
    }
    const url = URL.createObjectURL(file)
    onSend(conversation.id, {
      type: 'image',
      mediaUrl: url,
      mediaName: file.name,
      mediaSizeBytes: file.size,
    })
    e.target.value = ''
  }

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) {
      Modal.warning({ title: '文件过大', content: '单文件限制 50MB' })
      return
    }
    const url = URL.createObjectURL(file)
    const isVideo = file.type.startsWith('video/')
    onSend(conversation.id, {
      type: isVideo ? 'video' : 'file',
      mediaUrl: url,
      mediaName: file.name,
      mediaSizeBytes: file.size,
    })
    e.target.value = ''
  }

  const insertEmoji = (e: string) => setDraft((d) => d + e)

  return (
    <div className="cf-conv-view">
      <header className="cf-conv-view__header">
        <div className="cf-conv-view__title">
          <strong>{player?.remark ?? player?.nickname}</strong>
          <Tag color="green" bordered={false}>
            {account?.shortName}
          </Tag>
          <span className="cf-conv-view__assignee">
            指派:
            {assignee ? (
              <span className="cf-conv-view__assignee-name">{assignee.name}</span>
            ) : (
              <span className="cf-conv-view__assignee-empty">未指派</span>
            )}
          </span>
        </div>
        <Space size="small">
          {conversation.assigneeId === null ? (
            <Button size="small" type="primary" ghost onClick={onAssignClick}>
              指派
            </Button>
          ) : isMyAssignment ? (
            <Button size="small" onClick={onTransferClick}>
              转接
            </Button>
          ) : null}
          <Dropdown
            disabled={!isMyAssignment || conversation.status === 'ended'}
            menu={{
              items: tagOptions.map((t) => ({
                key: t.key,
                label: (
                  <span>
                    {conversation.tags.includes(t.key) ? '✓ ' : '  '}
                    {t.label}
                  </span>
                ),
                onClick: () => onToggleTag(conversation.id, t.key),
              })),
            }}
          >
            <Button size="small">标记</Button>
          </Dropdown>
          <Button
            size="small"
            disabled={conversation.status === 'ended'}
            onClick={() => onTogglePin(conversation.id)}
          >
            {conversation.pinned ? '取消置顶' : '置顶'}
          </Button>
          <Button
            size="small"
            danger
            disabled={!isMyAssignment || conversation.status === 'ended'}
            onClick={() => {
              Modal.confirm({
                title: '结束会话',
                content: '确认后本次会话标记为结束,可被玩家重新激活。',
                okText: '确认结束',
                cancelText: '取消',
                onOk: () => onEnd(conversation.id),
              })
            }}
          >
            结束会话
          </Button>
        </Space>
      </header>

      {accountBlocker && (
        <Alert type="error" showIcon banner message={accountBlocker} />
      )}
      {conversation.playerHasDeletedFriendship && !accountBlocker && (
        <Alert
          type="warning"
          showIcon
          banner
          message="此玩家已删好友,后续消息无法送达"
        />
      )}

      <div className="cf-conv-view__stream">
        {visibleMessages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            onClickFailed={onClickFailed}
            onRecall={onRecall}
          />
        ))}
      </div>

      <footer className="cf-conv-view__composer">
        {isReadOnly ? (
          <div className="cf-conv-view__readonly">
            {conversation.status === 'ended'
              ? '会话已结束,只能查看历史'
              : isAccountOffline
                ? `企微号 ${account?.shortName ?? ''} 当前不可用,无法发送消息`
                : `此会话已指派给 ${assignee?.name ?? '其他客服'},你只能查看`}
          </div>
        ) : (
          <>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handlePickImage}
            />
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={handlePickFile}
            />

            <Space size={4} className="cf-conv-view__toolbar">
              <Tooltip title="图片">
                <Button
                  type="text"
                  icon={<PictureOutlined />}
                  size="small"
                  onClick={() => imageInputRef.current?.click()}
                />
              </Tooltip>
              <Tooltip title="文件 / 视频">
                <Button
                  type="text"
                  icon={<PaperClipOutlined />}
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                />
              </Tooltip>
              <Popover
                trigger="click"
                content={
                  <div className="cf-emoji-picker">
                    {emojiList.map((e) => (
                      <button
                        key={e}
                        type="button"
                        className="cf-emoji-picker__item"
                        onClick={() => insertEmoji(e)}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                }
              >
                <Button type="text" icon={<SmileOutlined />} size="small" />
              </Popover>
            </Space>
            <Input.TextArea
              autoSize={{ minRows: 2, maxRows: 4 }}
              placeholder="输入消息,Enter 发送,Shift+Enter 换行"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault()
                  handleSendText()
                }
              }}
            />
            {hits.length > 0 && (
              <div className="cf-conv-view__forbidden">
                含违禁词:
                {hits.map((w) => (
                  <Tag color="red" key={w}>
                    {w}
                  </Tag>
                ))}
                <span className="cf-text-tertiary">请修改后发送</span>
              </div>
            )}
            <div className="cf-conv-view__send">
              <Button
                type="primary"
                disabled={!draft.trim() || hits.length > 0}
                onClick={handleSendText}
              >
                发送
              </Button>
            </div>
          </>
        )}
      </footer>
    </div>
  )
}

function MessageBubble({
  message,
  onClickFailed,
  onRecall,
}: {
  message: Message
  onClickFailed: (msg: Message) => void
  onRecall: (msg: Message) => void
}) {
  const senderName =
    message.direction === 'incoming'
      ? findPlayer(message.senderId)?.nickname ?? '玩家'
      : findAgent(message.senderId)?.name ?? '客服'
  const failureCat = message.failure?.category
  const isClickableFailed = failureCat === 'rpa_exception'

  const handleContextMenu = (e: React.MouseEvent) => {
    if (
      message.direction === 'outgoing' &&
      message.status === 'sent' &&
      !message.recalled
    ) {
      e.preventDefault()
      Modal.confirm({
        title: '撤回消息',
        content:
          'V1 阶段撤回需要在云桌面手动操作。点击确认将跳转到企微号控制台,你可以在那里的云桌面里手动撤回该条消息。',
        okText: '前往控制台',
        cancelText: '取消',
        onOk: () => onRecall(message),
      })
    }
  }

  const renderContent = () => {
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
      return (
        <video
          src={message.mediaUrl}
          controls
          className="cf-msg__video"
        />
      )
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
        <span className="cf-msg__time">
          {new Date(message.createdAt).toTimeString().slice(0, 5)}
        </span>
      </div>
      <div className="cf-msg__bubble-wrap">
        <div className="cf-msg__bubble" onContextMenu={handleContextMenu}>
          {renderContent()}
        </div>
        <div className="cf-msg__status">
          {message.direction === 'outgoing' && message.status === 'sending' && (
            <LoadingOutlined />
          )}
          {message.direction === 'outgoing' && message.status === 'sent' && (
            <CheckOutlined style={{ color: '#8C8C8C' }} />
          )}
          {message.status === 'failed' && (
            <Tooltip title={message.failure?.message ?? '发送失败'}>
              <span
                className={`cf-msg__failed ${isClickableFailed ? 'is-clickable' : ''}`}
                role={isClickableFailed ? 'button' : undefined}
                tabIndex={isClickableFailed ? 0 : -1}
                onClick={() => isClickableFailed && onClickFailed(message)}
              >
                <ExclamationCircleFilled style={{ color: '#FF4D4F' }} />
                <span className="cf-msg__failed-tag">
                  {failureLabel[failureCat ?? 'other']}
                </span>
              </span>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  )
}

function detectForbidden(text: string): string[] {
  if (!text) return []
  return forbiddenWords.filter((w) => text.includes(w))
}

export default ConversationView
