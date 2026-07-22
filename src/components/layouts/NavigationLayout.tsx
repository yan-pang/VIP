import { BellOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Badge, Button, Dropdown, Empty, List, Popover, Result, Tag, Tooltip } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { wechatAccounts } from '../../services/chatflowMock'
import {
  getMockIdentityOptions,
  logoutMockIdentity,
  roleMeta,
  switchMockIdentity,
  usePermissionSession,
} from '../../services/permissionMock'
import { listOpsRiskAlerts, useOpsAdminRevision } from '../../services/opsAdminMock'
import { useWorkbenchRuntime } from '../../services/workbenchRuntimeMock'
import SearchPanel from '../common/SearchPanel'
import '../../styles/NavigationLayout.scss'

export interface ShellOutletContext {
  openSearch: () => void
}

const tabs: Array<{ key: string; label: string; path: string }> = [
  { key: 'workbench', label: '工作台', path: '/workbench' },
  { key: 'control', label: '控制台', path: '/control' },
  { key: 'players', label: '玩家管理', path: '/players' },
  { key: 'messages', label: '消息管理', path: '/messages' },
  { key: 'ops-admin', label: '运营管理', path: '/ops-admin/wechat-accounts' },
  { key: 'permission', label: '权限管理', path: '/permission/agents' },
]

function NavigationLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const session = usePermissionSession()
  const [searchOpen, setSearchOpen] = useState(false)

  const visibleTabs = useMemo(
    () =>
      tabs.filter((tab) => {
        if (tab.key === 'control') return session.canOpenControl
        if (tab.key === 'ops-admin') return session.canViewOps
        if (tab.key === 'permission') return session.canViewRoleDefinitions
        return true
      }),
    [session.canOpenControl, session.canViewOps, session.canViewRoleDefinitions],
  )

  const activeKey = location.pathname.startsWith('/control')
    ? 'control'
    : location.pathname.startsWith('/players')
      ? 'players'
        : location.pathname.startsWith('/messages')
          ? 'messages'
          : location.pathname.startsWith('/ops-admin')
            ? 'ops-admin'
          : location.pathname.startsWith('/permission')
          ? 'permission'
        : 'workbench'

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((v) => !v)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault()
        if (session.canOpenControl) navigate(activeKey === 'workbench' ? '/control' : '/workbench')
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeKey, navigate, searchOpen, session.canOpenControl])

  const identityOptions = getMockIdentityOptions()

  if (!session.authenticated) {
    return (
      <div className="cf-shell">
        <Result
          status="info"
          title="已退出 ChatFlow"
          subTitle="Mock 环境请选择一个有效身份重新登录。"
          extra={identityOptions.map((item) => (
            <Button key={item.id} type={item.id === 'agent_admin' ? 'primary' : 'default'} onClick={() => { switchMockIdentity(item.id); navigate('/workbench') }}>
              {item.name} · {item.role}
            </Button>
          ))}
        />
      </div>
    )
  }

  return (
    <div className="cf-shell">
      <header className="cf-topbar">
        <div className="cf-topbar__left">
          <span className="cf-topbar__logo">ChatFlow</span>
          <nav className="cf-topbar__tabs">
            {visibleTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`cf-topbar__tab ${activeKey === tab.key ? 'is-active' : ''}`}
                onClick={() =>
                  navigate(
                    tab.key === 'ops-admin' && !session.canManageOps
                      ? '/ops-admin/operational-events'
                      : tab.path,
                  )
                }
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="cf-topbar__right">
          <Tooltip title="综合搜索 ⌘K">
            <Button
              type="text"
              icon={<SearchOutlined />}
              className="cf-topbar__icon-btn"
              onClick={() => setSearchOpen(true)}
            />
          </Tooltip>
          <NotificationBell
            canOpenControl={session.canOpenControl}
            visibleAccountIds={session.visibleAccountIds}
            onJumpToControl={(focusId) => navigate(`/control?focus=${focusId}`)}
            onJumpToWorkbench={(accountId) => navigate(`/workbench?accountId=${accountId}`)}
          />
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'mock-identity-label',
                  type: 'group',
                  label: 'Mock 当前身份',
                  children: identityOptions.map((item) => ({
                    key: `identity:${item.id}`,
                    label: `${item.name} · ${item.role}`,
                  })),
                },
                { type: 'divider' },
                { key: 'logout', label: '退出登录', danger: true },
              ],
              onClick: ({ key }) => {
                if (key.startsWith('identity:')) {
                  switchMockIdentity(key.replace('identity:', ''))
                  navigate('/workbench')
                } else if (key === 'logout') {
                  logoutMockIdentity()
                }
              },
            }}
            placement="bottomRight"
          >
            <button type="button" className="cf-topbar__user">
              <Avatar size={28} icon={<UserOutlined />} style={{ background: '#07C160' }} />
              <span className="cf-topbar__user-name">
                {session.agent.name} · {roleMeta[session.agent.roleId].label}
              </span>
            </button>
          </Dropdown>
        </div>
      </header>

      <main className="cf-main">
        <Outlet
          context={{ openSearch: () => setSearchOpen(true) } satisfies ShellOutletContext}
        />
      </main>

      <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}

