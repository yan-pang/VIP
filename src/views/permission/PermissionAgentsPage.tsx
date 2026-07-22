import {
  EditOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import {
  Alert,
  App as AntdApp,
  Button,
  Drawer,
  Empty,
  Input,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { MessageInstance } from 'antd/es/message/interface'
import { useEffect, useMemo, useState } from 'react'
import {
  getAccountsForGame,
  getPermissionAgent,
  listManageablePermissionAgents,
  listMockFeishuUsers,
  mockGames,
  mockWechatGameMap,
  roleMeta,
  savePermissionAgent,
  setPermissionAgentStatus,
  usePermissionSession,
  type PermissionAgentRecord,
  type PermissionAgentStatus,
  type PermissionRoleId,
  type SavePermissionAgentInput,
} from '../../services/permissionMock'
import '../../styles/Permission.scss'

interface ListFilter {
  keyword: string
  roleIds: PermissionRoleId[]
  status?: PermissionAgentStatus
  gameIds: string[]
}

interface DrawerState {
  mode: 'new' | 'edit'
  agentId?: string
}

type AgentConfigDraft = Omit<SavePermissionAgentInput, 'roleId'> & {
  roleId: PermissionRoleId | ''
}

const EMPTY_FILTER: ListFilter = { keyword: '', roleIds: [], gameIds: [] }

function gameLabel(id: string) {
  const game = mockGames.find((item) => item.id === id)
  return game ? `${game.id}-${game.name}` : id
}

function PermissionAgentsPage() {
  const session = usePermissionSession()
  const { message, modal } = AntdApp.useApp()
  const [filter, setFilter] = useState<ListFilter>(EMPTY_FILTER)
  const [drawerState, setDrawerState] = useState<DrawerState | null>(null)
  const [roleDrawerOpen, setRoleDrawerOpen] = useState(false)

  const allRows = listManageablePermissionAgents()
  const rows = useMemo(() => {
    const keyword = filter.keyword.trim().toLowerCase()
    return allRows
      .filter((row) => {
        if (
          keyword &&
          !row.name.toLowerCase().includes(keyword)
        )
          return false
        if (filter.roleIds.length && !filter.roleIds.includes(row.roleId)) return false
        if (filter.status && row.status !== filter.status) return false
        if (filter.gameIds.length && !row.gameIds.some((id) => filter.gameIds.includes(id))) return false
        return true
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [allRows, filter])

  const resetFilter = () => setFilter(EMPTY_FILTER)
  const isFiltering = !!(
    filter.keyword ||
    filter.roleIds.length ||
    filter.status ||
    filter.gameIds.length
  )

  const handleStatus = (record: PermissionAgentRecord) => {
    const nextStatus: PermissionAgentStatus = record.status === 'active' ? 'disabled' : 'active'
    modal.confirm({
      title: nextStatus === 'disabled' ? '停用客服账号' : '启用客服账号',
      content:
        nextStatus === 'disabled'
          ? `停用 ${record.name} 后,该账号不能登录或被指派,历史会话与消息仍会保留。`
          : `确认启用 ${record.name}?该账号会在下一次 Mock 身份映射时恢复可用。`,
      okText: nextStatus === 'disabled' ? '确认停用' : '确认启用',
      okButtonProps: nextStatus === 'disabled' ? { danger: true } : undefined,
      cancelText: '取消',
      onOk: () => {
        try {
          setPermissionAgentStatus(record.id, nextStatus)
          message.success(nextStatus === 'disabled' ? '账号已停用' : '账号已启用')
        } catch (error) {
          message.error(error instanceof Error ? error.message : '状态更新失败')
        }
      },
    })
  }

  const columns: ColumnsType<PermissionAgentRecord> = [
    {
      title: '客服账号',
      key: 'agent',
      width: 200,
      render: (_value, record) => (
        <button
          type="button"
          className="cf-permission__agent-cell"
          onClick={() => setDrawerState({ mode: 'edit', agentId: record.id })}
        >
          <strong className="cf-mono">{record.name}</strong>
        </button>
      ),
    },
    {
      title: '角色',
      dataIndex: 'roleId',
      width: 122,
      render: (roleId: PermissionRoleId) => <Tag color={roleColor(roleId)}>{roleMeta[roleId].label}</Tag>,
    },
    {
      title: '账号状态',
      dataIndex: 'status',
      width: 96,
      render: (status: PermissionAgentStatus) => (
        <Tag color={status === 'active' ? 'green' : 'default'}>{status === 'active' ? '启用' : '停用'}</Tag>
      ),
    },
    {
      title: '关联游戏',
      dataIndex: 'gameIds',
      width: 180,
      render: (gameIds: string[]) => <GameTags gameIds={gameIds} />,
    },
    {
      title: '授权企微号',
      dataIndex: 'accountIds',
      width: 138,
      render: (accountIds: string[], record) => (
        <Button
          type="link"
          size="small"
          onClick={() => setDrawerState({ mode: 'edit', agentId: record.id })}
        >
          已授权 {accountIds.length} 个
        </Button>
      ),
    },
    {
      title: '最近更新',
      dataIndex: 'updatedAt',
      width: 135,
      render: (value: string) => <span className="cf-text-tertiary">{formatUpdatedAt(value)}</span>,
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 155,
      render: (_value, record) => {
        const onlyAdmin =
          record.roleId === 'system_admin' &&
          record.status === 'active' &&
          allRows.filter((row) => row.roleId === 'system_admin' && row.status === 'active').length <= 1
        const statusBlocked = onlyAdmin
        const statusTip = onlyAdmin ? '请先配置另一名有效系统管理员' : undefined
        return (
          <Space size={4}>
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => setDrawerState({ mode: 'edit', agentId: record.id })}
            >
              编辑
            </Button>
            <Tooltip title={statusBlocked ? statusTip : undefined}>
              <Button
                type="link"
                size="small"
                danger={record.status === 'active'}
                disabled={statusBlocked}
                onClick={() => handleStatus(record)}
              >
                {record.status === 'active' ? '停用' : '启用'}
              </Button>
            </Tooltip>
          </Space>
        )
      },
    },
  ]

  if (!session.canManageAgents) {
    return (
      <div className="cf-permission">
        <header className="cf-permission__header">
          <div><h1>角色与权限说明</h1><p>所有已登录用户均可查看预置角色定义；只有系统管理员可以管理账号和授权。</p></div>
        </header>
        <Alert type="info" showIcon message="当前页面为只读说明，不展示其他客服的账号与授权范围。" />
        <section className="cf-permission__table-panel">
          <Table
            rowKey="id"
            pagination={false}
            dataSource={(Object.keys(roleMeta) as PermissionRoleId[]).map((id) => ({ id, ...roleMeta[id] }))}
            columns={[
              { title: '角色', dataIndex: 'label', width: 160 },
              { title: '权限说明', dataIndex: 'description' },
            ]}
          />
        </section>
      </div>
    )
  }

  return (
    <div className="cf-permission">
      <header className="cf-permission__header">
        <div>
          <h1>客服账号</h1>
          <p>客服账号直接来自飞书账号列表,在这里配置角色和游戏内企微号范围。</p>
        </div>
        <Space>
          <Button icon={<InfoCircleOutlined />} onClick={() => setRoleDrawerOpen(true)}>
            角色说明
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setDrawerState({ mode: 'new' })}>
            新建客服账号
          </Button>
        </Space>
      </header>

      <section className="cf-permission__filters" aria-label="客服账号筛选">
        <Input.Search
          allowClear
          placeholder="搜索客服账号"
          value={filter.keyword}
          onChange={(event) => setFilter((value) => ({ ...value, keyword: event.target.value }))}
          style={{ width: 250 }}
        />
        <Select
          mode="multiple"
          allowClear
          placeholder="角色"
          value={filter.roleIds}
          onChange={(roleIds) => setFilter((value) => ({ ...value, roleIds }))}
          options={(Object.keys(roleMeta) as PermissionRoleId[]).map((id) => ({ label: roleMeta[id].label, value: id }))}
          style={{ width: 170 }}
        />
        <Select
          allowClear
          placeholder="账号状态"
          value={filter.status}
          onChange={(status) => setFilter((value) => ({ ...value, status }))}
          options={[
            { label: '启用', value: 'active' },
            { label: '停用', value: 'disabled' },
          ]}
          style={{ width: 128 }}
        />
        <Select
          mode="multiple"
          allowClear
          placeholder="关联游戏"
          value={filter.gameIds}
          onChange={(gameIds) => setFilter((value) => ({ ...value, gameIds }))}
          options={mockGames
            .filter((game) => session.manageableGameIds.includes(game.id))
            .map((game) => ({ label: gameLabel(game.id), value: game.id }))}
          style={{ width: 220 }}
        />
        <Button type="text" disabled={!isFiltering} onClick={resetFilter}>
          重置
        </Button>
      </section>

      <section className="cf-permission__table-panel">
        <div className="cf-permission__table-meta">
          <span>共 {rows.length} 名账号</span>
          <span>展示全平台客服账号（含停用）</span>
        </div>
        {allRows.length === 0 ? (
          <Empty description="暂无可管理的客服账号" />
        ) : rows.length === 0 ? (
          <Empty
            description="没有符合条件的账号"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button icon={<ReloadOutlined />} onClick={resetFilter}>重置筛选</Button>
          </Empty>
        ) : (
          <Table<PermissionAgentRecord>
            rowKey="id"
            columns={columns}
            dataSource={rows}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: 960 }}
          />
        )}
      </section>

      <AgentConfigDrawer state={drawerState} messageApi={message} onClose={() => setDrawerState(null)} />
      <RoleInfoDrawer open={roleDrawerOpen} onClose={() => setRoleDrawerOpen(false)} />
    </div>
  )
}

function AgentConfigDrawer({
  state,
  messageApi,
  onClose,
}: {
  state: DrawerState | null
  messageApi: MessageInstance
  onClose: () => void
}) {
  const session = usePermissionSession()
  const { modal } = AntdApp.useApp()
  const open = !!state
  const existing = useMemo(
    () => (state?.agentId ? getPermissionAgent(state.agentId) : undefined),
    [state?.agentId],
  )
  const [draft, setDraft] = useState<AgentConfigDraft>(() => makeDraft(existing))
  const [initialJson, setInitialJson] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeGameId, setActiveGameId] = useState('')
  const [gameKeyword, setGameKeyword] = useState('')

  useEffect(() => {
    if (!open) return
    const next = makeDraft(existing)
    setDraft(next)
    setInitialJson(JSON.stringify(next))
    setSaving(false)
    setActiveGameId(next.gameIds[0] ?? '')
    setGameKeyword('')
  }, [open, state, existing])

  const isNew = state?.mode === 'new'
  const dirty = JSON.stringify(draft) !== initialJson
  const selectableGames = mockGames.filter((game) => session.manageableGameIds.includes(game.id))
  const feishuOptions = listMockFeishuUsers()
    .filter(
      (user) =>
        user.employmentStatus === 'active' &&
        (!user.boundAgentId || user.id === existing?.feishuUserId),
    )
    .map((user) => ({ label: user.name, value: user.id }))

  const requestClose = () => {
    if (!dirty || saving) {
      onClose()
      return
    }
    modal.confirm({
      title: '放弃本次配置?',
      content: '关闭后未保存的账号、角色与授权变更都会丢失。',
      okText: '放弃修改',
      okButtonProps: { danger: true },
      cancelText: '继续编辑',
      onOk: onClose,
    })
  }

  const save = () => {
    const user = listMockFeishuUsers().find((item) => item.id === draft.feishuUserId)
    if (!user || user.employmentStatus !== 'active' || (isNew && user.boundAgentId)) {
      messageApi.error('请选择一个可用的飞书账号')
      return
    }
    if (!draft.roleId) {
      messageApi.error('请选择预置角色')
      return
    }
    if (draft.gameIds.length === 0) {
      messageApi.error('至少关联一个游戏')
      return
    }
    setSaving(true)
    try {
      savePermissionAgent({ ...draft, roleId: draft.roleId })
      messageApi.success(isNew ? '客服账号已创建' : '账号配置已保存')
      onClose()
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const updateGames = (gameIds: string[]) => {
    setDraft((value) => {
      const accountIds = value.accountIds.filter((id) => gameIds.includes(mockWechatGameMap[id]))
      return { ...value, gameIds, accountIds }
    })
    setActiveGameId((current) => gameIds.includes(current) ? current : (gameIds[0] ?? ''))
  }

  const updateActiveGameAccounts = (accountIds: string[]) => {
    if (!activeGameId) return
    setDraft((value) => ({
      ...value,
      accountIds: [
        ...value.accountIds.filter((id) => mockWechatGameMap[id] !== activeGameId),
        ...accountIds,
      ],
    }))
  }

  const currentIsAdmin = existing?.id === session.agent.id
  const activeAdminCount = listManageablePermissionAgents().filter((record) => record.roleId === 'system_admin' && record.status === 'active').length
  const currentIsLastAdmin = currentIsAdmin && existing?.roleId === 'system_admin' && existing.status === 'active' && activeAdminCount <= 1
  const roleItems = (Object.keys(roleMeta) as PermissionRoleId[]).map((roleId) => {
    const disabled = currentIsLastAdmin && roleId !== 'system_admin'
    return {
      roleId,
      disabled,
      title: roleMeta[roleId].label,
      description: roleMeta[roleId].description,
    }
  })
  const selectedGames = selectableGames.filter((game) => draft.gameIds.includes(game.id))
  const filteredSelectedGames = selectedGames.filter((game) =>
    gameLabel(game.id).toLowerCase().includes(gameKeyword.trim().toLowerCase()),
  )
  const activeGame = selectedGames.find((game) => game.id === activeGameId)
  const activeGameAccounts = activeGameId ? getAccountsForGame(activeGameId) : []
  const activeAccountIds = draft.accountIds.filter((id) => mockWechatGameMap[id] === activeGameId)

  return (
    <Drawer
      title={(
        <div className="cf-permission__drawer-title">
          <strong>{isNew ? '新建客服账号' : '编辑客服账号'}</strong>
          <span>{isNew ? '选择账号并完成角色与数据范围配置' : `正在配置 ${existing?.name ?? ''}`}</span>
        </div>
      )}
      open={open}
      width={760}
      onClose={requestClose}
      destroyOnHidden
      className="cf-permission__config-drawer"
      footer={
        <div className="cf-permission__drawer-footer">
          <span className="cf-permission__footer-summary">
            已关联 {draft.gameIds.length} 个游戏，授权 {draft.accountIds.length} 个企微号
          </span>
          <Space>
            <Button onClick={requestClose}>取消</Button>
            <Button type="primary" loading={saving} onClick={save}>保存配置</Button>
          </Space>
        </div>
      }
    >
      <section className="cf-permission__drawer-section">
        <div className="cf-permission__config-card">
          <div className="cf-permission__section-heading">
            <span className="cf-permission__section-index">1</span>
            <div>
              <strong>账号与角色</strong>
              <span>配置飞书账号以及可以执行的业务动作</span>
            </div>
          </div>
          <div className="cf-permission__basic-grid">
            <div className="cf-permission__form-block">
              <label className="cf-permission__field-label">客服账号 *</label>
              <Select
                showSearch
                optionFilterProp="label"
                disabled={!isNew}
                placeholder="从飞书账号列表选择"
                value={draft.feishuUserId || undefined}
                options={feishuOptions}
                onChange={(feishuUserId) => setDraft((value) => ({ ...value, feishuUserId }))}
                style={{ width: '100%' }}
              />
              <span className="cf-permission__field-hint">账号名称直接使用飞书账号</span>
            </div>
            <div className="cf-permission__form-block">
              <label className="cf-permission__field-label">角色 *</label>
              <Select
                placeholder="选择预置角色"
                value={draft.roleId || undefined}
                options={roleItems.map((item) => ({
                  label: item.title,
                  value: item.roleId,
                  disabled: item.disabled,
                }))}
                onChange={(roleId: PermissionRoleId) => setDraft((value) => ({ ...value, roleId }))}
                style={{ width: '100%' }}
              />
              <span className="cf-permission__field-hint">账号状态在列表中单独控制</span>
            </div>
          </div>
          {draft.roleId && (
            <div className={`cf-permission__role-note${draft.roleId === 'customer_agent' ? ' is-warning' : ''}`}>
              <Tag color={roleColor(draft.roleId)}>{roleMeta[draft.roleId].label}</Tag>
              <span>{roleMeta[draft.roleId].description}</span>
              {draft.roleId === 'customer_agent' && <strong>客服不可进入控制台或打开云桌面</strong>}
            </div>
          )}
        </div>

        <div className="cf-permission__config-card">
          <div className="cf-permission__section-heading">
            <span className="cf-permission__section-index">2</span>
            <div>
              <strong>数据权限</strong>
              <span>先关联游戏，再按游戏授权企微号；移除游戏会同步撤销该游戏下的授权</span>
            </div>
          </div>
          <div className="cf-permission__form-block">
            <div className="cf-permission__field-title-row">
              <label className="cf-permission__field-label">关联游戏 *</label>
              <span>已选 {draft.gameIds.length} 个</span>
            </div>
            <Select
              mode="multiple"
              showSearch
              allowClear
              virtual
              optionFilterProp="label"
              maxTagCount={2}
              maxTagPlaceholder={(items) => `+${items.length} 个游戏`}
              placeholder="搜索游戏 ID 或名称并选择"
              value={draft.gameIds}
              options={selectableGames.map((game) => ({ label: gameLabel(game.id), value: game.id }))}
              onChange={updateGames}
              style={{ width: '100%' }}
            />
          </div>

          {selectedGames.length === 0 ? (
            <div className="cf-permission__empty-auth">
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="选择游戏后配置企微号授权" />
            </div>
          ) : (
            <div className="cf-permission__auth-workspace">
              <aside className="cf-permission__game-nav">
                <div className="cf-permission__game-nav-title">
                  <strong>已选游戏</strong>
                  <Tag>{selectedGames.length}</Tag>
                </div>
                {selectedGames.length > 5 && (
                  <Input.Search
                    allowClear
                    size="small"
                    placeholder="筛选已选游戏"
                    value={gameKeyword}
                    onChange={(event) => setGameKeyword(event.target.value)}
                  />
                )}
                <div className="cf-permission__game-nav-list">
                  {filteredSelectedGames.length === 0 ? (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无匹配游戏" />
                  ) : filteredSelectedGames.map((game) => {
                    const grantedCount = draft.accountIds.filter((id) => mockWechatGameMap[id] === game.id).length
                    return (
                      <button
                        key={game.id}
                        type="button"
                        className={game.id === activeGameId ? 'is-active' : undefined}
                        onClick={() => setActiveGameId(game.id)}
                      >
                        <strong>{gameLabel(game.id)}</strong>
                        <span>已授权 {grantedCount} 个企微号</span>
                      </button>
                    )
                  })}
                </div>
              </aside>

              <div className="cf-permission__account-editor">
                {activeGame ? (
                  <>
                    <div className="cf-permission__account-editor-head">
                      <div>
                        <strong>{gameLabel(activeGame.id)}</strong>
                        <span>选择该游戏下可访问的企微号</span>
                      </div>
                      <Space size={4}>
                        <Button
                          type="link"
                          size="small"
                          disabled={activeGameAccounts.length === 0 || activeAccountIds.length === activeGameAccounts.length}
                          onClick={() => updateActiveGameAccounts(activeGameAccounts.map((account) => account.id))}
                        >
                          全选
                        </Button>
                        <Button
                          type="link"
                          size="small"
                          disabled={activeAccountIds.length === 0}
                          onClick={() => updateActiveGameAccounts([])}
                        >
                          清空
                        </Button>
                      </Space>
                    </div>
                    {activeGameAccounts.length === 0 ? (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="该游戏暂无已配置企微号" />
                    ) : (
                      <>
                        <Select
                          mode="multiple"
                          showSearch
                          allowClear
                          virtual
                          optionFilterProp="label"
                          maxTagCount={2}
                          maxTagPlaceholder={(items) => `+${items.length} 个企微号`}
                          placeholder="搜索企微号名称或 ID 并授权"
                          value={activeAccountIds}
                          options={activeGameAccounts.map((account) => ({
                            label: `${account.shortName}（${account.id}） · ${wechatStatusLabel(account.status)}`,
                            value: account.id,
                          }))}
                          onChange={updateActiveGameAccounts}
                          style={{ width: '100%' }}
                        />
                        <span className="cf-permission__field-hint">
                          当前游戏已授权 {activeAccountIds.length} / {activeGameAccounts.length} 个企微号
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="请选择左侧游戏" />
                )}
              </div>
            </div>
          )}

          <div className="cf-permission__scope-summary">
            <div>
              <span>关联游戏</span>
              <strong>{draft.gameIds.length}</strong>
            </div>
            <div>
              <span>授权企微号</span>
              <strong>{draft.accountIds.length}</strong>
            </div>
            <p>最终数据范围为“已关联游戏”与“该游戏内已授权企微号”的交集。</p>
          </div>
        </div>
      </section>
    </Drawer>
  )
}

function RoleInfoDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [roleId, setRoleId] = useState<PermissionRoleId>('system_admin')
  const actions: Record<PermissionRoleId, string[]> = {
    system_admin: ['管理全平台客服账号、授权、企微配置与资源', '打开全部企微号的控制台与云桌面', '处理全平台风控告警与审计'],
    operations_supervisor: ['指派、转接和接待范围内会话', '在已授权号范围内操作控制台与人工介入', '按权限撤回团队消息并查看风控审计'],
    customer_agent: ['查看和接待范围内会话', '将排队会话指派给自己', '撤回自己发送的消息并查看失败原因'],
  }
  const denied: Record<PermissionRoleId, string[]> = {
    system_admin: ['自定义角色', '绕过服务端硬性风控'],
    operations_supervisor: ['开通或停用账号', '修改角色、游戏关联或企微号授权'],
    customer_agent: ['进入控制台或打开云桌面', '人工介入、撤回他人消息、管理账号或授权'],
  }
  return (
    <Drawer title="角色与权限说明" open={open} onClose={onClose} width={480}>
      <Radio.Group value={roleId} onChange={(event) => setRoleId(event.target.value)} buttonStyle="solid">
        {(Object.keys(roleMeta) as PermissionRoleId[]).map((id) => <Radio.Button key={id} value={id}>{roleMeta[id].label}</Radio.Button>)}
      </Radio.Group>
      <div className="cf-permission__role-info">
        <h3>{roleMeta[roleId].label}</h3>
        <p>{roleMeta[roleId].description}</p>
        <h4>可执行动作</h4>
        <ul>{actions[roleId].map((item) => <li key={item}>{item}</li>)}</ul>
        <h4>明确不允许</h4>
        <ul className="is-denied">{denied[roleId].map((item) => <li key={item}>{item}</li>)}</ul>
      </div>
      <Alert type="info" showIcon message="角色决定动作,数据范围决定可操作的游戏和企微号。二者必须同时满足。" />
    </Drawer>
  )
}

function GameTags({ gameIds }: { gameIds: string[] }) {
  const visible = gameIds.slice(0, 2)
  return (
    <Space size={[4, 4]} wrap>
      {visible.map((id) => <Tag key={id}>{gameLabel(id)}</Tag>)}
      {gameIds.length > 2 && <Tooltip title={gameIds.map(gameLabel).join('、')}><Tag>+{gameIds.length - 2}</Tag></Tooltip>}
    </Space>
  )
}

function makeDraft(existing?: PermissionAgentRecord): AgentConfigDraft {
  return existing
    ? {
        id: existing.id,
        feishuUserId: existing.feishuUserId,
        roleId: existing.roleId,
        status: existing.status,
        gameIds: [...existing.gameIds],
        accountIds: [...existing.accountIds],
        expectedUpdatedAt: existing.updatedAt,
      }
    : {
        feishuUserId: '',
        roleId: '',
        status: 'active',
        gameIds: [],
        accountIds: [],
      }
}

function roleColor(roleId: PermissionRoleId) {
  if (roleId === 'system_admin') return 'blue'
  if (roleId === 'operations_supervisor') return 'gold'
  return 'green'
}

function wechatStatusLabel(status: 'online' | 'offline' | 'banned') {
  if (status === 'online') return '在线'
  if (status === 'banned') return '封禁'
  return '离线'
}

function formatUpdatedAt(value: string) {
  const date = new Date(value)
  const pad = (number: number) => String(number).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default PermissionAgentsPage
