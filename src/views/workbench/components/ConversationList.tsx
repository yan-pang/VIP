import { CaretDownOutlined, CaretRightOutlined, FilterOutlined, PushpinFilled, SearchOutlined, StarFilled } from '@ant-design/icons'
import { Avatar, Badge, Checkbox, Divider, Dropdown, Empty, Popover, Tooltip } from 'antd'
import { useState } from 'react'
import type { Conversation, ConversationGroupKey } from '../../../types/chat'
import { findPlayer, wechatAccounts } from '../../../services/chatflowMock'

interface Props {
  conversations: Conversation[]
  selectedId: string | null
  accountFilter: string[]
  onSelect: (id: string) => void
  onAccountFilterChange: (next: string[]) => void
  onTogglePin: (id: string) => void
  onOpenSearch: () => void
}

const groupOrder: ConversationGroupKey[] = ['queueing', 'active', 'ended']
const groupLabel: Record<ConversationGroupKey, string> = {
  queueing: '排队中',
  active: '会话中',
  ended: '已结束',
}

function ConversationList({
  conversations,
  selectedId,
  accountFilter,
  onSelect,
  onAccountFilterChange,
  onTogglePin,
  onOpenSearch,
}: Props) {
  // 默认:排队中 / 会话中 展开,已结束 折叠
  const [collapsed, setCollapsed] = useState<Record<ConversationGroupKey, boolean>>({
    queueing: false,
    active: false,
    ended: true,
  })

  const grouped: Record<ConversationGroupKey, Conversation[]> = {
    queueing: [],
    active: [],
    ended: [],
  }

  conversations.forEach((c) => grouped[c.status].push(c))
  groupOrder.forEach((k) =>
    grouped[k].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? '')
    }),
  )

  const toggleGroup = (k: ConversationGroupKey) =>
    setCollapsed((prev) => ({ ...prev, [k]: !prev[k] }))

  const allAccountIds = wechatAccounts.map((a) => a.id)
  const isAllSelected = accountFilter.length === allAccountIds.length
  const isNoneSelected = accountFilter.length === 0
  // 角标:仅当不是"全选"时才展示当前已选数量
  const filterBadgeCount = isAllSelected ? 0 : accountFilter.length

  const handleToggleAll = (checked: boolean) => {
    onAccountFilterChange(checked ? allAccountIds : [])
  }
  const handleToggleOne = (id: string, checked: boolean) => {
    const set = new Set(accountFilter)
    if (checked) set.add(id)
    else set.delete(id)
    onAccountFilterChange(Array.from(set))
  }

  const filterPanel = (
    <div className="cf-conv-list__filter-panel">
      <Checkbox
        indeterminate={!isAllSelected && !isNoneSelected}
        checked={isAllSelected}
        onChange={(e) => handleToggleAll(e.target.checked)}
      >
        全部号
      </Checkbox>
      <Divider style={{ margin: '8px 0' }} />
      <div className="cf-conv-list__filter-list">
        {wechatAccounts.map((a) => (
          <Checkbox
            key={a.id}
            checked={accountFilter.includes(a.id)}
            onChange={(e) => handleToggleOne(a.id, e.target.checked)}
          >
            <span className="cf-conv-list__filter-item">
              <Badge
                dot
                color={a.status === 'online' ? '#52C41A' : a.status === 'banned' ? '#FF4D4F' : '#8C8C8C'}
              />
              <span>{a.shortName}</span>
              {a.status !== 'online' && (
                <span className="cf-text-tertiary">
                  {a.status === 'offline' ? '离线' : '封禁'}
                </span>
              )}
            </span>
          </Checkbox>
        ))}
      </div>
    </div>
  )

  return (
    <div className="cf-conv-list">
      <div className="cf-conv-list__groups">
        {groupOrder.map((key) => {
          const list = grouped[key]
          const isCollapsed = collapsed[key]
          return (
            <div key={key} className="cf-conv-group">
              <button
                type="button"
                className="cf-conv-group__header"
                onClick={() => toggleGroup(key)}
                aria-expanded={!isCollapsed}
              >
                {isCollapsed ? <CaretRightOutlined /> : <CaretDownOutlined />}
                <span>{groupLabel[key]}</span>
                <span className="cf-conv-group__count">{list.length}</span>
              </button>

              {!isCollapsed && (
                list.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={null}
                    style={{ padding: '12px 0' }}
                  />
                ) : (
                  list.map((c) => (
                    <ConversationCard
                      key={c.id}
                      conversation={c}
                      selected={c.id === selectedId}
                      onClick={() => onSelect(c.id)}
                      onTogglePin={() => onTogglePin(c.id)}
                    />
                  ))
                )
              )}
            </div>
          )
        })}
      </div>

      <div className="cf-conv-list__footer">
        <Popover content={filterPanel} trigger="click" placement="topLeft">
          <Tooltip
            title={
              isAllSelected
                ? '按企微号筛选会话(当前:全部号)'
                : isNoneSelected
                  ? '当前未勾选任何号,会话列表为空'
                  : `当前已选 ${accountFilter.length} 个号`
            }
          >
            <Badge count={filterBadgeCount} size="small" offset={[-4, 4]}>
              <button
                type="button"
                className={`cf-conv-list__filter-btn ${!isAllSelected ? 'is-active' : ''}`}
                aria-label="按企微号筛选"
              >
                <FilterOutlined />
              </button>
            </Badge>
          </Tooltip>
        </Popover>
        <button type="button" className="cf-conv-list__search-btn" onClick={onOpenSearch}>
          <SearchOutlined />
          <span>综合搜索</span>
          <kbd>⌘K</kbd>
        </button>
      </div>
    </div>
  )
}

