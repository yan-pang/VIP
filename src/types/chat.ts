/**
 * ChatFlow 领域核心类型定义
 * 同步于 project/domains/chat-workbench/design.md 共享规则
 */

/** 客服(坐席) */
export interface Agent {
  id: string
  name: string
  avatar?: string
  online: boolean
  /** 当前进行中会话量(用于指派/转接弹窗排序) */
  activeConversationCount: number
}

/**
 * 企微号运行状态（PRD 6/P-103 统一口径：在线 / 离线 / 停用 / 封禁）。
 * 由运营管理提供并实时推送，工作台只读消费。
 * - `disabled`（停用）是运行态被运营停用，属账号级硬限制，禁止发送与重新联系；
 *   与 `enabled=false`（ChatFlow 接入配置未启用）语义不同，后者不代表运行态停用。
 */
export type WechatAccountStatus = 'online' | 'offline' | 'disabled' | 'banned'

/** 企微号 */
export interface WechatAccount {
  id: string
  /** 企业微信企业主体；external_userid 只在同一 corpId 内唯一。 */
  corpId: string
  /** 号简称(运营内部叫法) */
  shortName: string
  /** 号头像 */
  avatar?: string
  /** 企微客户端是否已登录；不代表云桌面投屏或 RPA 执行状态。 */
  status: WechatAccountStatus
  /** ChatFlow 接入配置是否启用；禁用不删除账号与历史引用。 */
  enabled: boolean
  /** 该号下未读总和(跨会话) */
  unreadCount: number
  /** 最近活跃时间 */
  lastActiveAt?: string
  /** 关联云桌面 id(用于 /control 视频流定位) */
  desktopId?: string
}

/** 玩家(企微好友) */
export interface Player {
  id: string
  /** 企微原昵称 */
  nickname: string
  /** 客服侧备注;展示时优先备注 */
  remark?: string
  avatar?: string
  /** 玩家被加在哪些企微号上(一对多) */
  associatedAccountIds: string[]
}

/** 会话状态机:三态 */
export type ConversationStatus = 'queueing' | 'active' | 'ended'

/** 会话标记(V1 个人视角单选,固定三值:跟进中 / 重要 / 待回访) */
export type ConversationTag = 'follow_up' | 'important' | 'callback'

/** 会话(企微号 × 玩家) */
export type RelationStatus = 'normal' | 'removed_by_agent' | 'removed_by_player'

export interface Conversation {
  id: string
  accountId: string
  playerId: string
  status: ConversationStatus
  /** 指派人 id;为 null 时会话必定在 queueing */
  assigneeId: string | null
  /** 指派人历史(显式指派 / 转接 / 玩家重新激活都留痕) */
  assigneeHistory: Array<{
    agentId: string | null
    changedAt: string
    // V1 取消隐式指派后：显式指派（含主动发起 / 重新联系）/ 转接 / 玩家重新激活清空
    reason: 'explicit' | 'transfer' | 'reactivate'
    /** 系统生成的操作说明，例如客服主动发起或重新联系 */
    note?: string
  }>
  /** 是否置顶(客服个人视图) */
  pinned: boolean
  /** 会话标记：个人视角单选三值之一，未设置为 null；仅当前负责人可改。 */
  tag: ConversationTag | null
  /** 未读计数(玩家发出未被客服查看) */
  unreadCount: number
  /** 最近一条消息预览(20 字内) */
  lastMessagePreview?: string
  /** 最近消息时间 */
  lastMessageAt?: string
  /** 创建时间 */
  createdAt: string
  /** 玩家×企微号关系状态的会话投影；非 normal 时禁止发送。 */
  relationStatus: RelationStatus
  /** 首次消息尚未成功的工作台临时草稿；不得进入搜索、玩家中心和消息管理。 */
  isProvisional?: boolean
}

/** 消息发送方向。system 用于跨轮次会话的系统分割消息(结束 / 重新发起 / 主动发起) */
export type MessageDirection = 'incoming' | 'outgoing' | 'system'

