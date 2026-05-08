import type { CSSProperties, ReactNode } from 'react'
import { Button, Modal } from 'antd'
import type { ModalProps } from 'antd'
import '../../styles/DialogWrapper.scss'

interface DialogWrapperProps extends Omit<ModalProps, 'open' | 'onCancel' | 'onOk'> {
  visible: boolean
  onVisibleChange?: (visible: boolean) => void
  children?: ReactNode
  confirmText?: string
  cancelText?: string
  loading?: boolean
  onConfirm?: () => void
  onCancel?: () => void
  slideFromRight?: boolean
}

function DialogWrapper({
  visible,
  onVisibleChange,
  children,
  confirmText = '保存',
  cancelText = '取消',
  loading = false,
  onConfirm,
  onCancel,
  slideFromRight = false,
  className = '',
  footer,
  style,
  title = '弹窗',
  width = 680,
  ...restProps
}: DialogWrapperProps) {
  const handleClose = () => {
    onVisibleChange?.(false)
    onCancel?.()
  }

  const wrapperClassName = `dialog-wrapper ${slideFromRight ? 'dialog-wrapper-sliding-right' : ''} ${className}`
  const wrapperStyle: CSSProperties = {
    ...style,
  }

  return (
    <Modal
      {...restProps}
      className={wrapperClassName}
      footer={
        footer ?? (
          <div className="dialog-footer">
            <Button onClick={handleClose}>{cancelText}</Button>
            <Button loading={loading} type="primary" onClick={onConfirm}>
              {confirmText}
            </Button>
          </div>
        )
      }
      open={visible}
      style={wrapperStyle}
      title={title}
      width={width}
      onCancel={handleClose}
    >
      {children}
    </Modal>
  )
}

export default DialogWrapper
