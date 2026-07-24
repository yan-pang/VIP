import { CaretDownOutlined, CaretRightOutlined, ClockCircleFilled, FilterOutlined, PhoneFilled, PushpinFilled, SearchOutlined, StarFilled } from '@ant-design/icons'
import { Avatar, Badge, Checkbox, Divider, Empty, Popover, Tooltip } from 'antd'
import { useEffect, useState } from 'react'
import type { Conversation, ConversationGroupKey, ConversationTag } from '../../../types/chat'
import { findPlayer, wechatAccounts } from '../../../services/chatflowMock'
import { getRelation, subscribePlayerCenter } from '../../../services/playerCenterMock'

interface Props {
  conversations: Conversation[]
  selectedId: string | null
  currentAgentId: string
  visibleAccountIds: string[]
  accountFilter: string[]
  onSelect: (id: string) => void
  onAccountFilterChange: (next: string[]) => void
  onOpenSearch: () => void
}

const groupOrder: ConversationGroupKey[] = ['queueing', 'active', 'assigned_other', 'ended']
const groupLabel: Record<ConversationGroupKey, string> = {
  queueing: '排队中',
  active: '会话中',
  assigned_other: '他人接待中',
  ended: '已结束',
}

// 会话标记(单选三值)对应的卡片图标(PRD 9.2.5:单个图标)。
const tagMeta: Record<ConversationTag, { label: string; icon: React.ReactNode }> = {
  important: { label: '重要', icon: <StarFilled style={{ color: '#FF4D4F', fontSize: 12 }} /> },
  follow_up: { label: '跟进中', icon: <ClockCircleFilled style={{ color: '#FAAD14', fontSize: 12 }} /> },
  callback: { label: '待回访', icon: <PhoneFilled style={{ color: '#1677FF', fontSize: 12 }} /> },
}

/**
 * 计算会话的左列分组:进行中会话按指派人拆分 ——
 * 指派给自己 → 会话中(能发消息),指派给他人 → 他人接待中(只读)。
 */
function groupKeyOf(c: Conversation, currentAgentId: string): ConversationGroupKey {
  if (c.status === 'active') {
    return c.assigneeId === currentAgentId ? 'active' : 'assigned_other'
  }
  return c.status // 'queueing' | 'ended'
}

function ConversationList({
  conversations,
  selectedId,
  currentAgentId,
  visibleAccountIds,
  accountFilter,
  onSelect,
  onAccountFilterChange,
  onOpenSearch,
}: Props) {
  // 默认:排队中 / 会话中 展开,他人接待中 / 已结束 折叠
  const [collapsed, setCollapsed] = useState<Record<ConversationGroupKey, boolean>>({
    queueing: false,
    active: false,
    assigned_other: true,
    ended: true,
  })
  // 订阅 player-center 广播:slot / 详情页改备注后,会话卡的备注实时刷新
  const [, setVersion] = useState(0)
  useEffect(() => subscribePlayerCenter(() => setVersion((v) => v + 1)), [])

  const grouped: Record<ConversationGroupKey, Conversation[]> = {
    queueing: [],
    active: [],
    assigned_other: [],
    ended: [],
  }

  conversations.forEach((c) => grouped[groupKeyOf(c, currentAgentId)].push(c))
  groupOrder.forEach((k) =>
    grouped[k].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? '')
    }),
  )

  const toggleGroup = (k: ConversationGroupKey) =>
    setCollapsed((prev) => ({ ...prev, [k]: !prev[k] }))

  const visibleAccounts = wechatAccounts.filter((account) => visibleAccountIds.includes(account.id))
  const allAccountIds = visibleAccounts.map((a) => a.id)
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
        {visibleAccounts.map((a) => (
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
                  {a.status === 'offline' ? '离线' : a.status === 'disabled' ? '停用' : '封禁'}
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
        {conversations.length === 0 && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={isNoneSelected ? '当前未勾选任何号，会话列表为空' : '暂无会话，等待玩家上门'}
            style={{ padding: '48px 0' }}
          />
        )}
        {conversations.length > 0 && groupOrder.map((key) => {
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
                      currentAgentId={currentAgentId}
                      selected={c.id === selectedId}
                      onClick={() => onSelect(c.id)}
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
  currentAgentId,
  selected,
  onClick,
}: {
  conversation: Conversation
  currentAgentId: string
  selected: boolean
  onClick: () => void
}) {
  const player = findPlayer(conversation.playerId)
  // 备注取关系级(playerId × accountId,player-center 权威源),回落微信昵称
  const relationRemark = getRelation(conversation.playerId, conversation.accountId)?.remark?.trim()
  const displayName = relationRemark || player?.nickname || '未知玩家'
  const time = conversation.lastMessageAt ? formatTime(conversation.lastMessageAt) : ''
  const tag = conversation.tag ? tagMeta[conversation.tag] : null
  const hasMeta = conversation.pinned || !!tag
  // 未读徽章仅在 排队中 或 本人负责(会话中本人)展示;他人接待中 / 已结束不承载未读(PRD R-105-05)
  const showUnread =
    conversation.unreadCount > 0 &&
    (conversation.status === 'queueing'
      || (conversation.status === 'active' && conversation.assigneeId === currentAgentId))

  // 会话卡片不再提供右键菜单;置顶 / 标记走中列标题栏操作条
  return (
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
          {showUnread && <Badge count={conversation.unreadCount} size="small" />}
        </div>
        {hasMeta && (
          <div className="cf-conv-card__meta">
            {conversation.pinned && (
              <PushpinFilled style={{ color: '#FAAD14', fontSize: 12 }} />
            )}
            {tag && (
              <Tooltip title={tag.label}>{tag.icon}</Tooltip>
            )}
          </div>
        )}
      </div>
    </button>
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
