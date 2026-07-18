/**
 * /messages 消息管理列表页(D2 页面 3)
 * 当前为 build 阶段第 1 轮:
 *   - 顶部筛选条 + 会话索引表 + 行操作"查看对话消息" + 分页
 *   - 支持 ?conversationId=<id> 深链直达 Drawer(异步并行 — 表格按其余筛选,Drawer 立即打开)
 */
import {
  Avatar,
  Button,
  Empty,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { findAccount, findAgent, findPlayer, wechatAccounts } from '../../services/chatflowMock'
import {
  getConversationRounds,
  getRelation,
  getRoundMessages,
  getTagsByIds,
  subscribePlayerCenter,
  tagLibrary,
} from '../../services/playerCenterMock'
import type { ConversationRoundEntry } from '../../types/playerCenter'
import ConversationDrawer, {
  type ConversationDrawerContext,
} from '../../components/common/ConversationDrawer'

const { Text } = Typography

interface FilterState {
  conversationId: string
  accountIds: string[]
  content: string
  playerRemark: string
  playerTagIds: string[]
}

const DEFAULT_FILTER: FilterState = {
  conversationId: '',
  accountIds: [],
  content: '',
  playerRemark: '',
  playerTagIds: [],
}

// ── 排序(受控:回写 URL,同时修复原"固定排序 + 列头只重排当前页"的跨页 bug)──
type MsgSortField = 'last' | 'count'
interface SortState {
  field: MsgSortField
  order: 'ascend' | 'descend'
}
const DEFAULT_SORT: SortState = { field: 'last', order: 'descend' }
/** 列 key ↔ 排序字段 */
const SORT_COLUMN_KEY: Record<MsgSortField, string> = {
  last: 'last',
  count: 'messageCount',
}

// ── URL query 解析 ──
// 注:筛选「会话标识」用 `cid`,与 Drawer 的 `conversationId`/`round`(D2 §3.5.5)区分,互不覆盖。
function parseFilterFromUrl(sp: URLSearchParams): FilterState {
  const csv = (k: string) => {
    const v = sp.get(k)
    return v ? v.split(',').filter(Boolean) : []
  }
  return {
    conversationId: sp.get('cid') ?? '',
    accountIds: csv('acc'),
    content: sp.get('q') ?? '',
    playerRemark: sp.get('remark') ?? '',
    playerTagIds: csv('tags'),
  }
}
function parseSortFromUrl(sp: URLSearchParams): SortState {
  const f = sp.get('sort')
  if (f !== 'last' && f !== 'count') return DEFAULT_SORT
  const o = sp.get('order')
  return { field: f, order: o === 'asc' ? 'ascend' : o === 'desc' ? 'descend' : DEFAULT_SORT.order }
}
function parsePageSize(sp: URLSearchParams): number {
  const n = Number(sp.get('ps'))
  return [10, 20, 50, 100].includes(n) ? n : 20
}
function parsePage(sp: URLSearchParams): number {
  const n = Number(sp.get('p'))
  return Number.isInteger(n) && n > 0 ? n : 1
}

function MessagesListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  // 初值从 URL query 还原(惰性);后续变更回写 URL
  const [filter, setFilter] = useState<FilterState>(() => parseFilterFromUrl(searchParams))
  // 消息内容输入用独立 state + debounce,避免每次按键都扫全量消息(D2 §3.5.1 500ms)
  const [contentInput, setContentInput] = useState(() => searchParams.get('q') ?? '')
  const [sort, setSort] = useState<SortState>(() => parseSortFromUrl(searchParams))
  const [page, setPage] = useState(() => parsePage(searchParams))
  const [pageSize, setPageSize] = useState(() => parsePageSize(searchParams))
  const [version, setVersion] = useState(0)

  useEffect(() => subscribePlayerCenter(() => setVersion((v) => v + 1)), [])

  useEffect(() => {
    if (contentInput === filter.content) return
    const handle = setTimeout(() => {
      setFilter((f) => ({ ...f, content: contentInput }))
      setPage(1)
    }, 500)
    return () => clearTimeout(handle)
  }, [contentInput, filter.content])

  // Drawer 状态完全由 URL 驱动:
  //  - 打开:点行操作时写 ?conversationId=<id>
  //  - 关闭:Drawer onClose 时删 ?conversationId
  //  - 深链:URL 携带 conversationId 进入即自动打开
  // 单一信源消除双 state 同步导致的"关不掉 / 弹两次"问题。
  // round 用数字 roundIndex(不把含 # 的 roundId 塞进 query,避免与 HashRouter 冲突)。
  const conversationIdInUrl = searchParams.get('conversationId')
  const roundInUrl = searchParams.get('round')
  const drawerCtx: ConversationDrawerContext | null = conversationIdInUrl
    ? {
        kind: 'conversation',
        conversationId: conversationIdInUrl,
        roundIndex: roundInUrl ? Number(roundInUrl) : undefined,
      }
    : null

  const openDrawer = (conversationId: string, roundIndex: number) => {
    if (conversationIdInUrl === conversationId && roundInUrl === String(roundIndex)) return
    const next = new URLSearchParams(searchParams)
    next.set('conversationId', conversationId)
    next.set('round', String(roundIndex))
    setSearchParams(next, { replace: true })
  }

  const handleCloseDrawer = () => {
    if (!conversationIdInUrl) return
    const next = new URLSearchParams(searchParams)
    next.delete('conversationId')
    next.delete('round')
    setSearchParams(next, { replace: true })
  }

  // 筛选 / 排序 / 分页态实时回写 URL(replaceState,默认值省略);
  // 与 Drawer 的 conversationId/round 共存:保留这两个外部参数,只增删自己的 key。
  useEffect(() => {
    const next = new URLSearchParams()
    if (conversationIdInUrl) next.set('conversationId', conversationIdInUrl)
    if (roundInUrl) next.set('round', roundInUrl)
    if (filter.conversationId) next.set('cid', filter.conversationId)
    if (filter.accountIds.length) next.set('acc', filter.accountIds.join(','))
    if (filter.content) next.set('q', filter.content)
    if (filter.playerRemark) next.set('remark', filter.playerRemark)
    if (filter.playerTagIds.length) next.set('tags', filter.playerTagIds.join(','))
    if (sort.field !== DEFAULT_SORT.field || sort.order !== DEFAULT_SORT.order) {
      next.set('sort', sort.field)
      next.set('order', sort.order === 'ascend' ? 'asc' : 'desc')
    }
    if (page !== 1) next.set('p', String(page))
    if (pageSize !== 20) next.set('ps', String(pageSize))
    // 串相同则跳过,避免与 openDrawer/closeDrawer 的 setSearchParams 形成回写循环
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true })
  }, [filter, sort, page, pageSize, conversationIdInUrl, roundInUrl, searchParams, setSearchParams])

  // /messages 以「会话轮次」为维度:同一会话的多轮(已结束→重开)拆成多行
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allRounds = useMemo(() => getConversationRounds(), [version])

  const filtered = useMemo(() => {
    const contentQuery = filter.content.trim().toLowerCase()
    const cidQuery = filter.conversationId.trim()
    return allRounds.filter((s) => {
      // conversationId 精确筛:支持粘 conversationId(命中其全部轮次)或 roundId(命中单轮)
      if (cidQuery && s.conversationId !== cidQuery && s.roundId !== cidQuery) return false
      if (filter.accountIds.length > 0 && !filter.accountIds.includes(s.accountId)) return false
      // 消息内容:只扫「该轮」的消息(text 或 mediaName 任一命中即纳入)
      if (contentQuery) {
        const msgs = getRoundMessages(s.conversationId, s.roundIndex)
        const hit = msgs.some((m) => {
          if (m.contentType === 'system') return false
          const text = (m.text ?? '').toLowerCase()
          const mediaName = (m.mediaName ?? '').toLowerCase()
          return text.includes(contentQuery) || mediaName.includes(contentQuery)
        })
        if (!hit) return false
      }
      const relation = getRelation(s.playerId, s.accountId)
      if (
        filter.playerRemark &&
        !(relation?.remark.toLowerCase().includes(filter.playerRemark.toLowerCase()) ?? false)
      )
        return false
      if (
        filter.playerTagIds.length > 0 &&
        !filter.playerTagIds.some((tid) => relation?.tagIds.includes(tid))
      )
        return false
      return true
    })
  }, [allRounds, filter])

  const sortedFiltered = useMemo(() => {
    const dir = sort.order === 'ascend' ? 1 : -1
    return [...filtered].sort((a, b) =>
      sort.field === 'count'
        ? (a.messageCount - b.messageCount) * dir
        : a.lastMessage.sentAt.localeCompare(b.lastMessage.sentAt) * dir,
    )
  }, [filtered, sort])
  const total = sortedFiltered.length
  const pageData = useMemo(
    () => sortedFiltered.slice((page - 1) * pageSize, page * pageSize),
    [sortedFiltered, page, pageSize],
  )

  const tagOptions = tagLibrary.map((t) => ({
    label: t.deprecated ? `${t.label}(已废弃)` : t.label,
    value: t.id,
  }))
  const accountOptions = wechatAccounts.map((a) => ({
    label: `${a.shortName}${a.status !== 'online' ? ` · ${a.status === 'banned' ? '封禁' : '离线'}` : ''}`,
    value: a.id,
  }))

  const columns: ColumnsType<ConversationRoundEntry> = [
    {
      title: '会话轮次',
      key: 'round',
      width: 200,
      render: (_v, r) => (
        <Text style={{ fontFamily: 'SF Mono, Menlo, monospace', fontSize: 12 }}>
          {r.roundId}
        </Text>
      ),
    },
    {
      title: '玩家',
      key: 'player',
      width: 235,
      render: (_v, r) => {
        const p = findPlayer(r.playerId)
        const rel = getRelation(r.playerId, r.accountId)
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar size={28} style={{ background: '#07C160' }}>
              {p?.nickname?.[0] ?? '?'}
            </Avatar>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
              <Text>{p?.nickname ?? r.playerId}</Text>
              {rel?.remark ? (
                <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                  {rel.remark}
                </Text>
              ) : null}
            </div>
          </div>
        )
      },
    },
    {
      title: '对话管家',
      key: 'account',
      width: 140,
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
      title: '玩家标签',
      key: 'tags',
      width: 155,
      render: (_v, r) => {
        const rel = getRelation(r.playerId, r.accountId)
        if (!rel) return null
        const tags = getTagsByIds(rel.tagIds).slice(0, 3)
        return (
          <Space size={4} wrap>
            {tags.map((t) => (
              <Tag key={t.id} color="green">
                {t.label}
              </Tag>
            ))}
            {rel.tagIds.length > 3 ? <Tag>+{rel.tagIds.length - 3}</Tag> : null}
          </Space>
        )
      },
    },
    {
      title: '最后消息',
      key: 'last',
      width: 420,
      sorter: true,
      sortOrder: sort.field === 'last' ? sort.order : null,
      render: (_v, r) => (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.lastMessage.senderType === 'agent'
              ? findAgent(r.lastMessage.senderId)?.name ?? '客服'
              : '玩家'}{' '}
            · {r.lastMessage.sentAt.slice(0, 16).replace('T', ' ')}
          </Text>
          <Tooltip title={r.lastMessage.contentPreview}>
            <Text ellipsis style={{ maxWidth: 380 }}>
              {r.lastMessage.contentPreview}
            </Text>
          </Tooltip>
        </div>
      ),
    },
    {
      title: '消息总数',
      dataIndex: 'messageCount',
      width: 85,
      sorter: true,
      sortOrder: sort.field === 'count' ? sort.order : null,
    },
    {
      title: '操作',
      key: 'actions',
      width: 165,
      fixed: 'right',
      render: (_v, r) => (
        <Button size="small" type="link" onClick={() => openDrawer(r.conversationId, r.roundIndex)}>
          查看对话消息
        </Button>
      ),
    },
  ]

  const handleClearFilter = () => {
    setFilter(DEFAULT_FILTER)
    setContentInput('')
    setPage(1)
  }

  return (
    <section style={{ padding: 16, background: '#F5F5F5', minHeight: '100%' }}>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        消息管理
      </Typography.Title>

      <div
        style={{
          background: '#FFFFFF',
          padding: 12,
          borderRadius: 6,
          marginBottom: 12,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <Input
          placeholder="conversationId(精确)"
          allowClear
          value={filter.conversationId}
          onChange={(e) => {
            setFilter((f) => ({ ...f, conversationId: e.target.value }))
            setPage(1)
          }}
          style={{ width: 220, fontFamily: 'SF Mono, Menlo, monospace' }}
        />
        <Select
          mode="multiple"
          placeholder="对话管家(多选)"
          allowClear
          options={accountOptions}
          value={filter.accountIds}
          onChange={(v) => {
            setFilter((f) => ({ ...f, accountIds: v }))
            setPage(1)
          }}
          style={{ minWidth: 200 }}
          maxTagCount="responsive"
        />
        <Input
          placeholder="消息内容(扫全部聊天记录)"
          allowClear
          value={contentInput}
          onChange={(e) => setContentInput(e.target.value)}
          style={{ width: 220 }}
        />
        <Input
          placeholder="玩家备注(模糊)"
          allowClear
          value={filter.playerRemark}
          onChange={(e) => {
            setFilter((f) => ({ ...f, playerRemark: e.target.value }))
            setPage(1)
          }}
          style={{ width: 200 }}
        />
        <Select
          mode="multiple"
          placeholder="玩家标签"
          allowClear
          options={tagOptions}
          value={filter.playerTagIds}
          onChange={(v) => {
            setFilter((f) => ({ ...f, playerTagIds: v }))
            setPage(1)
          }}
          style={{ minWidth: 180 }}
          maxTagCount="responsive"
        />
        <Button onClick={handleClearFilter}>清空筛选</Button>
      </div>

      <Table<ConversationRoundEntry>
        rowKey="roundId"
        columns={columns}
        dataSource={pageData}
        scroll={{ x: 1380 }}
        size="small"
        onChange={(_pag, _filters, sorter) => {
          const s = Array.isArray(sorter) ? sorter[0] : sorter
          const key = s?.order ? String(s.columnKey ?? '') : ''
          const field = (Object.keys(SORT_COLUMN_KEY) as MsgSortField[]).find(
            (f) => SORT_COLUMN_KEY[f] === key,
          )
          if (field && s?.order) setSort({ field, order: s.order })
          else setSort(DEFAULT_SORT)
        }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (t, range) => `共 ${t} 轮会话 · ${range[0]}-${range[1]}`,
          onChange: (p, s) => {
            setPage(p)
            setPageSize(s)
          },
        }}
        locale={{
          emptyText: <Empty description="未找到匹配的会话" />,
        }}
      />

      <ConversationDrawer
        open={drawerCtx !== null}
        context={drawerCtx}
        onClose={handleCloseDrawer}
      />
    </section>
  )
}

export default MessagesListPage
