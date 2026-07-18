/**
 * 微信性别徽标(player-center 共用:工作台 slot / 玩家列表 / 玩家详情)。
 * unknown 不渲染;showLabel 控制是否在图标后带文字。
 */
import { ManOutlined, WomanOutlined } from '@ant-design/icons'
import { Tooltip } from 'antd'
import type { WechatGender } from '../../types/playerCenter'

interface Props {
  gender: WechatGender
  /** 是否在图标后附带文字标签(默认只显示图标) */
  showLabel?: boolean
}

const META = {
  male: { label: '男', color: '#1677FF', Icon: ManOutlined },
  female: { label: '女', color: '#EB2F96', Icon: WomanOutlined },
} as const

function GenderBadge({ gender, showLabel = false }: Props) {
  if (gender === 'unknown') return null
  const { label, color, Icon } = META[gender]
  return (
    <Tooltip title={`微信性别:${label}`}>
      <span style={{ color, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
        <Icon />
        {showLabel ? <span>{label}</span> : null}
      </span>
    </Tooltip>
  )
}

export default GenderBadge
