import { useState, useEffect, useRef, useCallback } from 'react'
import { useFrappeGetDocList } from 'frappe-react-sdk'
import { ChevronDown, X, Loader2 } from 'lucide-react'

/**
 * LinkField — typeahead combobox backed by a Frappe doctype.
 *
 * Props:
 *   doctype       – Frappe doctype to search (e.g. "Project", "User", "HSE Format")
 *   value         – current selected docname (string)
 *   onChange(v)   – called with new docname (or "" when cleared)
 *   placeholder   – placeholder text
 *   filters       – Frappe filter array, e.g. [["status","=","Open"]]
 *   displayField  – optional secondary field to show as description in the dropdown
 *   disabled      – disables input
 *   className     – extra class on the wrapper
 *
 * Notes:
 *   – Search is debounced 200ms.
 *   – The dropdown is only fetched while open (saves requests).
 *   – Click-outside closes the dropdown.
 */
export default function LinkField({
  doctype,
  value,
  onChange,
  placeholder = 'Select...',
  filters = [],
  displayField = null,
  disabled = false,
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const wrapperRef = useRef(null)
  const inputRef = useRef(null)

  // Debounce search input by 200ms
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 200)
    return () => clearTimeout(t)
  }, [search])

  // Click outside to close
  useEffect(() => {
    const onDocClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  // Build filters: include "name like %search%" when there's a search term
  const effectiveFilters = debounced
    ? [...filters, ['name', 'like', `%${debounced}%`]]
    : filters

  const fields = displayField ? ['name', displayField] : ['name']

  // Only fetch when the dropdown is open. Passing null as the SWR key
  // disables the fetch entirely.
  const swrKey = open ? `link:${doctype}:${debounced}:${JSON.stringify(filters)}` : null

  const { data: results, isLoading } = useFrappeGetDocList(
    doctype,
    {
      fields,
      filters: effectiveFilters,
      limit: 10,
      orderBy: { field: 'modified', order: 'desc' },
    },
    swrKey,
  )

  const selectItem = useCallback((item) => {
    onChange(item.name)
    setSearch('')
    setOpen(false)
    inputRef.current?.blur()
  }, [onChange])

  const clear = useCallback((e) => {
    e.stopPropagation()
    onChange('')
    setSearch('')
    inputRef.current?.focus()
  }, [onChange])

  // What the input shows: the search text while typing, otherwise the selected value
  const displayValue = open ? search : (value || '')

  return (
    <div ref={wrapperRef} className={`link-field ${className}`}>
      <div className="link-field-input-wrap">
        <input
          ref={inputRef}
          className="input link-field-input"
          placeholder={value ? '' : placeholder}
          value={displayValue}
          disabled={disabled}
          onChange={(e) => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
        {!open && value && !disabled && (
          <button className="link-field-icon-btn" onClick={clear} type="button" tabIndex={-1} title="Clear">
            <X size={14} />
          </button>
        )}
        <button
          className="link-field-icon-btn"
          onClick={() => { if (!disabled) { setOpen(!open); inputRef.current?.focus() } }}
          disabled={disabled}
          type="button"
          tabIndex={-1}
        >
          <ChevronDown size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
        </button>
      </div>

      {open && (
        <div className="link-field-dropdown">
          {isLoading ? (
            <div className="link-field-loading">
              <Loader2 size={14} className="link-field-spin" /> Loading...
            </div>
          ) : !results || results.length === 0 ? (
            <div className="link-field-empty">
              {debounced ? `No ${doctype} matching "${debounced}"` : `No ${doctype} found`}
            </div>
          ) : (
            results.map((item) => (
              <button
                key={item.name}
                className="link-field-option"
                onClick={() => selectItem(item)}
                type="button"
              >
                <div className="link-field-option-name">{item.name}</div>
                {displayField && item[displayField] && item[displayField] !== item.name && (
                  <div className="link-field-option-desc">{item[displayField]}</div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
