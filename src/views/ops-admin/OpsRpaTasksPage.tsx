import { PauseCircleOutlined, PlayCircleOutlined, SettingOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { App as AntdApp, Button, Drawer, Empty, Result, Select, Space, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  listCloudRpaResources,
  listOpsWechatAccounts,
  listRpaTasks,
  setRpaResourceOffline,
  setRpaResourceRunning,
  useOpsAdminRevision,
  type CloudRpaResource,
  type DesktopConnectionStatus,
  type RpaExecutionStatus,
  type RpaTask,
  type RpaTaskStatus,
} from '../../services/opsAdminMock'
import { getCurrentOpsActor, usePermissionSession } from '../../services/permissionMock'
import '../../styles/OpsAdmin.scss'

const desktopStatusMeta: Record<DesktopConnectionStatus, { label: string; color: string }> = {
  connected: { label: '可连接', color: 'green' },
  disconnected: { label: '已断开', color: 'default' },
  fault: { label: '连接异常', color: 'red' },
}

const rpaStatusMeta: Record<RpaExecutionStatus, { label: string; color: string }> = {
  running: { label: '运行中', color: 'green' },
  offline: { label: '已下线', color: 'gold' },
  fault: { label: '故障', color: 'red' },
}

const taskStatusMeta: Record<RpaTaskStatus, { label: string; color: string }> = {
  running: { label: '运行中', color: 'green' },
  paused: { label: '已暂停', color: 'gold' },
  failed: { label: '执行失败', color: 'red' },
}

function formatTime(value: string) {
  return value.replace('T', ' ').replace(/(\+|Z).*/, '')
}

function taskSummary(resourceId: string) {
  const task = listRpaTasks(resourceId)[0]
  return task ? `${task.name} · ${taskStatusMeta[task.status].label}` : '未配置'
}

function OpsRpaTasksPage() {
  const session = usePermissionSession()
  const actor = getCurrentOpsActor()
  const revision = useOpsAdminRevision()
  const { message, modal } = AntdApp.useApp()
  const navigate = useNavigate()
  const [statuses, setStatuses] = useState<RpaExecutionStatus[]>([])
  const [desktopStatuses, setDesktopStatuses] = useState<DesktopConnectionStatus[]>([])
  const [bindingStatus, setBindingStatus] = useState<'bound' | 'unbound'>()
  const [detail, setDetail] = useState<CloudRpaResource | null>(null)

  const accountMap = new Map(listOpsWechatAccounts().map((account) => [account.id, account]))
  const rows = listCloudRpaResources()
    .filter((resource) => !statuses.length || statuses.includes(resource.rpaStatus))
    .filter((resource) => !desktopStatuses.length || desktopStatuses.includes(resource.desktopStatus))
    .filter((resource) => !bindingStatus || (bindingStatus === 'bound' ? !!resource.boundAccountId : !resource.boundAccountId))
  void revision

  const handleOffline = (resource: CloudRpaResource) => {
    modal.confirm({
      title: '下线 RPA 机器人',
      content: `确认下线 ${resource.robotName}? 自动化任务会暂停，但云电脑保持可连接，之后可用于控制台人工接管。`,
      okText: '确认下线',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        try {
          const paused = setRpaResourceOffline(resource.id, resource.version, actor)
          message.success(paused ? `机器人已下线，已暂停 ${paused} 个任务` : '机器人已下线')
        } catch (error) {
          message.error(error instanceof Error ? error.message : '下线失败')
        }
      },
    })
  }

  const handleOnline = (resource: CloudRpaResource) => {
    try {
      const resumed = setRpaResourceRunning(resource.id, resource.version, actor)
      message.success(resumed ? `机器人已上线，已恢复 ${resumed} 个任务` : '机器人已上线')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '上线失败')
    }
  }

  const columns: ColumnsType<CloudRpaResource> = [
    {
      title: '云电脑',
      key: 'desktop',
      width: 180,
      render: (_value, record) => (
        <div className="cf-ops-admin__account"><strong>{record.cloudDesktopId}</strong><span className="cf-mono">{record.id}</span></div>
      ),
    },
    {
      title: 'RPA 机器人',
      key: 'robot',
      width: 200,
      render: (_value, record) => (
        <div className="cf-ops-admin__account"><strong>{record.robotName}</strong><span className="cf-mono">{record.robotId}</span></div>
      ),
    },
    { title: '云电脑连接', dataIndex: 'desktopStatus', width: 120, render: (status: DesktopConnectionStatus) => <Tag color={desktopStatusMeta[status].color}>{desktopStatusMeta[status].label}</Tag> },
    { title: 'RPA 执行状态', dataIndex: 'rpaStatus', width: 130, render: (status: RpaExecutionStatus) => <Tag color={rpaStatusMeta[status].color}>{rpaStatusMeta[status].label}</Tag> },
    { title: '分配 / 当前出口 IP', key: 'ip', width: 215, render: (_value, record) => <div className="cf-ops-admin__account"><strong className="cf-mono">{record.assignedPublicIp ?? '待同步'}</strong><span className="cf-mono">当前：{record.currentPublicIp ?? '待检测'}</span></div> },
    {
      title: '绑定企微号',
      key: 'account',
      width: 180,
      render: (_value, record) => {
        const account = record.boundAccountId ? accountMap.get(record.boundAccountId) : undefined
        return account ? <div className="cf-ops-admin__account"><strong>{account.shortName}</strong><span className="cf-mono">{account.id}</span></div> : <span className="cf-text-tertiary">未绑定</span>
      },
    },
    { title: '任务摘要', key: 'tasks', width: 170, render: (_value, record) => <span>{taskSummary(record.id)}</span> },
    { title: '最近更新时间', dataIndex: 'updatedAt', width: 170, render: (value: string) => <span className="cf-mono">{formatTime(value)}</span> },
    {
      title: '操作',
      key: 'action',
      width: 190,
      render: (_value, record) => (
        <Space size={2}>
          {record.rpaStatus === 'running' && <Button type="link" size="small" danger icon={<PauseCircleOutlined />} onClick={() => handleOffline(record)}>下线机器人</Button>}
          {record.rpaStatus === 'offline' && <Button type="link" size="small" icon={<PlayCircleOutlined />} onClick={() => handleOnline(record)}>上线机器人</Button>}
          <Button type="link" size="small" icon={<UnorderedListOutlined />} onClick={() => setDetail(record)}>任务详情</Button>
        </Space>
      ),
    },
  ]

  if (!session.canManageOps) {
    return <div className="cf-ops-admin cf-ops-admin--result"><Result status="403" title="无权限访问" subTitle="仅系统管理员可维护云电脑与 RPA 机器人。" /></div>
  }

  return (
    <div className="cf-ops-admin">
      <header className="cf-ops-admin__header">
        <div><h1>云电脑 & RPA机器人管理</h1><p>展示全部阿里云采购资源。下线机器人只暂停自动化，不关闭云电脑，供控制台人工接管使用。</p></div>
        <Space><Button onClick={() => navigate('/ops-admin/operational-events')}>运行风控与审计</Button><Button icon={<SettingOutlined />} onClick={() => navigate('/ops-admin/wechat-accounts')}>企微号配置</Button></Space>
      </header>
      <section className="cf-ops-admin__filters">
        <Select mode="multiple" allowClear placeholder="RPA 执行状态" value={statuses} onChange={setStatuses} style={{ width: 220 }} options={Object.entries(rpaStatusMeta).map(([value, meta]) => ({ value, label: meta.label }))} />
        <Select mode="multiple" allowClear placeholder="云电脑连接状态" value={desktopStatuses} onChange={setDesktopStatuses} style={{ width: 220 }} options={Object.entries(desktopStatusMeta).map(([value, meta]) => ({ value, label: meta.label }))} />
        <Select allowClear placeholder="绑定状态" value={bindingStatus} onChange={setBindingStatus} style={{ width: 160 }} options={[{ value: 'bound', label: '已绑定企微号' }, { value: 'unbound', label: '未绑定企微号' }]} />
        <Button type="text" disabled={!statuses.length && !desktopStatuses.length && !bindingStatus} onClick={() => { setStatuses([]); setDesktopStatuses([]); setBindingStatus(undefined) }}>重置</Button>
      </section>
      <section className="cf-ops-admin__table">
        <div className="cf-ops-admin__meta">共 {rows.length} 个云电脑与 RPA 机器人资源；一个云电脑最多绑定一个企微号，未绑定资源保留在列表中。</div>
        {rows.length ? <Table rowKey="id" columns={columns} dataSource={rows} pagination={false} scroll={{ x: 1180 }} /> : <Empty description="暂无符合条件的资源" />}
      </section>
      <TaskDrawer resource={detail} onClose={() => setDetail(null)} />
    </div>
  )
}

function TaskDrawer({ resource, onClose }: { resource: CloudRpaResource | null; onClose: () => void }) {
  const tasks = resource ? listRpaTasks(resource.id) : []
  const columns: ColumnsType<RpaTask> = [
    { title: '任务', dataIndex: 'name', width: 170 },
    { title: '状态', dataIndex: 'status', width: 110, render: (status: RpaTaskStatus) => <Tag color={taskStatusMeta[status].color}>{taskStatusMeta[status].label}</Tag> },
    { title: '原因', dataIndex: 'pauseReason', render: (reason?: string) => reason || <span className="cf-text-tertiary">—</span> },
    { title: '最近变更', dataIndex: 'updatedAt', width: 165, render: (value: string) => <span className="cf-mono">{formatTime(value)}</span> },
  ]
  return <Drawer title={resource ? `${resource.robotName} · 任务详情` : '任务详情'} open={!!resource} width={680} onClose={onClose} destroyOnHidden>{tasks.length ? <Table rowKey="id" columns={columns} dataSource={tasks} pagination={false} /> : <Empty description="该机器人暂无任务" />}</Drawer>
}

export default OpsRpaTasksPage
