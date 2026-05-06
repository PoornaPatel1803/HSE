import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useFrappeGetDoc,
  useFrappeCreateDoc,
  useFrappeUpdateDoc,
  useFrappePostCall,
} from 'frappe-react-sdk'
import {
  Save, Users, Target, Calendar, GraduationCap, FileArchive,
  Eye, AlertTriangle, FileText,
} from 'lucide-react'
import ChildTable from './ChildTable.jsx'
import LinkField from './fields/LinkField.jsx'
import SelectField from './fields/SelectField.jsx'
import { useToast } from './Toast.jsx'

const TABS = [
  { key: 'committee',    label: 'Committee',    icon: Users },
  { key: 'scope',        label: 'Scope',        icon: Target },
  { key: 'planning',     label: 'Planning',     icon: Calendar },
  { key: 'trainings',    label: 'Trainings',    icon: GraduationCap },
  { key: 'documents',    label: 'Documents',    icon: FileArchive },
  { key: 'observations', label: 'Observations', icon: Eye },
  { key: 'incidents',    label: 'Incidents',    icon: AlertTriangle },
]

const FREQUENCY_OPTIONS = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly']
const PLANNING_STATUS = ['Pending', 'Scheduled', 'In Progress', 'Completed', 'Cancelled']
const TRAINING_STATUS = ['Pending', 'In Progress', 'Completed', 'Overdue']
const CHARTER_STATUS = ['Draft', 'Active', 'Closed']

const EMPTY_CHARTER = {
  project: '',
  charter_date: '',
  status: 'Draft',
  safety_committee: [],
  project_hse_formats: [],
  custom_safety_inspections: [],
  custom_audit: [],
  custom_walkthrough: [],
  planning: [],
  assigned_trainings: [],
  master_ho_documents: [],
  default_ho_documents: [],
}

