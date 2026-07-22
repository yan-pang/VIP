import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { App as AntdApp, Button, Drawer, Empty, Input, Result, Select, Space, Switch, Table, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  deleteForbiddenWordRule,
  listForbiddenWordRules,
  saveForbiddenWordRule,
  setForbiddenWordRuleEnabled,
  useOpsAdminRevision,
  type ForbiddenWordRule,
} from '../../services/opsAdminMock'
import { mockGames } from '../../services/gameCatalogMock'
import { getCurrentOpsActor, usePermissionSession } from '../../services/permissionMock'
import '../../styles/OpsAdmin.scss'

function gameLabel(gameId: string) {
  const game = mockGames.find((item) => item.id === gameId)
  return game ? `${game.id}-${game.name}` : gameId
}

function formatTime(value: string) {
  return value.replace('T', ' ').replace(/(\+|Z).*/, '')
}

function parseForbiddenWords(value: string) {
  return Array.from(new Set(value.split(/[\n,，、;；]+/).map((word) => word.trim()).filter(Boolean)))
}

function OpsForbiddenWordsPage() {
  const session = usePermissionSession()
  const actor = getCurrentOpsActor()
  const revision = useOpsAdminRevision()
  const { message, modal } = AntdApp.useApp()
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [gameId, setGameId] = useState<string | undefined>()
  const [enabled, setEnabled] = useState<boolean | undefined>()
  const [editing, setEditing] = useState<ForbiddenWordRule | 'new' | null>(null)

  const normalizedKeyword = keyword.trim().toLocaleLowerCase()
  const allRules = listForbiddenWordRules()
  const rows = allRules.filter((rule) => {
    const hitKeyword = !normalizedKeyword || rule.words.some((word) => word.toLocaleLowerCase().includes(normalizedKeyword))
    return hitKeyword && (gameId === undefined || rule.gameId === gameId) && (enabled === undefined || rule.enabled === enabled)
  })
  void revision

  const handleToggle = (rule: ForbiddenWordRule, nextEnabled: boolean) => {
    try {
      setForbiddenWordRuleEnabled(rule.id, nextEnabled, rule.version, actor)
      message.success(nextEnabled ? '规则已启用，工作台将立即拦截命中消息' : '规则已停用')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '更新失败')
    }
  }

  const confirmDelete = (rule: ForbiddenWordRule) => {
    modal.confirm({
      title: '删除违禁词规则',
      content: `确认删除「${gameLabel(rule.gameId)}」的违禁词规则？删除后工作台不再拦截该游戏的词条，历史发送记录不受影响。`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        try {
          deleteForbiddenWordRule(rule.id, rule.version, actor)
          message.success('违禁词规则已删除')
        } catch (error) {
          message.error(error instanceof Error ? error.message : '删除失败')
        }
      },
    })
  }

  const columns: ColumnsType<ForbiddenWordRule> = [
    { title: '适用游戏', dataIndex: 'gameId', width: 220, render: (value: string) => <span className="cf-mono">{gameLabel(value)}</span> },
    { title: '违禁词', dataIndex: 'words', render: (words: string[]) => <Space size={[4, 4]} wrap>{words.map((word) => <Tag color="red" key={word}>{word}</Tag>)}</Space> },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 140,
      render: (value: boolean, record) => <Space size={8}><Switch size="small" checked={value} onChange={(next) => handleToggle(record, next)} /><Tag color={value ? 'green' : 'default'}>{value ? '已启用' : '已停用'}</Tag></Space>,
    },
    { title: '最近更新', dataIndex: 'updatedAt', width: 175, render: (value: string) => <span className="cf-mono">{formatTime(value)}</span> },
    {
      title: '操作',
      key: 'action',
      width: 130,
      render: (_value, record) => <Space size={4}><Button type="link" size="small" icon={<EditOutlined />} onClick={() => setEditing(record)}>编辑</Button><Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => confirmDelete(record)}>删除</Button></Space>,
    },
  ]

  if (!session.canManageOps) {
    return <div className="cf-ops-admin cf-ops-admin--result"><Result status="403" title="无权限访问" subTitle="仅系统管理员可维护违禁词规则。" /></div>
  }

  return (
    <div className="cf-ops-admin">
      <header className="cf-ops-admin__header">
        <div><h1>违禁词规则</h1><p>每个游戏维护一条规则，可包含多个客服出站违禁词；命中后消息显示失败图标，hover 查看原因。</p></div>
        <Space><Button onClick={() => navigate('/ops-admin/wechat-accounts')}>企微号配置</Button><Button onClick={() => navigate('/ops-admin/operational-events')}>运行风控与审计</Button><Button type="primary" icon={<PlusOutlined />} disabled={!mockGames.some((game) => game.enabled && !allRules.some((rule) => rule.gameId === game.id))} onClick={() => setEditing('new')}>新建规则</Button></Space>
      </header>
      <section className="cf-ops-admin__filters">
        <Input.Search allowClear placeholder="搜索违禁词" value={keyword} onChange={(event) => setKeyword(event.target.value)} style={{ width: 280 }} />
        <Select allowClear placeholder="适用游戏" value={gameId} onChange={setGameId} style={{ width: 220 }} options={mockGames.filter((game) => game.enabled).map((game) => ({ value: game.id, label: `${game.id}-${game.name}` }))} />
        <Select allowClear placeholder="规则状态" value={enabled} onChange={setEnabled} style={{ width: 150 }} options={[{ value: true, label: '已启用' }, { value: false, label: '已停用' }]} />
        <Button type="text" disabled={!keyword && !gameId && enabled === undefined} onClick={() => { setKeyword(''); setGameId(undefined); setEnabled(undefined) }}>重置</Button>
      </section>
      <section className="cf-ops-admin__table">
        <div className="cf-ops-admin__meta">共 {rows.length} 条游戏规则；工作台仅匹配当前企微号所属游戏的启用词条，命中后按统一失败样式展示。</div>
        {rows.length ? <Table rowKey="id" columns={columns} dataSource={rows} pagination={false} scroll={{ x: 920 }} /> : <Empty description="暂无符合条件的违禁词规则" />}
      </section>
      <ForbiddenWordDrawer value={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function ForbiddenWordDrawer({ value, onClose }: { value: ForbiddenWordRule | 'new' | null; onClose: () => void }) {
  const { message } = AntdApp.useApp()
  const actor = getCurrentOpsActor()
  const [selectedGameId, setSelectedGameId] = useState('')
  const [wordsText, setWordsText] = useState('')
  const open = value !== null
  const isNew = value === 'new'
  const record = value && value !== 'new' ? value : undefined
  const parsedWords = parseForbiddenWords(wordsText)
  const gameOptions = mockGames
    .filter((game) => game.enabled && (game.id === record?.gameId || !listForbiddenWordRules().some((rule) => rule.gameId === game.id)))
    .map((game) => ({ value: game.id, label: `${game.id}-${game.name}` }))

  const handleSave = () => {
    try {
      saveForbiddenWordRule({
        id: record?.id,
        gameId: selectedGameId,
        words: parsedWords,
        enabled: record?.enabled ?? true,
        expectedVersion: record?.version,
      }, actor)
      message.success(isNew ? '违禁词规则已创建' : '违禁词规则已保存')
      onClose()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存失败')
    }
  }

  return <Drawer title={isNew ? '新建违禁词规则' : '编辑违禁词规则'} open={open} width={560} destroyOnHidden afterOpenChange={(visible) => { if (visible) { setSelectedGameId(record?.gameId ?? ''); setWordsText(record?.words.join('\n') ?? '') } }} onClose={onClose} footer={<Space><Button onClick={onClose}>取消</Button><Button type="primary" onClick={handleSave}>保存规则</Button></Space>}>
    <div className="cf-ops-admin__form">
      <label>适用游戏 *</label><Select value={selectedGameId || undefined} placeholder="请选择游戏" options={gameOptions} onChange={setSelectedGameId} />
      <label>违禁词 *</label>
      <Input.TextArea value={wordsText} autoSize={{ minRows: 8, maxRows: 14 }} placeholder={'每行输入一个违禁词，例如：\n退款承诺\n保证最低价\n官方授权'} onChange={(event) => setWordsText(event.target.value)} />
      <div className="cf-ops-admin__word-hint"><span>支持整批粘贴；换行、逗号、顿号或分号均可自动拆分，重复词条会自动去除。</span><Tag color={parsedWords.length ? 'blue' : 'default'}>已识别 {parsedWords.length} 个</Tag></div>
      {parsedWords.length > 0 && <div className="cf-ops-admin__word-preview">{parsedWords.slice(0, 12).map((word) => <Tag key={word}>{word}</Tag>)}{parsedWords.length > 12 && <Tag>+{parsedWords.length - 12}</Tag>}</div>}
      <p>规则状态请保存后直接在列表中启用或停用。规则只校验客服出站的单条文本；混发时文本命中仅拒绝该文本，不影响同一消息发送批次内的附件继续执行。玩家入站消息不受影响。</p>
    </div>
  </Drawer>
}

export default OpsForbiddenWordsPage
