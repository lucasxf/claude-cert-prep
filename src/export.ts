import ExcelJS from 'exceljs'
import { Writable } from 'node:stream'

export interface ExportColumn {
    /** Column header label (shown in row 1). */
    header: string
    /** Property key on each row object. */
    key: string
    /** Optional column width in characters (default: 20). */
    width?: number
}

/**
 * Serialises rows to a CSV buffer with a UTF-8 BOM prepended so Excel on
 * Windows opens accented Portuguese characters correctly.
 */
export async function exportToCSV(
    rows: Record<string, unknown>[],
    columns: ExportColumn[],
): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Dados')
    sheet.columns = columns.map(c => ({ header: c.header, key: c.key, width: c.width ?? 20 }))
    for (const row of rows) {
        sheet.addRow(row)
    }

    const chunks: Buffer[] = []
    const writable = new Writable({
        write(chunk: Buffer | string, _enc: BufferEncoding, cb: () => void) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string))
            cb()
        },
    })

    await workbook.csv.write(writable)

    // UTF-8 BOM: EF BB BF — makes Excel auto-detect UTF-8 encoding
    const BOM = Buffer.from('\uFEFF', 'utf8')
    return Buffer.concat([BOM, ...chunks])
}

/**
 * Serialises rows to an XLSX buffer.  Header row is bolded.
 */
export async function exportToXLSX(
    rows: Record<string, unknown>[],
    columns: ExportColumn[],
    sheetName = 'Dados',
): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet(sheetName)
    sheet.columns = columns.map(c => ({ header: c.header, key: c.key, width: c.width ?? 20 }))
    for (const row of rows) {
        sheet.addRow(row)
    }

    const headerRow = sheet.getRow(1)
    headerRow.font = { bold: true }
    headerRow.commit()

    const arrayBuffer = await workbook.xlsx.writeBuffer()
    return Buffer.from(arrayBuffer)
}
