import { describe, expect, it } from 'vitest'
import { conversations, findAccount, simulateReconciliation, wechatAccounts } from './chatflowMock'
import {
  assessOutboundDelivery,
  getCloudRpaResourceForAccount,
  listOpsWechatAccounts,
  listRpaTasks,
  setOpsWechatAccountEnabled,
  setRpaResourceOffline,
  type OpsActor,
} from './opsAdminMock'
import {
  getPermissionAgent,
  getPermissionSession,
  savePermissionAgent,
} from './permissionMock'
import {
  getAllRelations,
  getConversationRounds,
  getRelation,
  updateRelationFields,
} from './playerCenterMock'
import { makeConversationId } from './proactiveStore'

const adminActor: OpsActor = {
  authenticated: true,
  agentId: 'agent_admin',
  name: 'yan.pang',
  roleId: 'system_admin',
  visibleAccountIds: wechatAccounts.map((account) => account.id),
}

describe('跨域安全与一致性契约', () => {
  it('系统管理员拥有全部启用游戏与企微号的数据范围', () => {
    const session = getPermissionSession()
    expect(session.agent.roleId).toBe('system_admin')
    expect(session.visibleAccountIds.sort()).toEqual(wechatAccounts.map((account) => account.id).sort())
    expect(session.manageableGameIds).toEqual(expect.arrayContaining(['20173', '20174', '20175']))
  })

  it('发送前区分可执行与硬性阻断，且不再产出「待发送」排队态', () => {
    expect(assessOutboundDelivery('wx_xiaoqin')).toEqual({ disposition: 'ready' })
    expect(assessOutboundDelivery('wx_xiaobei')).toMatchObject({ disposition: 'blocked', code: 'IP_MISMATCH' })
    expect(assessOutboundDelivery('wx_xiaojuan')).toMatchObject({ disposition: 'blocked', code: 'ACCOUNT_BANNED' })
    // PRD 移除「待发送」:任何企微号的发送前评估都不再返回 queued(临时依赖不可用改为直接 failed)。
    wechatAccounts.forEach((account) => {
      expect(assessOutboundDelivery(account.id).disposition).not.toBe('queued')
    })
  })

  it('回捞比对核实只会把消息修正为「回捞比对失败」分类', () => {
    for (let i = 0; i < 300; i++) {
      const result = simulateReconciliation()
      if (result.failed) {
        expect(result.failure.category).toBe('delivery_reconciliation_failed')
      }
    }
  })

  it('会话标记为个人单选三值(单值字段,非数组)', () => {
    conversations.forEach((conversation) => {
      expect(Array.isArray((conversation as { tags?: unknown }).tags)).toBe(false)
      expect(['follow_up', 'important', 'callback', null]).toContain(conversation.tag ?? null)
    })
  })

  it('运营服务拒绝无权角色，即使调用方绕过页面按钮', () => {
    const resource = getCloudRpaResourceForAccount('wx_xiaoqin')!
    const customerActor: OpsActor = {
      authenticated: true,
      agentId: 'agent_self',
      name: 'lin.yue',
      roleId: 'customer_agent',
      visibleAccountIds: ['wx_xiaoqin'],
    }
    expect(() => setRpaResourceOffline(resource.id, resource.version, customerActor)).toThrow('无权')
  })

  it('禁用企微号保留账号和资源绑定，并停止常驻发送任务', () => {
    const before = listOpsWechatAccounts().find((account) => account.id === 'wx_xiaoqin')!
    const resourceId = before.resourceId!
    setOpsWechatAccountEnabled(before.id, false, before.configVersion, adminActor)

    const disabled = listOpsWechatAccounts().find((account) => account.id === before.id)!
    expect(disabled.enabled).toBe(false)
    expect(findAccount(before.id)).toBeDefined()
    expect(getCloudRpaResourceForAccount(before.id)?.id).toBe(resourceId)
    expect(listRpaTasks(resourceId)[0]).toMatchObject({ status: 'paused', pauseCode: 'account_disabled' })

    setOpsWechatAccountEnabled(disabled.id, true, disabled.configVersion, adminActor)
    expect(listOpsWechatAccounts().find((account) => account.id === before.id)?.enabled).toBe(true)
    expect(getCloudRpaResourceForAccount(before.id)?.id).toBe(resourceId)
  })

  it('玩家外部联系人由 corpId 与 externalUserId 联合识别，关系复合键唯一', () => {
    const relations = getAllRelations()
    const relationKeys = relations.map((relation) => `${relation.playerId}::${relation.accountId}`)
    expect(new Set(relationKeys).size).toBe(relationKeys.length)
    relations.forEach((relation) => {
      expect(relation.corpId).toBeTruthy()
      expect(relation.externalUserId).toBeTruthy()
    })
  })

  it('关系编辑使用乐观锁，旧版本写入会明确冲突', () => {
    const relation = getRelation('p_xiaoqi', 'wx_xiaoqin')!
    updateRelationFields({
      playerId: relation.playerId,
      accountId: relation.accountId,
      description: relation.description,
      expectedVersion: relation.syncVersion,
    })
    expect(() => updateRelationFields({
      playerId: relation.playerId,
      accountId: relation.accountId,
      remark: relation.remark,
      expectedVersion: relation.syncVersion,
    })).toThrow('刷新后重试')
  })

  it('会话轮次使用结构化系统事件切分', () => {
    const rounds = getConversationRounds().filter((round) => round.conversationId === 'c_002')
    expect(rounds).toHaveLength(2)
    expect(rounds.map((round) => round.roundIndex)).toEqual([1, 2])
  })

  it('新会话沿用统一的 c_NNN 业务编号，轮次不写进会话 ID', () => {
    expect(makeConversationId(conversations)).toBe('c_007')
  })

  it('系统始终保护最后一名有效管理员', () => {
    const admin = getPermissionAgent('agent_admin')!
    expect(() => savePermissionAgent({
      id: admin.id,
      feishuUserId: admin.feishuUserId,
      roleId: 'operations_supervisor',
      status: 'active',
      gameIds: admin.gameIds,
      accountIds: admin.accountIds,
      expectedUpdatedAt: admin.updatedAt,
    })).toThrow('另一名有效系统管理员')
  })
})
