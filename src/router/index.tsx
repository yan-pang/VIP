import { lazy } from 'react'
import { createHashRouter, Navigate } from 'react-router-dom'

const NavigationLayout = lazy(() => import('../components/layouts/NavigationLayout'))
const ProjectCatalogPage = lazy(() => import('../views/catalog/ProjectCatalogPage'))

const router = createHashRouter([
  {
    path: '/',
    element: <NavigationLayout />,
    children: [
      {
        index: true,
        element: <Navigate replace to="/catalog" />,
      },
      {
        path: 'catalog',
        element: <ProjectCatalogPage />,
      },
    ],
  },
])

export default router
