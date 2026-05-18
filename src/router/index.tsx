import { lazy } from 'react'
import { createHashRouter, Navigate } from 'react-router-dom'

const NavigationLayout = lazy(() => import('../components/layouts/NavigationLayout'))
const WorkbenchPage = lazy(() => import('../views/workbench/WorkbenchPage'))
const ControlPage = lazy(() => import('../views/control/ControlPage'))
const ProjectCatalogPage = lazy(() => import('../views/catalog/ProjectCatalogPage'))

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
    ],
  },
])

export default router