/**
 * 消息结果状态（PRD 6.3(1)）：发送中 / 已送达 / 失败。
 * 无「待发送」——发送前临时执行依赖不可用等价于「没发出去」，直接置 failed 由客服手动重发。
 * 「历史已撤回」不是独立 status，由 `Message.recalled` 承载只读展示。
 */
export type MessageStatus = 'sending' | 'sent' | 'failed'

/** 消息内容类型。mixed 仅用于兼容历史图文合并存档，新发送按单条内容拆分。 */
export type MessageContentType = 'text' | 'image' | 'video' | 'file' | 'link' | 'emoji' | 'system' | 'mixed' | 'unsupported'

export type SystemMessageEvent = 'conversation_ended' | 'player_reopened' | 'agent_reopened' | 'notice'

/** 混发草稿里的单个附件；提交后会拆成独立消息。 */
export interface MessageAttachment {
  type: 'image' | 'video' | 'file'
  url: string
  name: string
  sizeBytes: number
}

/** 失败原因分类(决定 UI 展示行为) */
export type FailureCategory =
  | 'rpa_exception' // RPA 异常 / 企微卡顿(打开失败抽屉)
  | 'delivery_reconciliation_failed' // 回捞比对失败:已乐观显示已送达,存档回捞不到/比对不一致(打开失败抽屉,不自动重发)
  | 'player_deleted_friendship' // 玩家删好友(会话顶部横幅)
  | 'forbidden_word_backend' // 后端兜底违禁词(只 hover)
  | 'rate_limit_exceeded' // 速率上限(只 hover)
  | 'risk_blocked' // IP / 封禁 / 接入配置等硬性风控
  | 'other' // 其它(只 hover)

export interface FailureDetail {
  category: FailureCategory
  /** 原因码,例 RPA_TIMEOUT / WECHAT_FREEZE */
  code: string
  /** 原始错误消息 */
  message: string
  /** RPA 操作录屏 URL,可能过期 / 不存在 */
  recordingUrl?: string
  recordingSizeBytes?: number
  /** 录屏过期日期 */
  recordingExpireAt?: string
  /** RPA 执行时间 */
  executedAt?: string
}

/** 消息 */
export interface Message {
  id: string
  conversationId: string
  direction: MessageDirection
  contentType: MessageContentType
  /** 文本消息正文 */
  text?: string
  /** 单条媒体消息 URL */
  mediaUrl?: string
  mediaName?: string
  mediaSizeBytes?: number
  /** 兼容历史图文合并存档；新发送不再写入 */
  attachments?: MessageAttachment[]
  /** 发送方 id(客服 id 或玩家 id) */
  senderId: string
  /** 创建时间(玩家发送 / 客服点发送) */
  createdAt: string
  /** 消息状态(仅 outgoing 有意义) */
  status: MessageStatus
  /** 失败明细 */
  failure?: FailureDetail
  /** 客户端生成的幂等键；重试必须复用。 */
  clientRequestId?: string
  /** 客服混发时同批拆分消息共享的发送批次 ID。 */
  sendBatchId?: string
  /** 历史字段，仅用于兼容已持久化的旧 Mock 数据。 */
  rpaTaskId?: string
  /** 已执行次数；排队不计入尝试。 */
  attemptCount?: number
  lastAttemptAt?: string
  /** system 消息的结构化事件类型，轮次切分不得依赖展示文案。 */
  systemEvent?: SystemMessageEvent
  /** 无法识别的企微消息类型名称。 */
  unsupportedLabel?: string
  /** 是否客服已撤回(由会话存档 API 回查后更新) */
  recalled?: boolean
}

/** 违禁词命中信息(发送前本地校验) */
export interface ForbiddenWordHit {
  word: string
  /** 在文本中的起止位置 */
  start: number
  end: number
}

/**
 * 会话分组(左列折叠用)
 * - queueing 排队中(指派人为空)
 * - active 会话中:仅**指派给当前客服**的进行中会话(只有这些能发消息)
 * - assigned_other 他人接待中:进行中但指派人是其他客服,只读查看,不放进"会话中"
 * - ended 已结束
 */
export type ConversationGroupKey = 'queueing' | 'active' | 'assigned_other' | 'ended'
