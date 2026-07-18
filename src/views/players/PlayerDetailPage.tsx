/**
 * /players/:id 玩家详情页(D2 页面 2)
 * - 面包屑 + 返回玩家管理按钮
 * - 页头(头像 / 昵称 / playerId / 跨号汇总徽章)
 * - 4 个 tab(基础 / 跨号关系 / 会话记录 / 游戏数据 v1.1+ 占位)
 * - 基础 tab:单一"自定义信息"文本域(简化自 3 字段)
 * - 跨号关系 tab:内联编辑(备注 Input / 描述 Textarea / 标签 Select 多选)
 * - 会话记录 tab:支持企微号筛选
 * - 编辑通过 mock store 广播刷新
 */
import { ArrowLeftOutlined, CopyOutlined } from '@ant-design/icons'
import {
  Alert,
  Avatar,
  Breadcrumb,
  Button,
  Card,
  Empty,
  Input,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message as antdMessage,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { findAccount } from '../../services/chatflowMock'
import {
  getConversationIndex,
  getProfile,
  getRelationsByPlayer,
  subscribePlayerCenter,
  tagLibrary,
  updateCustomNote,
  updateRelationFields,
} from '../../services/playerCenterMock'
import type { PlayerProfile, PlayerRelation } from '../../types/playerCenter'
import ConversationDrawer, {
  type ConversationDrawerContext,
} from '../../components/common/ConversationDrawer'
import GenderBadge from '../../components/common/GenderBadge'

const { Text, Title } = Typography
const TAB_KEYS = ['basic', 'relations', 'game'] as const
type TabKey = (typeof TAB_KEYS)[number]
const STATUS_LABEL = {
  normal: { label: '正常', color: 'green' },
  removed_by_agent: { label: '被管家删除', color: 'default' },
  removed_by_player: { label: '被玩家删除', color: 'red' },
} as const

/** 兼容旧深链:?tab=sessions 已合并入 relations */
function resolveInitialTab(raw: string | null): TabKey {
  if (raw === 'sessions') return 'relations'
  if (raw && (TAB_KEYS as readonly string[]).includes(raw)) return raw as TabKey
  return 'basic'
}

function PlayerDetailPage() {
  const { playerId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabKey>(() => resolveInitialTab(searchParams.get('tab')))
  const [version, setVersion] = useState(0)
  const [drawerCtx, setDrawerCtx] = useState<ConversationDrawerContext | null>(null)

  useEffect(() => subscribePlayerCenter(() => setVersion((v) => v + 1)), [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const profile = useMemo(() => getProfile(playerId), [playerId, version])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const relations = useMemo(() => getRelationsByPlayer(playerId), [playerId, version])
  const sessions = useMemo(
    () => getConversationIndex().filter((c) => c.playerId === playerId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playerId, version],
  )

  const handleTabChange = (k: string) => {
    setTab(k as TabKey)
    const next = new URLSearchParams(searchParams)
    next.set('tab', k)
    setSearchParams(next, { replace: true })
  }

  if (!profile) {
    return (
      <section style={{ padding: 24 }}>
        <Empty description="玩家不存在或已被清理" />
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Button onClick={() => navigate('/players')}>返回玩家管理</Button>
        </div>
      </section>
    )
  }

  const visibleRelations = relations
  const totalConvCount = sessions.length
  const earliestAdd = relations
    .map((r) => r.addedAt)
    .sort()
    .at(0)

  return (
    <section style={{ padding: 16, background: '#F5F5F5', minHeight: '100%' }}>
      {/* 面包屑 + 返回主页按钮 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12,
        }}
      >
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/players')}
        >
          返回玩家管理
        </Button>
        <Breadcrumb
          items={[
            { title: <Link to="/players">玩家管理</Link> },
            { title: '玩家详情' },
            { title: profile.nickname },
          ]}
        />
      </div>

      <div
        style={{
          background: '#FFFFFF',
          padding: 16,
          borderRadius: 6,
          marginBottom: 12,
          display: 'flex',
          gap: 16,
          alignItems: 'center',
        }}
      >
        <Avatar size={64} style={{ background: '#07C160', fontSize: 28 }}>
          {profile.nickname[0]}
        </Avatar>
        <div style={{ flex: 1 }}>
          <Title level={4} style={{ marginTop: 0, marginBottom: 4 }}>
            <Space size={6} align="center">
              {profile.nickname}
              <GenderBadge gender={profile.gender} showLabel />
            </Space>
          </Title>
          <Text style={{ fontFamily: 'SF Mono, Menlo, monospace', color: '#8C8C8C' }}>
            playerId: {profile.playerId}{' '}
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
        <Space size={8} wrap>
          <Tag color="green">被 {visibleRelations.length} 个企微号添加</Tag>
          <Tag color="blue">总会话 {totalConvCount}</Tag>
          <Tag>最早添加 {earliestAdd?.slice(0, 10) ?? '-'}</Tag>
        </Space>
      </div>

      <Tabs
        activeKey={tab}
        onChange={handleTabChange}
        items={[
          {
            key: 'basic',
            label: '基础',
            children: <BasicTab profile={profile} relations={relations} />,
          },
          {
            key: 'relations',
            label: `跨号关系与会话 (${visibleRelations.length})`,
            children: (
              <RelationsTab
                playerId={playerId}
                relations={relations}
                sessions={sessions}
                onViewConversation={(conversationId) =>
                  setDrawerCtx({ kind: 'conversation', conversationId })
                }
                onStartFromAccount={(accountId) =>
                  navigate(
                    `/workbench?playerId=${encodeURIComponent(playerId)}&accountId=${encodeURIComponent(accountId)}`,
                  )
                }
              />
            ),
          },
          {
            key: 'game',
            label: '游戏数据 · v1.1+',
            children: <GamePlaceholderTab />,
          },
        ]}
      />

      <ConversationDrawer
        open={drawerCtx !== null}
        context={drawerCtx}
        onClose={() => setDrawerCtx(null)}
      />
    </section>
  )
}

function BasicTab({
  profile,
  relations,
}: {
  profile: PlayerProfile
  relations: PlayerRelation[]
}) {
  const [draft, setDraft] = useState(profile.customNote)

  // profile 来自 mock store(props 由父组件 useMemo 取最新);广播变更后 profile 更新
  // 时,把 draft 同步为最新值,避免编辑态显示旧值。
  useEffect(() => {
    setDraft(profile.customNote)
  }, [profile.customNote])

  const handleSave = () => {
    if (draft === profile.customNote) return
    updateCustomNote({ playerId: profile.playerId, customNote: draft })
    antdMessage.success('已保存')
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card title="自定义信息" size="small">
        <Input.TextArea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleSave}
          autoSize={{ minRows: 2, maxRows: 6 }}
          maxLength={200}
          showCount
          placeholder="跨企微号统一的玩家自定义备注;失焦保存"
        />
        <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
          V1 单一文本字段;v1.1+ 接入游戏数据后将迁移到「游戏数据」tab。
        </Text>
      </Card>

      <Card title="备注 / 描述聚合视图(只读)" size="small">
        {relations.length === 0 ? (
          <Empty description="无跨号关系" />
        ) : (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {relations
              .slice()
              .sort((a, b) => a.accountId.localeCompare(b.accountId))
              .map((r) => {
                const acc = findAccount(r.accountId)
                return (
                  <Card
                    key={r.accountId}
                    size="small"
                    type="inner"
                    title={acc?.shortName ?? r.accountId}
                  >
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Text>
                        <Text type="secondary">备注:</Text> {r.remark || '-'}
                      </Text>
                      <Text>
                        <Text type="secondary">描述:</Text> {r.description || '-'}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        添加时间 {r.addedAt.slice(0, 10)}
                      </Text>
                    </Space>
                  </Card>
                )
              })}
            <Text type="secondary" style={{ fontSize: 12 }}>
              详细编辑去「跨号关系」tab 或工作台 slot。
            </Text>
          </Space>
        )}
      </Card>
    </Space>
  )
}

function RelationsTab({
  playerId,
  relations,
  sessions,
  onViewConversation,
  onStartFromAccount,
}: {
  playerId: string
  relations: PlayerRelation[]
  sessions: ReturnType<typeof getConversationIndex>
  onViewConversation: (conversationId: string) => void
  onStartFromAccount: (accountId: string) => void
}) {
  void playerId // playerId 用于 onStartFromAccount 上下文(由父级闭包闭合)
  const tagOptions = tagLibrary.map((t) => ({
    label: t.deprecated ? `${t.label}(已废弃)` : t.label,
    value: t.id,
  }))

  // 该(玩家,企微号)→ conversation 索引(同一关系最多 1 个,跨轮次复用 conversationId)
  const sessionByAccountId = useMemo(() => {
    const map = new Map<string, (typeof sessions)[number]>()
    sessions.forEach((s) => map.set(s.accountId, s))
    return map
  }, [sessions])

  const handleSave = (
    r: PlayerRelation,
    field: 'remark' | 'description' | 'tagIds',
    value: string | string[],
  ) => {
    updateRelationFields({
      playerId: r.playerId,
      accountId: r.accountId,
      [field]: value,
    } as Parameters<typeof updateRelationFields>[0])
    antdMessage.success('已同步至企微')
  }

  const columns: ColumnsType<PlayerRelation> = [
    {
      title: '管家',
      key: 'account',
      width: 140,
      fixed: 'left',
      render: (_v, r) => {
        const acc = findAccount(r.accountId)
        return (
          <span>
            {acc?.shortName ?? r.accountId}
            {acc && acc.status !== 'online' ? (
              <Tag color={acc.status === 'banned' ? 'red' : 'orange'} style={{ marginLeft: 4 }}>
                {acc.status === 'banned' ? '封禁' : '离线'}
              </Tag>
            ) : null}
          </span>
        )
      },
    },
    {
      title: '备注',
      key: 'remark',
      width: 220,
      render: (_v, r) => (
        <Input
          defaultValue={r.remark}
          onBlur={(e) => {
            if (e.target.value !== r.remark) handleSave(r, 'remark', e.target.value)
          }}
          placeholder="点击编辑"
        />
      ),
    },
    {
      title: '描述',
      key: 'description',
      width: 260,
      render: (_v, r) => (
        <Input.TextArea
          defaultValue={r.description}
          autoSize={{ minRows: 1, maxRows: 4 }}
          onBlur={(e) => {
            if (e.target.value !== r.description) handleSave(r, 'description', e.target.value)
          }}
          placeholder="点击编辑(Ctrl+Enter 提交)"
        />
      ),
    },
    {
      title: '标签',
      key: 'tags',
      width: 220,
      render: (_v, r) => (
        <Select
          mode="multiple"
          defaultValue={r.tagIds}
          options={tagOptions}
          style={{ width: '100%' }}
          maxTagCount="responsive"
          onChange={(v) => handleSave(r, 'tagIds', v)}
        />
      ),
    },
    {
      title: '关系状态',
      key: 'status',
      width: 110,
      render: (_v, r) => {
        const meta = STATUS_LABEL[r.relationStatus]
        return <Tag color={meta.color}>{meta.label}</Tag>
      },
    },
    {
      title: '添加 / 删除时间',
      key: 'time',
      width: 160,
      render: (_v, r) => (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            添加 {r.addedAt.slice(0, 10)}
          </Text>
          {r.deletedAt ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              删除 {r.deletedAt.slice(0, 10)}
            </Text>
          ) : null}
        </div>
      ),
    },
    {
      title: '会话',
      key: 'conversation',
      width: 280,
      render: (_v, r) => {
        const session = sessionByAccountId.get(r.accountId)
        if (!session) {
          return (
            <Text type="secondary" style={{ fontSize: 12 }}>
              暂无会话
            </Text>
          )
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              共 {session.messageCount} 条 · 最近{' '}
              {session.lastMessage.sentAt.slice(5, 16).replace('T', ' ')}
            </Text>
            <Text ellipsis style={{ maxWidth: 260 }}>
              {session.lastMessage.senderType === 'agent' ? '客服:' : '玩家:'}
              {session.lastMessage.contentPreview}
            </Text>
          </div>
        )
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_v, r) => {
        const session = sessionByAccountId.get(r.accountId)
        if (session) {
          return (
            <Button size="small" type="link" onClick={() => onViewConversation(session.conversationId)}>
              查看会话
            </Button>
          )
        }
        // 无会话:被玩家删除的关系不能主动发起
        if (r.relationStatus === 'removed_by_player') {
          return (
            <Tooltip title="该玩家已删好友,无法主动发起会话">
              <Button size="small" type="link" disabled>
                主动发起
              </Button>
            </Tooltip>
          )
        }
        return (
          <Button size="small" type="link" onClick={() => onStartFromAccount(r.accountId)}>
            主动发起
          </Button>
        )
      },
    },
  ]

  return (
    <Table<PlayerRelation>
      rowKey={(r) => `${r.playerId}::${r.accountId}`}
      columns={columns}
      dataSource={relations.slice().sort((a, b) => a.addedAt.localeCompare(b.addedAt))}
      pagination={false}
      scroll={{ x: 1540 }}
      size="small"
    />
  )
}

function GamePlaceholderTab() {
  return (
    <Alert
      type="info"
      showIcon
      message="游戏数据 · 待 v1.1+ 接入"
      description={
        <p style={{ marginBottom: 0, fontSize: 12, color: '#8C8C8C' }}>
          V1 阶段如需手动备注玩家信息,可在「基础」tab 的「自定义信息」文本域记录。
        </p>
      }
    />
  )
}

export default PlayerDetailPage
