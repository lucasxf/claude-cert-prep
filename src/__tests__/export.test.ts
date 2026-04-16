import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'
import { exportToCSV, exportToXLSX } from '../export.js'

const columns = [
    { header: 'Número', key: 'number', width: 10 },
    { header: 'Nome', key: 'name', width: 25 },
    { header: '% de Acertos', key: 'pct', width: 15 },
]

const rows = [
    { number: 1, name: 'Simulado — Aprovação', pct: 75 },
    { number: 2, name: 'Reprovação', pct: 65 },
]

describe('exportToCSV', () => {
    it('returns a Buffer', async () => {
        const buf = await exportToCSV(rows, columns)
        expect(Buffer.isBuffer(buf)).toBe(true)
    })

    it('starts with UTF-8 BOM (EF BB BF)', async () => {
        const buf = await exportToCSV(rows, columns)
        expect(buf[0]).toBe(0xef)
        expect(buf[1]).toBe(0xbb)
        expect(buf[2]).toBe(0xbf)
    })

    it('contains header labels', async () => {
        const buf = await exportToCSV(rows, columns)
        const text = buf.toString('utf8')
        expect(text).toContain('Número')
        expect(text).toContain('Nome')
        expect(text).toContain('% de Acertos')
    })

    it('contains row data', async () => {
        const buf = await exportToCSV(rows, columns)
        const text = buf.toString('utf8')
        expect(text).toContain('Simulado')
        expect(text).toContain('75')
        expect(text).toContain('65')
    })

    it('produces non-empty output for empty rows array', async () => {
        const buf = await exportToCSV([], columns)
        // At minimum: BOM + header row
        expect(buf.length).toBeGreaterThan(3)
        const text = buf.toString('utf8')
        expect(text).toContain('Número')
    })
})

describe('exportToXLSX', () => {
    it('returns a Buffer', async () => {
        const buf = await exportToXLSX(rows, columns)
        expect(Buffer.isBuffer(buf)).toBe(true)
    })

    it('returns a non-empty buffer', async () => {
        const buf = await exportToXLSX(rows, columns)
        expect(buf.length).toBeGreaterThan(0)
    })

    it('produces a valid XLSX file that can be re-read', async () => {
        const buf = await exportToXLSX(rows, columns)
        const wb = new ExcelJS.Workbook()
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error — Buffer<ArrayBufferLike> vs ExcelJS Buffer incompatibility (TS 5.7+)
        await wb.xlsx.load(buf)
        const sheet = wb.worksheets[0]
        expect(sheet).toBeDefined()
    })

    it('includes header row in the XLSX', async () => {
        const buf = await exportToXLSX(rows, columns)
        const wb = new ExcelJS.Workbook()
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error — Buffer<ArrayBufferLike> vs ExcelJS Buffer incompatibility (TS 5.7+)
        await wb.xlsx.load(buf)
        const sheet = wb.worksheets[0]!
        const headerRow = sheet.getRow(1)
        const headers = [1, 2, 3].map(i => headerRow.getCell(i).value)
        expect(headers).toContain('Número')
        expect(headers).toContain('Nome')
    })

    it('includes data rows in the XLSX', async () => {
        const buf = await exportToXLSX(rows, columns)
        const wb = new ExcelJS.Workbook()
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error — Buffer<ArrayBufferLike> vs ExcelJS Buffer incompatibility (TS 5.7+)
        await wb.xlsx.load(buf)
        const sheet = wb.worksheets[0]!
        // Row 1 = headers, row 2 = first data row
        const dataRow = sheet.getRow(2)
        const values = [1, 2, 3].map(i => dataRow.getCell(i).value)
        expect(values).toContain(1) // number column
    })

    it('uses the provided sheet name', async () => {
        const buf = await exportToXLSX(rows, columns, 'Histórico')
        const wb = new ExcelJS.Workbook()
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error — Buffer<ArrayBufferLike> vs ExcelJS Buffer incompatibility (TS 5.7+)
        await wb.xlsx.load(buf)
        expect(wb.worksheets[0]!.name).toBe('Histórico')
    })
})
