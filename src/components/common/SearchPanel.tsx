import {
  CloseOutlined,
  SearchOutlined,
  TagOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Input, Tag } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  findAccount,
  findAgent,
  findPlayer,
} from '../../services/chatflowMock'
import { usePermissionSession } from '../../services/permissionMock'
import {
  getAllRelations,
  getRelation,
  subscribePlayerCenter,
  tagLibrary,
} from '../../services/playerCenterMock'
import { useWorkbenchRuntime } from '../../services/workbenchRuntimeMock'
import '../../styles/SearchPanel.scss'

interface Props {
  open: boolean
  onClose: () => void
}

type SearchCategory = 'all' | 'contacts' | 'messages' | 'tags'

interface ContactHit {
  type: 'contact'
  playerId: string
  accountId: string
  conversationId?: string
  display: string
  nickname: string
  account: string
}

interface MessageHit {
  type: 'message'
  conversationId: string
  messageId: string
  preview: string
  sender: string
  account: string
  createdAt: string
}

interface TagHit {
  type: 'tag'
  tagId: string
  label: string
  count: number
  deprecated?: boolean
}

type SearchHit = ContactHit | MessageHit | TagHit

const categories: Array<{ key: SearchCategory; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'contacts', label: '联系人' },
  { key: 'messages', label: '消息' },
  { key: 'tags', label: '标签' },
]

function hitKey(hit: SearchHit): string {
  if (hit.type === 'contact') return `contact:${hit.playerId}:${hit.accountId}`
  if (hit.type === 'message') return `message:${hit.messageId}`
  return `tag:${hit.tagId}`
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) return <>{text}</>

  const lowerText = text.toLocaleLowerCase()
  const nodes: ReactNode[] = []
  let cursor = 0
  let matchIndex = lowerText.indexOf(normalizedQuery)
  while (matchIndex >= 0) {
    if (matchIndex > cursor) nodes.push(text.slice(cursor, matchIndex))
    const end = matchIndex + normalizedQuery.length
    nodes.push(<mark key={`${matchIndex}-${end}`}>{text.slice(matchIndex, end)}</mark>)
    cursor = end
    matchIndex = lowerText.indexOf(normalizedQuery, cursor)
  }
  if (cursor < text.length) nodes.push(text.slice(cursor))
  return <>{nodes.length ? nodes : text}</>
}

