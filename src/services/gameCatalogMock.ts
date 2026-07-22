export interface MockGame {
  id: string
  name: string
  enabled: boolean
}

/**
 * V1 的游戏目录是只读 Mock 主数据：ops-admin 维护企微号归属，但不维护游戏目录本身。
 */
export const mockGames: MockGame[] = [
  { id: '20173', name: '无尽冬日', enabled: true },
  { id: '20174', name: '星火行动', enabled: true },
  { id: '20175', name: '深海远征', enabled: true },
]

/** 企微号的唯一游戏归属，由 ops-admin 的共享 Store 维护。 */
export const mockWechatGameMap: Record<string, string> = {
  wx_xiaoqin: '20173',
  wx_xiaobei: '20174',
  wx_xiaojuan: '20173',
}
