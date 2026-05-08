import { Table } from 'antd'
import type { ColumnsType, TableProps } from 'antd/es/table'
import type { ActionButton as ActionButtonType, TableColumn } from '../../types'
import ActionButton from './ActionButton'
import '../../styles/DataTable.scss'

interface DataTableProps<Row extends object> extends Omit<TableProps<Row>, 'columns' | 'dataSource'> {
  tableData: Row[]
  columns: TableColumn<Row>[]
  showAction?: boolean
  actions?: ActionButtonType<Row>[]
  actionWidth?: number | string
  showIndex?: boolean
  total?: number
  current?: number
  pageSize?: number
  indexReverse?: boolean
  onAction?: (action: string, row: Row) => void
}

function DataTable<Row extends object>({
  tableData,
  columns,
  showAction = false,
  actions = [],
  actionWidth = 180,
  showIndex = true,
  total,
  current = 1,
  pageSize = 10,
  indexReverse = false,
  onAction,
  rowKey = 'id',
  ...restProps
}: DataTableProps<Row>) {
  const buildColumns = (source: TableColumn<Row>[]): ColumnsType<Row> => {
    return source.map((column) => {
      const key = String(column.prop)
      return {
        title: column.label,
        dataIndex: key,
        key,
        width: column.width,
        minWidth: column.minWidth,
        fixed: column.fixed,
        sorter: column.sortable,
        ellipsis: true,
        render: column.formatter ? (_value: unknown, record: Row) => column.formatter?.(record, column) : undefined,
        children: column.children ? buildColumns(column.children) : undefined,
      }
    })
  }

  const mergedColumns: ColumnsType<Row> = []

  if (showIndex) {
    mergedColumns.push({
      align: 'center',
      key: '__index__',
      title: '#',
      width: 72,
      render: (_value: unknown, _record: Row, index: number) => {
        if (!indexReverse || !total || total <= 0) {
          return index + 1
        }
        const offset = (Math.max(1, current) - 1) * Math.max(1, pageSize)
        const number = total - (offset + index)
        return number > 0 ? number : index + 1
      },
    })
  }

  mergedColumns.push(...buildColumns(columns))

  if (showAction && actions.length > 0) {
    mergedColumns.push({
      key: '__action__',
      title: '操作',
      width: actionWidth,
      render: (_value: unknown, record: Row) => {
        const resolvedActions = actions.map((action) => ({
          ...action,
          disabled: typeof action.disabled === 'function' ? action.disabled(record) : action.disabled,
          tooltip: typeof action.tooltip === 'function' ? action.tooltip(record) : action.tooltip,
        }))

        return (
          <div className="table-action-buttons">
            <ActionButton
              buttons={resolvedActions}
              isTableAction={true}
              onAction={(actionName) => onAction?.(actionName, record)}
            />
          </div>
        )
      },
    })
  }

  return (
    <div className="data-table">
      <Table<Row>
        {...restProps}
        columns={mergedColumns}
        dataSource={tableData}
        pagination={false}
        rowKey={rowKey}
        scroll={{ x: true }}
        size="middle"
        tableLayout="auto"
      />
    </div>
  )
}

export default DataTable
