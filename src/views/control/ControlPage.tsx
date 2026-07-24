import {
  CheckCircleFilled,
  CloudServerOutlined,
  EyeOutlined,
  LoginOutlined,
  PoweroffOutlined,
  ScanOutlined,
} from '@ant-design/icons'
import { App as AntdApp, Avatar, Badge, Button, Empty, Result, Space, Tag } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { wechatAccounts } from '../../services/chatflowMock'
import { avatarColor } from '../../services/avatarColor'
import { getCurrentOpsActor, usePermissionSession } from '../../services/permissionMock'
import {
  exitDesktopProjection,
  getCloudRpaResourceForAccount,
  markOpsWechatAccountOffline,
  markOpsWechatAccountOnline,
  openDesktopProjection,
  startManualTakeover,
  useOpsAdminRevision,
  useProjectionSession,
} from '../../services/opsAdminMock'
import type { WechatAccount, WechatAccountStatus } from '../../types/chat'
import '../../styles/Control.scss'

type ScreenState = 'idle' | 'scanning' | 'success' | 'restarting'
type ScanIntent = { accountId: string } | null

const statusLabel: Record<WechatAccountStatus, string> = {
  online: '在线',
  offline: '离线',
  disabled: '停用',
  banned: '封禁中',
}

const statusColor: Record<WechatAccountStatus, string> = {
  online: '#52C41A',
  offline: '#8C8C8C',
  disabled: '#8C8C8C',
  banned: '#FF4D4F',
}

