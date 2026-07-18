/**
 * 消息记录时间展示口径(chat-workbench design「消息记录展示口径」共享工具)
 * - dayKey:自然日分组键(YYYY-MM-DD),用于消息流日期分割线
 * - formatDateLabel:日期分割线文案(YYYY年M月D日 周X)
 * - formatFullDateTime:气泡时间悬停浮出的完整日期时间(YYYY-MM-DD HH:MM:SS)
 */

const pad = (n: number) => String(n).padStart(2, '0')
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

/** 自然日分组键(本地时区) */
export function dayKey(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** 日期分割线文案 */
export function formatDateLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 周${WEEKDAYS[d.getDay()]}`
}

/** 完整日期时间(悬停 tooltip) */
export function formatFullDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** 月-日 时:分 MM-DD HH:MM(轮次边界分割线用,结束 / 重开两端都带日期) */
export function formatMonthDayTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
