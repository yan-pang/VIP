/**
 * 工作台 slot 精简档案(player-center D3-2 / design.md 模块 5)
 * - 接待场景专用的玩家精简档案,挂载在 chat-workbench 右列;不复用 /players/:id 详情页。
 * - 上下文:playerId + accountId(当前接待企微号)。
 * - 字段:身份卡 + 关系状态警示 + 当前管家关系字段(可编辑)+ 跨号 chip + 自定义信息(可编辑)。
 * - 编辑走 playerCenterMock 同源 store,广播刷新 /players、/players/:id;数据与详情页一致。
 * - 自定义信息为单一 customNote 文本(2026-05-30 简化),与详情页基础 tab 同源。
 */
import { CopyOutlined, EditOutlined } from '@ant-design/icons'
import {
  Alert,
  Avatar,
  Input,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  message as antdMessage,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import GenderBadge from './GenderBadge'
import { findAccount } from '../../services/chatflowMock'
import {
  getProfile,
  getRelation,
  getRelationsByPlayer,
  subscribePlayerCenter,
  tagLibrary,
  updateCustomNote,
  updateRelationFields,
} from '../../services/playerCenterMock'
import type { PlayerRelation, RelationStatus } from '../../types/playerCenter'

const { Text } = Typography

const STATUS_LABEL: Record<RelationStatus, { label: string; color: string }> = {
  normal: { label: '正常', color: 'green' },
  removed_by_agent: { label: '被管家删除', color: 'default' },
  removed_by_player: { label: '被玩家删除', color: 'red' },
}

const tagOptions = tagLibrary.map((t) => ({
  label: t.deprecated ? `${t.label}(已废弃)` : t.label,
  value: t.id,
}))

interface Props {
  playerId: string
  accountId: string
}

/** 当前管家关系字段(可编辑;非编辑列只读);key 由父级按 playerId::accountId 控制以重置编辑态 */
function RelationFields({ relation }: { relation: PlayerRelation }) {
  const handleSave = (
    field: 'description' | 'tagIds',
    value: string | string[],
  ) => {
    updateRelationFields({
      playerId: relation.playerId,
      accountId: relation.accountId,
      [field]: value,
    } as Parameters<typeof updateRelationFields>[0])
    antdMessage.success('已同步至企微')
  }

  const status = STATUS_LABEL[relation.relationStatus]

  return (
    <div className="cf-slot__section">
      <div className="cf-slot__field">
        <span className="cf-slot__label">描述</span>
        <Input.TextArea
          size="small"
          defaultValue={relation.description}
          autoSize={{ minRows: 1, maxRows: 4 }}
          placeholder="点击编辑(Ctrl+Enter 提交)"
          onBlur={(e) => {
            if (e.target.value !== relation.description) handleSave('description', e.target.value)
          }}
        />
      </div>
      <div className="cf-slot__field">
        <span className="cf-slot__label">标签</span>
        <Select
          size="small"
          mode="multiple"
          defaultValue={relation.tagIds}
          options={tagOptions}
          style={{ width: '100%' }}
          maxTagCount="responsive"
          placeholder="选择标签"
          onChange={(v) => handleSave('tagIds', v)}
        />
      </div>
      <div className="cf-slot__field">
        <span className="cf-slot__label">关系状态</span>
        <Tag color={status.color}>{status.label}</Tag>
      </div>
    </div>
  )
}

/**
 * 备注(展示 / 编辑合一):默认只读文本 + 编辑 icon,点击进入编辑态,失焦 / 回车保存。
 * key 由父级按 playerId::accountId 控制以重置编辑态。
 */
function RemarkInlineEditor({
  playerId,
  accountId,
  remark,
}: {
  playerId: string
  accountId: string
  remark: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(remark)

  // 广播变更后 remark 更新 → 同步 draft
  useEffect(() => {
    setDraft(remark)
  }, [remark])

  const save = () => {
    if (draft !== remark) {
      updateRelationFields({ playerId, accountId, remark: draft })
      antdMessage.success('已同步至企微')
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <Input
        size="small"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onPressEnter={save}
        placeholder="填写备注"
        style={{ maxWidth: 180 }}
      />
    )
  }

  return (
    <span className="cf-slot__remark">
      <span className="cf-slot__remark-text">{remark || '未设置备注'}</span>
      <Tooltip title="编辑备注">
        <EditOutlined
          className="cf-slot__remark-edit"
          onClick={() => setEditing(true)}
        />
      </Tooltip>
    </span>
  )
}

/** 自定义信息(单一 customNote,失焦保存;与详情页基础 tab 同源)。key 由父级按 playerId 控制 */
function CustomNoteEditor({ playerId, value }: { playerId: string; value: string }) {
  const [draft, setDraft] = useState(value)

  // 广播变更后 value 更新 → 同步 draft,避免编辑态显示旧值
  useEffect(() => {
    setDraft(value)
  }, [value])

  const handleSave = () => {
    if (draft === value) return
    updateCustomNote({ playerId, customNote: draft })
    antdMessage.success('已保存')
  }

  return (
    <div className="cf-slot__section">
      <span className="cf-slot__label">自定义信息</span>
      <Input.TextArea
        size="small"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleSave}
        autoSize={{ minRows: 4, maxRows: 12 }}
        maxLength={200}
        showCount
        placeholder="跨企微号统一的玩家自定义备注;失焦保存"
      />
    </div>
  )
}

function PlayerSlotPanel({ playerId, accountId }: Props) {
  const [version, setVersion] = useState(0)
  useEffect(() => subscribePlayerCenter(() => setVersion((v) => v + 1)), [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const profile = useMemo(() => getProfile(playerId), [playerId, version])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const relation = useMemo(() => getRelation(playerId, accountId), [playerId, accountId, version])
  const otherAccountIds = useMemo(
    () =>
      Array.from(
        new Set(
          getRelationsByPlayer(playerId)
            .map((r) => r.accountId)
            .filter((id) => id !== accountId),
        ),
      ).sort(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playerId, accountId, version],
  )

  if (!profile) {
    return (
      <div className="cf-slot">
        <Alert type="error" showIcon message="未找到玩家档案,可能已被清理" />
      </div>
    )
  }

  const openDetail = () => {
    // HashRouter:新标签页打开 #/players/:id,不打断当前接待
    const url = `${window.location.origin}${window.location.pathname}#/players/${playerId}`
    const win = window.open(url, '_blank')
    if (!win) antdMessage.warning('请允许在新标签页打开,或长按右键复制链接')
  }

  const otherAccounts = otherAccountIds
    .map((id) => findAccount(id))
    .filter((a): a is NonNullable<ReturnType<typeof findAccount>> => Boolean(a))

  return (
    <div className="cf-slot">
      {/* 关系状态警示横幅 */}
      {relation?.relationStatus === 'removed_by_player' ? (
        <Alert
          type="error"
          showIcon
          message="该玩家已删除好友,无法主动发起接待"
          style={{ marginBottom: 12 }}
        />
      ) : relation?.relationStatus === 'removed_by_agent' ? (
        <Alert
          type="warning"
          showIcon
          message="已被管家删除,继续接待请确认意图"
          style={{ marginBottom: 12 }}
        />
      ) : null}

      {/* 玩家身份卡 */}
      <div className="cf-slot__identity">
        <Avatar size={48} src={profile.avatarUrl} style={{ background: '#07C160', fontSize: 22 }}>
          {profile.nickname[0]}
        </Avatar>
        <div className="cf-slot__identity-main">
          <div className="cf-slot__nickname">
            {relation ? (
              <RemarkInlineEditor
                key={`${playerId}::${accountId}`}
                playerId={playerId}
                accountId={accountId}
                remark={relation.remark}
              />
            ) : (
              <Text type="secondary">未设置备注</Text>
            )}
            <GenderBadge gender={profile.gender} />
          </div>
          <Text className="cf-slot__playerid" type="secondary">
            {profile.playerId}{' '}
            <CopyOutlined
              style={{ cursor: 'pointer' }}
              onClick={async () => {
                try {
                  await navigator.clipboard?.writeText(profile.playerId)
                  antdMessage.success('已复制 playerId')
                } catch {
                  antdMessage.warning('请手动复制')
                }
              }}
            />
          </Text>
        </div>
      </div>

      {/* 当前管家关系字段(可编辑) */}
      {relation ? (
        <RelationFields key={`${playerId}::${accountId}`} relation={relation} />
      ) : (
        <Alert
          type="warning"
          showIcon
          message="未找到该(玩家,企微号)的关系记录,可能已被清理"
          style={{ marginBottom: 12 }}
        />
      )}

      {/* 跨号 chip(只显示其他企微号,不展开) */}
      {otherAccounts.length > 0 ? (
        <div className="cf-slot__section">
          <span className="cf-slot__label">其他管家</span>
          <Space size={4} wrap>
            {otherAccounts.slice(0, 3).map((a) => (
              <Tag key={a.id}>{a.shortName}</Tag>
            ))}
            {otherAccounts.length > 3 ? (
              <Tooltip title={otherAccounts.map((a) => a.shortName).join('、')}>
                <Tag>+{otherAccounts.length - 3}</Tag>
              </Tooltip>
            ) : null}
          </Space>
        </div>
      ) : null}

      {/* 自定义信息(可编辑) */}
      <CustomNoteEditor key={playerId} playerId={playerId} value={profile.customNote} />

      {/* 底部链接:新标签页打开完整档案 */}
      <div className="cf-slot__footer">
        <a onClick={openDetail}>在玩家管理打开 →</a>
      </div>
    </div>
  )
}

export default PlayerSlotPanel
