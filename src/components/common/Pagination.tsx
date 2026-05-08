import { Pagination as AntdPagination } from 'antd'
import '../../styles/Pagination.scss'

interface PaginationProps {
  current: number
  total: number
  pageSize: number
  pageSizes?: number[]
  onChange: (page: number, pageSize: number) => void
}

function Pagination({ current, total, pageSize, pageSizes = [10, 20, 50, 100], onChange }: PaginationProps) {
  return (
    <div className="pagination-shell">
      <AntdPagination
        current={current}
        pageSize={pageSize}
        pageSizeOptions={pageSizes.map((size) => size.toString())}
        showQuickJumper
        showSizeChanger
        showTotal={(all, range) => `共 ${all} 条，当前显示 ${range[0]}-${range[1]} 条`}
        total={total}
        onChange={onChange}
        onShowSizeChange={onChange}
      />
    </div>
  )
}

export default Pagination