export default function HSECharterForm() {
  const { charterId, projectId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [activeTab, setActiveTab] = useState('committee')
  const [charter, setCharter] = useState({ ...EMPTY_CHARTER, project: projectId || '' })

  const {
    data: existingCharter,
    isLoading,
    mutate: refetchCharter,
  } = useFrappeGetDoc('HSE Charter', charterId)

  const { createDoc, loading: creating } = useFrappeCreateDoc()
  const { updateDoc, loading: updating } = useFrappeUpdateDoc()

  const { call: callScopePlan }     = useFrappePostCall('hse_app.api.generate_scope_planning')
  const { call: callCustomPlan }    = useFrappePostCall('hse_app.api.generate_custom_planning')
  const { call: callTrainingEvent } = useFrappePostCall('hse_app.api.create_training_event')

  useEffect(() => {
    if (existingCharter) {
      setCharter({ ...EMPTY_CHARTER, ...existingCharter })
    }
  }, [existingCharter])

  const saving = creating || updating

  // ---------- Save ----------
  const handleSave = async () => {
    if (!charter.project) {
      toast.error('Please select a project first')
      return
    }
    try {
      if (charterId) {
        await updateDoc('HSE Charter', charterId, charter)
        toast.success('HSE Charter updated successfully')
        refetchCharter()
      } else {
        const result = await createDoc('HSE Charter', charter)
        toast.success('HSE Charter created successfully')
        navigate(`/charter/${encodeURIComponent(result.name)}`, { replace: true })
      }
    } catch (e) {
      toast.error(e?.message || e?.exception || 'Failed to save HSE Charter')
    }
  }

  // ---------- Child table mutators ----------
  const updateRow = (field, idx, key, value) => {
    setCharter((prev) => {
      const rows = [...(prev[field] || [])]
      rows[idx] = { ...rows[idx], [key]: value }
      return { ...prev, [field]: rows }
    })
  }
  const addRow = (field) => {
    setCharter((prev) => ({ ...prev, [field]: [...(prev[field] || []), {}] }))
  }
  const removeRow = (field, idx) => {
    setCharter((prev) => ({
      ...prev,
      [field]: (prev[field] || []).filter((_, i) => i !== idx),
    }))
  }

  // ---------- Server methods ----------
  const runServerMethod = async (callFn, successMsg) => {
    if (!charterId) {
      toast.error('Save the charter first before running this action')
      return
    }
    try {
      const res = await callFn({ charter_name: charterId })
      toast.success(res?.message?.message || successMsg)
      refetchCharter()
    } catch (e) {
      toast.error(e?.message || e?.exception || 'Action failed')
    }
  }

  // ---------- Render ----------
  if (charterId && isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 400 }}>
        Loading HSE Charter...
      </div>
    )
  }

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="card">
        <div className="card-header">
          <div className="flex justify-between items-start">
            <div>
              <div className="card-title">HSE Charter</div>
              <div className="card-desc">
                {charterId ? `Editing: ${charterId}` : 'Create new HSE Charter'}
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              <Save size={16} /> {saving ? 'Saving...' : 'Save Charter'}
            </button>
          </div>
        </div>

        <div className="card-content">
          {/* Header fields */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2">Project *</label>
              <LinkField
                doctype="Project"
                value={charter.project}
                onChange={(v) => setCharter({ ...charter, project: v })}
                placeholder="Select project"
                displayField="project_name"
                disabled={!!charterId}
              />
            </div>
            {/* <div>
              <label className="block text-sm font-medium mb-2">Charter Date</label>
              <input
                className="input"
                type="date"
                value={charter.charter_date || ''}
                onChange={(e) => setCharter({ ...charter, charter_date: e.target.value })}
              />
            </div> */}
            {/* <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <SelectField
                value={charter.status}
                onChange={(v) => setCharter({ ...charter, status: v })}
                options={CHARTER_STATUS}
                placeholder="Select status"
              />
            </div> */}
          </div>

          {/* Tab triggers */}
          <div className="tabs-list" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
            {TABS.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.key}
                  className="tab-trigger"
                  data-state={activeTab === t.key ? 'active' : 'inactive'}
                  onClick={() => setActiveTab(t.key)}
                >
                  <Icon size={14} /> {t.label}
                </button>
              )
            })}
          </div>

          {/* ============ Committee ============ */}
          {activeTab === 'committee' && (
            <div className="pt-5">
              <ChildTable
                title="Safety Committee"
                rows={charter.safety_committee || []}
                columns={[
                  { label: 'Member', field: 'member', type: 'link', doctype: 'User', displayField: 'full_name', placeholder: 'Select user' },
                  { label: 'Role', field: 'role', placeholder: 'e.g. HSE Manager' },
                  { label: 'Contact', field: 'contact', placeholder: 'Phone / email' },
                ]}
                onAdd={() => addRow('safety_committee')}
                onRemove={(i) => removeRow('safety_committee', i)}
                onUpdate={(i, k, v) => updateRow('safety_committee', i, k, v)}
              />
            </div>
          )}

          {/* ============ Scope ============ */}
          {activeTab === 'scope' && (
            <div className="pt-5 space-y-6">
              <ChildTable
                title="Project HSE Formats"
                rows={charter.project_hse_formats || []}
                columns={[
                  { label: 'Format', field: 'format', type: 'link', doctype: 'HSE Format', displayField: 'description', filters: [['is_active', '=', 1]] },
                  { label: 'Applicable', field: 'applicable', type: 'check' },
                ]}
                onAdd={() => addRow('project_hse_formats')}
                onRemove={(i) => removeRow('project_hse_formats', i)}
                onUpdate={(i, k, v) => updateRow('project_hse_formats', i, k, v)}
              />
              <ChildTable
                title="Safety Inspections"
                rows={charter.custom_safety_inspections || []}
                columns={[
                  { label: 'Inspection Type', field: 'inspection_type', placeholder: 'e.g. Scaffold Inspection' },
                  { label: 'Frequency', field: 'frequency', type: 'select', options: FREQUENCY_OPTIONS, placeholder: 'Frequency' },
                ]}
                onAdd={() => addRow('custom_safety_inspections')}
                onRemove={(i) => removeRow('custom_safety_inspections', i)}
                onUpdate={(i, k, v) => updateRow('custom_safety_inspections', i, k, v)}
              />
              <ChildTable
                title="Audits"
                rows={charter.custom_audit || []}
                columns={[
                  { label: 'Audit Type', field: 'audit_type', placeholder: 'e.g. Internal HSE Audit' },
                  { label: 'Frequency', field: 'frequency', type: 'select', options: FREQUENCY_OPTIONS, placeholder: 'Frequency' },
                ]}
                onAdd={() => addRow('custom_audit')}
                onRemove={(i) => removeRow('custom_audit', i)}
                onUpdate={(i, k, v) => updateRow('custom_audit', i, k, v)}
              />
              <ChildTable
                title="Walkthroughs"
                rows={charter.custom_walkthrough || []}
                columns={[
                  { label: 'Walkthrough Type', field: 'walkthrough_type', placeholder: 'e.g. Management Walkthrough' },
                  { label: 'Frequency', field: 'frequency', type: 'select', options: FREQUENCY_OPTIONS, placeholder: 'Frequency' },
                ]}
                onAdd={() => addRow('custom_walkthrough')}
                onRemove={(i) => removeRow('custom_walkthrough', i)}
                onUpdate={(i, k, v) => updateRow('custom_walkthrough', i, k, v)}
              />
            </div>
          )}

          {/* ============ Planning ============ */}
          {activeTab === 'planning' && (
            <div className="pt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="card">
                  <div className="card-header" style={{ padding: '1rem 1.25rem' }}>
                    <div className="card-title" style={{ fontSize: '.9375rem' }}>Generate Initial Scope Plan</div>
                    <div className="card-desc" style={{ fontSize: '.75rem' }}>
                      Creates one planning row per scope item with today's date
                    </div>
                  </div>
                  <div className="card-content" style={{ padding: '1rem 1.25rem' }}>
                    <button
                      className="btn btn-primary w-full"
                      onClick={() => runServerMethod(callScopePlan, 'Scope plan generated')}
                    >
                      Generate Initial Scope Plan
                    </button>
                  </div>
                </div>
                <div className="card">
                  <div className="card-header" style={{ padding: '1rem 1.25rem' }}>
                    <div className="card-title" style={{ fontSize: '.9375rem' }}>Generate Custom Plan</div>
                    <div className="card-desc" style={{ fontSize: '.75rem' }}>
                      Stretches scope items across the year using their frequency
                    </div>
                  </div>
                  <div className="card-content" style={{ padding: '1rem 1.25rem' }}>
                    <button
                      className="btn btn-primary w-full"
                      onClick={() => runServerMethod(callCustomPlan, 'Custom plan generated')}
                    >
                      Generate Custom Plan
                    </button>
                  </div>
                </div>
              </div>

              <ChildTable
                title="Planning"
                rows={charter.planning || []}
                columns={[
                  { label: 'Activity', field: 'activity' },
                  { label: 'Planned Date', field: 'planned_date', type: 'date' },
                  { label: 'Status', field: 'status', type: 'select', options: PLANNING_STATUS },
                ]}
                onAdd={() => addRow('planning')}
                onRemove={(i) => removeRow('planning', i)}
                onUpdate={(i, k, v) => updateRow('planning', i, k, v)}
              />
            </div>
          )}

          {/* ============ Trainings ============ */}
          {activeTab === 'trainings' && (
            <div className="pt-5 space-y-4">
              <div className="mb-4">
                <button
                  className="btn btn-primary"
                  onClick={() => runServerMethod(callTrainingEvent, 'Training event(s) created')}
                >
                  <GraduationCap size={14} /> Create Training Event
                </button>
              </div>
              <ChildTable
                title="Assigned Trainings"
                rows={charter.assigned_trainings || []}
                columns={[
                  { label: 'Training', field: 'training', placeholder: 'e.g. Working at Height' },
                  { label: 'Assigned To', field: 'assigned_to', type: 'link', doctype: 'User', displayField: 'full_name', placeholder: 'Select user' },
                  { label: 'Due Date', field: 'due_date', type: 'date' },
                  { label: 'Status', field: 'status', type: 'select', options: TRAINING_STATUS },
                ]}
                onAdd={() => addRow('assigned_trainings')}
                onRemove={(i) => removeRow('assigned_trainings', i)}
                onUpdate={(i, k, v) => updateRow('assigned_trainings', i, k, v)}
              />
            </div>
          )}

          {/* ============ Documents ============ */}
          {activeTab === 'documents' && (
            <div className="pt-5 space-y-6">
              <ChildTable
                title="Master HO Documents"
                rows={charter.master_ho_documents || []}
                columns={[
                  { label: 'Document', field: 'document', type: 'link', doctype: 'HSE Document', displayField: 'description' },
                  { label: 'Version', field: 'version' },
                ]}
                onAdd={() => addRow('master_ho_documents')}
                onRemove={(i) => removeRow('master_ho_documents', i)}
                onUpdate={(i, k, v) => updateRow('master_ho_documents', i, k, v)}
              />
              <ChildTable
                title="Default HO Documents"
                rows={charter.default_ho_documents || []}
                columns={[
                  { label: 'Document', field: 'document', type: 'link', doctype: 'HSE Document', displayField: 'description' },
                  { label: 'Version', field: 'version' },
                ]}
                onAdd={() => addRow('default_ho_documents')}
                onRemove={(i) => removeRow('default_ho_documents', i)}
                onUpdate={(i, k, v) => updateRow('default_ho_documents', i, k, v)}
              />
            </div>
          )}

          {/* ============ Observations / Incidents (placeholders) ============ */}
          {activeTab === 'observations' && (
            <div className="pt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <button className="btn btn-primary" onClick={() => toast.info('Observation form not built yet')}>
                  <Eye size={14} /> Create Observation
                </button>
                <button className="btn btn-outline" onClick={() => toast.info('Observations list not built yet')}>
                  <FileText size={14} /> View Observations
                </button>
              </div>
              <div className="placeholder-box">
                Observations doctype not in this implementation. Add it the same way as HSE Charter when needed.
              </div>
            </div>
          )}

          {activeTab === 'incidents' && (
            <div className="pt-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <button className="btn btn-primary" onClick={() => toast.info('Incident form not built yet')}>
                  <AlertTriangle size={14} /> Create New Incident
                </button>
                <button className="btn btn-outline" onClick={() => toast.info('Incidents list not built yet')}>
                  <FileText size={14} /> View Incidents
                </button>
              </div>
              <div className="placeholder-box">
                Incidents doctype not in this implementation. Add it the same way as HSE Charter when needed.
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