function ControlPage() {
  const { message, modal } = AntdApp.useApp()
  const session = usePermissionSession()
  const actor = getCurrentOpsActor()
  const opsAdminRevision = useOpsAdminRevision()
  const [searchParams] = useSearchParams()
  const focusId = searchParams.get('focus')
  const [accounts, setAccounts] = useState<WechatAccount[]>(() => wechatAccounts.filter((account) => account.enabled && session.visibleAccountIds.includes(account.id)))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [screenState, setScreenState] = useState<ScreenState>('idle')
  const [scanIntent, setScanIntent] = useState<ScanIntent>(null)
  const scanCompletedRef = useRef(false)

  useEffect(() => {
    setAccounts(wechatAccounts.filter((account) => account.enabled && session.visibleAccountIds.includes(account.id)))
  }, [opsAdminRevision, session.visibleAccountIds])

  useEffect(() => {
    if (focusId && accounts.some((account) => account.id === focusId)) {
      setSelectedId(focusId)
      return
    }
    if (focusId) {
      setSelectedId(null)
      return
    }
    setSelectedId((current) => current && accounts.some((account) => account.id === current) ? current : accounts[0]?.id ?? null)
  }, [focusId, accounts])

  const selected = accounts.find((account) => account.id === selectedId) ?? null
  const projection = useProjectionSession(selected?.desktopId)
  const resource = getCloudRpaResourceForAccount(selected?.id)
  const isTakeover = projection.isOwner && projection.session?.mode === 'takeover'
  const hasProjection = projection.isOwner && projection.state === 'active'

  const showError = useCallback(
    (error: unknown, fallback: string) => message.error(error instanceof Error ? error.message : fallback),
    [message],
  )

  const handleOpenProjection = (account = selected) => {
    if (!account) return
    try {
      openDesktopProjection(account.id, actor)
      setScreenState('idle')
      message.success('已打开云桌面投屏（只读）；新浏览器连接同一云电脑会自动接管投屏')
    } catch (error) {
      showError(error, '打开云桌面失败')
    }
  }

  const handleStartTakeover = (account = selected) => {
    if (!account) return false
    if (!session.canOperateControl) {
      message.warning('当前身份无权操作控制台')
      return false
    }
    try {
      startManualTakeover(account.id, actor)
      message.success('已进入人工接管，可以直接操作云桌面中的企微')
      return true
    } catch (error) {
      showError(error, '开始人工接管失败')
      return false
    }
  }

  const requireTakeover = (action: string) => {
    if (!session.canOperateControl) {
      message.warning(`当前身份无权${action}`)
      return false
    }
    if (!selected || !isTakeover) {
      message.warning(`请先将机器人下线，并在当前云桌面开始人工接管后再${action}`)
      return false
    }
    return true
  }

  const handleScanComplete = useCallback(() => {
    if (scanCompletedRef.current || screenState !== 'scanning' || !scanIntent) return
    scanCompletedRef.current = true
    const target = accounts.find((account) => account.id === scanIntent.accountId)
    try {
      markOpsWechatAccountOnline(scanIntent.accountId, actor)
      setScreenState('success')
      message.success(`${target?.shortName ?? '企微号'} 已模拟登录企微`)
      window.setTimeout(() => {
        setScreenState('idle')
        setScanIntent(null)
      }, 1500)
    } catch (error) {
      showError(error, '登录状态更新失败')
      setScreenState('idle')
      setScanIntent(null)
    }
  }, [accounts, actor, message, scanIntent, screenState, showError])

  const beginScan = (account: WechatAccount) => {
    scanCompletedRef.current = false
    setSelectedId(account.id)
    setScanIntent({ accountId: account.id })
    setScreenState('scanning')
  }

  const handleSimulateLogin = () => {
    if (!selected || !requireTakeover('模拟登录企微')) return
    if (selected.status === 'banned') {
      message.warning('该企微号已封禁，暂不能在控制台登录，请先完成风控处置')
      return
    }
    beginScan(selected)
  }

  const handleSimulateLogout = () => {
    if (!selected || !requireTakeover('模拟退出企微')) return
    modal.confirm({
      title: '模拟退出企业微信',
      content: `确认模拟在 ${selected.shortName} 的云桌面中退出企业微信？该操作只会将企微在线状态改为离线，不影响投屏、RPA 或资源绑定。`,
      okText: '确认退出',
      cancelText: '取消',
      onOk: () => {
        try {
          markOpsWechatAccountOffline(selected.id, actor)
          message.success(`${selected.shortName} 已模拟退出企微，状态已更新为离线`)
        } catch (error) {
          showError(error, '模拟退出企微失败')
        }
      },
    })
  }

  const handleRestart = () => {
    if (!selected || !requireTakeover('重启')) return
    modal.confirm({
      title: '重启企微客户端',
      content: `确认重启 ${selected.shortName} 的企微客户端？重启期间该号无法收发消息（约 30 秒）。`,
      okText: '确认重启',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        try {
          markOpsWechatAccountOffline(selected.id, actor)
          setScreenState('restarting')
          message.info(`正在重启 ${selected.shortName}...`)
          window.setTimeout(() => {
            try {
              markOpsWechatAccountOnline(selected.id, actor)
              message.success(`${selected.shortName} 已完成重启并恢复在线`)
            } catch (error) {
              showError(error, '重启后恢复登录失败')
            } finally {
              setScreenState('idle')
            }
          }, 3_000)
        } catch (error) {
          showError(error, '启动重启失败')
        }
      },
    })
  }

  const handleCloseProjection = () => {
    if (!session.canOperateControl || !selected?.desktopId) return
    try {
      exitDesktopProjection(selected.desktopId, actor)
      setScreenState('idle')
      setScanIntent(null)
      message.success('已关闭当前浏览器投屏；左侧企微号、企微登录状态与 RPA 状态均保持不变')
    } catch (error) {
      showError(error, '关闭投屏失败')
    }
  }

  if (!session.canOpenControl) {
    return <div className="cf-control__empty"><Result status="403" title="无权限访问控制台" subTitle="客服不能打开云桌面。需要人工介入时请联系运营主管或系统管理员。" /></div>
  }

  if (!accounts.length) {
    return <div className="cf-control__empty"><Empty description="暂无可监控企微号，请联系系统管理员配置数据权限与企微接入。" /></div>
  }

  if (focusId && !accounts.some((account) => account.id === focusId)) {
    const exists = wechatAccounts.some((account) => account.id === focusId)
    return <div className="cf-control__empty"><Result status={exists ? '403' : '404'} title={exists ? '无权访问该企微号' : '企微号不存在'} subTitle="链接中的 focus 参数无效，系统不会自动切换到其他账号。" /></div>
  }

  return (
    <div className="cf-control">
      <div className="cf-control__body">
        <aside className="cf-control__left">
          <div className="cf-control__list">
            {accounts.map((account) => (
              <ControlAccountCard key={account.id} account={account} status={account.status} selected={account.id === selectedId} disabled={screenState !== 'idle'} onSelect={() => { setSelectedId(account.id); setScreenState('idle') }} />
            ))}
          </div>
        </aside>

        <section className="cf-control__main">
          <div className="cf-control__viewport">
            {selected && screenState === 'scanning' && <ScanningView onComplete={handleScanComplete} />}
            {selected && screenState === 'success' && <SuccessView />}
            {selected && screenState === 'restarting' && <div className="cf-control__placeholder"><PoweroffOutlined style={{ fontSize: 48, color: '#1677ff' }} /><div className="cf-control__placeholder-text"><strong>企微客户端正在重启</strong><p>重启完成前该账号保持离线，消息会进入待发队列。</p></div></div>}
            {selected && screenState === 'idle' && projection.state === 'evicted' && <ProjectionEvicted onReconnect={() => handleOpenProjection(selected)} />}
            {selected && screenState === 'idle' && !hasProjection && projection.state !== 'evicted' && <ProjectionIdle account={selected} resourceStatus={resource?.rpaStatus} onOpen={() => handleOpenProjection(selected)} />}
            {selected && screenState === 'idle' && hasProjection && <MonitorView account={selected} mode={projection.session?.mode ?? 'observe'} resourceStatus={resource?.rpaStatus} />}
          </div>
          <footer className="cf-control__controls">
            <div className="cf-control__controls-status">
              {hasProjection ? <Tag color={isTakeover ? 'green' : 'gold'}>{isTakeover ? '人工接管中' : '只读监控中'}</Tag> : <span>未打开投屏</span>}
              {resource && <span>RPA：{resource.rpaStatus === 'running' ? '运行中' : resource.rpaStatus === 'offline' ? '已下线' : '故障'}</span>}
            </div>
            <Space size="small">
              {hasProjection && !isTakeover && session.canOperateControl && <Button type="primary" icon={<LoginOutlined />} onClick={() => handleStartTakeover(selected)} disabled={resource?.rpaStatus !== 'offline'}>开始人工接管</Button>}
              {isTakeover && session.canOperateControl && <Button icon={<PoweroffOutlined />} onClick={handleRestart} disabled={screenState !== 'idle'}>重启</Button>}
              {isTakeover && session.canOperateControl && selected?.status === 'offline' && <Button icon={<ScanOutlined />} onClick={handleSimulateLogin} disabled={screenState !== 'idle'}>模拟登录企微</Button>}
              {isTakeover && session.canOperateControl && selected?.status === 'online' && <Button danger onClick={handleSimulateLogout} disabled={screenState !== 'idle'}>模拟退出企微</Button>}
              {hasProjection && session.canOperateControl && <Button danger onClick={handleCloseProjection} disabled={screenState !== 'idle'}>关闭投屏</Button>}
            </Space>
          </footer>
        </section>
      </div>
    </div>
  )
}

