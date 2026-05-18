/**
 * ChatFlow V1 本地 Mock 种子数据。
 * 真实链路由会话存档 API / 阿里云 RPA / 无影云提供;Mock 阶段全部走本文件 + 内存事件流。
 */
import type {
  Agent,
  Conversation,
  Message,
  Player,
  WechatAccount,
} from '../types/chat'

/** 当前登录客服(单浏览器演示) */
export const currentAgentId = 'agent_self'

export const agents: Agent[] = [
  { id: 'agent_self', name: '我自己', online: true, activeConversationCount: 4 },
  { id: 'agent_zhang', name: '张三', online: true, activeConversationCount: 5 },
  { id: 'agent_li', name: '李四', online: true, activeConversationCount: 12 },
  { id: 'agent_wang', name: '王五', online: false, activeConversationCount: 0 },
]

export const wechatAccounts: WechatAccount[] = [
  {
    id: 'wx_xiaoqin',
    shortName: '小琴号',
    status: 'online',
    unreadCount: 3,
    lastActiveAt: '2026-05-18T15:42:00+08:00',
    desktopId: 'desk_001',
  },
  {
    id: 'wx_xiaobei',
    shortName: '小贝号',
    status: 'offline',
    unreadCount: 0,
    lastActiveAt: '2026-05-17T22:10:00+08:00',
    desktopId: 'desk_002',
  },
  {
    id: 'wx_xiaojuan',
    shortName: '小娟号',
    status: 'banned',
    unreadCount: 0,
    lastActiveAt: '2026-05-15T11:30:00+08:00',
    desktopId: 'desk_003',
  },
]

export const players: Player[] = [
  {
    id: 'p_xiaoqi',
    nickname: '小琪',
    remark: 'VIP_001',
    associatedAccountIds: ['wx_xiaoqin'],
  },
  {
    id: 'p_xiaobai',
    nickname: '小白',
    associatedAccountIds: ['wx_xiaoqin', 'wx_xiaobei'],
  },
  {
    id: 'p_xiaolin',
    nickname: '小琳',
    remark: '高消费',
    associatedAccountIds: ['wx_xiaoqin'],
  },
  {
    id: 'p_xiaohe',
    nickname: '小贺',
    associatedAccountIds: ['wx_xiaobei'],
  },
  {
    id: 'p_xiaomei',
    nickname: '小梅',
    associatedAccountIds: ['wx_xiaoqin'],
  },
]

export const conversations: Conversation[] = [
  {
    id: 'c_001',
    accountId: 'wx_xiaoqin',
    playerId: 'p_xiaoqi',
    status: 'active',
    assigneeId: 'agent_self',
    assigneeHistory: [
      { agentId: 'agent_self', changedAt: '2026-05-18T14:30:00+08:00', reason: 'explicit' },
    ],
    pinned: true,
    tags: ['important', 'follow_up'],
    unreadCount: 2,
    lastMessagePreview: '这个优惠券怎么用?',
    lastMessageAt: '2026-05-18T15:40:00+08:00',
    createdAt: '2026-05-18T14:00:00+08:00',
    playerHasDeletedFriendship: false,
  },
  {
    id: 'c_002',
    accountId: 'wx_xiaoqin',
    playerId: 'p_xiaolin',
    status: 'queueing',
    assigneeId: null,
    assigneeHistory: [],
    pinned: false,
    tags: [],
    unreadCount: 1,
    lastMessagePreview: '在吗 我充值后没到账',
    lastMessageAt: '2026-05-18T15:38:00+08:00',
    createdAt: '2026-05-18T15:38:00+08:00',
    playerHasDeletedFriendship: false,
  },
  {
    id: 'c_003',
    accountId: 'wx_xiaobei',
    playerId: 'p_xiaobai',
    status: 'active',
    assigneeId: 'agent_self',
    assigneeHistory: [
      { agentId: 'agent_self', changedAt: '2026-05-18T11:20:00+08:00', reason: 'implicit_first_message' },
    ],
    pinned: false,
    tags: [],
    unreadCount: 0,
    lastMessagePreview: '好的谢谢',
    lastMessageAt: '2026-05-18T11:55:00+08:00',
    createdAt: '2026-05-18T11:20:00+08:00',
    playerHasDeletedFriendship: false,
  },
  {
    id: 'c_004',
    accountId: 'wx_xiaoqin',
    playerId: 'p_xiaomei',
    status: 'active',
    assigneeId: 'agent_zhang',
    assigneeHistory: [
      { agentId: 'agent_zhang', changedAt: '2026-05-18T10:00:00+08:00', reason: 'explicit' },
    ],
    pinned: false,
    tags: ['callback'],
    unreadCount: 0,
    lastMessagePreview: '明天再联系你',
    lastMessageAt: '2026-05-18T13:00:00+08:00',
    createdAt: '2026-05-18T09:50:00+08:00',
    playerHasDeletedFriendship: false,
  },
  {
    id: 'c_005',
    accountId: 'wx_xiaobei',
    playerId: 'p_xiaohe',
    status: 'ended',
    assigneeId: 'agent_self',
    assigneeHistory: [
      { agentId: 'agent_self', changedAt: '2026-05-17T16:00:00+08:00', reason: 'explicit' },
    ],
    pinned: false,
    tags: [],
    unreadCount: 0,
    lastMessagePreview: '会话已结束',
    lastMessageAt: '2026-05-17T16:30:00+08:00',
    createdAt: '2026-05-17T15:30:00+08:00',
    playerHasDeletedFriendship: true,
  },
]

