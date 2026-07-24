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
  App as AntdApp,
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
  getMessagesByConversation,
} from '../../../services/chatflowMock'
import { getRelation, subscribePlayerCenter } from '../../../services/playerCenterMock'
import { assessOutboundDelivery } from '../../../services/opsAdminMock'
import MessageStream from '../../../components/common/MessageStream'

type SendPayload = { text?: string; attachments?: MessageAttachment[] }

/** 草稿附件:比 MessageAttachment 多一个本地 id 用于预览条增删 */
interface DraftAttachment extends MessageAttachment {
  id: string
}

interface ConversationViewCache {
  draft: string
  attachments: DraftAttachment[]
  expandedHistoryCount: number
  scrollTop?: number
}

const conversationViewCache = new Map<string, ConversationViewCache>()

interface Props {
  conversation: Conversation | null
  currentAgentId: string
  messages: Message[]
  highlightMessageId?: string | null
  isReactivating: boolean
  onSend: (conversationId: string, payload: SendPayload) => boolean
  onStartReactivate: (id: string) => void
  onCancelReactivate: (id: string) => void
  onAssignClick: () => void
  onTransferClick: () => void
  onTogglePin: (id: string) => void
  onEnd: (id: string) => void
  /** 设置标记(单选三值);传 null 清除标记 */
  onSetTag: (id: string, tag: ConversationTag | null) => void
  onClickFailed: (msg: Message) => void
  canAssignOthers: boolean
}

const tagOptions: Array<{ key: ConversationTag; label: string }> = [
  { key: 'follow_up', label: '跟进中' },
  { key: 'important', label: '重要' },
  { key: 'callback', label: '待回访' },
]

const emojiList = ['😀', '😅', '😂', '🤣', '😊', '😍', '🤔', '😎', '😭', '😡', '👍', '👏', '🎉', '🙏', '❤️', '💪']