function ControlAccountCard({ account, status, selected, disabled, onSelect }: { account: WechatAccount; status: WechatAccountStatus; selected: boolean; disabled: boolean; onSelect: () => void }) {
  return <button type="button" className={`cf-control__card ${selected ? 'is-selected' : ''}`} disabled={disabled} onClick={onSelect}>
    <Badge dot color={statusColor[status]} offset={[-4, 32]}><Avatar size={36} style={{ background: avatarColor(account.id), fontSize: 14 }}>{account.shortName.slice(0, 1)}</Avatar></Badge>
    <div className="cf-control__card-body"><div className="cf-control__card-name">{account.shortName}</div><div className="cf-control__card-meta"><span style={{ color: statusColor[status] }}>{statusLabel[status]}</span></div></div>
  </button>
}

function ProjectionIdle({ account, resourceStatus, onOpen }: { account: WechatAccount; resourceStatus?: string; onOpen: () => void }) {
  return <div className="cf-control__placeholder"><CloudServerOutlined style={{ fontSize: 48, color: '#8c8c8c' }} /><div className="cf-control__placeholder-text"><strong>尚未打开投屏</strong><p>{account.shortName} 的企微登录状态与投屏会话相互独立。可先以只读方式打开云桌面投屏。</p><p className="cf-text-tertiary">当前 RPA：{resourceStatus === 'running' ? '运行中，仅允许只读监控' : resourceStatus === 'offline' ? '已下线，可在监控后进入人工接管' : '故障，请前往资源管理处理'}</p><Button type="primary" icon={<EyeOutlined />} onClick={onOpen}>打开投屏（只读）</Button></div></div>
}

