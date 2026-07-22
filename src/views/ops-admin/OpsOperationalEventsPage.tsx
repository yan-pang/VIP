import { EditOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import {
  Alert,
  App as AntdApp,
  Button,
  Drawer,
  Empty,
  Input,
  InputNumber,
  Result,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  listCloudRpaResources,
  listForbiddenWordRules,
  listOpsAuditRecords,
  listOpsRiskAlerts,
  listOpsRiskPolicies,
  listOpsWechatAccounts,
  saveOpsRiskPolicy,
  updateOpsRiskAlertStatus,
  useOpsAdminRevision,
  type OpsAlertSeverity,
  type OpsAlertStatus,
  type OpsAuditRecord,
  type OpsAuditResult,
  type OpsRiskAlert,
  type OpsRiskPolicy,
} from '../../services/opsAdminMock'
import { getCurrentOpsActor, usePermissionSession } from '../../services/permissionMock'
import type { OpsActor } from '../../services/opsAdminMock'
import '../../styles/OpsAdmin.scss'

const severityMeta: Record<OpsAlertSeverity, { label: string; color: string }> = {
  high: { label: '高', color: 'red' },
  medium: { label: '中', color: 'orange' },
  low: { label: '低', color: 'blue' },
}

const alertStatusMeta: Record<OpsAlertStatus, { label: string; color: string }> = {
  open: { label: '待处理', color: 'red' },
  acknowledged: { label: '已确认', color: 'gold' },
  resolved: { label: '已解决', color: 'green' },
}

const auditResultMeta: Record<OpsAuditResult, { label: string; color: string }> = {
  success: { label: '成功', color: 'green' },
  rejected: { label: '已拒绝', color: 'gold' },
  failed: { label: '失败', color: 'red' },
}

function formatTime(value: string) {
  return value.replace('T', ' ').replace(/(\+|Z).*/, '')
}

function OpsOperationalEventsPage() {
  const session = usePermissionSession()
  const actor = getCurrentOpsActor()
  const revision = useOpsAdminRevision()
  const navigate = useNavigate()
  const isAdmin = session.canManageOps
  const canView = session.canViewOps
  void revision

  if (!canView) {
    return (
      <div className="cf-ops-admin cf-ops-admin--result">
        <Result status="403" title="无权限访问" subTitle="仅系统管理员和运营主管可查看运行风控与审计。" />
      </div>
    )
  }

  return (
    <div className="cf-ops-admin">
      <header className="cf-ops-admin__header">
        <div>
          <h1>运行风控与审计</h1>
          <p>集中处理风险告警、查看或调整风控策略，并追溯运营管理关键操作。</p>
        </div>
        <Space>
          {isAdmin && <Button onClick={() => navigate('/ops-admin/wechat-accounts')}>企微号配置</Button>}
          {isAdmin && <Button onClick={() => navigate('/ops-admin/cloud-rpa-resources')}>云电脑 & RPA机器人</Button>}
          {!isAdmin && <Button onClick={() => navigate('/control')}>返回控制台</Button>}
        </Space>
      </header>
      <Tabs
        className="cf-ops-admin__tabs"
        defaultActiveKey="alerts"
        items={[
          {
            key: 'alerts',
            label: '风险告警',
            children: <RiskAlertsTab isAdmin={isAdmin} actor={actor} visibleAccountIds={session.visibleAccountIds} />,
          },
          {
            key: 'policies',
            label: '风控策略',
            children: <RiskPoliciesTab isAdmin={isAdmin} actor={actor} visibleAccountIds={session.visibleAccountIds} />,
          },
          {
            key: 'audits',
            label: '操作审计',
            children: <AuditRecordsTab isAdmin={isAdmin} visibleAccountIds={session.visibleAccountIds} visibleGameIds={session.visibleGameIds} />,
          },
        ]}
      />
    </div>
  )
}

function RiskAlertsTab({
  isAdmin,
  actor,
  visibleAccountIds,
}: {
  isAdmin: boolean
  actor: OpsActor
  visibleAccountIds: string[]
}) {
  const { message, modal } = AntdApp.useApp()
  const [statuses, setStatuses] = useState<OpsAlertStatus[]>(['open', 'acknowledged'])
  const [severities, setSeverities] = useState<OpsAlertSeverity[]>([])
  const [accountId, setAccountId] = useState<string>()
  const accountMap = new Map(listOpsWechatAccounts().map((account) => [account.id, account]))
  const allowedAccounts = isAdmin ? listOpsWechatAccounts() : listOpsWechatAccounts().filter((account) => visibleAccountIds.includes(account.id))
  const rows = listOpsRiskAlerts().filter((alert) => {
    if (!isAdmin && alert.accountId && !visibleAccountIds.includes(alert.accountId)) return false
    if (statuses.length && !statuses.includes(alert.status)) return false
    if (severities.length && !severities.includes(alert.severity)) return false
    return !accountId || alert.accountId === accountId
  })

  const advanceStatus = (record: OpsRiskAlert) => {
    const nextStatus: OpsAlertStatus = record.status === 'open' ? 'acknowledged' : 'resolved'
    modal.confirm({
      title: nextStatus === 'acknowledged' ? '确认风险告警' : '标记告警已解决',
      content:
        nextStatus === 'acknowledged'
          ? '确认只表示已有人开始处理，不会解除任何硬性风控。'
          : '仅在已完成恢复验证后标记解决；操作会写入审计记录。',
      okText: nextStatus === 'acknowledged' ? '确认并处理' : '确认已解决',
      cancelText: '取消',
      onOk: () => {
        try {
          updateOpsRiskAlertStatus(record.id, nextStatus, actor)
          message.success(nextStatus === 'acknowledged' ? '告警已确认' : '告警已解决')
        } catch (error) {
          message.error(error instanceof Error ? error.message : '状态更新失败')
        }
      },
    })
  }

  const columns: ColumnsType<OpsRiskAlert> = [
    { title: '级别', dataIndex: 'severity', width: 80, render: (value: OpsAlertSeverity) => <Tag color={severityMeta[value].color}>{severityMeta[value].label}</Tag> },
    {
      title: '告警',
      key: 'alert',
      render: (_value, record) => (
        <div className="cf-ops-admin__alert-title">
          <strong>{record.title}</strong>
          <span>{record.detail}</span>
        </div>
      ),
    },
    {
      title: '关联企微号',
      dataIndex: 'accountId',
      width: 180,
      render: (value?: string) => value ? <div className="cf-ops-admin__account"><strong>{accountMap.get(value)?.shortName ?? value}</strong><span className="cf-mono">{value}</span></div> : '—',
    },
    { title: '状态', dataIndex: 'status', width: 105, render: (value: OpsAlertStatus) => <Tag color={alertStatusMeta[value].color}>{alertStatusMeta[value].label}</Tag> },
    { title: '触发时间', dataIndex: 'triggeredAt', width: 170, render: (value: string) => <span className="cf-mono">{formatTime(value)}</span> },
    { title: '处理人', dataIndex: 'handledBy', width: 120, render: (value?: string) => value || '—' },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_value, record) =>
        isAdmin && record.status !== 'resolved'
          ? <Button type="link" size="small" onClick={() => advanceStatus(record)}>{record.status === 'open' ? '确认处理' : '标记解决'}</Button>
          : <span className="cf-text-tertiary">只读</span>,
    },
  ]

  return (
    <>
      {!isAdmin && <Alert type="info" showIcon message="运营主管仅能查看自身授权企微号范围内的告警，不能确认或关闭告警。" />}
      <section className="cf-ops-admin__filters cf-ops-admin__filters--tab">
        <Select mode="multiple" allowClear placeholder="告警状态" value={statuses} onChange={setStatuses} style={{ width: 200 }} options={Object.entries(alertStatusMeta).map(([value, meta]) => ({ value, label: meta.label }))} />
        <Select mode="multiple" allowClear placeholder="严重级别" value={severities} onChange={setSeverities} style={{ width: 180 }} options={Object.entries(severityMeta).map(([value, meta]) => ({ value, label: meta.label }))} />
        <Select allowClear showSearch optionFilterProp="label" placeholder="关联企微号" value={accountId} onChange={setAccountId} style={{ width: 220 }} options={allowedAccounts.map((account) => ({ value: account.id, label: account.shortName + ' · ' + account.id }))} />
      </section>
      <section className="cf-ops-admin__table">
        <div className="cf-ops-admin__meta">
          默认显示待处理和已确认告警，共 {rows.length} 条；已解决告警可通过状态筛选查看。确认告警不会解除 IP、频率、封禁等硬性拦截。
        </div>
        {rows.length ? <Table rowKey="id" columns={columns} dataSource={rows} pagination={false} scroll={{ x: 1120 }} /> : <Empty description="暂无符合条件的风险告警" />}
      </section>
    </>
  )
}

