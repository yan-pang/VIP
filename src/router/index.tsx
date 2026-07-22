import { lazy } from 'react'
import { createHashRouter, Navigate } from 'react-router-dom'
import { Button, Result } from 'antd'

const NavigationLayout = lazy(() => import('../components/layouts/NavigationLayout'))
const WorkbenchPage = lazy(() => import('../views/workbench/WorkbenchPage'))
const ControlPage = lazy(() => import('../views/control/ControlPage'))
const ProjectCatalogPage = lazy(() => import('../views/catalog/ProjectCatalogPage'))
const PlayersListPage = lazy(() => import('../views/players/PlayersListPage'))
const PlayerDetailPage = lazy(() => import('../views/players/PlayerDetailPage'))
const MessagesListPage = lazy(() => import('../views/messages/MessagesListPage'))
const PermissionAgentsPage = lazy(() => import('../views/permission/PermissionAgentsPage'))
const OpsWechatAccountsPage = lazy(() => import('../views/ops-admin/OpsWechatAccountsPage'))
const OpsRpaTasksPage = lazy(() => import('../views/ops-admin/OpsRpaTasksPage'))
const OpsForbiddenWordsPage = lazy(() => import('../views/ops-admin/OpsForbiddenWordsPage'))
const OpsOperationalEventsPage = lazy(() => import('../views/ops-admin/OpsOperationalEventsPage'))

const router = createHashRouter([
  {
    path: '/',
    element: <NavigationLayout />,
    children: [
      {
        index: true,
        element: <Navigate replace to="/workbench" />,
      },
      {
        path: 'workbench',
        element: <WorkbenchPage />,
      },
      {
        path: 'control',
        element: <ControlPage />,
      },
      {
        path: 'catalog',
        element: <ProjectCatalogPage />,
      },
      {
        path: 'players',
        element: <PlayersListPage />,
      },
      {
        path: 'players/:playerId',
        element: <PlayerDetailPage />,
      },
      {
        path: 'messages',
        element: <MessagesListPage />,
      },
      {
        path: 'permission/agents',
        element: <PermissionAgentsPage />,
      },
      {
        path: 'ops-admin/wechat-accounts',
        element: <OpsWechatAccountsPage />,
      },
      {
        path: 'ops-admin/cloud-rpa-resources',
        element: <OpsRpaTasksPage />,
      },
      {
        path: 'ops-admin/forbidden-words',
        element: <OpsForbiddenWordsPage />,
      },
      {
        path: 'ops-admin/operational-events',
        element: <OpsOperationalEventsPage />,
      },
      {
        path: 'ops-admin/rpa-tasks',
        element: <Navigate replace to="/ops-admin/cloud-rpa-resources" />,
      },
      {
        path: '*',
        element: <Result status="404" title="页面不存在" subTitle="请检查链接，或返回工作台继续接待。" extra={<Button type="primary" href="#/workbench">返回工作台</Button>} />,
      },
    ],
  },
])

export default router
