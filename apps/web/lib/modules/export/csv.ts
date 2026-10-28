/**
 * CSV building for exports opened in Excel / Google Sheets.
 *
 * Two details matter: a UTF-8 BOM so Excel shows ₹ and Hindi/Gujarati text
 * correctly, and neutralising cells that start with = + - @ so a customer
 * cannot plant a spreadsheet formula in a form field (CSV injection).
 */

type Cell = string | number | boolean | Date | null | undefined

function escapeCell(value: Cell): string {
  if (value == null) return ''
  let text = value instanceof Date ? value.toISOString() : String(value)
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(header: string[], rows: Cell[][]): string {
  const lines = [header, ...rows].map((row) => row.map(escapeCell).join(','))
  return `\uFEFF${lines.join('\r\n')}\r\n`
}
