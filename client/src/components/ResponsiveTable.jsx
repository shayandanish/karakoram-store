import React from 'react';

/**
 * ResponsiveTable renders a desktop table (visible on lg+ screens) and a mobile stacked card view (lg- screens).
 *
 * Props:
 *   columns: Array<{ header: string; accessor: string; render?: (row:any)=>React.ReactNode }>
 *   rows: Array<any>
 *   rowKey: string – unique identifier key in each row (e.g., "_id")
 *   actions?: (row:any) => React.ReactNode – optional actions column (e.g., View / Delete buttons)
 */
export default function ResponsiveTable({ columns, rows, rowKey, actions }) {
  return (
    <>
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50/75 text-stone-500 text-xs uppercase tracking-wider font-semibold border-b border-stone-200/60">
            <tr>
              {columns.map((c) => (
                <th key={c.accessor} className="py-3 px-4">{c.header}</th>
              ))}
              {actions && <th className="py-3 px-5 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {rows.map((row) => (
              <tr key={row[rowKey]} className="hover:bg-stone-50/80 transition">
                {columns.map((c) => (
                  <td key={c.accessor} className="py-3.5 px-4">
                    {c.render ? c.render(row) : row[c.accessor]}
                  </td>
                ))}
                {actions && (
                  <td className="py-3.5 px-5 text-right flex gap-2 justify-end">
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden divide-y divide-stone-100">
        {rows.map((row) => (
          <div key={row[rowKey]} className="p-4 space-y-2 hover:bg-stone-50/80 transition">
            {columns.map((c) => (
              <div key={c.accessor} className="flex justify-between text-xs">
                <span className="font-medium text-stone-600">{c.header}</span>
                <span className="text-stone-900">{c.render ? c.render(row) : row[c.accessor]}</span>
              </div>
            ))}
            {actions && (
              <div className="flex justify-end gap-2 mt-2">
                {actions(row)}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