function RiskPoliciesTab({
  isAdmin,
  actor,
  visibleAccountIds,
}: {
  isAdmin: boolean
  actor: OpsActor
  visibleAccountIds: string[]
}) {
  const [editing, setEditing] = useState<OpsRiskPolicy | null>(null)
  const accountMap = new Map(listOpsWechatAccounts().map((account) => [account.id, account]))
  const rows = listOpsRiskPolicies().filter((policy) => isAdmin || visibleAccountIds.includes(policy.accountId))
  const columns: ColumnsType<OpsRiskPolicy> = [
    {
      title: '企微号',
      dataIndex: 'accountId',
      width: 210,
      render: (value: string) => <div className="cf-ops-admin__account"><strong>{accountMap.get(value)?.shortName ?? value}</strong><span className="cf-mono">{value}</span></div>,
    },
    { title: '发送频率', key: 'send', width: 190, render: (_value, record) => <span><strong>{record.hourlySendLimit}</strong> 条/小时 <span className="cf-text-tertiary">（硬上限 {record.hardHourlyCap}）</span></span> },
    { title: '连续失败阈值', key: 'failure', width: 190, render: (_value, record) => <span><strong>{record.consecutiveFailureLimit}</strong> 次 <span className="cf-text-tertiary">（硬上限 {record.hardFailureCap}）</span></span> },
    { title: '版本', dataIndex: 'version', width: 80, render: (value: number) => <Tag color="blue">v{value}</Tag> },
    { title: '最近更新', dataIndex: 'updatedAt', width: 170, render: (value: string) => <span className="cf-mono">{formatTime(value)}</span> },
    { title: '更新人', dataIndex: 'updatedBy', width: 110 },
    { title: '调整原因', dataIndex: 'changeReason' },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_value, record) => isAdmin ? <Button type="link" size="small" icon={<EditOutlined />} onClick={() => setEditing(record)}>调整</Button> : <span className="cf-text-tertiary">只读</span>,
    },
  ]

  return (
    <>
      <Alert
        type="warning"
        showIcon
        icon={<SafetyCertificateOutlined />}
        message="策略值可调整，但不能超过服务端硬上限，也不能关闭 IP、封禁和单号单桌面等硬性风控。"
        description="当前数值用于 Mock 验证；生产初始值需结合 RPA 供应商能力和试运行规模确认。每次调整都会生成新版本并写入审计。"
      />
      <section className="cf-ops-admin__table cf-ops-admin__table--spaced">
        <div className="cf-ops-admin__meta">共 {rows.length} 条企微号策略；{isAdmin ? '系统管理员可在硬上限内调整。' : '运营主管仅可查看授权范围。'}</div>
        {rows.length ? <Table rowKey="id" columns={columns} dataSource={rows} pagination={false} scroll={{ x: 1260 }} /> : <Empty description="暂无可见风控策略" />}
      </section>
      <PolicyDrawer value={editing} actor={actor} onClose={() => setEditing(null)} />
    </>
  )
}

