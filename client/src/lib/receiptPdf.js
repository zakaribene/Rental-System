// Draws a receipt PDF directly with jsPDF's vector text/shape primitives
// instead of screenshotting the on-screen DOM (html2canvas). The DOM lives
// inside a modal with scroll clipping, fade-in animation, and border-radius
// clipping on many stacked rows — html2canvas rendered that combination
// unreliably (rows randomly ghosted or climbed into their own border), and
// no amount of font/CORS/timing fixes made it consistent. Drawing straight
// into the PDF sidesteps that whole failure class: every line is real,
// deterministically-positioned PDF text, never a rasterized guess.
const INK900 = [12, 12, 16]
const INK800 = [23, 24, 30]
const INK700 = [67, 74, 90]
const INK500 = [103, 113, 133]
const INK400 = [134, 144, 163]
const INK200 = [213, 217, 225]
const INK100 = [236, 238, 242]
const INK50 = [246, 247, 249]
const PRIMARY600 = [90, 52, 245]
const PRIMARY700 = [75, 38, 217]
const SUCCESS50 = [236, 253, 245]
const SUCCESS600 = [5, 150, 105]
const SUCCESS700 = [4, 120, 87]
const DANGER50 = [254, 242, 242]
const DANGER600 = [220, 38, 38]
const WHITE = [255, 255, 255]

function setFill(pdf, rgb) {
  pdf.setFillColor(rgb[0], rgb[1], rgb[2])
}
function setText(pdf, rgb) {
  pdf.setTextColor(rgb[0], rgb[1], rgb[2])
}
function setDraw(pdf, rgb) {
  pdf.setDrawColor(rgb[0], rgb[1], rgb[2])
}

async function loadImageAsDataUrl(url) {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    const format = blob.type.includes('png') ? 'PNG' : blob.type.includes('webp') ? 'WEBP' : 'JPEG'
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    return { dataUrl, format }
  } catch {
    return null
  }
}

function ensureSpace(pdf, y, needed, margin, pageHeight) {
  if (y + needed <= pageHeight - margin) return y
  pdf.addPage()
  return margin
}

function drawPill(pdf, text, x, y, bg, fg) {
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8)
  const paddingX = 7
  const w = pdf.getTextWidth(text) + paddingX * 2
  const h = 15
  setFill(pdf, bg)
  pdf.roundedRect(x, y, w, h, h / 2, h / 2, 'F')
  setText(pdf, fg)
  pdf.text(text, x + w / 2, y + h / 2 + 2.8, { align: 'center' })
  return h
}

function drawField(pdf, cell, x, y) {
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  setText(pdf, INK400)
  pdf.text(cell.label, x, y)
  if (cell.badge) {
    drawPill(pdf, cell.value, x, y + 5, cell.badge.bg, cell.badge.fg)
    return
  }
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10.5)
  setText(pdf, cell.tone === 'danger' ? DANGER600 : INK800)
  pdf.text(String(cell.value), x, y + 16)
  if (cell.sub) {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    setText(pdf, cell.subTone === 'success' ? SUCCESS600 : INK400)
    pdf.text(cell.sub, x, y + 27)
  }
}

