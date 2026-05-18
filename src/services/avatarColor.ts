/**
 * 根据 id 哈希出稳定头像背景色,避免每次随机颜色不一致。
 * 颜色取自 ui-brand 风格:克制、低饱和、避免冲突主色。
 */
const palette = [
  '#5E81F4', // soft blue
  '#FF7A6B', // coral
  '#FFB547', // amber
  '#7E57C2', // violet
  '#26A69A', // teal
  '#EF5DA8', // pink
  '#5C6BC0', // indigo
  '#66BB6A', // moss
  '#FF8A65', // peach
  '#42A5F5', // sky
]

export function avatarColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0
  }
  return palette[h % palette.length]
}
