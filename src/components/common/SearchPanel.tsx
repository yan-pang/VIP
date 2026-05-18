import { CloseOutlined, SearchOutlined } from '@ant-design/icons'
import { Input, Tag } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  conversations,
  findAccount,
  findPlayer,
  messages,
} from '../../services/chatflowMock'
import '../../styles/SearchPanel.scss'

interface Props {
  open: boolean
  onClose: () => void
}

interface ContactHit {
  type: 'contact'
  conversationId: string
  display: string
  account: string
}
interface MessageHit {
  type: 'message'
  conversationId: string
  messageId: string
  preview: string
  sender: string
  account: string
}

function SearchPanel({ open, onClose }: Props) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  // 关闭时清空关键词
  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  const { contacts, msgHits } = useMemo(() => {
    if (query.trim().length < 2) return { contacts: [], msgHits: [] }
    const q = query.trim().toLowerCase()

    const seen = new Set<string>()
    const contacts: ContactHit[] = []
    for (const c of conversations) {
      if (seen.has(c.playerId)) continue
      const player = findPlayer(c.playerId)
      const acc = findAccount(c.accountId)
      const display = player?.remark ?? player?.nickname ?? ''
      const matched =
        display.toLowerCase().includes(q) ||
        (player?.nickname ?? '').toLowerCase().includes(q)
      if (matched) {
        contacts.push({
          type: 'contact',
          conversationId: c.id,
          display,
          account: acc?.shortName ?? '',
        })
        seen.add(c.playerId)
      }
      if (contacts.length >= 5) break
    }

    const msgHits: MessageHit[] = messages
      .filter((m) => m.text?.toLowerCase().includes(q))
      .slice(0, 5)
      .map((m) => {
        const c = conversations.find((cc) => cc.id === m.conversationId)
        const acc = c ? findAccount(c.accountId) : null
        const player = c ? findPlayer(c.playerId) : null
        return {
          type: 'message',
          conversationId: m.conversationId,
          messageId: m.id,
          preview: m.text ?? '',
          sender:
            m.direction === 'outgoing'
              ? '客服'
              : player?.nickname ?? '玩家',
          account: acc?.shortName ?? '',
        }
      })

    return { contacts, msgHits }
  }, [query])

  if (!open) return null

  const handleJump = (conversationId: string, messageId?: string) => {
    const params = new URLSearchParams({ conversationId })
    if (messageId) params.set('messageId', messageId)
    navigate(`/workbench?${params.toString()}`)
    onClose()
  }

  return (
    <div className="cf-search-overlay" onClick={onClose}>
      <div
        className="cf-search-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="cf-search-panel__input">
          <SearchOutlined />
          <Input
            autoFocus
            variant="borderless"
            placeholder="搜索联系人 / 聊天记录 / 标签(至少 2 字)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <span className="cf-text-tertiary">Esc 关闭</span>
          <CloseOutlined onClick={onClose} style={{ cursor: 'pointer' }} />
        </div>

        <div className="cf-search-panel__results">
          {query.trim().length < 2 ? (
            <p className="cf-text-tertiary cf-search-panel__hint">
              请至少输入 2 个字符,例如:小琪 / 优惠券 / 礼包
            </p>
          ) : contacts.length === 0 && msgHits.length === 0 ? (
            <p className="cf-text-tertiary cf-search-panel__hint">
              无匹配项,换个关键词试试
            </p>
          ) : (
            <>
              {contacts.length > 0 && (
                <section>
                  <header className="cf-search-panel__section">
                    联系人 ({contacts.length})
                  </header>
                  {contacts.map((c) => (
                    <button
                      key={c.conversationId}
                      type="button"
                      className="cf-search-panel__item"
                      onClick={() => handleJump(c.conversationId)}
                    >
                      <span>👤 {c.display}</span>
                      <Tag>{c.account}</Tag>
                    </button>
                  ))}
                </section>
              )}

              {msgHits.length > 0 && (
                <section>
                  <header className="cf-search-panel__section">
                    消息 ({msgHits.length})
                  </header>
                  {msgHits.map((m) => (
                    <button
                      key={m.messageId}
                      type="button"
                      className="cf-search-panel__item"
                      onClick={() => handleJump(m.conversationId, m.messageId)}
                    >
                      <span>
                        <strong>{m.sender}</strong>
                        <span className="cf-text-tertiary">: {m.preview}</span>
                      </span>
                      <span className="cf-text-tertiary cf-mono">{m.account}</span>
                    </button>
                  ))}
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
