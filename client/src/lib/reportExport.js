const COLUMNS = [
  { header: 'Type', key: 'type', width: 16 },
  { header: 'Rental', key: 'rental', width: 12 },
  { header: 'Amount', key: 'amount', width: 12 },
  { header: 'Method', key: 'method', width: 16 },
  { header: 'Customer', key: 'customer', width: 20 },
  { header: 'Staff', key: 'staff', width: 16 },
  { header: 'Note', key: 'note', width: 42 },
  { header: 'Date', key: 'date', width: 20 },
]

const SALES_COLUMNS = [
  { header: 'Sale', key: 'sale', width: 12 },
  { header: 'Customer', key: 'customer', width: 20 },
  { header: 'Items', key: 'items', width: 10 },
  { header: 'Sold by', key: 'staff', width: 16 },
  { header: 'Discount', key: 'discount', width: 12 },
  { header: 'Total', key: 'total', width: 12 },
  { header: 'Method', key: 'method', width: 16 },
  { header: 'Date', key: 'date', width: 20 },
]

const ACTIVITY_LOG_COLUMNS = [
  { header: 'Store', key: 'store', width: 20 },
  { header: 'Date', key: 'date', width: 20 },
  { header: 'User', key: 'user', width: 18 },
  { header: 'Role', key: 'role', width: 14 },
  { header: 'Module', key: 'module', width: 14 },
  { header: 'Action', key: 'action', width: 12 },
  { header: 'Description', key: 'description', width: 42 },
]

async function loadImageAsDataUrl(url) {
  if (!url) return null
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function extensionFromDataUrl(dataUrl) {
  const match = /^data:image\/(png|jpeg|jpg)/i.exec(dataUrl || '')
  const ext = match?.[1]?.toLowerCase()
  return ext === 'jpg' ? 'jpeg' : ext || 'png'
}

// Shared engine behind every "export as a branded, professional spreadsheet"
// button in the app — a real editable .xlsx (not a flattened image), with a
// colored title band, styled header row and alternating row shading.
async function exportToExcel({ rows, store, columns, sheetName, title, filenamePrefix }) {
  const [{ default: ExcelJS }, { saveAs }] = await Promise.all([import('exceljs'), import('file-saver')])
  const workbook = new ExcelJS.Workbook()
  workbook.creator = store?.storeName || 'Rental System'
  const sheet = workbook.addWorksheet(sheetName)
  const lastCol = String.fromCharCode(64 + columns.length)

  sheet.mergeCells(`A1:${lastCol}1`)
  const titleCell = sheet.getCell('A1')
  titleCell.value = store?.storeName || 'Rental System'
  titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
  titleCell.alignment = { vertical: 'middle' }
  sheet.getRow(1).height = 34
  for (let col = 1; col <= columns.length; col++) {
    sheet.getRow(1).getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6C4FFF' } }
  }

  sheet.mergeCells(`A2:${lastCol}2`)
  const subtitleCell = sheet.getCell('A2')
  subtitleCell.value = `${title} — generated ${new Date().toLocaleString()}`
  subtitleCell.font = { size: 10, italic: true, color: { argb: 'FF677185' } }
  sheet.getRow(2).height = 20
  sheet.addRow([])

  const headerRow = sheet.addRow(columns.map((c) => c.header))
  headerRow.height = 20
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D3140' } }
    cell.alignment = { vertical: 'middle' }
  })

  rows.forEach((r, i) => {
    const row = sheet.addRow(columns.map((c) => r[c.key]))
    if (i % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6F7F9' } }
      })
    }
  })

  columns.forEach((c, i) => {
    sheet.getColumn(i + 1).width = c.width
  })

  if (store?.logoUrl) {
    const dataUrl = await loadImageAsDataUrl(store.logoUrl)
    if (dataUrl) {
      const imageId = workbook.addImage({ base64: dataUrl, extension: extensionFromDataUrl(dataUrl) })
      sheet.addImage(imageId, { tl: { col: columns.length - 0.9, row: 0.05 }, ext: { width: 32, height: 32 } })
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer], { type: 'application/octet-stream' }), `${filenamePrefix}-${Date.now()}.xlsx`)
}

async function exportToPdf({ rows, store, columns, title, filenamePrefix }) {
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const autoTable = autoTableModule.default

  const doc = new jsPDF()
  let textX = 14

  if (store?.logoUrl) {
    const dataUrl = await loadImageAsDataUrl(store.logoUrl)
    if (dataUrl) {
      doc.addImage(dataUrl, extensionFromDataUrl(dataUrl).toUpperCase(), 14, 10, 14, 14)
      textX = 32
    }
  }

  doc.setFontSize(16)
  doc.setTextColor(40, 40, 40)
  doc.text(store?.storeName || 'Rental System', textX, 18)
  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text(`${title} — generated ${new Date().toLocaleString()}`, textX, 24)

  autoTable(doc, {
    startY: 32,
    head: [columns.map((c) => c.header)],
    body: rows.map((r) => columns.map((c) => r[c.key])),
    headStyles: { fillColor: [108, 79, 255], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [246, 247, 249] },
    styles: { fontSize: 8, cellPadding: 3 },
  })

  doc.save(`${filenamePrefix}-${Date.now()}.pdf`)
}

export const exportPaymentsToExcel = (rows, store) =>
  exportToExcel({ rows, store, columns: COLUMNS, sheetName: 'Transactions', title: 'Transactions report', filenamePrefix: 'transactions' })

export const exportPaymentsToPdf = (rows, store) =>
  exportToPdf({ rows, store, columns: COLUMNS, title: 'Transactions report', filenamePrefix: 'transactions' })

export const exportSalesToExcel = (rows, store) =>
  exportToExcel({ rows, store, columns: SALES_COLUMNS, sheetName: 'Sales', title: 'Sales report', filenamePrefix: 'sales' })

export const exportSalesToPdf = (rows, store) =>
  exportToPdf({ rows, store, columns: SALES_COLUMNS, title: 'Sales report', filenamePrefix: 'sales' })

export const exportActivityLogToExcel = (rows, store) =>
  exportToExcel({ rows, store, columns: ACTIVITY_LOG_COLUMNS, sheetName: 'Activity Log', title: 'Activity log', filenamePrefix: 'activity-log' })

export const exportActivityLogToPdf = (rows, store) =>
  exportToPdf({ rows, store, columns: ACTIVITY_LOG_COLUMNS, title: 'Activity log', filenamePrefix: 'activity-log' })