export const messages: Message[] = [
  // c_001 主线:多种状态
  {
    id: 'm_1001',
    conversationId: 'c_001',
    direction: 'incoming',
    contentType: 'text',
    text: '在吗,昨天买的礼包好像有问题',
    senderId: 'p_xiaoqi',
    createdAt: '2026-05-18T14:00:00+08:00',
    status: 'sent',
  },
  {
    id: 'm_1002',
    conversationId: 'c_001',
    direction: 'outgoing',
    contentType: 'text',
    text: '在的,具体是什么问题?',
    senderId: 'agent_self',
    createdAt: '2026-05-18T14:31:00+08:00',
    status: 'sent',
  },
  {
    id: 'm_1003',
    conversationId: 'c_001',
    direction: 'incoming',
    contentType: 'text',
    text: '我充了 648 但是没收到道具',
    senderId: 'p_xiaoqi',
    createdAt: '2026-05-18T14:35:00+08:00',
    status: 'sent',
  },
  {
    id: 'm_1004',
    conversationId: 'c_001',
    direction: 'outgoing',
    contentType: 'text',
    text: '好的,我帮你查一下,稍等 2 分钟',
    senderId: 'agent_self',
    createdAt: '2026-05-18T14:36:00+08:00',
    status: 'sent',
  },
  {
    id: 'm_1005',
    conversationId: 'c_001',
    direction: 'outgoing',
    contentType: 'text',
    text: '订单已查到,正在为你补发',
    senderId: 'agent_self',
    createdAt: '2026-05-18T14:50:00+08:00',
    status: 'failed',
    failure: {
      category: 'rpa_exception',
      code: 'RPA_TIMEOUT',
      message: 'RPA 操作超时,云桌面 30s 内未响应。建议重试或人工介入',
      recordingUrl: '/mock/recording-rpa-timeout.mp4',
      recordingSizeBytes: 4_408_172,
      recordingExpireAt: '2026-06-17T14:50:00+08:00',
      executedAt: '2026-05-18T14:50:00+08:00',
    },
  },
  {
    id: 'm_1006',
    conversationId: 'c_001',
    direction: 'incoming',
    contentType: 'text',
    text: '这个优惠券怎么用?',
    senderId: 'p_xiaoqi',
    createdAt: '2026-05-18T15:38:00+08:00',
    status: 'sent',
  },
  {
    id: 'm_1007',
    conversationId: 'c_001',
    direction: 'incoming',
    contentType: 'text',
    text: '在吗',
    senderId: 'p_xiaoqi',
    createdAt: '2026-05-18T15:40:00+08:00',
    status: 'sent',
  },

  // c_003 主线:发送中 + 已送达
  {
    id: 'm_3001',
    conversationId: 'c_003',
    direction: 'incoming',
    contentType: 'text',
    text: '客服你好',
    senderId: 'p_xiaobai',
    createdAt: '2026-05-18T11:20:00+08:00',
    status: 'sent',
  },
  {
    id: 'm_3002',
    conversationId: 'c_003',
    direction: 'outgoing',
    contentType: 'text',
    text: '你好,有什么可以帮你的?',
    senderId: 'agent_self',
    createdAt: '2026-05-18T11:21:00+08:00',
    status: 'sent',
  },
  {
    id: 'm_3003',
    conversationId: 'c_003',
    direction: 'incoming',
    contentType: 'text',
    text: '我想问下活动什么时候结束',
    senderId: 'p_xiaobai',
    createdAt: '2026-05-18T11:30:00+08:00',
    status: 'sent',
  },
  {
    id: 'm_3004',
    conversationId: 'c_003',
    direction: 'outgoing',
    contentType: 'text',
    text: '本周日 23:59 截止',
    senderId: 'agent_self',
    createdAt: '2026-05-18T11:50:00+08:00',
    status: 'sent',
  },
  {
    id: 'm_3005',
    conversationId: 'c_003',
    direction: 'incoming',
    contentType: 'text',
    text: '好的谢谢',
    senderId: 'p_xiaobai',
    createdAt: '2026-05-18T11:55:00+08:00',
    status: 'sent',
  },

  // c_005 主线:删好友失败
  {
    id: 'm_5001',
    conversationId: 'c_005',
    direction: 'outgoing',
    contentType: 'text',
    text: '上次问题处理好了吗?',
    senderId: 'agent_self',
    createdAt: '2026-05-17T16:30:00+08:00',
    status: 'failed',
    failure: {
      category: 'player_deleted_friendship',
      code: 'NOT_FRIEND',
      message: '玩家已删好友,后续消息无法送达',
      executedAt: '2026-05-17T16:30:00+08:00',
    },
  },
]

