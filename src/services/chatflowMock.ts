/**
 * ChatFlow V1 本地 Mock 种子数据。
 * 真实链路由会话存档 API / 阿里云 RPA / 无影云提供;Mock 阶段全部走本文件 + 内存事件流。
 */
import type {
  Agent,
  Conversation,
  Message,
  MessageContentType,
  Player,
  WechatAccount,
} from '../types/chat'

/** 当前登录客服(单浏览器演示) */
export const currentAgentId = 'agent_self'

export const agents: Agent[] = [
  { id: 'agent_self', name: '林悦', online: true, activeConversationCount: 4 },
  { id: 'agent_zhang', name: '张三', online: true, activeConversationCount: 5 },
  { id: 'agent_li', name: '李四', online: true, activeConversationCount: 12 },
  { id: 'agent_wang', name: '王五', online: false, activeConversationCount: 0 },
]

export const wechatAccounts: WechatAccount[] = [
  {
    id: 'wx_xiaoqin',
    corpId: 'ww_cg_vip_cn',
    shortName: '小琴号',
    status: 'online',
    enabled: true,
    unreadCount: 3,
    lastActiveAt: '2026-05-18T15:42:00+08:00',
    desktopId: 'desk_001',
  },
  {
    id: 'wx_xiaobei',
    corpId: 'ww_cg_vip_cn',
    shortName: '小贝号',
    status: 'offline',
    enabled: true,
    unreadCount: 0,
    lastActiveAt: '2026-05-17T22:10:00+08:00',
    desktopId: 'desk_002',
  },
  {
    id: 'wx_xiaojuan',
    corpId: 'ww_cg_overseas',
    shortName: '小娟号',
    status: 'banned',
    enabled: true,
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
  {
    id: 'p_xiaotao',
    nickname: '小桃',
    remark: '老客',
    associatedAccountIds: ['wx_xiaoqin'],
  },
  // 以下 4 人由 player-center 领域引入(覆盖关系状态三态);两域共享同一份玩家集合,
  // 保证从玩家中心"主动发起"跳工作台时能正确显示昵称。associatedAccountIds 对齐 playerCenterMock 关系 seed。
  {
    id: 'p_axian',
    nickname: '阿弦',
    associatedAccountIds: ['wx_xiaoqin', 'wx_xiaojuan'],
  },
  {
    id: 'p_dahai',
    nickname: '大海',
    associatedAccountIds: ['wx_xiaoqin', 'wx_xiaobei', 'wx_xiaojuan'],
  },
  {
    id: 'p_xiaowu',
    nickname: '小武',
    associatedAccountIds: ['wx_xiaobei'],
  },
  {
    id: 'p_kaikai',
    nickname: '凯凯',
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
    relationStatus: 'normal',
  },
  {
    id: 'c_002',
    accountId: 'wx_xiaoqin',
    playerId: 'p_xiaolin',
    status: 'queueing',
    assigneeId: null,
    // 历史轮次:5/14 由林悦接过一次,玩家结束后 5/18 重新发起,当前再次进入排队中
    assigneeHistory: [
      { agentId: 'agent_self', changedAt: '2026-05-14T10:05:00+08:00', reason: 'explicit' },
      { agentId: null, changedAt: '2026-05-14T18:00:00+08:00', reason: 'reactivate' },
    ],
    pinned: false,
    tags: [],
    unreadCount: 1,
    lastMessagePreview: '在吗 我充值后没到账',
    lastMessageAt: '2026-05-18T15:38:00+08:00',
    createdAt: '2026-05-14T10:00:00+08:00',
    relationStatus: 'normal',
  },
  {
    id: 'c_003',
    accountId: 'wx_xiaobei',
    playerId: 'p_xiaobai',
    status: 'active',
    assigneeId: 'agent_self',
    assigneeHistory: [
      { agentId: 'agent_self', changedAt: '2026-05-18T11:20:00+08:00', reason: 'explicit' },
    ],
    pinned: false,
    tags: [],
    unreadCount: 0,
    lastMessagePreview: '好的谢谢',
    lastMessageAt: '2026-05-18T11:55:00+08:00',
    createdAt: '2026-05-18T11:20:00+08:00',
    relationStatus: 'normal',
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
    relationStatus: 'normal',
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
    lastMessagePreview: '上次问题处理好了吗?',
    lastMessageAt: '2026-05-17T16:30:00+08:00',
    createdAt: '2026-05-17T15:30:00+08:00',
    relationStatus: 'removed_by_player',
  },
  {
    id: 'c_006',
    accountId: 'wx_xiaoqin',
    playerId: 'p_xiaotao',
    status: 'ended',
    assigneeId: 'agent_self',
    assigneeHistory: [
      { agentId: 'agent_self', changedAt: '2026-05-16T10:00:00+08:00', reason: 'explicit' },
    ],
    pinned: false,
    tags: [],
    unreadCount: 0,
    lastMessagePreview: '感谢咨询,有需要随时找我',
    lastMessageAt: '2026-05-16T11:20:00+08:00',
    createdAt: '2026-05-16T09:50:00+08:00',
    relationStatus: 'normal',
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

  // c_002 主线:玩家多轮会话(5/14 一轮 + 5/18 重开)— 演示历史分割条
  {
    id: 'm_2000a',
    conversationId: 'c_002',
    direction: 'incoming',
    contentType: 'text',
    text: '上次活动券我领到了,谢谢',
    senderId: 'p_xiaolin',
    createdAt: '2026-05-14T10:00:00+08:00',
    status: 'sent',
  },
  {
    id: 'm_2000b',
    conversationId: 'c_002',
    direction: 'outgoing',
    contentType: 'text',
    text: '不客气,有需要随时找我',
    senderId: 'agent_self',
    createdAt: '2026-05-14T10:05:00+08:00',
    status: 'sent',
  },
  {
    id: 'm_2000c',
    conversationId: 'c_002',
    direction: 'system',
    contentType: 'system',
    systemEvent: 'conversation_ended',
    text: '本次会话已结束 · 2026-05-14 18:00',
    senderId: 'system',
    createdAt: '2026-05-14T18:00:00+08:00',
    status: 'sent',
  },
  {
    id: 'm_2000d',
    conversationId: 'c_002',
    direction: 'system',
    contentType: 'system',
    systemEvent: 'player_reopened',
    text: '玩家于 2026-05-18 15:38 重新发起会话',
    senderId: 'system',
    createdAt: '2026-05-18T15:37:30+08:00',
    status: 'sent',
  },
  {
    id: 'm_2001',
    conversationId: 'c_002',
    direction: 'incoming',
    contentType: 'text',
    text: '在吗 我充值后没到账',
    senderId: 'p_xiaolin',
    createdAt: '2026-05-18T15:38:00+08:00',
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

  // c_004 主线:别的客服(张三)在接,我只能查看
  {
    id: 'm_4001',
    conversationId: 'c_004',
    direction: 'incoming',
    contentType: 'text',
    text: '客服你好,我想咨询下活动',
    senderId: 'p_xiaomei',
    createdAt: '2026-05-18T09:50:00+08:00',
    status: 'sent',
  },
  {
    id: 'm_4002',
    conversationId: 'c_004',
    direction: 'outgoing',
    contentType: 'text',
    text: '你好,具体哪个活动?',
    senderId: 'agent_zhang',
    createdAt: '2026-05-18T10:01:00+08:00',
    status: 'sent',
  },
  {
    id: 'm_4003',
    conversationId: 'c_004',
    direction: 'incoming',
    contentType: 'text',
    text: '充值送豪礼那个',
    senderId: 'p_xiaomei',
    createdAt: '2026-05-18T10:15:00+08:00',
    status: 'sent',
  },
  {
    id: 'm_4004',
    conversationId: 'c_004',
    direction: 'outgoing',
    contentType: 'text',
    text: '稍等,我帮你查下规则',
    senderId: 'agent_zhang',
    createdAt: '2026-05-18T10:20:00+08:00',
    status: 'sent',
  },
  {
    id: 'm_4005',
    conversationId: 'c_004',
    direction: 'incoming',
    contentType: 'text',
    text: '明天再联系你',
    senderId: 'p_xiaomei',
    createdAt: '2026-05-18T13:00:00+08:00',
    status: 'sent',
  },

  // c_005 主线:删好友失败 + 结束分割
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
  {
    id: 'm_5002',
    conversationId: 'c_005',
    direction: 'system',
    contentType: 'system',
    systemEvent: 'conversation_ended',
    text: '本次会话已结束 · 2026-05-17 16:35',
    senderId: 'system',
    createdAt: '2026-05-17T16:35:00+08:00',
    status: 'sent',
  },

  // c_001 追加:违禁词后端兜底拦截样例
  {
    id: 'm_1008',
    conversationId: 'c_001',
    direction: 'outgoing',
    contentType: 'text',
    text: '这次给你额外保证最低价,放心买',
    senderId: 'agent_self',
    createdAt: '2026-05-18T15:42:00+08:00',
    status: 'failed',
    failure: {
      category: 'forbidden_word_backend',
      code: 'FORBIDDEN_WORD',
      message: '消息命中违禁词「保证最低价」,后端兜底拦截,未发送',
      executedAt: '2026-05-18T15:42:00+08:00',
    },
  },

  // c_006 主线:正常结束的会话(号在线 + 玩家未删好友) — 演示主动发起会话
  {
    id: 'm_6001',
    conversationId: 'c_006',
    direction: 'incoming',
    contentType: 'text',
    text: '你好,想问下上周的活动还能补领吗',
    senderId: 'p_xiaotao',
    createdAt: '2026-05-16T09:50:00+08:00',
    status: 'sent',
  },
  {
    id: 'm_6002',
    conversationId: 'c_006',
    direction: 'outgoing',
    contentType: 'text',
    text: '可以的,我帮你提交补领申请',
    senderId: 'agent_self',
    createdAt: '2026-05-16T10:05:00+08:00',
    status: 'sent',
  },
  {
    id: 'm_6003',
    conversationId: 'c_006',
    direction: 'outgoing',
    contentType: 'text',
    text: '感谢咨询,有需要随时找我',
    senderId: 'agent_self',
    createdAt: '2026-05-16T11:20:00+08:00',
    status: 'sent',
  },
  {
    id: 'm_6004',
    conversationId: 'c_006',
    direction: 'system',
    contentType: 'system',
    systemEvent: 'conversation_ended',
    text: '本次会话已结束 · 2026-05-16 11:25',
    senderId: 'system',
    createdAt: '2026-05-16T11:25:00+08:00',
    status: 'sent',
  },
]

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
 * Mock 单个 RPA 混发任务中某一条子消息的发送结果分布。
 * 55% 成功 / 15% RPA 异常 / 10% 删好友 / 10% 速率上限 / 5% 违禁词后端兜底 / 5% 其它
 */
export function simulateSendOutcome(contentType: MessageContentType = 'text'): {
  status: 'sent'
} | {
  status: 'failed'
  failure: import('../types/chat').FailureDetail
} {
  const r = Math.random()
  if (r < 0.55) return { status: 'sent' }
  if (r < 0.7) {
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
  if (r < 0.8) {
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
  if (r < 0.9) {
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
  if (r < 0.95) {
    if (!['text', 'link', 'emoji'].includes(contentType)) {
      return {
        status: 'failed',
        failure: {
          category: 'other',
          code: 'ATTACHMENT_UPLOAD_FAILED',
          message: '附件上传失败，请重试当前消息',
          executedAt: new Date().toISOString(),
        },
      }
    }
    return {
      status: 'failed',
      failure: {
        category: 'forbidden_word_backend',
        code: 'FORBIDDEN_WORD',
        message: '消息命中违禁词,后端兜底拦截,未发送',
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
