import { EditOutlined, PauseCircleOutlined, PlayCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { App as AntdApp, Button, Drawer, Empty, Input, Result, Select, Space, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mockGames } from '../../services/gameCatalogMock'
import {
  listSelectableCloudRpaResources,
  listOpsWechatAccounts,
  saveOpsWechatAccount,
  setOpsWechatAccountEnabled,
  useOpsAdminRevision,
  type OpsWechatAccount,
  type SaveOpsWechatAccountInput,
  type WechatRiskStatus,
} from '../../services/opsAdminMock'
import { getCurrentOpsActor, usePermissionSession } from '../../services/permissionMock'
import type { WechatAccountStatus } from '../../types/chat'
import '../../styles/OpsAdmin.scss'

const onlineMeta: Record<WechatAccountStatus, { label: string; color: string }> = {
  online: { label: '在线', color: 'green' },
  offline: { label: '离线', color: 'default' },
  banned: { label: '封禁中', color: 'red' },
}

const riskMeta: Record<WechatRiskStatus, { label: string; color: string }> = {
  normal: { label: '正常', color: 'green' },
  ip_unverified: { label: 'IP 待校验', color: 'default' },
  ip_mismatch: { label: 'IP 异常', color: 'red' },
  frequency_limited: { label: '频率受限', color: 'orange' },
}

const EMPTY_DRAFT: SaveOpsWechatAccountInput = { accountId: '', shortName: '', corpId: '', gameId: '', resourceId: '' }

function gameLabel(gameId: string) {
  const game = mockGames.find((item) => item.id === gameId)
  return game ? `${game.id}-${game.name}` : '未配置游戏'
}

function OpsWechatAccountsPage() {
  const session = usePermissionSession()
  const actor = getCurrentOpsActor()
  const revision = useOpsAdminRevision()
  const { message, modal } = AntdApp.useApp()
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [gameIds, setGameIds] = useState<string[]>([])
  const [onlineStatuses, setOnlineStatuses] = useState<WechatAccountStatus[]>([])
  const [riskStatuses, setRiskStatuses] = useState<WechatRiskStatus[]>([])
  const [enabledStatus, setEnabledStatus] = useState<boolean | undefined>()
  const [editing, setEditing] = useState<OpsWechatAccount | null | 'new'>(null)

  const rows = (() => {
    const normalized = keyword.trim().toLowerCase()
    return listOpsWechatAccounts()
      .filter((account) => !normalized
        || account.shortName.toLowerCase().includes(normalized)
        || account.id.toLowerCase().includes(normalized)
        || account.corpId.toLowerCase().includes(normalized))
      .filter((account) => !gameIds.length || gameIds.includes(account.gameId))
      .filter((account) => !onlineStatuses.length || onlineStatuses.includes(account.status))
      .filter((account) => !riskStatuses.length || riskStatuses.includes(account.riskStatus))
      .filter((account) => enabledStatus === undefined || account.enabled === enabledStatus)
  })()
  void revision

  const confirmToggleEnabled = (record: OpsWechatAccount) => {
    const nextEnabled = !record.enabled
    modal.confirm({
      title: nextEnabled ? '启用企微接入' : '禁用企微接入',
      content: nextEnabled
        ? `确认重新启用 ${record.shortName}？原资源绑定会保留，机器人仍需人工上线。`
        : `确认禁用 ${record.shortName}？系统会停止自动发送，但保留账号、资源绑定、历史会话和审计记录。`,
      okText: nextEnabled ? '确认启用' : '确认禁用',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        try {
          setOpsWechatAccountEnabled(record.id, nextEnabled, record.configVersion, actor)
          message.success(nextEnabled ? '企微接入已启用' : '企微接入已禁用')
        } catch (error) {
          message.error(error instanceof Error ? error.message : '停用失败')
        }
      },
    })
  }

  const columns: ColumnsType<OpsWechatAccount> = [
    {
      title: '企微号',
      key: 'account',
      width: 240,
      render: (_value, record) => <div className="cf-ops-admin__account"><strong>{record.shortName}</strong><span className="cf-mono">{record.id} · {record.corpId}</span></div>,
    },
    { title: '所属游戏', dataIndex: 'gameId', width: 180, render: (gameId: string) => <Tag color="blue">{gameLabel(gameId)}</Tag> },
    { title: '云桌面 ID', dataIndex: 'desktopId', width: 150, render: (value?: string) => <span className="cf-mono">{value || '未绑定'}</span> },
    { title: '企微账号状态', dataIndex: 'status', width: 125, render: (status: WechatAccountStatus) => <Tag color={onlineMeta[status].color}>{onlineMeta[status].label}</Tag> },
    { title: '接入状态', dataIndex: 'enabled', width: 100, render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'default'}>{enabled ? '启用' : '禁用'}</Tag> },
    {
      title: '风控状态',
      key: 'riskStatus',
      width: 120,
      render: (_value, record) => record.status === 'banned'
        ? <span className="cf-text-tertiary">—</span>
        : <Tag color={riskMeta[record.riskStatus].color}>{riskMeta[record.riskStatus].label}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 155,
      render: (_value, record) => <Space size={4}><Button type="link" size="small" icon={<EditOutlined />} onClick={() => setEditing(record)}>编辑</Button><Button type="link" size="small" danger={record.enabled} icon={record.enabled ? <PauseCircleOutlined /> : <PlayCircleOutlined />} onClick={() => confirmToggleEnabled(record)}>{record.enabled ? '禁用' : '启用'}</Button></Space>,
    },
  ]

  if (!session.canManageOps) return <div className="cf-ops-admin cf-ops-admin--result"><Result status="403" title="无权限访问" subTitle="仅系统管理员可维护企微接入配置。" /></div>

  return (
    <div className="cf-ops-admin">
      <header className="cf-ops-admin__header">
        <div><h1>企微号配置</h1><p>维护企微号、游戏归属、云电脑资源绑定与风控状态；机器人生命周期在资源管理中维护。</p></div>
        <Space><Button onClick={() => navigate('/ops-admin/cloud-rpa-resources')}>云电脑 & RPA机器人管理</Button><Button onClick={() => navigate('/ops-admin/forbidden-words')}>违禁词规则</Button><Button onClick={() => navigate('/ops-admin/operational-events')}>运行风控与审计</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing('new')}>新建企微号</Button></Space>
      </header>
      <section className="cf-ops-admin__filters">
        <Input.Search allowClear placeholder="搜索名称 / ID / corpId" value={keyword} onChange={(event) => setKeyword(event.target.value)} style={{ width: 260 }} />
        <Select mode="multiple" allowClear placeholder="所属游戏" value={gameIds} onChange={setGameIds} style={{ width: 220 }} options={mockGames.map((game) => ({ label: gameLabel(game.id), value: game.id }))} />
        <Select mode="multiple" allowClear placeholder="企微账号状态" value={onlineStatuses} onChange={setOnlineStatuses} style={{ width: 180 }} options={Object.entries(onlineMeta).map(([value, meta]) => ({ label: meta.label, value }))} />
        <Select mode="multiple" allowClear placeholder="风控状态" value={riskStatuses} onChange={setRiskStatuses} style={{ width: 180 }} options={Object.entries(riskMeta).map(([value, meta]) => ({ label: meta.label, value }))} />
        <Select allowClear placeholder="接入状态" value={enabledStatus} onChange={setEnabledStatus} style={{ width: 140 }} options={[{ label: '启用', value: true }, { label: '禁用', value: false }]} />
        <Button type="text" disabled={!keyword && !gameIds.length && !onlineStatuses.length && !riskStatuses.length && enabledStatus === undefined} onClick={() => { setKeyword(''); setGameIds([]); setOnlineStatuses([]); setRiskStatuses([]); setEnabledStatus(undefined) }}>重置</Button>
      </section>
      <section className="cf-ops-admin__table"><div className="cf-ops-admin__meta">共 {rows.length} 个企微号配置；账号状态展示在线、离线或封禁，风控状态展示 IP、频率等独立运行限制。</div>{rows.length ? <Table rowKey="id" columns={columns} dataSource={rows} pagination={false} scroll={{ x: 900 }} /> : <Empty description="暂无符合条件的企微号" />}</section>
      <WechatAccountDrawer value={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function WechatAccountDrawer({ value, onClose }: { value: OpsWechatAccount | null | 'new'; onClose: () => void }) {
  const { message } = AntdApp.useApp()
  const actor = getCurrentOpsActor()
  const [draft, setDraft] = useState<SaveOpsWechatAccountInput>(EMPTY_DRAFT)
  const open = value !== null
  const isNew = value === 'new'
  const record = value && value !== 'new' ? value : undefined
  const source = record ? { id: record.id, accountId: record.id, shortName: record.shortName, corpId: record.corpId, gameId: record.gameId, resourceId: record.resourceId ?? '', expectedVersion: record.configVersion } : EMPTY_DRAFT
  const resourceOptions = listSelectableCloudRpaResources(record?.id).map((resource) => ({ value: resource.id, label: `${resource.cloudDesktopId} · ${resource.robotName}（${resource.robotId}）` }))

  return <Drawer title={isNew ? '新建企微号配置' : '编辑企微号配置'} open={open} width={540} destroyOnHidden afterOpenChange={(visible) => { if (visible) setDraft(source) }} onClose={onClose} footer={<Space><Button onClick={onClose}>取消</Button><Button type="primary" onClick={() => { try { saveOpsWechatAccount({ ...draft, id: record?.id }, actor); message.success(isNew ? '企微号配置已创建' : '企微号配置已保存'); onClose() } catch (error) { message.error(error instanceof Error ? error.message : '保存失败') } }}>保存配置</Button></Space>}>
    <div className="cf-ops-admin__form">
      <label>企微号 ID *</label><Input disabled={!isNew} value={draft.accountId} placeholder="例如 wx_vip_001" onChange={(event) => setDraft((item) => ({ ...item, accountId: event.target.value }))} />
      <label>企微号名称 *</label><Input value={draft.shortName} placeholder="例如 VIP 一组号" onChange={(event) => setDraft((item) => ({ ...item, shortName: event.target.value }))} />
      <label>企业微信 corpId *</label><Input value={draft.corpId} disabled={!isNew} placeholder="例如 ww_cg_vip_cn" onChange={(event) => setDraft((item) => ({ ...item, corpId: event.target.value }))} />
      <label>所属游戏 *</label><Select value={draft.gameId || undefined} placeholder="选择所属游戏" options={mockGames.filter((game) => game.enabled).map((game) => ({ label: gameLabel(game.id), value: game.id }))} onChange={(gameId) => setDraft((item) => ({ ...item, gameId }))} />
      <label>云电脑 & RPA 机器人 *</label><Select showSearch optionFilterProp="label" value={draft.resourceId || undefined} placeholder="选择未绑定的云电脑资源" options={resourceOptions} onChange={(resourceId) => setDraft((item) => ({ ...item, resourceId }))} />
      <label>企微账号状态</label>{record ? <Tag color={onlineMeta[record.status].color}>{onlineMeta[record.status].label}</Tag> : <Tag>新建默认为离线</Tag>}
      <label>风控状态</label>{record ? record.status === 'banned' ? <span className="cf-text-tertiary">—</span> : <Tag color={riskMeta[record.riskStatus].color}>{riskMeta[record.riskStatus].label}</Tag> : <Tag color="green">正常</Tag>}
      <p>云电脑与机器人必须从资源管理中选择。账号状态由企微登录与封禁结果更新；风控状态汇总当前绑定关系的 IP、频率等运行限制。</p>
    </div>
  </Drawer>
}

export default OpsWechatAccountsPage