/** 简单的违禁词库(本地 Mock,真实从 ops-admin 同步) */
export const forbiddenWords: string[] = ['退款承诺', '保证最低价', '官方授权', '返利']

/** 工具函数:按 conversationId 取消息 */
export const getMessagesByConversation = (
  pool: Message[],
  conversationId: string,
): Message[] =>
  pool
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))

/** 工具函数:按 id 取实体 */
export const findAccount = (id: string) => wechatAccounts.find((a) => a.id === id)
export const findPlayer = (id: string) => players.find((p) => p.id === id)
export const findAgent = (id: string) => agents.find((a) => a.id === id)

/**
 * Mock 发送结果模拟器(无后端的本地概率分布)
 * 60% 成功 / 15% RPA 异常 / 10% 删好友 / 10% 速率上限 / 5% 其它
 */
export function simulateSendOutcome(): {
  status: 'sent'
} | {
  status: 'failed'
  failure: import('../types/chat').FailureDetail
} {
  const r = Math.random()
  if (r < 0.6) return { status: 'sent' }
  if (r < 0.75) {
    return {
      status: 'failed',
      failure: {
        category: 'rpa_exception',
        code: 'RPA_TIMEOUT',
        message: 'RPA 操作超时,云桌面 30s 内未响应,建议重试或人工介入',
        recordingUrl: '/mock/recording-rpa-timeout.mp4',
        recordingSizeBytes: 4_408_172,
        recordingExpireAt: new Date(Date.now() + 30 * 86400_000).toISOString(),
        executedAt: new Date().toISOString(),
      },
    }
  }
  if (r < 0.85) {
    return {
      status: 'failed',
      failure: {
        category: 'player_deleted_friendship',
        code: 'NOT_FRIEND',
        message: '玩家已删好友,后续消息无法送达',
        executedAt: new Date().toISOString(),
      },
    }
  }
  if (r < 0.95) {
    return {
      status: 'failed',
      failure: {
        category: 'rate_limit_exceeded',
        code: 'RATE_LIMIT',
        message: '该企微号已达发送上限,请稍后再试',
        executedAt: new Date().toISOString(),
      },
    }
  }
  return {
    status: 'failed',
    failure: {
      category: 'other',
      code: 'UNKNOWN',
      message: '未知错误,请联系管理员',
      executedAt: new Date().toISOString(),
    },
  }
}
