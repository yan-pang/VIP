import {
  CloseOutlined,
  CopyOutlined,
  FileOutlined,
  LoadingOutlined,
  PaperClipOutlined,
  PlayCircleOutlined,
  SmileOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Dropdown,
  Empty,
  Image,
  Input,
  Modal,
  Popover,
  Space,
  Tag,
  Tooltip,
  message as antMessage,
} from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  Conversation,
  ConversationTag,
  Message,
  MessageAttachment,
} from '../../../types/chat'
import {
  findAccount,
  findAgent,
  findPlayer,
  forbiddenWords,
  getMessagesByConversation,
} from '../../../services/chatflowMock'
import MessageStream from '../../../components/common/MessageStream'

type SendPayload = { text?: string; attachments?: MessageAttachment[] }

/** 草稿附件:比 MessageAttachment 多一个本地 id 用于预览条增删 */
interface DraftAttachment extends MessageAttachment {
  id: string
}

interface Props {
  conversation: Conversation | null
  currentAgentId: string
  messages: Message[]
  isReactivating: boolean
  onSend: (conversationId: string, payload: SendPayload) => void
  onStartReactivate: (id: string) => void
  onCancelReactivate: (id: string) => void
  onAssignClick: () => void
  onTransferClick: () => void
  onTogglePin: (id: string) => void
  onEnd: (id: string) => void
  onToggleTag: (id: string, tag: ConversationTag) => void
  onClickFailed: (msg: Message) => void
  onRecall: (msg: Message) => void
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
  isReactivating,
  onSend,
  onStartReactivate,
  onCancelReactivate,
  onAssignClick,
  onTransferClick,
  onTogglePin,
  onEnd,
  onToggleTag,
  onClickFailed,
  onRecall,
}: Props) {
  const [draft, setDraft] = useState('')
  const [attachments, setAttachments] = useState<DraftAttachment[]>([])
  const [videoPreview, setVideoPreview] = useState<{ url: string; name: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<HTMLDivElement>(null)

  const visibleMessages = useMemo(
    () => (conversation ? getMessagesByConversation(messages, conversation.id) : []),
    [conversation, messages],
  )
  const hits = useMemo(() => detectForbidden(draft), [draft])

  // 按"本次会话已结束"系统分割条切轮次,最后一轮(live 或最近一次结束的轮)默认显示
  const segments = useMemo(() => splitRoundsByEnded(visibleMessages), [visibleMessages])
  const totalHistoryRounds = Math.max(0, segments.length - 1)
  const [expandedHistoryCount, setExpandedHistoryCount] = useState(0)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const isExpandingRef = useRef(false)

  const visibleStreamMessages = useMemo(() => {
    if (segments.length === 0) return []
    const startIdx = Math.max(0, segments.length - 1 - expandedHistoryCount)
    return segments.slice(startIdx).flat()
  }, [segments, expandedHistoryCount])

  // 切换会话:清空草稿(文字 + 未发送附件),重置展开计数 / loading,默认只渲染最新一轮并滚到底
  useEffect(() => {
    setDraft('')
    setAttachments((prev) => {
      prev.forEach((a) => URL.revokeObjectURL(a.url))
      return []
    })
    setExpandedHistoryCount(0)
    setIsLoadingHistory(false)
    isExpandingRef.current = false
    requestAnimationFrame(() => {
      const stream = streamRef.current
      if (stream) stream.scrollTop = stream.scrollHeight
    })
  }, [conversation?.id])

  // 上滑触发展开:先 ~350ms loading 占位,再渲染新一轮 + 把 scrollTop 锚回原本可见位置
  const triggerExpandOneRound = () => {
    const stream = streamRef.current
    if (!stream || isExpandingRef.current) return
    if (expandedHistoryCount >= totalHistoryRounds) return
    isExpandingRef.current = true
    setIsLoadingHistory(true)
    const baseHeight = stream.scrollHeight
    // loading 出现后强制把视图保持在顶部,客服才能看到加载动画
    requestAnimationFrame(() => {
      if (streamRef.current) streamRef.current.scrollTop = 0
    })
    window.setTimeout(() => {
      setIsLoadingHistory(false)
      setExpandedHistoryCount((c) => Math.min(c + 1, totalHistoryRounds))
      requestAnimationFrame(() => {
        const s = streamRef.current
        if (s) {
          const delta = s.scrollHeight - baseHeight
          s.scrollTop = delta + 8
        }
        // 多留一帧让我们自己 setScrollTop 触发的 scroll 事件先 settle,再释放锁
        window.setTimeout(() => {
          isExpandingRef.current = false
        }, 50)
      })
    }, 350)
  }

  // 内容溢出时:scroll 到顶部触发展开
  const handleStreamScroll = () => {
    const stream = streamRef.current
    if (!stream) return
    if (stream.scrollTop > 40) return
    triggerExpandOneRound()
  }

  // 内容不溢出(只剩最新一轮 2-3 条消息)时,scroll 事件不会触发,
  // 这里用 wheel 兜底:已经在顶部还往上滚就触发展开
  const handleStreamWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY >= 0) return
    const stream = streamRef.current
    if (!stream) return
    if (stream.scrollTop > 0) return
    triggerExpandOneRound()
  }

  const handleCollapseAll = () => {
    // 收起后内容变短,浏览器会把 scrollTop clamp 到 0,可能立刻 fire 一次 scroll
    // 事件触发"上滑加载";而平滑滚动期间也会持续 fire scroll 事件。
    // 复用展开锁 + 400ms 缓冲覆盖整个收起过程,防止刚收起又立刻被加载回来。
    isExpandingRef.current = true
    setExpandedHistoryCount(0)
    setIsLoadingHistory(false)
    requestAnimationFrame(() => {
      const stream = streamRef.current
      if (stream) stream.scrollTo({ top: stream.scrollHeight, behavior: 'smooth' })
      window.setTimeout(() => {
        isExpandingRef.current = false
      }, 400)
    })
  }

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
  const isEnded = conversation.status === 'ended'
  const isAccountOffline = account?.status !== 'online'
  const accountBlocker = account?.status === 'banned'
    ? '该企微号已封禁,所有消息无法发送'
    : account?.status === 'offline'
      ? '该企微号离线,请到控制台重新登录'
      : null
  // 已结束 + 主动发起态 → 解锁输入区(账号在线 + 玩家未删好友才允许)
  const canReactivate = isEnded && !isAccountOffline && !conversation.playerHasDeletedFriendship
  const canEditWhileEnded = isEnded && isReactivating && canReactivate
  // 排队中(未指派):V1 取消隐式指派,必须先指派给自己才能回复,输入区不渲染
  const isQueueing = !isEnded && conversation.assigneeId === null
  const isReadOnly =
    isQueueing ||
    (conversation.assigneeId !== null && !isMyAssignment && !isEnded) ||
    (isEnded && !canEditWhileEnded) ||
    (isAccountOffline && !isEnded)
  const actionsDisabled = isEnded // Diff C:已结束分组所有标准操作按钮禁用

  const canSend = (draft.trim().length > 0 || attachments.length > 0) && hits.length === 0

  // 图文一起发:一条消息带 text + 全部草稿附件;成功后清空草稿(不 revoke,url 已被消息引用)
  const handleSend = () => {
    if (!canSend) return
    onSend(conversation.id, {
      text: draft.trim() || undefined,
      attachments: attachments.length
        ? attachments.map((a) => ({
            type: a.type,
            url: a.url,
            name: a.name,
            sizeBytes: a.sizeBytes,
          }))
        : undefined,
    })
    setDraft('')
    setAttachments([])
  }

  const addImageDraft = (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      Modal.warning({ title: '图片过大', content: '单图限制 20MB' })
      return
    }
    setAttachments((prev) => [
      ...prev,
      {
        id: `att_${Date.now()}_${prev.length}`,
        type: 'image',
        url: URL.createObjectURL(file),
        name: file.name || `粘贴图片-${Date.now()}.png`,
        sizeBytes: file.size,
      },
    ])
  }

  const addMediaDraft = (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      Modal.warning({ title: '文件过大', content: '单文件限制 50MB' })
      return
    }
    const isVideo = file.type.startsWith('video/')
    setAttachments((prev) => [
      ...prev,
      {
        id: `att_${Date.now()}_${prev.length}`,
        type: isVideo ? 'video' : 'file',
        url: URL.createObjectURL(file),
        name: file.name,
        sizeBytes: file.size,
      },
    ])
  }

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((a) => a.id !== id)
    })
  }

  // 统一附件入口:按 MIME 分流(图片走 20MB 限制,其余走 50MB)
  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.type.startsWith('image/')) addImageDraft(file)
      else addMediaDraft(file)
    }
    e.target.value = ''
  }

  // 复制图片粘贴 → 进草稿附件(不立即发送)
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const it of items) {
      if (it.type.startsWith('image/')) {
        const file = it.getAsFile()
        if (file) {
          e.preventDefault()
          addImageDraft(file)
        }
        return
      }
    }
  }

  const insertEmoji = (e: string) => setDraft((d) => d + e)

  const handleCopyId = () => {
    navigator.clipboard?.writeText(conversation.id)
    antMessage.success(`会话 ID 已复制:${conversation.id}`)
  }

  return (
    <div className="cf-conv-view">
      <header className="cf-conv-view__header">
        <div className="cf-conv-view__title">
          <strong>{player?.nickname}</strong>
          {player?.remark ? (
            <span className="cf-text-tertiary" style={{ fontSize: 12 }}>
              （{player.remark}）
            </span>
          ) : null}
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
          <Tooltip title="点击复制会话 ID">
            <button
              type="button"
              className="cf-conv-view__id"
              onClick={handleCopyId}
            >
              <span className="cf-text-tertiary">ID</span>
              <code>{conversation.id}</code>
              <CopyOutlined />
            </button>
          </Tooltip>
        </div>
        <Space size="small">
          {isEnded ? (
            isReactivating ? (
              <Button size="small" onClick={() => onCancelReactivate(conversation.id)}>
                取消发起
              </Button>
            ) : (
              <Tooltip
                title={
                  isAccountOffline
                    ? '该企微号当前离线/封禁,无法主动发起'
                    : conversation.playerHasDeletedFriendship
                      ? '玩家已删好友,无法主动发起'
                      : '解锁输入区,主动给玩家发起会话;发送成功后会话进入会话中'
                }
              >
                <Button
                  size="small"
                  type="primary"
                  ghost
                  icon={<PlayCircleOutlined />}
                  disabled={!canReactivate}
                  onClick={() => onStartReactivate(conversation.id)}
                >
                  主动发起会话
                </Button>
              </Tooltip>
            )
          ) : conversation.assigneeId === null ? (
            <Button size="small" type="primary" ghost onClick={onAssignClick}>
              指派
            </Button>
          ) : isMyAssignment ? (
            <Button size="small" disabled={actionsDisabled} onClick={onTransferClick}>
              转接
            </Button>
          ) : null}
          <Dropdown
            disabled={!isMyAssignment || actionsDisabled}
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
            disabled={!isMyAssignment || actionsDisabled}
            onClick={() => onTogglePin(conversation.id)}
          >
            {conversation.pinned ? '取消置顶' : '置顶'}
          </Button>
          <Button
            size="small"
            danger
            disabled={!isMyAssignment || actionsDisabled}
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
      {isEnded && isReactivating && !accountBlocker && (
        <Alert
          type="info"
          showIcon
          banner
          message="主动发起态:发送成功后会话将进入会话中并指派给你;发送失败状态保持不变,可继续重试"
        />
      )}
      {conversation.playerHasDeletedFriendship && !accountBlocker && (
        <Alert
          type="warning"
          showIcon
          banner
          message="此玩家已删好友,后续消息无法送达"
        />
      )}

      <div
        className="cf-conv-view__stream"
        ref={streamRef}
        onScroll={handleStreamScroll}
        onWheel={handleStreamWheel}
      >
        {expandedHistoryCount > 0 && (
          <button
            type="button"
            className="cf-conv-view__history-collapse"
            onClick={handleCollapseAll}
          >
            <span>
              已展开历史{' '}
              <span className="cf-conv-view__history-count">
                {expandedHistoryCount}/{totalHistoryRounds}
              </span>
            </span>
            <span aria-hidden>·</span>
            <span className="cf-conv-view__history-action">收起</span>
          </button>
        )}
        {isLoadingHistory && (
          <div className="cf-conv-view__history-loading">
            <LoadingOutlined />
            <span>加载历史会话…</span>
          </div>
        )}
        {!isLoadingHistory &&
          totalHistoryRounds > 0 &&
          expandedHistoryCount < totalHistoryRounds && (
            <div className="cf-conv-view__history-hint">↑ 上滑查看更早历史</div>
          )}
        <MessageStream
          messages={visibleStreamMessages}
          onClickFailed={onClickFailed}
          onRecall={onRecall}
        />
      </div>

      <footer className="cf-conv-view__composer">
        {isReadOnly ? (
          <div className="cf-conv-view__readonly">
            {isEnded
              ? '会话已结束,如需继续沟通请点击右上角「主动发起会话」'
              : isAccountOffline
                ? `企微号 ${account?.shortName ?? ''} 当前不可用,无法发送消息`
                : isQueueing
                  ? '此会话在排队中,点击右上角「指派」接入(可指派给自己)后即可回复'
                  : `此会话已指派给 ${assignee?.name ?? '其他客服'},你只能查看`}
          </div>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={handlePickFile}
            />

            <Space size={4} className="cf-conv-view__toolbar">
              <Tooltip title="上传附件(图片 / 文件 / 视频)">
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
            {attachments.length > 0 && (
              <div className="cf-conv-view__attachments">
                <Image.PreviewGroup>
                  {attachments.map((a) => (
                    <div
                      className={`cf-conv-view__attach${a.type !== 'image' ? ' cf-conv-view__attach--file' : ''}`}
                      key={a.id}
                    >
                      {a.type === 'image' ? (
                        <Image
                          src={a.url}
                          width={64}
                          height={64}
                          style={{ objectFit: 'cover', borderRadius: 6 }}
                        />
                      ) : a.type === 'video' ? (
                        <button
                          type="button"
                          className="cf-conv-view__attach-videobtn"
                          onClick={() => setVideoPreview({ url: a.url, name: a.name })}
                          title={`预览视频:${a.name}`}
                        >
                          <video src={a.url} className="cf-conv-view__attach-video" muted />
                          <span className="cf-conv-view__attach-badge">
                            <PlayCircleOutlined />
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="cf-conv-view__attach-card"
                          title={`打开:${a.name}`}
                          onClick={() => window.open(a.url, '_blank', 'noopener')}
                        >
                          <FileOutlined className="cf-conv-view__attach-icon" />
                          <div className="cf-conv-view__attach-info">
                            <div className="cf-conv-view__attach-name">{a.name}</div>
                            <div className="cf-conv-view__attach-size">
                              {(a.sizeBytes / 1024 / 1024).toFixed(2)} MB
                            </div>
                          </div>
                        </button>
                      )}
                      <button
                        type="button"
                        className="cf-conv-view__attach-remove"
                        onClick={() => removeAttachment(a.id)}
                        aria-label="移除附件"
                      >
                        <CloseOutlined />
                      </button>
                    </div>
                  ))}
                </Image.PreviewGroup>
              </div>
            )}
            <Input.TextArea
              key={conversation.id}
              autoFocus
              autoSize={{ minRows: 5, maxRows: 18 }}
              placeholder={
                canEditWhileEnded
                  ? '输入消息主动发起会话,Enter 发送,Shift+Enter 换行'
                  : '输入消息,Enter 发送,Shift+Enter 换行'
              }
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onPaste={handlePaste}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault()
                  handleSend()
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
              <Button type="primary" disabled={!canSend} onClick={handleSend}>
                发送
              </Button>
            </div>
          </>
        )}
      </footer>

      <Modal
        open={!!videoPreview}
        title={videoPreview?.name}
        footer={null}
        width={640}
        destroyOnClose
        onCancel={() => setVideoPreview(null)}
      >
        {videoPreview && (
          <video
            src={videoPreview.url}
            controls
            autoPlay
            style={{ width: '100%', maxHeight: '70vh', background: '#000' }}
          />
        )}
      </Modal>
    </div>
  )
}

function detectForbidden(text: string): string[] {
  if (!text) return []
  return forbiddenWords.filter((w) => text.includes(w))
}

function splitRoundsByEnded(msgs: Message[]): Message[][] {
  if (msgs.length === 0) return []
  const rounds: Message[][] = [[]]
  for (const m of msgs) {
    rounds[rounds.length - 1].push(m)
    if (
      m.direction === 'system' &&
      typeof m.text === 'string' &&
      m.text.includes('本次会话已结束')
    ) {
      rounds.push([])
    }
  }
  if (rounds[rounds.length - 1].length === 0) rounds.pop()
  return rounds
}

export default ConversationView
