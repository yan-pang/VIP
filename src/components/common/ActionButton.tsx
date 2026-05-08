import { Button, message, Space, Tooltip } from 'antd'
import type { ActionButton as ActionButtonType } from '../../types'
import '../../styles/ActionButton.scss'

interface ActionButtonProps<Row = object> {
  buttons: ActionButtonType<Row>[]
  onAction: (action: string) => void
  isTableAction?: boolean
}

function ActionButton<Row = object>({
  buttons,
  onAction,
  isTableAction = false,
}: ActionButtonProps<Row>) {
  return (
    <div className={`action-button ${isTableAction ? 'table-action' : ''}`}>
      <Space wrap>
        {buttons.map((button) => {
          const disabled = button.disabled === true
          const tooltipText = typeof button.tooltip === 'string' ? button.tooltip : undefined

          const buttonNode = (
            <Button
              key={button.name}
              danger={isTableAction && button.name === 'delete'}
              disabled={!isTableAction ? disabled : false}
              size={button.size || 'middle'}
              type={isTableAction ? 'link' : button.type || 'primary'}
              onClick={(event) => {
                event.stopPropagation()
                if (disabled) {
                  if (tooltipText) {
                    message.warning(tooltipText)
                  }
                  return
                }
                onAction(button.name)
              }}
            >
              {button.label}
            </Button>
          )

          if (tooltipText && disabled) {
            return (
              <Tooltip key={button.name} placement="top" title={tooltipText}>
                <span>{buttonNode}</span>
              </Tooltip>
            )
          }

          return buttonNode
        })}
      </Space>
    </div>
  )
}

export default ActionButton
