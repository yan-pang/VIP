import { Button, Drawer, Empty, Space, Tag } from 'antd'
import type { Message } from '../../../types/chat'
import { conversations, findAccount } from '../../../services/chatflowMock'

interface Props {
  message: Message | null
  onClose: () => void
  onIntervene: () => void
}

function FailureDrawer({ message, onClose, onIntervene }: Props) {
  const failure = message?.failure
  const conv = message ? conversations.find((c) => c.id === message.conversationId) : null
  const account = conv ? findAccount(conv.accountId) : null

  return (
    <Drawer
      title="发送失败详情"
      open={!!message}
      onClose={onClose}
      width={480}
      footer={
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>关闭</Button>
          <Button type="primary" onClick={onIntervene}>
            人工介入
          </Button>
        </Space>
      }
    >
      {!message || !failure ? (
        <Empty description="无失败详情" />
      ) : (
        <div className="cf-failure">
          <section className="cf-failure__summary">
            <Space size={12} wrap>
              <Tag color="red">RPA 异常</Tag>
              <span className="cf-mono">{failure.code}</span>
            </Space>
            <p className="cf-failure__meta">
              <span>时间:</span>
              <span className="cf-mono">
                {failure.executedAt ? new Date(failure.executedAt).toLocaleString() : '-'}
              </span>
            </p>
            <p className="cf-failure__meta">
              <span>企微号:</span>
              <span>{account?.shortName ?? '-'}</span>
            </p>
          </section>

          <section>
            <h4 className="cf-failure__h4">失败原文</h4>
            <pre className="cf-failure__raw">{failure.message}</pre>
          </section>

          <section>
            <h4 className="cf-failure__h4">操作录屏</h4>
            {failure.recordingUrl ? (
              <div className="cf-failure__video">
                <div className="cf-failure__video-placeholder">
                  ▶ 录屏播放器(Mock 占位)
                  <span className="cf-text-tertiary">{failure.recordingUrl}</span>
                </div>
                <p className="cf-failure__video-meta">
                  录屏保留至 {failure.recordingExpireAt ? new Date(failure.recordingExpireAt).toLocaleDateString() : '-'} /
                  大小 {failure.recordingSizeBytes ? `${(failure.recordingSizeBytes / 1024 / 1024).toFixed(1)} MB` : '-'}
                </p>
              </div>
            ) : (
              <div className="cf-failure__video-placeholder">录屏不可用或已过期</div>
            )}
          </section>
        </div>
      )}
    </Drawer>
  )
}

export default FailureDrawer
