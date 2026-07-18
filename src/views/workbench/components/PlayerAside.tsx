import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { Button, Empty } from 'antd'
import type { Conversation } from '../../../types/chat'
import PlayerSlotPanel from '../../../components/common/PlayerSlotPanel'

interface Props {
  conversation: Conversation | null
  collapsed: boolean
  onToggle: () => void
}

/**
 * 工作台右列壳:折叠 / 展开 + 标题;有会话时挂载 player-center 的 slot 精简档案。
 * slot 内容由 <PlayerSlotPanel> 承载(player-center 领域组件,与 /players/:id 不复用)。
 */
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

      {conversation ? (
        <PlayerSlotPanel
          playerId={conversation.playerId}
          accountId={conversation.accountId}
        />
      ) : (
        <Empty description="选择会话后查看玩家档案" />
      )}
    </div>
  )
}

export default PlayerAside
