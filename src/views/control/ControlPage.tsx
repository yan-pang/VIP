import {
  CheckCircleFilled,
  DeleteOutlined,
  PlusOutlined,
  PoweroffOutlined,
  ScanOutlined,
} from '@ant-design/icons'
import { Avatar, Badge, Button, Dropdown, Empty, Modal, Space, message as antMessage } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { wechatAccounts } from '../../services/chatflowMock'
import { avatarColor } from '../../services/avatarColor'
import type { WechatAccount, WechatAccountStatus } from '../../types/chat'
import '../../styles/Control.scss'

type ViewportMode = 'monitor' | 'scanning' | 'success'

const statusLabel: Record<WechatAccountStatus, string> = {
  online: '在线',
  offline: '离线',
  banned: '封禁中',
}

const statusColor: Record<WechatAccountStatus, string> = {
  online: '#52C41A',
  offline: '#8C8C8C',
  banned: '#FF4D4F',
}

function ControlPage() {
  const [searchParams] = useSearchParams()
  const focusId = searchParams.get('focus')

  const [accounts, setAccounts] = useState<WechatAccount[]>(wechatAccounts)
  const [viewMode, setViewMode] = useState<ViewportMode>('monitor')

  const defaultId = useMemo(() => {
    if (focusId && accounts.find((a) => a.id === focusId)) return focusId
    return accounts.find((a) => a.status === 'online')?.id ?? accounts[0]?.id
  }, [focusId, accounts])

  const [selectedId, setSelectedId] = useState<string | null>(defaultId ?? null)

  useEffect(() => {
    if (focusId) setSelectedId(focusId)
  }, [focusId])

  const selected = accounts.find((a) => a.id === selectedId) ?? null

  const handleAddAccount = () => {
    setViewMode('scanning')
  }

  const handleScanComplete = () => {
    setViewMode('success')
    const newId = `wx_${Date.now()}`
    const newAccount: WechatAccount = {
      id: newId,
      shortName: `新号${accounts.length + 1}`,
      status: 'online',
      unreadCount: 0,
      lastActiveAt: new Date().toISOString(),
      desktopId: `desk_${Math.floor(Math.random() * 9000) + 1000}`,
    }
    setAccounts((prev) => [...prev, newAccount])
    setSelectedId(newId)
    antMessage.success(`登录成功:${newAccount.shortName}`)
    window.setTimeout(() => setViewMode('monitor'), 1500)
  }

  const handleRelogin = (id?: string) => {
    const target = id ? accounts.find((a) => a.id === id) : selected
    if (!target) return
    if (target.id !== selectedId) setSelectedId(target.id)
    setViewMode('scanning')
    antMessage.info(`正在为 ${target.shortName} 重新登录...`)
  }

  const handleRestart = () => {
    if (!selected) return
    Modal.confirm({
      title: '重启企微号',
      content: `确认重启 ${selected.shortName} 的云桌面与企微客户端?重启期间该号无法收发消息(约 30 秒)。`,
      okText: '确认重启',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        antMessage.info(`正在重启 ${selected.shortName}...`)
      },
    })
  }

  const handleDelete = (id: string) => {
    const target = accounts.find((a) => a.id === id)
    if (!target) return
    Modal.confirm({
      title: '删除企微号',
      content: `确认从 ChatFlow 中删除 ${target.shortName}?将解绑云桌面与所有授权关系,该号下的会话历史保留但客服无法继续接待。该操作不可撤销。`,
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        setAccounts((prev) => prev.filter((a) => a.id !== id))
        if (selectedId === id) {
          const remaining = accounts.filter((a) => a.id !== id)
          setSelectedId(remaining[0]?.id ?? null)
        }
        antMessage.success(`已删除 ${target.shortName}`)
      },
    })
  }

  return (
    <div className="cf-control">
      <div className="cf-control__body">
        <aside className="cf-control__left">
          <div className="cf-control__list">
            {accounts.map((a) => (
              <Dropdown
                key={a.id}
                trigger={['contextMenu']}
                menu={{
                  items: [
                    { key: 'relogin', label: '重新登录', onClick: () => handleRelogin(a.id) },
                    { type: 'divider' },
                    {
                      key: 'delete',
                      label: '删除号',
                      danger: true,
                      onClick: () => handleDelete(a.id),
                    },
                  ],
                }}
              >
                <button
                  type="button"
                  className={`cf-control__card ${a.id === selectedId ? 'is-selected' : ''}`}
                  onClick={() => {
                    setSelectedId(a.id)
                    setViewMode('monitor')
                  }}
                >
                  <Badge dot color={statusColor[a.status]} offset={[-4, 32]}>
                    <Avatar size={36} style={{ background: avatarColor(a.id), fontSize: 14 }}>
                      {a.shortName.slice(0, 1)}
                    </Avatar>
                  </Badge>
                  <div className="cf-control__card-body">
                    <div className="cf-control__card-name">{a.shortName}</div>
                    <div className="cf-control__card-meta">
                      <span style={{ color: statusColor[a.status] }}>{statusLabel[a.status]}</span>
                    </div>
                  </div>
                </button>
              </Dropdown>
            ))}
          </div>
          <div className="cf-control__add">
            <Button block type="primary" icon={<PlusOutlined />} onClick={handleAddAccount}>
              添加号
            </Button>
          </div>
        </aside>

        <section className="cf-control__main">
          {selected || viewMode === 'scanning' ? (
            <>
              <div className="cf-control__viewport">
                {viewMode === 'monitor' && selected && <MonitorView account={selected} />}
                {viewMode === 'scanning' && (
                  <ScanningView onComplete={handleScanComplete} />
                )}
                {viewMode === 'success' && <SuccessView />}
              </div>
              <footer className="cf-control__controls">
                <Space size="small">
                  <Button icon={<PoweroffOutlined />} onClick={handleRestart} disabled={!selected}>
                    重启
                  </Button>
                  <Button icon={<ScanOutlined />} onClick={() => handleRelogin()} disabled={!selected}>
                    重新登录
                  </Button>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => selected && handleDelete(selected.id)}
                    disabled={!selected}
                  >
                    删除号
                  </Button>
                </Space>
              </footer>
            </>
          ) : (
            <div className="cf-control__empty">
              <Empty description="选择左侧企微号或添加新号" />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function MonitorView({ account }: { account: WechatAccount }) {
  return (
    <div className="cf-control__placeholder">
      <div className="cf-control__rec">● 录制中</div>
      <div className="cf-control__placeholder-text">
        <strong>云桌面投屏(Mock)</strong>
        <p>
          该区域真实环境会显示无影云远程桌面的视频流,客服可在此扫码登录、
          手动撤回消息、人工介入失败发送。
        </p>
        <p>
          当前选中:{account.shortName} / desktop {account.desktopId}
        </p>
      </div>
    </div>
  )
}

function ScanningView({ onComplete }: { onComplete: () => void }) {
  const [seconds, setSeconds] = useState(5)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          window.clearInterval(timer)
          window.setTimeout(onComplete, 100)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [onComplete])

  return (
    <div className="cf-control__placeholder">
      <div className="cf-control__rec">● 录制中</div>
      <div className="cf-control__qr">
        <div className="cf-control__qr-grid" />
        <div className="cf-control__qr-label">企业微信</div>
      </div>
      <div className="cf-control__placeholder-text">
        <strong>请用手机企业微信扫描屏幕中的二维码</strong>
        <p className="cf-text-tertiary">
          模拟扫码 {seconds}s 后自动完成,可点
          <Button type="link" onClick={onComplete}>立即模拟扫码成功</Button>
        </p>
      </div>
    </div>
  )
}

function SuccessView() {
  return (
    <div className="cf-control__placeholder">
      <CheckCircleFilled style={{ fontSize: 64, color: '#07C160' }} />
      <div className="cf-control__placeholder-text">
        <strong>登录成功</strong>
        <p>正在加载云桌面...</p>
      </div>
    </div>
  )
}

export default ControlPage
