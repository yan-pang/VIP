import { useEffect, useRef, useState } from 'react'
import { Button, DatePicker, Form, Input, Select, Space } from 'antd'
import { DownOutlined } from '@ant-design/icons'
import type { SearchItem } from '../../types'
import '../../styles/SearchBar.scss'

const { RangePicker } = DatePicker

interface SearchBarProps {
  searchItems: SearchItem[]
  initialFormData?: Record<string, any>
  onSearch: (data: Record<string, any>) => void
  onReset: () => void
  className?: string
}

function SearchBar({
  searchItems,
  initialFormData = {},
  onSearch,
  onReset,
  className,
}: SearchBarProps) {
  const [form] = Form.useForm<Record<string, any>>()
  const [moreOpen, setMoreOpen] = useState(false)
  const [maxFields, setMaxFields] = useState(2)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    form.setFieldsValue(initialFormData)
  }, [form, initialFormData])

  useEffect(() => {
    const calculateMaxFields = () => {
      if (!containerRef.current) {
        return
      }

      const parentWidth = containerRef.current.offsetWidth
      const fieldWidth = 220
      const computedMax = Math.floor((parentWidth * 0.55) / fieldWidth)
      setMaxFields(Math.max(1, computedMax))
    }

    calculateMaxFields()
    window.addEventListener('resize', calculateMaxFields)
    return () => window.removeEventListener('resize', calculateMaxFields)
  }, [])

  const showMore = searchItems.length > maxFields
  const visibleItems = moreOpen || !showMore ? searchItems : searchItems.slice(0, maxFields)

  const handleReset = () => {
    form.resetFields()
    onReset()
  }

  const getRangePlaceholder = (item: SearchItem) => {
    if (Array.isArray(item.placeholder) && item.placeholder.length === 2) {
      return [item.placeholder[0], item.placeholder[1]] as [string, string]
    }

    return [
      item.startPlaceholder || '开始日期',
      item.endPlaceholder || '结束日期',
    ] as [string, string]
  }

  const renderField = (item: SearchItem) => {
    switch (item.type) {
      case 'input':
        return <Input allowClear placeholder={typeof item.placeholder === 'string' ? item.placeholder : `请输入${item.label}`} />
      case 'select':
        return (
          <Select
            allowClear
            mode={item.selectMode}
            options={item.options}
            placeholder={typeof item.placeholder === 'string' ? item.placeholder : `请选择${item.label}`}
          />
        )
      case 'date':
        return (
          <DatePicker
            allowClear
            format={item.format}
            placeholder={typeof item.placeholder === 'string' ? item.placeholder : `请选择${item.label}`}
          />
        )
      case 'daterange':
        return <RangePicker allowClear format={item.format || 'YYYY-MM-DD'} placeholder={getRangePlaceholder(item)} />
      default:
        return <Input allowClear />
    }
  }

  return (
    <div ref={containerRef} className={`search-bar ${className || ''}`}>
      <Form
        className={`search-form ${moreOpen ? 'more-open' : ''}`}
        form={form}
        layout="inline"
        onFinish={(values) => onSearch(values)}
      >
        {visibleItems.map((item) => (
          <Form.Item key={item.prop} label={item.label} name={item.prop}>
            {renderField(item)}
          </Form.Item>
        ))}

        {showMore ? (
          <Form.Item>
            <Button type="link" onClick={() => setMoreOpen((open) => !open)}>
              {moreOpen ? '收起' : '更多'}
              <DownOutlined
                style={{
                  marginLeft: 2,
                  transform: moreOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              />
            </Button>
          </Form.Item>
        ) : null}

        <Form.Item>
          <Space>
            <Button htmlType="submit" type="primary">
              搜索
            </Button>
            <Button onClick={handleReset}>重置</Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  )
}

export default SearchBar
