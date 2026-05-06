import { ChevronDown } from 'lucide-react'

/**
 * SelectField — a styled <select> for static option lists.
 *
 * Props:
 *   value         – current value
 *   onChange(v)   – called with new value
 *   options       – array of strings, or array of {value, label}
 *   placeholder   – text for the empty option
 *   disabled
 *   className
 */
export default function SelectField({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  disabled = false,
  className = '',
}) {
  const normalized = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  )

  return (
    <div className={`select-field ${className}`}>
      <select
        className="input select-field-input"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {normalized.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown size={14} className="select-field-icon" />
    </div>
  )
}