function formatRelativeTime(iso: string): string {
  const diffMs = Math.max(0, Date.now() - new Date(iso).getTime())
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} 个月前`
  return `${Math.floor(months / 12)} 年前`
}

function SearchPanel({ open, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [category, setCategory] = useState<SearchCategory>('all')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [relations, setRelations] = useState(() => getAllRelations())
  const resultsRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const session = usePermissionSession()
  const runtime = useWorkbenchRuntime()

  useEffect(() => subscribePlayerCenter(() => setRelations(getAllRelations())), [])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setDebouncedQuery('')
      setCategory('all')
      setSelectedIndex(0)
    }
  }, [open])

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setDebouncedQuery('')
      return
    }
    const timer = window.setTimeout(() => setDebouncedQuery(trimmed), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  const { contacts, messageHits, tagHits } = useMemo(() => {
    const q = debouncedQuery.toLocaleLowerCase()
    if (!q) return { contacts: [], messageHits: [], tagHits: [] }

    const visibleAccountIds = new Set(session.visibleAccountIds)
    const visibleConversations = runtime.conversations
      .filter((conversation) => !conversation.isProvisional && visibleAccountIds.has(conversation.accountId))
      .sort((a, b) =>
        (b.lastMessageAt ?? b.createdAt).localeCompare(a.lastMessageAt ?? a.createdAt),
      )
    const conversationById = new Map(
      visibleConversations.map((conversation) => [conversation.id, conversation]),
    )
    const latestConversationByRelation = new Map<string, (typeof visibleConversations)[number]>()
    visibleConversations.forEach((conversation) => {
      const key = `${conversation.playerId}:${conversation.accountId}`
      if (!latestConversationByRelation.has(key)) {
        latestConversationByRelation.set(key, conversation)
      }
    })

    const scopedRelations = relations.filter((relation) =>
      visibleAccountIds.has(relation.accountId),
    )
    const contacts: ContactHit[] = scopedRelations
      .filter((relation) => {
        const player = findPlayer(relation.playerId)
        return [relation.remark, player?.nickname ?? '', relation.playerId]
          .some((value) => value.toLocaleLowerCase().includes(q))
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((relation) => {
        const player = findPlayer(relation.playerId)
        return {
          type: 'contact' as const,
          playerId: relation.playerId,
          accountId: relation.accountId,
          conversationId: latestConversationByRelation.get(
            `${relation.playerId}:${relation.accountId}`,
          )?.id,
          display: relation.remark?.trim() || player?.nickname || '未知玩家',
          nickname: player?.nickname ?? '未知玩家',
          account: findAccount(relation.accountId)?.shortName ?? relation.accountId,
        }
      })

    const messageHits: MessageHit[] = runtime.messages
      .filter((message) => {
        return (
          message.direction !== 'system'
          && !!conversationById.get(message.conversationId)
          && !!message.text?.toLocaleLowerCase().includes(q)
        )
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((message) => {
        const conversation = conversationById.get(message.conversationId)!
        const player = findPlayer(conversation.playerId)
        const relationRemark = getRelation(
          conversation.playerId,
          conversation.accountId,
        )?.remark?.trim()
        return {
          type: 'message' as const,
          conversationId: message.conversationId,
          messageId: message.id,
          preview: message.text ?? '',
          sender:
            message.direction === 'outgoing'
              ? findAgent(message.senderId)?.name ?? '客服'
              : relationRemark || player?.nickname || '玩家',
          account:
            findAccount(conversation.accountId)?.shortName ?? conversation.accountId,
          createdAt: message.createdAt,
        }
      })

    const tagHits: TagHit[] = tagLibrary
      .filter((tag) => tag.label.toLocaleLowerCase().includes(q))
      .map((tag) => ({
        type: 'tag' as const,
        tagId: tag.id,
        label: tag.label,
        deprecated: tag.deprecated,
        count: new Set(
          scopedRelations
            .filter((relation) => relation.tagIds.includes(tag.id))
            .map((relation) => relation.playerId),
        ).size,
      }))

    return { contacts, messageHits, tagHits }
  }, [
    debouncedQuery,
    relations,
    runtime.conversations,
    runtime.messages,
    session.visibleAccountIds,
  ])

  const displayedContacts = contacts.slice(0, category === 'all' ? 5 : 50)
  const displayedMessages = messageHits.slice(0, category === 'all' ? 5 : 100)
  const displayedTags = tagHits.slice(0, category === 'all' ? 5 : 50)
  const displayedHits = useMemo<SearchHit[]>(() => {
    if (category === 'contacts') return displayedContacts
    if (category === 'messages') return displayedMessages
    if (category === 'tags') return displayedTags
    return [...displayedContacts, ...displayedMessages, ...displayedTags]
  }, [category, displayedContacts, displayedMessages, displayedTags])

  useEffect(() => setSelectedIndex(0), [category, debouncedQuery])

  useEffect(() => {
    const selected = resultsRef.current?.querySelector<HTMLElement>('.is-selected')
    selected?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (!open) return null

  const handleActivate = (hit: SearchHit) => {
    if (hit.type === 'tag') {
      navigate(`/players?tags=${encodeURIComponent(hit.tagId)}`)
    } else if (hit.type === 'message') {
      const params = new URLSearchParams({
        conversationId: hit.conversationId,
        messageId: hit.messageId,
      })
      navigate(`/workbench?${params.toString()}`)
    } else if (hit.conversationId) {
      navigate(`/workbench?conversationId=${encodeURIComponent(hit.conversationId)}`)
    } else {
      const params = new URLSearchParams({
        playerId: hit.playerId,
        accountId: hit.accountId,
      })
      navigate(`/workbench?${params.toString()}`)
    }
    onClose()
  }

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }
    if (event.key === 'Tab') {
      event.preventDefault()
      const current = categories.findIndex((item) => item.key === category)
      const offset = event.shiftKey ? -1 : 1
      setCategory(categories[(current + offset + categories.length) % categories.length].key)
      return
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (displayedHits.length === 0) return
      event.preventDefault()
      const delta = event.key === 'ArrowDown' ? 1 : -1
      setSelectedIndex((current) =>
        (current + delta + displayedHits.length) % displayedHits.length,
      )
      return
    }
    if (event.key === 'Enter' && displayedHits[selectedIndex]) {
      event.preventDefault()
      handleActivate(displayedHits[selectedIndex])
    }
  }

  const isSearching = !!query.trim() && query.trim() !== debouncedQuery
  const hasResults = displayedHits.length > 0

  const renderContact = (hit: ContactHit) => {
    const index = displayedHits.findIndex((item) => hitKey(item) === hitKey(hit))
    return (
      <button
        key={hitKey(hit)}
        type="button"
        className={`cf-search-panel__item${index === selectedIndex ? ' is-selected' : ''}`}
        onMouseEnter={() => setSelectedIndex(index)}
        onClick={() => handleActivate(hit)}
      >
        <span className="cf-search-panel__item-main">
          <UserOutlined />
          <span>
            <HighlightedText text={hit.display} query={debouncedQuery} />
            {hit.display !== hit.nickname && (
              <span className="cf-text-tertiary"> · {hit.nickname}</span>
            )}
          </span>
        </span>
        <Tag>{hit.account}</Tag>
      </button>
    )
  }

  const renderMessage = (hit: MessageHit) => {
    const index = displayedHits.findIndex((item) => hitKey(item) === hitKey(hit))
    return (
      <button
        key={hitKey(hit)}
        type="button"
        className={`cf-search-panel__item${index === selectedIndex ? ' is-selected' : ''}`}
        onMouseEnter={() => setSelectedIndex(index)}
        onClick={() => handleActivate(hit)}
      >
        <span className="cf-search-panel__message">
          <strong>{hit.sender}</strong>
          <span className="cf-text-tertiary">：</span>
          <span className="cf-search-panel__preview">
            <HighlightedText text={hit.preview} query={debouncedQuery} />
          </span>
        </span>
        <span className="cf-search-panel__meta">
          <span>{formatRelativeTime(hit.createdAt)}</span>
          <Tag>{hit.account}</Tag>
        </span>
      </button>
    )
  }

  const renderTag = (hit: TagHit) => {
    const index = displayedHits.findIndex((item) => hitKey(item) === hitKey(hit))
    return (
      <button
        key={hitKey(hit)}
        type="button"
        className={`cf-search-panel__item${index === selectedIndex ? ' is-selected' : ''}`}
        onMouseEnter={() => setSelectedIndex(index)}
        onClick={() => handleActivate(hit)}
      >
        <span className="cf-search-panel__item-main">
          <TagOutlined />
          <span>
            #<HighlightedText text={hit.label} query={debouncedQuery} />
            {hit.deprecated && <span className="cf-text-tertiary">（已停用）</span>}
          </span>
        </span>
        <span className="cf-text-tertiary">关联 {hit.count} 个玩家</span>
      </button>
    )
  }

  const renderSectionHeader = (
    label: string,
    count: number,
    targetCategory: Exclude<SearchCategory, 'all'>,
  ) => (
    <header className="cf-search-panel__section">
      <span>{label}（{count}）</span>
      {category === 'all' && count > 5 && (
        <button type="button" onClick={() => setCategory(targetCategory)}>
          查看更多
        </button>
      )}
    </header>
  )

  return (
    <div className="cf-search-overlay" onClick={onClose}>
      <div
        className="cf-search-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="综合搜索"
      >
        <div className="cf-search-panel__input">
          <SearchOutlined />
          <Input
            autoFocus
            variant="borderless"
            aria-label="搜索联系人、聊天记录或标签"
            placeholder="搜索联系人 / 聊天记录 / 标签"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
          />
          {isSearching && <span className="cf-search-panel__searching">搜索中…</span>}
          <button type="button" className="cf-search-panel__close" onClick={onClose} aria-label="关闭搜索">
            <CloseOutlined />
          </button>
        </div>

        <div className="cf-search-panel__tabs" role="tablist" aria-label="搜索分类">
          {categories.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={category === item.key}
              className={category === item.key ? 'is-active' : ''}
              onClick={() => setCategory(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="cf-search-panel__results" ref={resultsRef}>
          {!query.trim() ? (
            <p className="cf-text-tertiary cf-search-panel__hint">
              输入关键词开始搜索，例如：丑 / 小琪 / 优惠券
            </p>
          ) : isSearching ? (
            <p className="cf-text-tertiary cf-search-panel__hint">正在搜索…</p>
          ) : !hasResults ? (
            <p className="cf-text-tertiary cf-search-panel__hint">
              无匹配项，换个关键词试试
            </p>
          ) : (
            <>
              {(category === 'all' || category === 'contacts') && displayedContacts.length > 0 && (
                <section>
                  {renderSectionHeader('联系人', contacts.length, 'contacts')}
                  {displayedContacts.map(renderContact)}
                </section>
              )}
              {(category === 'all' || category === 'messages') && displayedMessages.length > 0 && (
                <section>
                  {renderSectionHeader('消息', messageHits.length, 'messages')}
                  {displayedMessages.map(renderMessage)}
                  {category === 'messages' && messageHits.length > 100 && (
                    <p className="cf-search-panel__limit">仅展示前 100 条，请缩小范围</p>
                  )}
                </section>
              )}
              {(category === 'all' || category === 'tags') && displayedTags.length > 0 && (
                <section>
                  {renderSectionHeader('标签', tagHits.length, 'tags')}
                  {displayedTags.map(renderTag)}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default SearchPanel
