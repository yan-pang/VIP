import { lazy } from 'react'
import { createHashRouter, Navigate } from 'react-router-dom'

const NavigationLayout = lazy(() => import('../components/layouts/NavigationLayout'))
const WorkbenchPage = lazy(() => import('../views/workbench/WorkbenchPage'))
const ControlPage = lazy(() => import('../views/control/ControlPage'))
const ProjectCatalogPage = lazy(() => import('../views/catalog/ProjectCatalogPage'))
const PlayersListPage = lazy(() => import('../views/players/PlayersListPage'))
const PlayerDetailPage = lazy(() => import('../views/players/PlayerDetailPage'))
const MessagesListPage = lazy(() => import('../views/messages/MessagesListPage'))

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
    ],
  },
])

export default router
