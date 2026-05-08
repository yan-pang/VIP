import { useMemo, useState } from 'react'
import { Form, Input, Select, Space, Tag, Typography, message } from 'antd'
import DialogWrapper from '../../components/common/DialogWrapper'
import TablePageLayout from '../../components/layouts/TablePageLayout'
import { projectCatalogSeed, projectStatusOptions, type ProjectRecord, type ProjectStatus } from '../../services/projectCatalogMock'
import type { ActionButton, SearchItem, TableColumn } from '../../types'
import '../../styles/CatalogPage.scss'

interface ProjectFormValues {
  domain: string
  name: string
  owner: string
  status: ProjectStatus
}

interface SearchFilters {
  keyword?: string
  owner?: string
  status?: ProjectStatus
}

const PAGE_SIZE = 10

const searchItems: SearchItem[] = [
  { label: '关键词', prop: 'keyword', type: 'input', placeholder: '项目名称或领域' },
  { label: '状态', prop: 'status', type: 'select', options: projectStatusOptions },
  { label: '负责人', prop: 'owner', type: 'input', placeholder: '负责人姓名' },
]

const statusColors: Record<ProjectStatus, string> = {
  需求梳理: 'default',
  开发中: 'processing',
  待交付: 'success',
}

function ProjectCatalogPage() {
  const [records, setRecords] = useState<ProjectRecord[]>(projectCatalogSeed)
  const [filters, setFilters] = useState<SearchFilters>({})
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm<ProjectFormValues>()

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const keyword = filters.keyword?.trim().toLowerCase()
      const owner = filters.owner?.trim().toLowerCase()
      const matchesKeyword =
        !keyword ||
        record.name.toLowerCase().includes(keyword) ||
        record.domain.toLowerCase().includes(keyword)
      const matchesOwner = !owner || record.owner.toLowerCase().includes(owner)
      const matchesStatus = !filters.status || record.status === filters.status

      return matchesKeyword && matchesOwner && matchesStatus
    })
  }, [filters, records])

  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRecords.slice(start, start + pageSize)
  }, [filteredRecords, page, pageSize])

  const actionButtons: ActionButton<ProjectRecord>[] = [
    { name: 'create', label: '新建项目', type: 'primary' },
  ]

  const tableActions: ActionButton<ProjectRecord>[] = [
    { name: 'edit', label: '编辑', type: 'link' },
    { name: 'duplicate', label: '复制', type: 'link' },
  ]

  const columns: TableColumn<ProjectRecord>[] = [
    {
      prop: 'name',
      label: '项目',
      minWidth: 180,
      formatter: (record) => (
        <div className="catalog-project-cell">
          <strong>{record.name}</strong>
          <span>{record.domain}</span>
        </div>
      ),
    },
    { prop: 'owner', label: '负责人', width: 120 },
    {
      prop: 'status',
      label: '状态',
      width: 180,
      formatter: (record) => <Tag color={statusColors[record.status]}>{record.status}</Tag>,
    },
    { prop: 'modules', label: '模块数', width: 100 },
    { prop: 'updatedAt', label: '更新时间', width: 140 },
  ]

  const openCreateDialog = () => {
    setEditingId(null)
    form.setFieldsValue({
      domain: '',
      name: '',
      owner: '',
      status: '需求梳理',
    })
    setDialogOpen(true)
  }

  const openEditDialog = (record: ProjectRecord) => {
    setEditingId(record.id)
    form.setFieldsValue({
      domain: record.domain,
      name: record.name,
      owner: record.owner,
      status: record.status,
    })
    setDialogOpen(true)
  }

  const handleDuplicate = (record: ProjectRecord) => {
    const duplicatedRecord: ProjectRecord = {
      ...record,
      id: `starter-${Date.now()}`,
      name: `${record.name} 副本`,
      updatedAt: new Date().toISOString().slice(0, 10),
    }

    setRecords((current) => [duplicatedRecord, ...current])
    message.success('已在本地 mock 数据中复制项目')
  }

  const handleSave = async () => {
    const values = await form.validateFields()

    if (editingId) {
      setRecords((current) =>
        current.map((record) =>
          record.id === editingId
            ? {
                ...record,
                ...values,
                updatedAt: new Date().toISOString().slice(0, 10),
              }
            : record,
        ),
      )
      message.success('项目已更新')
    } else {
      const newRecord: ProjectRecord = {
        id: `starter-${Date.now()}`,
        ...values,
        modules: 1,
        updatedAt: new Date().toISOString().slice(0, 10),
      }
      setRecords((current) => [newRecord, ...current])
      message.success('项目已创建')
    }

    setDialogOpen(false)
  }

  return (
    <>
      <TablePageLayout<ProjectRecord>
        actionButtons={actionButtons}
        current={page}
        description={
          <Typography.Paragraph>
            这个页面只作为通用列表页业务示例，用来演示 starter 默认的搜索、表格、分页，以及新建 / 编辑弹窗组合。
          </Typography.Paragraph>
        }
        initialFormData={filters}
        pageSize={pageSize}
        searchItems={searchItems}
        tableActions={tableActions}
        tableColumns={columns}
        tableData={pageData}
        title="项目目录"
        total={filteredRecords.length}
        onAction={(action) => {
          if (action === 'create') {
            openCreateDialog()
          }
        }}
        onPagination={(nextPage, nextPageSize) => {
          setPage(nextPage)
          setPageSize(nextPageSize)
        }}
        onReset={() => {
          setFilters({})
          setPage(1)
        }}
        onSearch={(nextFilters) => {
          setFilters(nextFilters as SearchFilters)
          setPage(1)
        }}
        onTableAction={(action, row) => {
          if (action === 'edit') {
            openEditDialog(row)
          }

          if (action === 'duplicate') {
            handleDuplicate(row)
          }
        }}
      />

      <DialogWrapper
        confirmText={editingId ? '保存修改' : '创建项目'}
        title={editingId ? '编辑项目' : '新建项目'}
        visible={dialogOpen}
        onConfirm={() => void handleSave()}
        onVisibleChange={setDialogOpen}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="项目名称" name="name" rules={[{ required: true, message: '请输入项目名称' }]}>
            <Input placeholder="请输入项目名称" />
          </Form.Item>
          <Form.Item label="所属领域" name="domain" rules={[{ required: true, message: '请输入所属领域' }]}>
            <Input placeholder="请输入项目所属领域" />
          </Form.Item>
          <Space className="catalog-form-row" size={16}>
            <Form.Item label="负责人" name="owner" rules={[{ required: true, message: '请输入负责人姓名' }]}>
              <Input placeholder="请输入负责人姓名" />
            </Form.Item>
            <Form.Item label="状态" name="status" rules={[{ required: true, message: '请选择状态' }]}>
              <Select options={projectStatusOptions} />
            </Form.Item>
          </Space>
        </Form>
      </DialogWrapper>
    </>
  )
}

export default ProjectCatalogPage
