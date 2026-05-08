import { AppstoreOutlined } from '@ant-design/icons'
import type { ReactNode } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import '../../styles/NavigationLayout.scss'

interface MenuItem {
  label: string
  path: string
  icon: ReactNode
  note: string
}

const menuItems: MenuItem[] = [
  {
    label: '项目目录',
    path: '/catalog',
    icon: <AppstoreOutlined />,
    note: '通用列表示例页',
  },
]

function NavigationLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="starter-layout">
      <header className="starter-layout__header">
        <div>
          <p className="starter-layout__eyebrow">可复用原型基线</p>
          <h1 className="starter-layout__brand">VIP Starter</h1>
        </div>
        <div className="starter-layout__meta">
          <span>中文优先长期模板</span>
          <span>默认直接对话触发 guide-agent</span>
        </div>
      </header>

      <div className="starter-layout__body">
        <aside className="starter-layout__sidebar">
          <div className="starter-layout__sidebar-title">示例页面</div>
          {menuItems.map((item) => {
            const active = location.pathname === item.path

            return (
              <button
                key={item.path}
                className={`starter-layout__nav-item ${active ? 'is-active' : ''}`}
                type="button"
                onClick={() => navigate(item.path)}
              >
                <span className="starter-layout__nav-icon">{item.icon}</span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.note}</small>
                </span>
              </button>
            )
          })}
        </aside>

        <main className="starter-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default NavigationLayout