function ConversationCard({
  conversation,
  selected,
  onClick,
  onTogglePin,
}: {
  conversation: Conversation
  selected: boolean
  onClick: () => void
  onTogglePin: () => void
}) {
  const player = findPlayer(conversation.playerId)
  const displayName = player?.remark ?? player?.nickname ?? '未知玩家'
  const time = conversation.lastMessageAt ? formatTime(conversation.lastMessageAt) : ''
  const hasMeta = conversation.pinned || conversation.tags.includes('important')

  return (
    <Dropdown
      trigger={['contextMenu']}
      menu={{
        items: [
          {
            key: 'pin',
            label: conversation.pinned ? '取消置顶' : '置顶',
            onClick: onTogglePin,
          },
          {
            key: 'copy-name',
            label: '复制玩家昵称',
            onClick: () => navigator.clipboard?.writeText(displayName),
          },
        ],
      }}
    >
      <button
        type="button"
        className={`cf-conv-card ${selected ? 'is-selected' : ''} ${conversation.pinned ? 'is-pinned' : ''}`}
        onClick={onClick}
      >
        <Avatar size={36} style={{ background: '#95E1B5' }}>
          {displayName.slice(0, 1)}
        </Avatar>
        <div className="cf-conv-card__body">
          <div className="cf-conv-card__row">
            <span className="cf-conv-card__name">{displayName}</span>
            <span className="cf-conv-card__time">{time}</span>
          </div>
          <div className="cf-conv-card__row">
            <span className="cf-conv-card__preview">{conversation.lastMessagePreview}</span>
            <Badge count={conversation.unreadCount} size="small" />
          </div>
          {hasMeta && (
            <div className="cf-conv-card__meta">
              {conversation.pinned && (
                <PushpinFilled style={{ color: '#FAAD14', fontSize: 12 }} />
              )}
              {conversation.tags.includes('important') && (
                <StarFilled style={{ color: '#FF4D4F', fontSize: 12 }} />
              )}
            </div>
          )}
        </div>
      </button>
    </Dropdown>
  )
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) {
    return d.toTimeString().slice(0, 5)
  }
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default ConversationList