function PolicyDrawer({
  value,
  actor,
  onClose,
}: {
  value: OpsRiskPolicy | null
  actor: OpsActor
  onClose: () => void
}) {
  const { message } = AntdApp.useApp()
  const [hourlySendLimit, setHourlySendLimit] = useState(1)
  const [consecutiveFailureLimit, setConsecutiveFailureLimit] = useState(1)
  const [changeReason, setChangeReason] = useState('')

  const save = () => {
    if (!value) return
    try {
      saveOpsRiskPolicy({ id: value.id, hourlySendLimit, consecutiveFailureLimit, changeReason, expectedVersion: value.version }, actor)
      message.success('风控策略已保存并生成新版本')
      onClose()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    }
  }

  return (
    <Drawer
      title="调整风控策略"
      open={!!value}
      width={520}
      destroyOnHidden
      onClose={onClose}
      afterOpenChange={(visible) => {
        if (visible && value) {
          setHourlySendLimit(value.hourlySendLimit)
          setConsecutiveFailureLimit(value.consecutiveFailureLimit)
          setChangeReason('')
        }
      }}
      footer={<Space><Button onClick={onClose}>取消</Button><Button type="primary" onClick={save}>确认调整</Button></Space>}
    >
      {value && (
        <div className="cf-ops-admin__form">
          <Alert type="info" showIcon message={'当前策略版本 v' + value.version + '；保存后版本自动递增。'} />
          <label>每小时发送上限 *</label>
          <Space><InputNumber min={1} max={value.hardHourlyCap} value={hourlySendLimit} onChange={(next) => setHourlySendLimit(next ?? 1)} style={{ width: 260 }} /><span>条/小时</span></Space>
          <p>服务端硬上限：{value.hardHourlyCap} 条/小时，页面不能配置更高数值。</p>
          <label>连续失败阈值 *</label>
          <Space><InputNumber min={1} max={value.hardFailureCap} value={consecutiveFailureLimit} onChange={(next) => setConsecutiveFailureLimit(next ?? 1)} style={{ width: 260 }} /><span>次</span></Space>
          <p>达到阈值后暂停自动发送并生成高风险告警。</p>
          <label>调整原因 *</label>
          <Input.TextArea value={changeReason} onChange={(event) => setChangeReason(event.target.value)} autoSize={{ minRows: 4, maxRows: 8 }} placeholder="至少 4 个字；原因会进入操作审计。" />
        </div>
      )}
    </Drawer>
  )
}

