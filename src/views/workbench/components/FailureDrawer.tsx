import { Alert, Button, Drawer, Empty, Space, Tag } from 'antd'
import { useEffect, useState } from 'react'
import type { Conversation, Message } from '../../../types/chat'
import { findAccount } from '../../../services/chatflowMock'

interface Props {
  message: Message | null
  conversation: Conversation | null
  onClose: () => void
  onIntervene: () => void
  canIntervene: boolean
  canRetry: boolean
  onRetry: () => void
}

function FailureDrawer({ message, conversation, onClose, onIntervene, canIntervene, canRetry, onRetry }: Props) {
  const failure = message?.failure
  const failureLabel = failure?.category === 'delivery_reconciliation_failed' ? '回捞比对失败' : 'RPA 异常'
  const account = conversation ? findAccount(conversation.accountId) : null
  const [videoFailed, setVideoFailed] = useState(false)
  useEffect(() => setVideoFailed(false), [message?.id])
  const recordingExpired = !!failure?.recordingExpireAt && new Date(failure.recordingExpireAt).getTime() <= Date.now()

  return (
    <Drawer
      title="发送失败详情"
      open={!!message}
      onClose={onClose}
      width={480}
      footer={
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>关闭</Button>
          {canRetry && <Button onClick={onRetry}>重试当前消息</Button>}
          {canIntervene && <Button type="primary" onClick={onIntervene}>人工介入</Button>}
        </Space>
      }
    >
      {!message || !failure ? (
        <Empty description="无失败详情" />
      ) : (
        <div className="cf-failure">
          <section className="cf-failure__summary">
            <Space size={12} wrap>
              <Tag color="red">{failureLabel}</Tag>
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
          {!canIntervene && (
            <div className="cf-failure__notice">请联系运营主管或系统管理员协助处理</div>
          )}

          <section>
            <h4 className="cf-failure__h4">操作录屏</h4>
            {failure.recordingUrl && !recordingExpired && !videoFailed ? (
              <div className="cf-failure__video">
                <video src={failure.recordingUrl} controls preload="metadata" className="cf-msg__video" onError={() => setVideoFailed(true)} />
                <p className="cf-failure__video-meta">
                  录屏保留至 {failure.recordingExpireAt ? new Date(failure.recordingExpireAt).toLocaleDateString() : '-'} /
                  大小 {failure.recordingSizeBytes ? `${(failure.recordingSizeBytes / 1024 / 1024).toFixed(1)} MB` : '-'}
                </p>
              </div>
            ) : (
              <Alert type="info" showIcon message={recordingExpired ? '录屏已过期' : '录屏加载失败'} description="可重试当前消息；仍失败时由主管或管理员进入控制台人工处理。" />
            )}
          </section>
        </div>
      )}
    </Drawer>
  )
}

export default FailureDrawer
