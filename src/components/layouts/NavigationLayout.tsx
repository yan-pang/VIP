import { BellOutlined, SearchOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Badge, Button, Dropdown, Empty, List, Popover, Tag, Tooltip } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { findAgent, currentAgentId, wechatAccounts } from '../../services/chatflowMock'
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
]

function NavigationLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const me = findAgent(currentAgentId)
  const [searchOpen, setSearchOpen] = useState(false)

  const activeKey = location.pathname.startsWith('/control')
    ? 'control'
    : location.pathname.startsWith('/players')
      ? 'players'
      : location.pathname.startsWith('/messages')
        ? 'messages'
        : 'workbench'

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((v) => !v)
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault()
        navigate(activeKey === 'workbench' ? '/control' : '/workbench')
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeKey, navigate, searchOpen])

  return (
    <div className="cf-shell">
      <header className="cf-topbar">
        <div className="cf-topbar__left">
          <span className="cf-topbar__logo">ChatFlow</span>
          <nav className="cf-topbar__tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`cf-topbar__tab ${activeKey === tab.key ? 'is-active' : ''}`}
                onClick={() => navigate(tab.path)}
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
          <NotificationBell onJumpToControl={(focusId) => navigate(`/control?focus=${focusId}`)} />
          <Dropdown
            menu={{
              items: [
                { key: 'profile', label: '个人偏好' },
                { type: 'divider' },
                { key: 'logout', label: '退出登录', danger: true },
              ],
            }}
            placement="bottomRight"
          >
            <button type="button" className="cf-topbar__user">
              <Avatar size={28} icon={<UserOutlined />} style={{ background: '#07C160' }} />
              <span className="cf-topbar__user-name">{me?.name ?? '客服'}</span>
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

function NotificationBell({ onJumpToControl }: { onJumpToControl: (focusId: string) => void }) {
  const alerts = useMemo(
    () =>
      wechatAccounts
        .filter((a) => a.status !== 'online')
        .map((a) => ({
          id: a.id,
          title: a.shortName,
          content:
            a.status === 'banned'
              ? '该号已被封禁,需要管理员处理'
              : '该号已掉线,请重新登录',
          severity: a.status === 'banned' ? ('error' as const) : ('warning' as const),
        })),
    [],
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
              actions={[
                <Button
                  key="goto"
                  type="link"
                  size="small"
                  onClick={() => onJumpToControl(item.id)}
                >
                  前往
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <span>
                    {item.title}{' '}
                    <Tag color={item.severity === 'error' ? 'red' : 'orange'}>
                      {item.severity === 'error' ? '封禁' : '掉线'}
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
