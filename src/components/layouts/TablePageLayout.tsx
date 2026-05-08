import type { ReactNode } from 'react'
import ActionButton from '../common/ActionButton'
import DataTable from '../common/DataTable'
import Pagination from '../common/Pagination'
import SearchBar from '../common/SearchBar'
import type { ActionButton as ActionButtonType, SearchItem, TableColumn } from '../../types'

interface TablePageLayoutProps<Row extends object> {
  title: string
  description?: ReactNode
  searchItems?: SearchItem[]
  initialFormData?: Record<string, any>
  onSearch?: (formData: Record<string, any>) => void
  onReset?: () => void
  actionButtons?: ActionButtonType<Row>[]
  onAction?: (action: string) => void
  tableData: Row[]
  tableColumns: TableColumn<Row>[]
  tableActions?: ActionButtonType<Row>[]
  onTableAction?: (action: string, row: Row) => void
  loading?: boolean
  total: number
  current: number
  pageSize: number
  onPagination: (page: number, size: number) => void
  children?: ReactNode
}

function TablePageLayout<Row extends object>({
  title,
  description,
  searchItems = [],
  initialFormData = {},
  onSearch,
  onReset,
  actionButtons = [],
  onAction,
  tableData,
  tableColumns,
  tableActions = [],
  onTableAction,
  loading = false,
  total,
  current,
  pageSize,
  onPagination,
  children,
}: TablePageLayoutProps<Row>) {
  return (
    <section className="page-shell">
      <header className="page-shell__header">
        <div>
          <h1 className="page-shell__title">{title}</h1>
          {description ? <div className="page-shell__description">{description}</div> : null}
        </div>
      </header>

      <div className="page-shell__toolbar">
        {searchItems.length > 0 ? (
          <div className="page-shell__search">
            <SearchBar
              initialFormData={initialFormData}
              searchItems={searchItems}
              onReset={onReset || (() => undefined)}
              onSearch={onSearch || (() => undefined)}
            />
          </div>
        ) : null}

        {actionButtons.length > 0 ? (
          <ActionButton buttons={actionButtons} onAction={onAction || (() => undefined)} />
        ) : null}
      </div>

      <div className="page-shell__table">
        <DataTable
          actions={tableActions}
          columns={tableColumns}
          current={current}
          indexReverse={true}
          loading={loading}
          pageSize={pageSize}
          showAction={tableActions.length > 0}
          tableData={tableData}
          total={total}
          onAction={onTableAction}
        />
        <Pagination current={current} pageSize={pageSize} total={total} onChange={onPagination} />
      </div>

      {children}
    </section>
  )
}

export default TablePageLayout