function NotificationBell({
  canOpenControl,
  visibleAccountIds,
  onJumpToControl,
  onJumpToWorkbench,
}: {
  canOpenControl: boolean
  visibleAccountIds: string[]
  onJumpToControl: (focusId: string) => void
  onJumpToWorkbench: (accountId: string) => void
}) {
  const runtime = useWorkbenchRuntime()
  const opsRevision = useOpsAdminRevision()
  const alerts = useMemo(
    () => {
      void opsRevision
      const accountAlerts = wechatAccounts
        .filter((a) => a.enabled && visibleAccountIds.includes(a.id) && a.status !== 'online')
        .map((a) => ({
          id: `account:${a.id}`,
          accountId: a.id,
          title: a.shortName,
          content:
            a.status === 'banned'
              ? '该号已被封禁,需要管理员处理'
              : '该号已掉线,请重新登录',
          severity: a.status === 'banned' ? ('error' as const) : ('warning' as const),
          target: 'control' as const,
        }))
      const riskAlerts = listOpsRiskAlerts()
        .filter((alert) => alert.status !== 'resolved' && (!alert.accountId || visibleAccountIds.includes(alert.accountId)))
        .map((alert) => ({
          id: `risk:${alert.id}`,
          accountId: alert.accountId,
          title: alert.title,
          content: alert.detail,
          severity: alert.severity === 'high' ? ('error' as const) : ('warning' as const),
          target: 'control' as const,
        }))
      const unreadAlerts = wechatAccounts
        .filter((account) => visibleAccountIds.includes(account.id))
        .map((account) => ({
          account,
          unread: runtime.conversations
            .filter((conversation) => !conversation.isProvisional && conversation.accountId === account.id)
            .reduce((sum, conversation) => sum + conversation.unreadCount, 0),
        }))
        .filter((item) => item.unread > 0)
        .map(({ account, unread }) => ({
          id: `unread:${account.id}`,
          accountId: account.id,
          title: `${account.shortName} 有 ${unread} 条未读消息`,
          content: '进入工作台查看未读会话。',
          severity: 'info' as const,
          target: 'workbench' as const,
        }))
      return [...accountAlerts, ...riskAlerts, ...unreadAlerts]
    },
    [opsRevision, runtime.conversations, visibleAccountIds],
  )

  const content = (
    <div style={{ width: 320 }}>
      {alerts.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无告警" />
      ) : (
        <List
          size="small"
          dataSource={alerts}
          renderItem={(item) => (
            <List.Item
              actions={
                item.accountId && (item.target === 'workbench' || canOpenControl)
                  ? [
                      <Button
                        key="goto"
                        type="link"
                        size="small"
                        onClick={() => item.target === 'workbench' ? onJumpToWorkbench(item.accountId!) : onJumpToControl(item.accountId!)}
                      >
                        前往
                      </Button>,
                    ]
                  : []
              }
            >
              <List.Item.Meta
                title={
                  <span>
                    {item.title}{' '}
                    <Tag color={item.severity === 'error' ? 'red' : item.severity === 'warning' ? 'orange' : 'blue'}>
                      {item.target === 'workbench' ? '未读' : '告警'}
                    </Tag>
                  </span>
                }
                description={item.content}
              />
            </List.Item>
          )}
        />
      )}
    </div>
  )

  return (
    <Popover content={content} title="通知中心" trigger="click" placement="bottomRight">
      <Tooltip title="通知">
        <Badge count={alerts.length} size="small" offset={[-4, 4]}>
          <Button type="text" icon={<BellOutlined />} className="cf-topbar__icon-btn" />
        </Badge>
      </Tooltip>
    </Popover>
  )
}

export default NavigationLayout