function AuditRecordsTab({ isAdmin, visibleAccountIds, visibleGameIds }: { isAdmin: boolean; visibleAccountIds: string[]; visibleGameIds: string[] }) {
  const [keyword, setKeyword] = useState('')
  const [result, setResult] = useState<OpsAuditResult>()
  const alerts = listOpsRiskAlerts()
  const policies = listOpsRiskPolicies()
  const resources = listCloudRpaResources()

  const rows = useMemo(() => {
    const normalized = keyword.trim().toLocaleLowerCase()
    const canSee = (record: OpsAuditRecord) => {
      if (isAdmin) return true
      if (record.targetType === 'account') return visibleAccountIds.includes(record.targetId)
      if (record.targetType === 'policy') return visibleAccountIds.includes(policies.find((item) => item.id === record.targetId)?.accountId ?? '')
      if (record.targetType === 'alert') return visibleAccountIds.includes(alerts.find((item) => item.id === record.targetId)?.accountId ?? '')
      if (record.targetType === 'resource') return visibleAccountIds.includes(resources.find((item) => item.id === record.targetId)?.boundAccountId ?? '')
      if (record.targetType === 'projection') return visibleAccountIds.includes(resources.find((item) => item.cloudDesktopId === record.targetId)?.boundAccountId ?? '')
      if (record.targetType === 'rule') return visibleGameIds.includes(listForbiddenWordRules().find((item) => item.id === record.targetId)?.gameId ?? '')
      return false
    }
    return listOpsAuditRecords().filter((record) => {
      if (!canSee(record)) return false
      if (result && record.result !== result) return false
      return !normalized || [record.operator, record.action].some((value) => value.toLocaleLowerCase().includes(normalized))
    })
  }, [alerts, isAdmin, keyword, policies, resources, result, visibleAccountIds, visibleGameIds])

  const columns: ColumnsType<OpsAuditRecord> = [
    { title: '发生时间', dataIndex: 'occurredAt', width: 175, render: (value: string) => <span className="cf-mono">{formatTime(value)}</span> },
    { title: '操作人', dataIndex: 'operator', width: 120 },
    { title: '动作', dataIndex: 'action', width: 170 },
    { title: '结果', dataIndex: 'result', width: 90, render: (value: OpsAuditResult) => <Tag color={auditResultMeta[value].color}>{auditResultMeta[value].label}</Tag> },
  ]

  return (
    <>
      {!isAdmin && <Alert type="info" showIcon message="运营主管仅可查看自身授权企微号关联的操作审计，不提供导出。" />}
      <section className="cf-ops-admin__filters cf-ops-admin__filters--tab">
        <Input.Search allowClear placeholder="搜索操作人或动作" value={keyword} onChange={(event) => setKeyword(event.target.value)} style={{ width: 260 }} />
        <Select allowClear placeholder="执行结果" value={result} onChange={setResult} style={{ width: 150 }} options={Object.entries(auditResultMeta).map(([value, meta]) => ({ value, label: meta.label }))} />
        {isAdmin && <Button disabled>导出审计（生产接入）</Button>}
      </section>
      <section className="cf-ops-admin__table">
        <div className="cf-ops-admin__meta">共 {rows.length} 条只追加审计记录；默认保留 180 天，录屏和原始日志仅提供受控查看。</div>
        {rows.length ? <Table rowKey="id" columns={columns} dataSource={rows} pagination={false} /> : <Empty description="暂无符合条件的审计记录" />}
      </section>
    </>
  )
}

export default OpsOperationalEventsPage