// 附件白名单(PRD P-114 R-114-09):非白名单格式提交前拒绝,不进入草稿区。
const ATTACHMENT_WHITELIST: Record<'image' | 'video' | 'file', { exts: string[]; maxMB: number }> = {
  image: { exts: ['jpg', 'jpeg', 'png', 'gif'], maxMB: 20 },
  video: { exts: ['mp4', 'mov'], maxMB: 50 },
  file: { exts: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar'], maxMB: 50 },
}
const ATTACHMENT_SUPPORT_HINT =
  '仅支持 图片(jpg/jpeg/png/gif)、视频(mp4/mov)、文档(pdf/doc/docx/xls/xlsx/ppt/pptx/txt)、压缩包(zip/rar)'

function classifyAttachment(fileName: string): 'image' | 'video' | 'file' | null {
  const ext = fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase()
  if (!ext || !fileName.includes('.')) return null
  return (Object.keys(ATTACHMENT_WHITELIST) as Array<'image' | 'video' | 'file'>).find((type) =>
    ATTACHMENT_WHITELIST[type].exts.includes(ext),
  ) ?? null
}

function ConversationView({
  conversation,
  currentAgentId,
  messages,
  highlightMessageId,
  isReactivating,
  onSend,
  onStartReactivate,
  onCancelReactivate,
  onAssignClick,
  onTransferClick,
  onTogglePin,
  onEnd,
  onSetTag,
  onClickFailed,
  canAssignOthers,
}: Props) {
  const { message, modal } = AntdApp.useApp()
  const cacheKey = conversation ? `${currentAgentId}:${conversation.id}` : ''
  const cachedView = cacheKey ? conversationViewCache.get(cacheKey) : undefined
  const [draft, setDraft] = useState(cachedView?.draft ?? '')
  const [attachments, setAttachments] = useState<DraftAttachment[]>(cachedView?.attachments ?? [])
  const [videoPreview, setVideoPreview] = useState<{ url: string; name: string } | null>(null)
  const [, setPlayerCenterVersion] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<HTMLDivElement>(null)

  // 关系备注在玩家档案侧可编辑；收到同源广播后同步刷新会话头部展示。
  useEffect(() => subscribePlayerCenter(() => setPlayerCenterVersion((v) => v + 1)), [])

  const visibleMessages = useMemo(
    () => (conversation ? getMessagesByConversation(messages, conversation.id) : []),
    [conversation, messages],
  )
  // 按"本次会话已结束"系统分割条切轮次,最后一轮(live 或最近一次结束的轮)默认显示
  const segments = useMemo(() => splitRoundsByEnded(visibleMessages), [visibleMessages])
  const totalHistoryRounds = Math.max(0, segments.length - 1)
  const [expandedHistoryCount, setExpandedHistoryCount] = useState(
    cachedView?.expandedHistoryCount ?? 0,
  )
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const isExpandingRef = useRef(false)

  const visibleStreamMessages = useMemo(() => {
    if (segments.length === 0) return []
    const startIdx = Math.max(0, segments.length - 1 - expandedHistoryCount)
    return segments.slice(startIdx).flat()
  }, [segments, expandedHistoryCount])

  // 搜索命中历史轮次时先自动展开到目标所在轮次，不要求客服逐轮上滑。
  useEffect(() => {
    if (!highlightMessageId) return
    const targetSegmentIndex = segments.findIndex((segment) =>
      segment.some((message) => message.id === highlightMessageId),
    )
    if (targetSegmentIndex < 0) return
    const requiredHistoryCount = segments.length - 1 - targetSegmentIndex
    setExpandedHistoryCount((current) => Math.max(current, requiredHistoryCount))
  }, [highlightMessageId, segments])

  // 父级按“身份 + 会话”设置 key；路由返回或切回会话时从 SPA 运行态恢复草稿与浏览位置。
  useEffect(() => {
    setIsLoadingHistory(false)
    isExpandingRef.current = false
    requestAnimationFrame(() => {
      const stream = streamRef.current
      if (stream) stream.scrollTop = cachedView?.scrollTop ?? stream.scrollHeight
    })
  }, [cachedView?.scrollTop])

  useEffect(() => {
    if (
      !highlightMessageId
      || !visibleStreamMessages.some((message) => message.id === highlightMessageId)
    ) {
      return
    }
    const frame = requestAnimationFrame(() => {
      const target = Array.from(
        streamRef.current?.querySelectorAll<HTMLElement>('[data-message-id]') ?? [],
      ).find((element) => element.dataset.messageId === highlightMessageId)
      target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(frame)
  }, [highlightMessageId, visibleStreamMessages])

  useEffect(() => {
    if (!cacheKey) return
    const previous = conversationViewCache.get(cacheKey)
    conversationViewCache.set(cacheKey, {
      draft,
      attachments,
      expandedHistoryCount,
      scrollTop: previous?.scrollTop,
    })
  }, [attachments, cacheKey, draft, expandedHistoryCount])

  // 好友关系断开后，当前草稿已无法送达；立即清空并交由只读态提示原因。
  useEffect(() => {
    if (!conversation || conversation.relationStatus === 'normal') return
    setDraft('')
    setAttachments((prev) => {
      prev.forEach((a) => URL.revokeObjectURL(a.url))
      return []
    })
  }, [conversation])

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
    if (cacheKey) {
      const previous = conversationViewCache.get(cacheKey)
      conversationViewCache.set(cacheKey, {
        ...previous,
        draft,
        attachments,
        expandedHistoryCount,
        scrollTop: stream.scrollTop,
      })
    }
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
  // 关系备注是玩家 × 当前企微号的权威展示字段，与列表、右侧档案保持一致。
  const relationRemark = getRelation(conversation.playerId, conversation.accountId)?.remark?.trim()
  const playerDisplayName = relationRemark || player?.nickname || '未知玩家'
  const assignee = conversation.assigneeId ? findAgent(conversation.assigneeId) : null
  const isMyAssignment = conversation.assigneeId === currentAgentId
  const isEnded = conversation.status === 'ended'
  const deliveryAssessment = account ? assessOutboundDelivery(account.id) : null
  const accountHardBlocked = !account?.enabled || deliveryAssessment?.disposition === 'blocked'
  // 账号级硬限制文案统一走 PRD 9.4 字典。
  const accountBlocker = !account?.enabled
    ? '该企微号接入已禁用，历史会话仅可查看'
    : account?.status === 'banned'
      ? '企微号已被封禁，暂时无法发送消息'
      : account?.status === 'disabled'
        ? '企微号已停用，暂时无法发送消息'
        : account?.status === 'offline'
          ? '企微号已离线，暂时无法发送消息'
          : deliveryAssessment?.disposition === 'blocked'
            ? deliveryAssessment.message
            : null
  // 已结束「重新联系」入口:账号级 / 全局硬限制或好友关系异常时禁用(PRD 9.2.1)。
  const reactivateBlocker = account?.status === 'offline' ? '企微号已离线，暂时无法重新联系' : accountBlocker
  const canReactivate = isEnded && !accountHardBlocked && conversation.relationStatus === 'normal'
  const canEditWhileEnded = isEnded && isReactivating && canReactivate
  // 排队中(未指派):V1 取消隐式指派,必须先指派给自己才能回复,输入区不渲染
  const isQueueing = !isEnded && conversation.assigneeId === null
  const isReadOnly =
    isQueueing ||
    conversation.relationStatus !== 'normal' ||
    (conversation.assigneeId !== null && !isMyAssignment && !isEnded) ||
    (isEnded && !canEditWhileEnded) ||
    (accountHardBlocked && !isEnded)
  const actionsDisabled = isEnded || !!conversation.isProvisional || accountHardBlocked || conversation.relationStatus !== 'normal'

  const canSend = draft.trim().length > 0 || attachments.length > 0

  // 编辑区一次提交 text + 全部草稿附件；发送层用一个消息发送批次拆成多条消息，URL 仍被媒体消息引用。
  const handleSend = () => {
    if (!canSend) return
    const accepted = onSend(conversation.id, {
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
    if (accepted) {
      setDraft('')
      setAttachments([])
    }
  }

  // 粘贴图片(剪贴板位图,MIME 恒为 image/*):直接按图片草稿处理。
  const addImageDraft = (file: File) => {
    if (file.size > ATTACHMENT_WHITELIST.image.maxMB * 1024 * 1024) {
      modal.warning({ title: '图片过大', content: `单图限制 ${ATTACHMENT_WHITELIST.image.maxMB}MB` })
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

  // 文件选择:按扩展名走白名单;非白名单格式或超限,提交前拒绝、不进入草稿区。
  const addFileDraft = (file: File) => {
    const type = classifyAttachment(file.name)
    if (!type) {
      modal.warning({ title: '不支持的附件格式', content: ATTACHMENT_SUPPORT_HINT })
      return
    }
    const { maxMB } = ATTACHMENT_WHITELIST[type]
    if (file.size > maxMB * 1024 * 1024) {
      modal.warning({ title: '附件过大', content: `${type === 'image' ? '单图' : '单文件'}限制 ${maxMB}MB` })
      return
    }
    setAttachments((prev) => [
      ...prev,
      {
        id: `att_${Date.now()}_${prev.length}`,
        type,
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

  // 统一附件入口:按扩展名走白名单校验(图片 / 视频 / 文档 / 压缩包)。
  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) addFileDraft(file)
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
    message.success(`会话 ID 已复制:${conversation.id}`)
  }

  return (
    <div className="cf-conv-view">
      <header className="cf-conv-view__header">
        <div className="cf-conv-view__title">
          <strong>{playerDisplayName}</strong>
          <Tag color="green" bordered={false}>
            {account?.shortName}
          </Tag>
          {conversation.isProvisional && <Tag color="blue">待首条消息送达</Tag>}
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
                取消重新联系
              </Button>
            ) : (
              <Tooltip
                title={
                  accountHardBlocked
                    ? reactivateBlocker ?? '该企微号当前不可用'
                    : conversation.relationStatus !== 'normal'
                      ? '玩家已删除该企微号，请重新添加好友后再联系'
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
                  重新联系
                </Button>
              </Tooltip>
            )
          ) : conversation.assigneeId === null ? (
            <Button size="small" type="primary" ghost disabled={actionsDisabled} onClick={onAssignClick}>
              指派
            </Button>
          ) : isMyAssignment || canAssignOthers ? (
            <Button size="small" disabled={actionsDisabled} onClick={onTransferClick}>
              转接
            </Button>
          ) : null}
          <Dropdown
            disabled={!isMyAssignment || actionsDisabled}
            menu={{
              items: [
                ...tagOptions.map((t) => ({
                  key: t.key,
                  label: (
                    <span>
                      {conversation.tag === t.key ? '✓ ' : '　'}
                      {t.label}
                    </span>
                  ),
                  // 单选:点已选值取消,点新值替换旧值
                  onClick: () => onSetTag(conversation.id, conversation.tag === t.key ? null : t.key),
                })),
                { type: 'divider' as const },
                {
                  key: '__clear',
                  label: '清除标记',
                  disabled: !conversation.tag,
                  onClick: () => onSetTag(conversation.id, null),
                },
              ],
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
              modal.confirm({
                title: '结束会话',
                content: '确认结束该会话？结束后可通过"重新联系"继续',
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
          message="重新联系中：首条消息成功后会话才会进入会话中并指派给你；失败时仍保持已结束，可继续重试"
        />
      )}
      {conversation.relationStatus !== 'normal' && !accountBlocker && (
        <Alert
          type="warning"
          showIcon
          banner
          message="玩家已删除该企微号，请重新添加好友后再联系"
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
          highlightMessageId={highlightMessageId}
          onClickFailed={onClickFailed}
        />
      </div>

      <footer className="cf-conv-view__composer">
        {isReadOnly ? (
          <div className="cf-conv-view__readonly">
            {conversation.relationStatus !== 'normal'
              ? '玩家已删除该企微号，请重新添加好友后再联系'
              : accountHardBlocked
                ? accountBlocker ?? '企微号当前不可用，暂时无法发送消息'
                : isEnded
                  ? '会话已结束，如需继续沟通请点击"重新联系"'
                  : isQueueing
                    ? '此会话尚未指派，请先指派后回复'
                    : `此会话已由${assignee?.name ?? '其他客服'}接待，你只能查看`}
          </div>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              accept=".jpg,.jpeg,.png,.gif,.mp4,.mov,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
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
                  ? '输入重新联系内容，Enter 发送，Shift+Enter 换行'
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
        destroyOnHidden
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

function splitRoundsByEnded(msgs: Message[]): Message[][] {
  if (msgs.length === 0) return []
  const rounds: Message[][] = [[]]
  for (const m of msgs) {
    rounds[rounds.length - 1].push(m)
    if (
      m.direction === 'system' &&
      typeof m.text === 'string' &&
      (m.systemEvent === 'conversation_ended' || (!m.systemEvent && m.text.includes('本次会话已结束')))
    ) {
      rounds.push([])
    }
  }
  if (rounds[rounds.length - 1].length === 0) rounds.pop()
  return rounds
}

export default ConversationView
