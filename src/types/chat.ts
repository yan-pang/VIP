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

/** 企微号在线状态 */
export type WechatAccountStatus = 'online' | 'offline' | 'banned'

/** 企微号 */
export interface WechatAccount {
  id: string
  /** 号简称(运营内部叫法) */
  shortName: string
  /** 号头像 */
  avatar?: string
  /** 状态 */
  status: WechatAccountStatus
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

/** 会话标记(V1 内置三种,可多选) */
export type ConversationTag = 'follow_up' | 'important' | 'callback'

/** 会话(企微号 × 玩家) */
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
    // V1 取消隐式指派后:显式指派(含主动发起)/ 转接 / 玩家重新激活清空
    reason: 'explicit' | 'transfer' | 'reactivate'
    /** 显式指派 / 转接时的内部备注(玩家不可见) */
    note?: string
  }>
  /** 是否置顶(客服个人视图) */
  pinned: boolean
  tags: ConversationTag[]
  /** 未读计数(玩家发出未被客服查看) */
  unreadCount: number
  /** 最近一条消息预览(20 字内) */
  lastMessagePreview?: string
  /** 最近消息时间 */
  lastMessageAt?: string
  /** 创建时间 */
  createdAt: string
  /** 是否已结束的删好友会话(影响顶部红色横幅) */
  playerHasDeletedFriendship: boolean
}

/** 消息发送方向。system 用于跨轮次会话的系统分割消息(结束 / 重新发起 / 主动发起) */
export type MessageDirection = 'incoming' | 'outgoing' | 'system'

/** 消息状态 */
export type MessageStatus = 'sending' | 'sent' | 'failed'

/** 消息内容类型。mixed 用于图文/多附件合并消息(文字 + 一个或多个附件同框) */
export type MessageContentType = 'text' | 'image' | 'video' | 'file' | 'link' | 'emoji' | 'system' | 'mixed'

/** 图文消息里的单个附件(客服可在草稿区攒多个,连同文字一次发出) */
export interface MessageAttachment {
  type: 'image' | 'video' | 'file'
  url: string
  name: string
  sizeBytes: number
}

/** 失败原因分类(决定 UI 展示行为) */
export type FailureCategory =
  | 'rpa_exception' // RPA 异常 / 企微卡顿(打开失败抽屉)
  | 'player_deleted_friendship' // 玩家删好友(会话顶部横幅)
  | 'forbidden_word_backend' // 后端兜底违禁词(只 hover)
  | 'rate_limit_exceeded' // 速率上限(只 hover)
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
  /** 媒体 URL(单媒体消息;图文合并消息改用 attachments) */
  mediaUrl?: string
  mediaName?: string
  mediaSizeBytes?: number
  /** 图文/多附件合并消息的附件列表(与 text 同框展示) */
  attachments?: MessageAttachment[]
  /** 发送方 id(客服 id 或玩家 id) */
  senderId: string
  /** 创建时间(玩家发送 / 客服点发送) */
  createdAt: string
  /** 消息状态(仅 outgoing 有意义) */
  status: MessageStatus
  /** 失败明细 */
  failure?: FailureDetail
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