function ProjectionEvicted({ onReconnect }: { onReconnect: () => void }) {
  return <div className="cf-control__placeholder cf-control__placeholder--evicted"><CloudServerOutlined style={{ fontSize: 48, color: '#faad14' }} /><div className="cf-control__placeholder-text"><strong>云桌面已在另一浏览器打开</strong><p>同一台云电脑一次只能投屏至一个浏览器。当前浏览器已退出画面与输入通道。</p><Button onClick={onReconnect}>在此浏览器重新打开</Button></div></div>
}

function MonitorView({ account, mode, resourceStatus }: { account: WechatAccount; mode: 'observe' | 'takeover'; resourceStatus?: string }) {
  const readOnly = mode === 'observe'
  return <div className="cf-control__placeholder"><div className="cf-control__rec">● 云桌面连接中</div><div className="cf-control__placeholder-text"><strong>云桌面投屏（Mock）</strong><p>当前选中：{account.shortName} / desktop {account.desktopId}</p><p>{readOnly ? '当前为只读监控。RPA 运行时不能向云桌面输入操作。' : '当前为人工接管，可直接操作云桌面中的企业微信。'}</p><p className="cf-text-tertiary">RPA 状态：{resourceStatus === 'running' ? '运行中' : resourceStatus === 'offline' ? '已下线' : '故障'}；企微是否登录不受投屏打开、挤出或退出影响。</p></div></div>
}

function ScanningView({ onComplete }: { onComplete: () => void }) {
  const [seconds, setSeconds] = useState(5)
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => {
      if (value <= 1) { window.clearInterval(timer); window.setTimeout(onComplete, 100); return 0 }
      return value - 1
    }), 1000)
    return () => window.clearInterval(timer)
  }, [onComplete])
  return <div className="cf-control__placeholder"><div className="cf-control__rec">● 人工接管中</div><div className="cf-control__qr"><div className="cf-control__qr-grid" /><div className="cf-control__qr-label">企业微信</div></div><div className="cf-control__placeholder-text"><strong>请用手机企业微信扫描屏幕中的二维码</strong><p className="cf-text-tertiary">模拟扫码 {seconds}s 后自动完成，可点 <Button type="link" onClick={onComplete}>立即模拟扫码成功</Button></p></div></div>
}

function SuccessView() {
  return <div className="cf-control__placeholder"><CheckCircleFilled style={{ fontSize: 64, color: '#07C160' }} /><div className="cf-control__placeholder-text"><strong>模拟登录成功</strong><p>企微在线状态已更新；投屏与 RPA 状态保持不变。</p></div></div>
}

export default ControlPage
