'use client'

interface ExportButtonsProps {
    csvUrl: string
    xlsxUrl: string
}

export function ExportButtons({ csvUrl, xlsxUrl }: ExportButtonsProps) {
    return (
        <div className="flex gap-2">
            <a
                href={csvUrl}
                download
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
                Exportar CSV
            </a>
            <a
                href={xlsxUrl}
                download
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
                Exportar XLSX
            </a>
        </div>
    )
}
