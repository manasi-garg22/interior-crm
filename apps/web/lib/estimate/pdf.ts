/**
 * Builds the estimate PDF in the browser.
 *
 * jsPDF is loaded on demand, so the ~350 KB library is only downloaded when
 * someone actually clicks "Download PDF" — not on every CRM page load.
 *
 * The terms, specifications and payment schedule are the studio's standard
 * wording, carried over unchanged from the original estimate tool.
 */

// Type-only imports are erased at build time, so they do not defeat the
// on-demand loading below.
import type { jsPDF } from 'jspdf'
import type { RowInput } from 'jspdf-autotable'
import { formatRs, grandTotal, groupByRoom, lineTotal, type Estimate } from './types'

// Brand palette (matches the website).
const INK: [number, number, number] = [27, 26, 23]
const INK_SOFT: [number, number, number] = [74, 71, 64]
const MUTED: [number, number, number] = [131, 126, 116]
const ACCENT: [number, number, number] = [169, 113, 75]
const ACCENT_SOFT: [number, number, number] = [242, 232, 224]
const CANVAS: [number, number, number] = [247, 245, 241]
const LINE: [number, number, number] = [226, 222, 213]

const WEBSITE_URL = 'https://www.omarchdesigns.com'
const WEBSITE_LABEL = 'www.omarchdesigns.com'

type Doc = jsPDF

