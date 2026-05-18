import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { Button, Descriptions, Empty, Tag } from 'antd'
import type { Conversation } from '../../../types/chat'
import { findPlayer, wechatAccounts } from '../../../services/chatflowMock'

interface Props {
  conversation: Conversation | null
  collapsed: boolean
  onToggle: () => void
}

function PlayerAside({ conversation, collapsed, onToggle }: Props) {
  if (collapsed) {
    return (
      <div className="cf-aside cf-aside--collapsed">
        <Button
          type="text"
          size="small"
          icon={<LeftOutlined />}
          onClick={onToggle}
        />
      </div>
    )
  }

  if (!conversation) {
    return (
      <div className="cf-aside">
        <header className="cf-aside__header">
          <span>玩家档案</span>
          <Button
            type="text"
            size="small"
            icon={<RightOutlined />}
            onClick={onToggle}
          />
        </header>
        <Empty description="选择会话后查看玩家档案" />
      </div>
    )
  }

  const player = findPlayer(conversation.playerId)
  const associated = wechatAccounts.filter((a) =>
    player?.associatedAccountIds.includes(a.id),
  )

  return (
    <div className="cf-aside">
      <header className="cf-aside__header">
        <span>玩家档案</span>
        <Button
          type="text"
          size="small"
          icon={<RightOutlined />}
          onClick={onToggle}
        />
      </header>

      <div className="cf-aside__placeholder">
        <p className="cf-text-tertiary">
          由 player-center 领域承载,这里仅做挂载位与上下文传递。下方为占位预览。
        </p>
      </div>

      <Descriptions column={1} size="small" colon={false}>
        <Descriptions.Item label="昵称">{player?.nickname}</Descriptions.Item>
        <Descriptions.Item label="备注">
          {player?.remark ?? <span className="cf-text-tertiary">未设置</span>}
        </Descriptions.Item>
        <Descriptions.Item label="关联企微号">
          {associated.map((a) => (
            <Tag color="green" key={a.id}>
              {a.shortName}
            </Tag>
          ))}
        </Descriptions.Item>
      </Descriptions>

      <Descriptions column={1} size="small" title="标签" colon={false}>
        {conversation.tags.length > 0 ? (
          conversation.tags.map((t) => (
            <Tag key={t} color="blue">
              {labelOf(t)}
            </Tag>
          ))
        ) : (
          <span className="cf-text-tertiary">无</span>
        )}
      </Descriptions>
    </div>
  )
}

function labelOf(t: string) {
  return { follow_up: '跟进中', important: '重要', callback: '待回访' }[t] ?? t
}

export default PlayerAside
