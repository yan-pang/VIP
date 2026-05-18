import { Suspense } from 'react'
import { App as AntdApp, ConfigProvider, Spin } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { RouterProvider } from 'react-router-dom'
import router from './router'

function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#07C160',
          colorInfo: '#1677FF',
          colorLink: '#1677FF',
          colorSuccess: '#52C41A',
          colorWarning: '#FAAD14',
          colorError: '#FF4D4F',
          colorTextBase: '#262626',
          colorBgLayout: '#F5F5F5',
          borderRadius: 6,
          fontSize: 13,
          fontFamily:
            'PingFang SC, Microsoft YaHei, system-ui, -apple-system, sans-serif',
          controlHeight: 32,
          lineHeight: 1.5,
        },
        components: {
          Tabs: {
            horizontalItemPadding: '8px 16px',
          },
          Table: {
            cellPaddingBlock: 8,
            cellPaddingInline: 12,
          },
        },
      }}
    >
      <AntdApp>
        <div id="app">
          <Suspense
            fallback={
              <div className="app-loading">
                <Spin size="large" />
              </div>
            }
          >
            <RouterProvider router={router} />
          </Suspense>
        </div>
      </AntdApp>
    </ConfigProvider>
  )
}

export default App
