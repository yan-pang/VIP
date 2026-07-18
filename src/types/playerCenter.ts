/**
 * player-center 领域核心类型定义
 * 同步于 project/domains/player-center/design.md D1 § 共享规则与 D2 字段表
 */

/** 关系状态:三态枚举 */
export type RelationStatus = 'normal' | 'removed_by_agent' | 'removed_by_player'

/** 微信性别(企微好友资料;unknown 表示未设置) */
export type WechatGender = 'male' | 'female' | 'unknown'

/** 标签库条目 */
export interface TagDef {
  id: string
  label: string
  /** 所属标签组(企微"客户标签组"映射) */
  groupLabel?: string
  /** 是否已废弃(运营在标签库中删除) */
  deprecated?: boolean
}

/** 玩家(真人级,playerId 为主键;跨企微号统一) */
export interface PlayerProfile {
  playerId: string
  nickname: string
  /** 微信性别(企微好友资料) */
  gender: WechatGender
  avatarUrl?: string
  /** 自定义信息(运营在玩家维度自由填写;跨企微号统一,只一个字段) */
  customNote: string
}

/** 玩家×企微号 关系记录(本领域列表的最小颗粒) */
export interface PlayerRelation {
  /** 复合主键 (playerId, accountId) */
  playerId: string
  accountId: string
  /** 关系级备注 */
  remark: string
  /** 关系级描述(多行) */
  description: string
  /** 关系级标签 id 列表(对齐 TagDef.id) */
  tagIds: string[]
  /** 关系状态 */
  relationStatus: RelationStatus
  /** 添加时间 ISO */
  addedAt: string
  /** 更新时间 ISO */
  updatedAt: string
  /** 删除时间 ISO,仅非 normal 时有值 */
  deletedAt?: string
}

/** 会话索引(player-center 反查 chat-workbench 用,不重存消息) */
export interface ConversationIndexEntry {
  conversationId: string
  accountId: string
  playerId: string
  /** 最后一条消息预览 */
  lastMessage: {
    senderType: 'player' | 'agent'
    /** 发送方 id(agent 时用于反查实际回复客服姓名) */
    senderId: string
    sentAt: string
    contentPreview: string
  }
  /** 消息总数(扫读字段) */
  messageCount: number
  /** 最早消息时间 */
  firstMessageAt: string
}

/**
 * 会话轮次条目(`/messages` 以轮次为最小展示单位)。
 * 同一 conversationId 内由 system「本次会话已结束」边界切分;conversationId 跨轮次不变,
 * roundId 仅为展示层派生标识(`${conversationId}#${roundIndex}`),非持久化字段。
 * lastMessage / messageCount / firstMessageAt 的口径限定在该轮内。
 */
export interface ConversationRoundEntry extends ConversationIndexEntry {
  /** 派生标识 `${conversationId}#${roundIndex}`(1-based) */
  roundId: string
  /** 轮次序号(1-based) */
  roundIndex: number
  /** 该会话的总轮数 */
  roundCount: number
}

/** 关系字段编辑负载 */
export interface RelationEditPayload {
  playerId: string
  accountId: string
  /** 仅传变更字段 */
  remark?: string
  description?: string
  tagIds?: string[]
}

/** 自定义信息编辑负载 */
export interface PlayerNoteEditPayload {
  playerId: string
  customNote: string
}

/** mock store 广播事件 */
export type PlayerCenterEvent =
  | {
      type: 'relation_changed'
      payload: {
        playerId: string
        accountId: string
        relation: PlayerRelation
      }
    }
  | {
      type: 'custom_note_changed'
      payload: {
        playerId: string
        customNote: string
      }
    }
  | {
      type: 'relation_status_changed'
      payload: {
        playerId: string
        accountId: string
        relationStatus: RelationStatus
        deletedAt?: string
      }
    }

export type PlayerCenterEventListener = (event: PlayerCenterEvent) => void
