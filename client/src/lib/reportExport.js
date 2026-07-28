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

export async function exportPaymentsToExcel(rows, store) {
  const [{ default: ExcelJS }, { saveAs }] = await Promise.all([import('exceljs'), import('file-saver')])
  const workbook = new ExcelJS.Workbook()
  workbook.creator = store?.storeName || 'Rental System'
  const sheet = workbook.addWorksheet('Transactions')
  const lastCol = String.fromCharCode(64 + COLUMNS.length)

  sheet.mergeCells(`A1:${lastCol}1`)
  const titleCell = sheet.getCell('A1')
  titleCell.value = store?.storeName || 'Rental System'
  titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
  titleCell.alignment = { vertical: 'middle' }
  sheet.getRow(1).height = 34
  for (let col = 1; col <= COLUMNS.length; col++) {
    sheet.getRow(1).getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6C4FFF' } }
  }

  sheet.mergeCells(`A2:${lastCol}2`)
  const subtitleCell = sheet.getCell('A2')
  subtitleCell.value = `Transactions report — generated ${new Date().toLocaleString()}`
  subtitleCell.font = { size: 10, italic: true, color: { argb: 'FF677185' } }
  sheet.getRow(2).height = 20
  sheet.addRow([])

  const headerRow = sheet.addRow(COLUMNS.map((c) => c.header))
  headerRow.height = 20
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D3140' } }
    cell.alignment = { vertical: 'middle' }
  })

  rows.forEach((r, i) => {
    const row = sheet.addRow(COLUMNS.map((c) => r[c.key]))
    if (i % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6F7F9' } }
      })
    }
  })

  COLUMNS.forEach((c, i) => {
    sheet.getColumn(i + 1).width = c.width
  })

  if (store?.logoUrl) {
    const dataUrl = await loadImageAsDataUrl(store.logoUrl)
    if (dataUrl) {
      const imageId = workbook.addImage({ base64: dataUrl, extension: extensionFromDataUrl(dataUrl) })
      sheet.addImage(imageId, { tl: { col: COLUMNS.length - 0.9, row: 0.05 }, ext: { width: 32, height: 32 } })
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer], { type: 'application/octet-stream' }), `transactions-${Date.now()}.xlsx`)
}

export async function exportPaymentsToPdf(rows, store) {
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
  doc.text(`Transactions report — generated ${new Date().toLocaleString()}`, textX, 24)

  autoTable(doc, {
    startY: 32,
    head: [COLUMNS.map((c) => c.header)],
    body: rows.map((r) => COLUMNS.map((c) => r[c.key])),
    headStyles: { fillColor: [108, 79, 255], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [246, 247, 249] },
    styles: { fontSize: 8, cellPadding: 3 },
  })

  doc.save(`transactions-${Date.now()}.pdf`)
}