function finalY(doc: Doc, fallback: number): number {
  return (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? fallback
}

async function loadLogo(): Promise<string | null> {
  try {
    const response = await fetch('/brand/om-arch-logo-pdf.png')
    if (!response.ok) return null
    const blob = await response.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function downloadEstimatePdf(estimate: Estimate): Promise<void> {
  const [{ jsPDF: JsPdf }, { autoTable }, logo] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    loadLogo(),
  ])

  const doc = new JsPdf({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 14
  const marginBottom = 20
  const contentWidth = pageWidth - marginX * 2

  const clientName = estimate.clientName.trim() || 'Interior Quotation'
  const dateStr = estimate.date
    ? new Date(`${estimate.date}T00:00:00`).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''

  // ── Header ──────────────────────────────────────────────────
  doc.setFillColor(...CANVAS)
  doc.rect(0, 0, pageWidth, 40, 'F')
  if (logo) {
    // Source logo is 560×400; 30mm wide keeps it crisp and compact.
    doc.addImage(logo, 'PNG', marginX - 2, 5, 42, 30)
  } else {
    doc.setFont('times', 'normal')
    doc.setFontSize(20)
    doc.setTextColor(...INK)
    doc.text('OM ARCH DESIGNS', marginX, 22)
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MUTED)
  // No charSpace here: jsPDF measures right-aligned text without it, which
  // pushed the label off the page edge.
  doc.text('INTERIOR COST ESTIMATE', pageWidth - marginX, 15, { align: 'right' })
  doc.setFont('times', 'normal')
  doc.setFontSize(16)
  doc.setTextColor(...INK)
  const titleLines = doc.splitTextToSize(clientName, 95)
  doc.text(titleLines, pageWidth - marginX, 23, { align: 'right' })
  if (dateStr) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...INK_SOFT)
    doc.text(dateStr, pageWidth - marginX, 23 + titleLines.length * 6.5, { align: 'right' })
  }

  doc.setDrawColor(...ACCENT)
  doc.setLineWidth(0.6)
  doc.line(0, 40, pageWidth, 40)

  // ── Items, grouped by room with subtotals ───────────────────
  const body: RowInput[] = []
  for (const group of groupByRoom(estimate.items)) {
    body.push([
      {
        content: group.roomType.toUpperCase(),
        colSpan: 6,
        styles: { halign: 'left', fillColor: ACCENT_SOFT, textColor: ACCENT, fontStyle: 'bold', fontSize: 8.5, cellPadding: { top: 2.6, bottom: 2.6, left: 3, right: 3 } },
      },
    ])
    group.items.forEach((item, index) => {
      body.push([
        String(index + 1),
        item.name,
        String(item.quantity),
        item.unit,
        formatRs(item.price),
        formatRs(lineTotal(item)),
      ])
    })
    body.push([
      { content: `${group.roomType} subtotal`, colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', textColor: INK_SOFT } },
      { content: formatRs(group.subtotal), styles: { halign: 'right', fontStyle: 'bold' } },
    ])
  }

  autoTable(doc, {
    startY: 48,
    margin: { left: marginX, right: marginX, bottom: marginBottom },
    // columnStyles only reach body cells, so numeric headers align themselves.
    head: [[
      { content: '#', styles: { halign: 'center' } },
      'Item',
      { content: 'Qty', styles: { halign: 'right' } },
      'Units',
      { content: 'Unit Price', styles: { halign: 'right' } },
      { content: 'Total', styles: { halign: 'right' } },
    ]],
    body,
    foot: [[
      { content: 'Grand Total', colSpan: 5, styles: { halign: 'right' } },
      { content: formatRs(grandTotal(estimate.items)), styles: { halign: 'right' } },
    ]],
    showFoot: 'lastPage',
    theme: 'plain',
    styles: { font: 'helvetica', fontSize: 9.5, textColor: INK, cellPadding: 3, lineColor: LINE, lineWidth: { bottom: 0.2 } },
    headStyles: { fillColor: INK, textColor: [250, 249, 247], fontStyle: 'bold', fontSize: 8.5, lineWidth: 0 },
    footStyles: { fillColor: INK, textColor: [250, 249, 247], fontStyle: 'bold', fontSize: 11, lineWidth: 0 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10, textColor: MUTED },
      2: { halign: 'right', cellWidth: 16 },
      3: { cellWidth: 24 },
      4: { halign: 'right', cellWidth: 32 },
      5: { halign: 'right', cellWidth: 34 },
    },
  })

  let y = finalY(doc, 60) + 10

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - marginBottom) {
      doc.addPage()
      y = 22
    }
  }

  // ── Remarks ─────────────────────────────────────────────────
  const remarks = estimate.remarks.trim()
  if (remarks) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    const lines: string[] = doc.splitTextToSize(remarks, contentWidth - 10)
    const boxHeight = lines.length * 5 + 14
    ensureSpace(boxHeight + 4)
    doc.setFillColor(...CANVAS)
    doc.setDrawColor(...LINE)
    doc.roundedRect(marginX, y, contentWidth, boxHeight, 1, 1, 'FD')
    doc.setFontSize(8)
    doc.setTextColor(...ACCENT)
    doc.setFont('helvetica', 'bold')
    doc.text('REMARKS', marginX + 5, y + 7, { charSpace: 0.5 })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...INK_SOFT)
    doc.text(lines, marginX + 5, y + 13)
    y += boxHeight + 10
  }

  // ── Terms, specifications and conditions ────────────────────
  const sectionHeading = (text: string) => {
    ensureSpace(16)
    doc.setFont('times', 'normal')
    doc.setFontSize(14)
    doc.setTextColor(...INK)
    doc.text(text, marginX, y)
    y += 2.5
    doc.setDrawColor(...ACCENT)
    doc.setLineWidth(0.4)
    doc.line(marginX, y, marginX + 18, y)
    y += 7
  }

  const subHeading = (text: string) => {
    ensureSpace(10)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...ACCENT)
    doc.text(text.toUpperCase(), marginX, y, { charSpace: 0.4 })
    y += 5.5
  }

  const bullets = (lines: string[]) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...INK_SOFT)
    for (const line of lines) {
      const wrapped: string[] = doc.splitTextToSize(line, contentWidth - 6)
      ensureSpace(wrapped.length * 4.8 + 1)
      doc.setFillColor(...ACCENT)
      doc.circle(marginX + 1, y - 1.2, 0.6, 'F')
      doc.text(wrapped, marginX + 5, y)
      y += wrapped.length * 4.8 + 1.4
    }
    y += 3
  }

  // Heading + the whole 7-row table (~66mm) stay together on one page.
  ensureSpace(76)
  sectionHeading('Payment Terms')
  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX, bottom: marginBottom },
    head: [['Stage', { content: 'Percentage', styles: { halign: 'right' } }]],
    body: [
      ['Advance Payment', '10%'],
      ['Material Procurement', '30%'],
      ['Structure Completion', '20%'],
      ['Laminate Work', '20%'],
      ['Handle & Lock Installation', '15%'],
      ['Final Finishing & Handover', '5%'],
    ],
    theme: 'plain',
    styles: { fontSize: 9.5, textColor: INK, cellPadding: 2.6, lineColor: LINE, lineWidth: { bottom: 0.2 } },
    headStyles: { fillColor: ACCENT_SOFT, textColor: ACCENT, fontStyle: 'bold', fontSize: 8.5 },
    columnStyles: { 1: { halign: 'right', cellWidth: 40 } },
  })
  y = finalY(doc, y) + 12

  sectionHeading('Furniture Specifications')
  subHeading('Kitchen')
  bullets([
    'Waterproof Plywood (710 Grade) - Rs. 80-85 Range',
    'Tandem Basket - Eigos / Godrej (if required)',
  ])
  subHeading('Other Furniture')
  bullets([
    'MR Plywood 303 - Rs. 60-65 Range',
    'Inner Liner (Off White) - Rs. 450 Range',
    'Laminate - Rs. 1800 Range',
    'Acrylic Finish (if required) - Rs. 3800 Range',
    'Cupboard Configuration: 1 Cupboard + 4 Drawers',
    'Additional Drawer - Rs. 2000 per Drawer',
    'Handles - Rs. 200-250 Range',
    'Sofa Fabric - Rs. 450 Range',
    'Sofa Material - Refresh Prime',
    'Soft Close Hinges - Rs. 90 per Set',
    'Door Lock (Jali Door) - Rs. 1500 Range',
  ])
  subHeading('Colour')
  bullets(['Interior only (in above specified work area) - Asian Royale / Berger Paints'])
  subHeading('Electrical Accessories')
  bullets([
    'Wiring: Anchor / RR',
    'Lights: Panasonic (Approx. Rs. 400 Range)',
    'Switches: Anchor / Fybros',
  ])

  sectionHeading('Exclusions')
  bullets([
    'AC electrical work is not included.',
    'Wall texture and rustic finishes will be charged extra.',
    'Deco / PU / Polish finishes will be charged extra.',
    'Decorative items such as curtains, fans, mattresses, hanging lights, etc. are not included.',
    'Any work or materials not specifically mentioned above will be charged separately upon mutual agreement.',
  ])

  sectionHeading('Terms & Conditions')
  bullets([
    'All dimensions are approximate and subject to site requirements.',
    'Final measurements and billing will be completed after project completion.',
    'Electricity points required for use during execution shall be provided by the client at no additional cost.',
    'The contractor shall not be responsible for delays caused by payment issues or unavoidable circumstances.',
  ])

  // ── Closing: "Know us more" with a clickable website link ───
  ensureSpace(30)
  y += 4
  doc.setFillColor(...CANVAS)
  doc.rect(marginX, y, contentWidth, 24, 'F')
  doc.setFont('times', 'normal')
  doc.setFontSize(13)
  doc.setTextColor(...INK)
  doc.text('Your space. Our expertise.', pageWidth / 2, y + 8, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTED)
  doc.text('Explore our portfolio and services at', pageWidth / 2, y + 14, { align: 'center' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...ACCENT)
  const linkWidth = doc.getTextWidth(WEBSITE_LABEL)
  const linkX = (pageWidth - linkWidth) / 2
  doc.textWithLink(WEBSITE_LABEL, linkX, y + 20, { url: WEBSITE_URL })
  doc.setDrawColor(...ACCENT)
  doc.setLineWidth(0.2)
  doc.line(linkX, y + 21, linkX + linkWidth, y + 21)

  // ── Footer on every page ────────────────────────────────────
  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    doc.setDrawColor(...LINE)
    doc.setLineWidth(0.2)
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text('OM Arch Designs · Vadodara', marginX, pageHeight - 7)
    doc.text(`Page ${page} of ${pages}`, pageWidth - marginX, pageHeight - 7, { align: 'right' })
  }

  const safeName = clientName.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').toLowerCase()
  doc.save(`${safeName || 'interior_estimate'}.pdf`)
}
