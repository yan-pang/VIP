import { PushpinFilled, SearchOutlined, StarFilled } from '@ant-design/icons'
import { Avatar, Badge, Dropdown, Empty, Select } from 'antd'
import type { Conversation, ConversationGroupKey } from '../../../types/chat'
import { findAccount, findPlayer, wechatAccounts } from '../../../services/chatflowMock'

interface Props {
  conversations: Conversation[]
  selectedId: string | null
  accountFilter: string
  onSelect: (id: string) => void
  onAccountFilterChange: (id: string) => void
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

  return (
    <div className="cf-conv-list">
      <div className="cf-conv-list__filter">
        <Select
          size="small"
          value={accountFilter}
          onChange={onAccountFilterChange}
          style={{ width: '100%' }}
          options={[
            { label: '全部号', value: 'all' },
            ...wechatAccounts.map((a) => ({
              label: `${a.shortName}${a.status !== 'online' ? ` · ${a.status === 'offline' ? '离线' : '封禁'}` : ''}`,
              value: a.id,
            })),
          ]}
        />
      </div>

      <div className="cf-conv-list__groups">
        {groupOrder.map((key) => {
          const list = grouped[key]
          return (
            <div key={key} className="cf-conv-group">
              <header className="cf-conv-group__header">
                <span>{groupLabel[key]}</span>
                <span className="cf-conv-group__count">{list.length}</span>
              </header>

              {list.length === 0 ? (
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
              )}
            </div>
          )
        })}
      </div>

      <div className="cf-conv-list__search">
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
  const account = findAccount(conversation.accountId)
  const player = findPlayer(conversation.playerId)
  const displayName = player?.remark ?? player?.nickname ?? '未知玩家'
  const time = conversation.lastMessageAt ? formatTime(conversation.lastMessageAt) : ''

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
          <div className="cf-conv-card__meta">
            <span className="cf-conv-card__account">{account?.shortName}</span>
            {conversation.pinned && (
              <PushpinFilled style={{ color: '#FAAD14', fontSize: 12 }} />
            )}
            {conversation.tags.includes('important') && (
              <StarFilled style={{ color: '#FF4D4F', fontSize: 12 }} />
            )}
          </div>
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