// spec: {
//   docLabel: 'Sale Receipt' | 'Rental Receipt',
//   store: { name, logoUrl },
//   receiptId, headerRight: [line1, line2],
//   grid: [[cellA, cellB], ...]   // cell: { label, value, sub?, subTone?, tone?, badge?:{text,bg,fg} }
//   items: { title, rows: [{ name, meta, amount }] },
//   extraSections: [{ title, rows: [{ left, right, rightTone? }] }],
//   totals: [{ label, value, tone?, emphasize?, highlight? }]
// }
async function buildReceiptPdf(spec) {
  const { default: jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 40
  const contentWidth = pageWidth - margin * 2

  let logo = null
  if (spec.store?.logoUrl) {
    logo = await loadImageAsDataUrl(spec.store.logoUrl)
  }

  let y = margin
  const logoSize = 34

  if (logo) {
    try {
      pdf.addImage(logo.dataUrl, logo.format, margin, y, logoSize, logoSize)
    } catch {
      logo = null
    }
  }
  if (!logo) {
    setFill(pdf, PRIMARY600)
    pdf.roundedRect(margin, y, logoSize, logoSize, 8, 8, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(13)
    setText(pdf, WHITE)
    pdf.text((spec.store?.name || 'RS').slice(0, 2).toUpperCase(), margin + logoSize / 2, y + logoSize / 2 + 4.5, {
      align: 'center',
    })
  }

  const textX = margin + logoSize + 10
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  setText(pdf, INK900)
  pdf.text(spec.store?.name || 'Rental System', textX, y + 14)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(7.5)
  setText(pdf, INK400)
  pdf.text(spec.docLabel.toUpperCase(), textX, y + 25)

  const rightX = pageWidth - margin
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(10)
  setText(pdf, INK900)
  pdf.text(`#${spec.receiptId}`, rightX, y + 10, { align: 'right' })
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9.5)
  setText(pdf, INK800)
  pdf.text(spec.headerRight[0] || '', rightX, y + 22, { align: 'right' })
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  setText(pdf, INK400)
  pdf.text(spec.headerRight[1] || '', rightX, y + 33, { align: 'right' })

  y += Math.max(logoSize, 40) + 14
  setDraw(pdf, INK800)
  pdf.setLineWidth(1.2)
  pdf.line(margin, y, pageWidth - margin, y)
  y += 24

  const colWidth = contentWidth / 2
  for (const row of spec.grid || []) {
    const rowHasSub = row.some((c) => c?.sub)
    const rowHeight = rowHasSub ? 40 : 30
    y = ensureSpace(pdf, y, rowHeight, margin, pageHeight)
    row.forEach((cell, i) => {
      if (cell) drawField(pdf, cell, margin + i * colWidth, y)
    })
    y += rowHeight
  }
  y += 6

  if (spec.items?.rows?.length) {
    const rowH = 32
    const boxHeight = 34 + spec.items.rows.length * rowH + 10
    y = ensureSpace(pdf, y, boxHeight, margin, pageHeight)
    setDraw(pdf, INK100)
    pdf.setLineWidth(1)
    pdf.roundedRect(margin, y, contentWidth, boxHeight, 10, 10, 'S')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    setText(pdf, INK700)
    pdf.text(spec.items.title || 'Items', margin + 14, y + 22)

    let rowY = y + 34
    for (const item of spec.items.rows) {
      setDraw(pdf, INK100)
      pdf.roundedRect(margin + 14, rowY, contentWidth - 28, rowH - 4, 6, 6, 'S')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      setText(pdf, INK800)
      pdf.text(item.name, margin + 24, rowY + 13)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(8)
      setText(pdf, INK400)
      pdf.text(item.meta, margin + 24, rowY + 23)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(10)
      setText(pdf, INK800)
      pdf.text(item.amount, margin + contentWidth - 24, rowY + 17, { align: 'right' })
      rowY += rowH
    }
    y += boxHeight + 16
  }

  for (const section of spec.extraSections || []) {
    if (!section?.rows?.length) continue
    const rowH = 26
    const boxHeight = 30 + section.rows.length * rowH + 8
    y = ensureSpace(pdf, y, boxHeight, margin, pageHeight)
    setDraw(pdf, INK100)
    pdf.setLineWidth(1)
    pdf.roundedRect(margin, y, contentWidth, boxHeight, 10, 10, 'S')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    setText(pdf, INK700)
    pdf.text(section.title, margin + 14, y + 20)

    let rowY = y + 30
    for (const row of section.rows) {
      setDraw(pdf, INK100)
      pdf.roundedRect(margin + 14, rowY, contentWidth - 28, rowH - 4, 6, 6, 'S')
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      setText(pdf, INK700)
      pdf.text(row.left, margin + 24, rowY + 14.5)
      setText(pdf, row.rightTone === 'success' ? SUCCESS600 : row.rightTone === 'danger' ? DANGER600 : INK800)
      pdf.text(row.right, margin + contentWidth - 24, rowY + 14.5, { align: 'right' })
      rowY += rowH
    }
    y += boxHeight + 16
  }

  if (spec.totals?.length) {
    const lineH = 19
    const boxHeight = spec.totals.length * lineH + 20
    y = ensureSpace(pdf, y, boxHeight, margin, pageHeight)
    setFill(pdf, INK50)
    pdf.roundedRect(margin, y, contentWidth, boxHeight, 10, 10, 'F')

    let lineY = y + 24
    spec.totals.forEach((line, idx) => {
      const isLast = idx === spec.totals.length - 1
      if (line.highlight) {
        setFill(pdf, DANGER50)
        pdf.roundedRect(margin + 12, lineY - 12, contentWidth - 24, 18, 5, 5, 'F')
      }
      if (line.emphasize) {
        setDraw(pdf, INK200)
        pdf.setLineWidth(0.75)
        pdf.line(margin + 14, lineY - 13, margin + contentWidth - 14, lineY - 13)
      }
      pdf.setFont('helvetica', line.emphasize || line.highlight ? 'bold' : 'normal')
      pdf.setFontSize(line.emphasize ? 10.5 : 9.5)
      const toneColor = line.tone === 'danger' ? DANGER600 : line.tone === 'success' ? SUCCESS600 : null
      // "Total" splits colors on-screen: a plain dark label, a purple value —
      // only a bare tone (danger/success) or the highlighted "Owed" row
      // colors the label to match the value.
      const labelColor = toneColor || (line.highlight ? DANGER600 : line.emphasize ? INK800 : INK500)
      const valueColor = toneColor || (line.highlight ? DANGER600 : line.emphasize ? PRIMARY700 : INK500)
      setText(pdf, labelColor)
      pdf.text(line.label, margin + 20, lineY)
      setText(pdf, valueColor)
      pdf.text(line.value, margin + contentWidth - 20, lineY, { align: 'right' })
      lineY += lineH
      void isLast
    })
    y += boxHeight
  }

  return pdf
}

export async function downloadReceiptPdf(spec, filename) {
  const pdf = await buildReceiptPdf(spec)
  pdf.save(filename)
}

export const receiptBadge = {
  success: { bg: SUCCESS50, fg: SUCCESS700 },
  danger: { bg: DANGER50, fg: DANGER600 },
  warning: { bg: [255, 251, 235], fg: [180, 83, 9] },
  info: { bg: [239, 246, 255], fg: [29, 78, 216] },
  primary: { bg: [242, 241, 255], fg: PRIMARY700 },
  neutral: { bg: INK100, fg: INK700 },
}
