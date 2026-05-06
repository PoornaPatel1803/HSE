import { Plus, Trash2 } from 'lucide-react'
import LinkField from './fields/LinkField.jsx'
import SelectField from './fields/SelectField.jsx'

/**
 * ChildTable — inline-editable table for Frappe child tables.
 *
 * Props:
 *   title    – string, header label
 *   rows     – array of row objects
 *   columns  – column descriptors, each:
 *     { label, field, type?, options?, doctype?, filters?, displayField?, placeholder? }
 *
 *     type:
 *       'text'    (default) – plain text input
 *       'date'              – date picker
 *       'select'            – styled select; pass `options` array
 *       'link'              – Frappe Link autocomplete; pass `doctype`, optional `filters`, `displayField`
 *       'check'              – checkbox; value is 0/1
 *
 *   onAdd    – () => void
 *   onRemove – (index) => void
 *   onUpdate – (index, fieldName, value) => void
 */
export default function ChildTable({ title, rows, columns, onAdd, onRemove, onUpdate }) {
  return (
    <div className="card">
      <div
        className="card-header"
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem' }}
      >
        <div className="card-title" style={{ fontSize: '1rem' }}>{title}</div>
        <button className="btn btn-outline btn-sm" onClick={onAdd}>
          <Plus size={14} /> Add Row
        </button>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="tbl">
          <thead>
            <tr>
              {columns.map((c) => <th key={c.field}>{c.label}</th>)}
              <th style={{ width: 60 }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="text-muted-foreground"
                  style={{ textAlign: 'center', padding: '1.5rem' }}
                >
                  No rows yet — click "Add Row"
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.name || row.idx || idx}>
                  {columns.map((col) => (
                    <td key={col.field}>
                      <Cell
                        col={col}
                        row={row}
                        onChange={(v) => onUpdate(idx, col.field, v)}
                      />
                    </td>
                  ))}
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-destructive-ghost btn-sm"
                      onClick={() => onRemove(idx)}
                      title="Remove row"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * Cell — renders the right input control for a column type.
 */
function Cell({ col, row, onChange }) {
  const value = row[col.field]

  switch (col.type) {
    case 'link':
      return (
        <LinkField
          doctype={col.doctype}
          value={value || ''}
          onChange={onChange}
          placeholder={col.placeholder || `Select ${col.doctype}...`}
          filters={col.filters || []}
          displayField={col.displayField}
        />
      )

    case 'select':
      return (
        <SelectField
          value={value || ''}
          onChange={onChange}
          options={col.options || []}
          placeholder={col.placeholder || ''}
        />
      )

    case 'check':
      return (
        <input
          type="checkbox"
          className="cell-checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked ? 1 : 0)}
        />
      )

    case 'date':
      return (
        <input
          className="cell-input"
          type="date"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )

    case 'text':
    default:
      return (
        <input
          className="cell-input"
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={col.placeholder || ''}
        />
      )
  }
}
