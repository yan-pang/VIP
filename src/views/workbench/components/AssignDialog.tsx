import { Avatar, Empty, Input, Modal, Space, Tag } from 'antd'
import { useMemo, useState } from 'react'
import type { Agent } from '../../../types/chat'

interface Props {
  state: { conversationId: string; mode: 'assign' | 'transfer' } | null
  agents: Agent[]
  currentAgentId: string
  /** 转接模式:会话当前负责人姓名,只读展示作上下文(不作候选) */
  currentAssigneeName?: string
  onClose: () => void
  onSubmit: (conversationId: string, agentId: string) => void
}

function AssignDialog({ state, agents, currentAgentId, currentAssigneeName, onClose, onSubmit }: Props) {
  const [keyword, setKeyword] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const candidates = useMemo(() => {
    if (!state) return []
    // 候选资格 = 启用(active) + 同游戏 + 同号授权(由调用方过滤);不看登录在线态。
    // 转接时的原负责人已由调用方剔除。
    let list = agents
    if (keyword) {
      list = list.filter((a) => a.name.includes(keyword))
    }
    return list.sort((a, b) => {
      // 自己永远排首(指派模式)
      if (state.mode === 'assign') {
        if (a.id === currentAgentId) return -1
        if (b.id === currentAgentId) return 1
      }
      return a.activeConversationCount - b.activeConversationCount
    })
  }, [agents, currentAgentId, keyword, state])

  const title = state?.mode === 'transfer' ? '转接会话' : '指派会话'

  return (
    <Modal
      title={title}
      open={!!state}
      onCancel={() => {
        setKeyword('')
        setSelectedId(null)
        onClose()
      }}
      onOk={() => {
        if (state && selectedId) {
          onSubmit(state.conversationId, selectedId)
          setKeyword('')
          setSelectedId(null)
        }
      }}
      okButtonProps={{ disabled: !selectedId }}
      okText={state?.mode === 'transfer' ? '确认转接' : '确认指派'}
      width={480}
      destroyOnHidden
    >
      <div className="cf-assign">
        {state?.mode === 'transfer' && (
          <div className="cf-assign__current" style={{ marginBottom: 12 }}>
            <span className="cf-text-tertiary">当前负责人：</span>
            <span>{currentAssigneeName ?? '—'}</span>
          </div>
        )}
        <div className="cf-assign__field">
          <label>目标客服 *</label>
          <Input
            placeholder="搜索姓名"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            allowClear
          />
        </div>
        <div className="cf-assign__list">
          {candidates.length === 0 ? (
            <Empty description={state?.mode === 'transfer' ? '暂无其他可转接的客服' : '暂无可指派的客服'} />
          ) : (
            candidates.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`cf-assign__item ${selectedId === a.id ? 'is-selected' : ''}`}
                onClick={() => setSelectedId(a.id)}
              >
                <Space>
                  <input
                    type="radio"
                    checked={selectedId === a.id}
                    readOnly
                  />
                  <Avatar size={28} style={{ background: '#95E1B5' }}>
                    {a.name.slice(0, 1)}
                  </Avatar>
                  <span>{a.name}</span>
                  {state?.mode === 'assign' && a.id === currentAgentId && (
                    <Tag color="green">推荐</Tag>
                  )}
                </Space>
                <span className="cf-text-tertiary">会话量 {a.activeConversationCount}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}

export default AssignDialog
