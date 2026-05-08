import type { ReactNode } from 'react'

export interface TableColumn<Row = object> {
  prop: keyof Row | string
  label: string
  width?: number | string
  minWidth?: number
  sortable?: boolean
  fixed?: 'left' | 'right'
  formatter?: (row: Row, column: TableColumn<Row>) => ReactNode
  children?: TableColumn<Row>[]
}

export interface ActionButton<Row = object> {
  name: string
  label: string
  type?: 'primary' | 'default' | 'dashed' | 'text' | 'link'
  size?: 'large' | 'middle' | 'small'
  disabled?: boolean | ((row: Row) => boolean)
  tooltip?: string | ((row: Row) => string)
}

export interface SearchItem {
  label: string
  prop: string
  type: 'input' | 'select' | 'date' | 'daterange'
  options?: Array<{ label: string; value: string }>
  placeholder?: string | string[]
  startPlaceholder?: string
  endPlaceholder?: string
  format?: string
  selectMode?: 'multiple' | 'tags'
}
