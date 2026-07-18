/**
 * /players 玩家管理列表页(D2 页面 1 — V2:玩家维度)
 *
 * 2026-05-30 重构:列表粒度从「(玩家×企微号)关系记录」改回「玩家(playerId)」。
 *   - 同一玩家被 N 个企微号添加 → 主表只出 1 行;跨号字段在主表用 chip 去重聚合
 *   - 列表纯只读、不展开、点行不跳转;行高一致
 *   - 行尾仅一个操作:查看完整档案(跳详情页)
 *   - 关系级细节(备注 / 描述 / 删除时间)不在主表展示,去详情页跨号关系 tab 看
 *   - "查看会话"行操作移除,通过详情页"会话记录" tab 浏览
 *   - 关系状态分类切换语义 = "至少有一条该状态关系的玩家"
 *   - 筛选语义统一为"该玩家任一可见关系命中即纳入"
 */
import {
  Avatar,
  Button,
  Empty,
  Input,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import GenderBadge from '../../components/common/GenderBadge'
import { findAccount, wechatAccounts } from '../../services/chatflowMock'
import {
  getPlayersAggregatedView,
  getTagsByIds,
  subscribePlayerCenter,
  tagLibrary,
} from '../../services/playerCenterMock'
import type { PlayerAggregatedView } from '../../services/playerCenterMock'
import type { RelationStatus } from '../../types/playerCenter'

const { Text } = Typography

interface FilterState {
  playerId: string
  nickname: string
  accountIds: string[]
  remark: string
  tagIds: string[]
  description: string
  relationStatus: RelationStatus
}

const DEFAULT_FILTER: FilterState = {
  playerId: '',
  nickname: '',
  accountIds: [],
  remark: '',
  tagIds: [],
  description: '',
  relationStatus: 'normal',
}

const STATUS_LABEL: Record<RelationStatus, string> = {
  normal: '正常',
  removed_by_agent: '被管家删除',
  removed_by_player: '被玩家删除',
}

// ── 排序(受控:既能回写 URL,又修复原"固定排序 + 列头只重排当前页"的跨页 bug)──
type PlayerSortField = 'updated' | 'added' | 'rel'
interface SortState {
  field: PlayerSortField
  order: 'ascend' | 'descend'
}
const DEFAULT_SORT: SortState = { field: 'updated', order: 'descend' }
/** 列 key ↔ 排序字段(URL 用短名) */
const SORT_COLUMN_KEY: Record<PlayerSortField, string> = {
  rel: 'relationCount',
  added: 'earliestAddedAt',
  updated: 'latestUpdatedAt',
}

// ── URL query 解析(深链 / 刷新 / 分享还原视图;非法值回落默认)──
function parseFilterFromUrl(sp: URLSearchParams): FilterState {
  const csv = (k: string) => {
    const v = sp.get(k)
    return v ? v.split(',').filter(Boolean) : []
  }
  const status = sp.get('status')
  return {
    playerId: sp.get('pid') ?? '',
    nickname: sp.get('nick') ?? '',
    accountIds: csv('acc'),
    remark: sp.get('remark') ?? '',
    tagIds: csv('tags'),
    description: sp.get('desc') ?? '',
    relationStatus:
      status === 'removed_by_agent' || status === 'removed_by_player' ? status : 'normal',
  }
}
function parseSortFromUrl(sp: URLSearchParams): SortState {
  const f = sp.get('sort')
  if (f !== 'added' && f !== 'rel' && f !== 'updated') return DEFAULT_SORT
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

function formatDate(iso?: string) {
  if (!iso) return '-'
  return iso.slice(0, 10)
}
function formatDateTime(iso?: string) {
  if (!iso) return '-'
  return iso.slice(5, 16).replace('T', ' ')
}

/** 对单个玩家聚合视图施加非状态筛选(返回是否命中)。
 *  状态分类不在这里处理(由调用方决定)。 */
function matchesNonStatusFilter(view: PlayerAggregatedView, filter: FilterState): boolean {
  if (filter.playerId && view.playerId !== filter.playerId.trim()) return false
  if (
    filter.nickname &&
    !view.profile.nickname.toLowerCase().includes(filter.nickname.toLowerCase())
  )
    return false
  if (
    filter.accountIds.length > 0 &&
    !view.relations.some((r) => filter.accountIds.includes(r.accountId))
  )
    return false
  if (
    filter.remark &&
    !view.relations.some((r) => r.remark.toLowerCase().includes(filter.remark.toLowerCase()))
  )
    return false
  if (
    filter.description &&
    !view.relations.some((r) =>
      r.description.toLowerCase().includes(filter.description.toLowerCase()),
    )
  )
    return false
  if (
    filter.tagIds.length > 0 &&
    !view.relations.some((r) => filter.tagIds.some((tid) => r.tagIds.includes(tid)))
  )
    return false
  return true
}

function PlayersListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  // 初值从 URL query 还原(惰性);后续变更回写 URL
  const [filter, setFilter] = useState<FilterState>(() => parseFilterFromUrl(searchParams))
  const [sort, setSort] = useState<SortState>(() => parseSortFromUrl(searchParams))
  const [page, setPage] = useState(() => parsePage(searchParams))
  const [pageSize, setPageSize] = useState(() => parsePageSize(searchParams))
  const [version, setVersion] = useState(0)

  useEffect(() => {
    return subscribePlayerCenter(() => setVersion((v) => v + 1))
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const allViews = useMemo(() => getPlayersAggregatedView(), [version])

  // 非状态筛选后的中间集 — 用于状态分类计数与最终结果
  const passNonStatus = useMemo(
    () => allViews.filter((v) => matchesNonStatusFilter(v, filter)),
    [allViews, filter],
  )

  const filteredViews = useMemo(
    () => passNonStatus.filter((v) => v.hasRelationStatus(filter.relationStatus)),
    [passNonStatus, filter.relationStatus],
  )

  // 分类计数(与其他筛选联动,但相互排除 relationStatus 自身)
  const counts = useMemo(
    () => ({
      normal: passNonStatus.filter((v) => v.hasRelationStatus('normal')).length,
      removed_by_agent: passNonStatus.filter((v) => v.hasRelationStatus('removed_by_agent')).length,
      removed_by_player: passNonStatus.filter((v) => v.hasRelationStatus('removed_by_player'))
        .length,
    }),
    [passNonStatus],
  )

  const sorted = useMemo(() => {
    const dir = sort.order === 'ascend' ? 1 : -1
    return [...filteredViews].sort((a, b) => {
      if (sort.field === 'rel') return (a.relations.length - b.relations.length) * dir
      if (sort.field === 'added') return a.earliestAddedAt.localeCompare(b.earliestAddedAt) * dir
      return a.latestUpdatedAt.localeCompare(b.latestUpdatedAt) * dir
    })
  }, [filteredViews, sort])

  // 筛选 / 分类 / 排序 / 分页态实时回写 URL(replaceState,默认值省略,保持链接干净)
  useEffect(() => {
    const next = new URLSearchParams()
    if (filter.playerId) next.set('pid', filter.playerId)
    if (filter.nickname) next.set('nick', filter.nickname)
    if (filter.accountIds.length) next.set('acc', filter.accountIds.join(','))
    if (filter.remark) next.set('remark', filter.remark)
    if (filter.tagIds.length) next.set('tags', filter.tagIds.join(','))
    if (filter.description) next.set('desc', filter.description)
    if (filter.relationStatus !== 'normal') next.set('status', filter.relationStatus)
    if (sort.field !== DEFAULT_SORT.field || sort.order !== DEFAULT_SORT.order) {
      next.set('sort', sort.field)
      next.set('order', sort.order === 'ascend' ? 'asc' : 'desc')
    }
    if (page !== 1) next.set('p', String(page))
    if (pageSize !== 20) next.set('ps', String(pageSize))
    // 串相同则跳过:setSearchParams 在 location 变化后会换新引用,无此保护会触发死循环
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true })
  }, [filter, sort, page, pageSize, searchParams, setSearchParams])
  const total = sorted.length
  const pageData = useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [sorted, page, pageSize],
  )

  const tagOptions = tagLibrary.map((t) => ({
    label: t.deprecated ? `${t.label}(已废弃)` : t.label,
    value: t.id,
  }))
  const accountOptions = wechatAccounts.map((a) => ({
    label: `${a.shortName}${a.status !== 'online' ? ` · ${a.status === 'banned' ? '封禁' : '离线'}` : ''}`,
    value: a.id,
  }))

  const columns: ColumnsType<PlayerAggregatedView> = [
    {
      title: '微信昵称',
      key: 'nickname',
      width: 240,
      render: (_v, view) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar size={32} style={{ background: '#07C160' }}>
            {view.profile.nickname[0] ?? '?'}
          </Avatar>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Text>{view.profile.nickname}</Text>
              <GenderBadge gender={view.profile.gender} />
            </span>
            <Text
              type="secondary"
              style={{ fontSize: 12, fontFamily: 'SF Mono, Menlo, monospace' }}
            >
              {view.playerId}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: '添加管家',
      key: 'accounts',
      width: 220,
      render: (_v, view) => {
        // chip 直接按 relations 渲染(不去重),颜色 + 后缀按关系状态区分;
        // 号本身的在线/离线/封禁状态降级到 Tooltip,避免 chip 视觉过载。
        const sorted = [...view.relations].sort((a, b) => a.accountId.localeCompare(b.accountId))
        const visible = sorted.slice(0, 3)
        const overflow = sorted.length - visible.length

        const renderChip = (rel: typeof sorted[number]) => {
          const acc = findAccount(rel.accountId)
          const accName = acc?.shortName ?? rel.accountId
          const accStatusText =
            acc?.status === 'banned' ? '号已封禁' : acc?.status === 'offline' ? '号已离线' : '号在线'
          let color: string
          let label: string
          let statusText: string
          if (rel.relationStatus === 'removed_by_agent') {
            color = 'default'
            label = `${accName} · 已删`
            statusText = '该关系已被管家删除'
          } else if (rel.relationStatus === 'removed_by_player') {
            color = 'red'
            label = `${accName} · 玩家删`
            statusText = '该关系已被玩家删除(无法主动发起)'
          } else {
            color = 'blue'
            label = accName
            statusText = '关系正常'
          }
          return (
            <Tooltip key={rel.accountId} title={`${statusText} · ${accStatusText}`}>
              <Tag
                color={color}
                style={{
                  textDecoration: rel.relationStatus !== 'normal' ? 'line-through' : undefined,
                }}
              >
                {label}
              </Tag>
            </Tooltip>
          )
        }

        return (
          <Space size={4} wrap>
            {visible.map(renderChip)}
            {overflow > 0 ? (
              <Tooltip
                title={sorted
                  .slice(3)
                  .map((r) => `${findAccount(r.accountId)?.shortName ?? r.accountId}`)
                  .join(', ')}
              >
                <Tag>+{overflow}</Tag>
              </Tooltip>
            ) : null}
          </Space>
        )
      },
    },
    {
      title: '玩家标签',
      key: 'tags',
      width: 220,
      render: (_v, view) => {
        const tags = getTagsByIds(view.tagIds)
        if (tags.length === 0) {
          return (
            <Text type="secondary" style={{ fontSize: 12 }}>
              -
            </Text>
          )
        }
        return (
          <Space size={4} wrap>
            {tags.map((t) => (
              <Tag key={t.id} color={t.deprecated ? 'default' : 'green'}>
                {t.label}
              </Tag>
            ))}
          </Space>
        )
      },
    },
    {
      title: '关系数',
      key: 'relationCount',
      width: 90,
      sorter: true,
      sortOrder: sort.field === 'rel' ? sort.order : null,
      render: (_v, view) => (
        <Text>
          {view.relations.length}{' '}
          <Text type="secondary" style={{ fontSize: 12 }}>
            个号
          </Text>
        </Text>
      ),
    },
    {
      title: '最早添加',
      dataIndex: 'earliestAddedAt',
      width: 110,
      sorter: true,
      sortOrder: sort.field === 'added' ? sort.order : null,
      render: (v: string) => formatDate(v),
    },
    {
      title: '最近更新',
      dataIndex: 'latestUpdatedAt',
      width: 130,
      sorter: true,
      sortOrder: sort.field === 'updated' ? sort.order : null,
      render: (v: string) => formatDateTime(v),
    },
    {
      title: '操作',
      key: 'actions',
      width: 130,
      fixed: 'right',
      render: (_v, view) => (
        <Button size="small" onClick={() => navigate(`/players/${view.playerId}`)}>
          查看完整档案
        </Button>
      ),
    },
  ]

  const handleClearFilter = () => {
    setFilter({ ...DEFAULT_FILTER, relationStatus: filter.relationStatus })
    setPage(1)
  }

  return (
    <section style={{ padding: 16, background: '#F5F5F5', minHeight: '100%' }}>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        玩家管理
      </Typography.Title>

      {/* 筛选条 */}
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
          placeholder="playerId(精确)"
          allowClear
          value={filter.playerId}
          onChange={(e) => {
            setFilter((f) => ({ ...f, playerId: e.target.value }))
            setPage(1)
          }}
          style={{ width: 200, fontFamily: 'SF Mono, Menlo, monospace' }}
        />
        <Input
          placeholder="微信昵称(模糊)"
          allowClear
          value={filter.nickname}
          onChange={(e) => {
            setFilter((f) => ({ ...f, nickname: e.target.value }))
            setPage(1)
          }}
          style={{ width: 180 }}
        />
        <Select
          mode="multiple"
          placeholder="管家(任一关系命中)"
          allowClear
          showSearch
          options={accountOptions}
          value={filter.accountIds}
          onChange={(v) => {
            setFilter((f) => ({ ...f, accountIds: v }))
            setPage(1)
          }}
          style={{ minWidth: 220 }}
          maxTagCount="responsive"
        />
        <Input
          placeholder="玩家备注(任一关系模糊命中)"
          allowClear
          value={filter.remark}
          onChange={(e) => {
            setFilter((f) => ({ ...f, remark: e.target.value }))
            setPage(1)
          }}
          style={{ width: 220 }}
        />
        <Select
          mode="multiple"
          placeholder="玩家标签(任一关系命中)"
          allowClear
          options={tagOptions}
          value={filter.tagIds}
          onChange={(v) => {
            setFilter((f) => ({ ...f, tagIds: v }))
            setPage(1)
          }}
          style={{ minWidth: 220 }}
          maxTagCount="responsive"
        />
        <Input
          placeholder="玩家描述(任一关系模糊命中)"
          allowClear
          value={filter.description}
          onChange={(e) => {
            setFilter((f) => ({ ...f, description: e.target.value }))
            setPage(1)
          }}
          style={{ width: 220 }}
        />
        <Button onClick={handleClearFilter}>清空筛选</Button>
      </div>

      {/* 关系状态分类 chip — 语义:至少有一条该状态关系的玩家 */}
      <div style={{ marginBottom: 12 }}>
        <Segmented
          value={filter.relationStatus}
          onChange={(v) => {
            setFilter((f) => ({ ...f, relationStatus: v as RelationStatus }))
            setPage(1)
          }}
          options={(['normal', 'removed_by_agent', 'removed_by_player'] as RelationStatus[]).map(
            (s) => ({
              label: `${STATUS_LABEL[s]} (${counts[s]})`,
              value: s,
            }),
          )}
        />
      </div>

      <Table<PlayerAggregatedView>
        rowKey="playerId"
        columns={columns}
        dataSource={pageData}
        scroll={{ x: 1140 }}
        size="small"
        onChange={(_pag, _filters, sorter) => {
          const s = Array.isArray(sorter) ? sorter[0] : sorter
          const key = s?.order ? String(s.columnKey ?? '') : ''
          const field = (Object.keys(SORT_COLUMN_KEY) as PlayerSortField[]).find(
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
          showTotal: (t, range) => `共 ${t} 位玩家 · ${range[0]}-${range[1]}`,
          onChange: (p, s) => {
            setPage(p)
            setPageSize(s)
          },
        }}
        locale={{
          emptyText: <Empty description="未找到匹配的玩家" />,
        }}
      />
    </section>
  )
}

export default PlayersListPage
