'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase, CrmContact, CrmProject } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

type Status = CrmProject['status']

const STATUSES: {
  key: Status; label: string
  colBg: string; headerBg: string; badgeBg: string; badgeText: string; dot: string
}[] = [
  { key: 'lead',        label: 'Lead',        colBg: 'bg-slate-50',   headerBg: 'bg-slate-100',   badgeBg: 'bg-slate-100',   badgeText: 'text-slate-700',   dot: 'bg-slate-400'   },
  { key: 'quoted',      label: 'Quoted',      colBg: 'bg-blue-50',    headerBg: 'bg-blue-100',    badgeBg: 'bg-blue-100',    badgeText: 'text-blue-700',    dot: 'bg-blue-500'    },
  { key: 'won',         label: 'Won',         colBg: 'bg-green-50',   headerBg: 'bg-green-100',   badgeBg: 'bg-green-100',   badgeText: 'text-green-700',   dot: 'bg-green-500'   },
  { key: 'in_progress', label: 'In Progress', colBg: 'bg-amber-50',   headerBg: 'bg-amber-100',   badgeBg: 'bg-amber-100',   badgeText: 'text-amber-700',   dot: 'bg-amber-500'   },
  { key: 'completed',   label: 'Completed',   colBg: 'bg-emerald-50', headerBg: 'bg-emerald-100', badgeBg: 'bg-emerald-100', badgeText: 'text-emerald-700', dot: 'bg-emerald-500' },
  { key: 'lost',        label: 'Lost',        colBg: 'bg-red-50',     headerBg: 'bg-red-100',     badgeBg: 'bg-red-100',     badgeText: 'text-red-700',     dot: 'bg-red-400'     },
]

const PIPELINE_STAGES: Status[] = ['lead', 'quoted', 'won', 'in_progress', 'completed']

const PRODUCT_LINES = [
  'PoolComfort Inverter',
  'PoolComfort Commercial',
  'HeatPump All-in-One',
  'HeatPump Eco',
  'HeatPump High Temp',
  'Storage Tank',
]

function statusMeta(key: string) {
  return STATUSES.find(s => s.key === key) ?? STATUSES[0]
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function CrmPage() {
  const [projects, setProjects] = useState<CrmProject[]>([])
  const [contacts, setContacts] = useState<CrmContact[]>([])
  const [tab, setTab] = useState<'pipeline' | 'contacts'>('pipeline')
  const [showLost, setShowLost] = useState(false)
  const [contactSearch, setContactSearch] = useState('')

  // undefined = closed, null = add new, object = edit
  const [editProject, setEditProject] = useState<CrmProject | null | undefined>(undefined)
  const [editContact, setEditContact] = useState<CrmContact | null | undefined>(undefined)
  const [defaultStatus, setDefaultStatus] = useState<Status>('lead')
  const [defaultContactId, setDefaultContactId] = useState('')

  async function fetchData() {
    const [pr, cr] = await Promise.all([
      supabase.from('crm_projects').select('*, crm_contacts(name, company, phone)').order('created_at', { ascending: false }),
      supabase.from('crm_contacts').select('*').order('name'),
    ])
    setProjects((pr.data as CrmProject[]) ?? [])
    setContacts((cr.data as CrmContact[]) ?? [])
  }

  useEffect(() => { fetchData() }, [])

  function openNewProject(status: Status = 'lead', contactId = '') {
    setDefaultStatus(status)
    setDefaultContactId(contactId)
    setEditProject(null)
  }

  async function deleteProject(id: string) {
    if (!confirm('Delete this project?')) return
    await supabase.from('crm_projects').delete().eq('id', id)
    fetchData()
  }

  async function deleteContact(id: string) {
    if (!confirm('Delete this contact? Their projects will also be removed.')) return
    await supabase.from('crm_projects').delete().eq('contact_id', id)
    await supabase.from('crm_contacts').delete().eq('id', id)
    fetchData()
  }

  const activeProjects = projects.filter(p => p.status !== 'completed' && p.status !== 'lost')
  const pipelineValue = activeProjects.reduce((s, p) => s + (p.value || 0), 0)
  const completedCount = projects.filter(p => p.status === 'completed').length
  const visibleProjects = showLost ? projects : projects.filter(p => p.status !== 'lost')
  const filteredContacts = contacts.filter(c => {
    const q = contactSearch.toLowerCase()
    return !q || c.name.toLowerCase().includes(q) || c.company.toLowerCase().includes(q) ||
      c.phone.includes(q) || c.email.toLowerCase().includes(q)
  })

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM</h1>
          <p className="text-gray-500 text-sm mt-1">Project pipeline & customer management</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setEditContact(null)}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 transition-colors">
            Add Contact
          </button>
          <button onClick={() => openNewProject()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Contacts</p>
          <p className="text-2xl font-bold text-gray-900">{contacts.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Active Projects</p>
          <p className="text-2xl font-bold text-amber-600">{activeProjects.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Completed</p>
          <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Pipeline Value</p>
          <p className="text-2xl font-bold text-violet-600">฿{pipelineValue.toLocaleString()}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-gray-200 mb-5">
        {(['pipeline', 'contacts'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'pipeline' ? 'Pipeline' : `Contacts (${contacts.length})`}
          </button>
        ))}
        {tab === 'pipeline' && (
          <label className="ml-auto flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none pb-2">
            <input type="checkbox" checked={showLost} onChange={e => setShowLost(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-gray-300" />
            Show Lost
          </label>
        )}
      </div>

      {tab === 'pipeline' ? (
        <PipelineBoard
          projects={visibleProjects}
          showLost={showLost}
          onEdit={p => { setDefaultStatus(p.status); setDefaultContactId(''); setEditProject(p) }}
          onDelete={deleteProject}
          onAdd={status => openNewProject(status)}
        />
      ) : (
        <ContactsTable
          contacts={filteredContacts}
          projects={projects}
          search={contactSearch}
          onSearch={setContactSearch}
          onEdit={c => setEditContact(c)}
          onDelete={deleteContact}
          onAddProject={c => openNewProject('lead', c.id)}
        />
      )}

      {editProject !== undefined && (
        <ProjectModal
          project={editProject}
          contacts={contacts}
          defaultStatus={defaultStatus}
          defaultContactId={defaultContactId}
          onClose={() => setEditProject(undefined)}
          onSaved={() => { setEditProject(undefined); fetchData() }}
        />
      )}
      {editContact !== undefined && (
        <ContactModal
          contact={editContact}
          onClose={() => setEditContact(undefined)}
          onSaved={() => { setEditContact(undefined); fetchData() }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline Board (Kanban)
// ─────────────────────────────────────────────────────────────────────────────

function PipelineBoard({
  projects, showLost, onEdit, onDelete, onAdd,
}: {
  projects: CrmProject[]
  showLost: boolean
  onEdit: (p: CrmProject) => void
  onDelete: (id: string) => void
  onAdd: (status: Status) => void
}) {
  const stages: Status[] = showLost ? [...PIPELINE_STAGES, 'lost'] : PIPELINE_STAGES

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-8 sm:px-8">
      {stages.map(status => {
        const meta = statusMeta(status)
        const cols = projects.filter(p => p.status === status)
        const colValue = cols.reduce((s, p) => s + (p.value || 0), 0)
        return (
          <div key={status} className="shrink-0 w-72 flex flex-col">
            <div className={`${meta.headerBg} rounded-t-xl px-3 py-2.5 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                <span className={`text-sm font-semibold ${meta.badgeText}`}>{meta.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${meta.badgeBg} ${meta.badgeText} font-medium`}>
                  {cols.length}
                </span>
              </div>
              {colValue > 0 && <span className="text-xs text-gray-500">฿{colValue.toLocaleString()}</span>}
            </div>
            <div className={`flex-1 ${meta.colBg} rounded-b-xl border border-t-0 border-gray-200 p-2 space-y-2 min-h-[100px]`}>
              {cols.map(p => (
                <ProjectCard key={p.id} project={p} onEdit={onEdit} onDelete={onDelete} />
              ))}
              {status !== 'lost' && (
                <button onClick={() => onAdd(status)}
                  className="w-full py-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-white/60 rounded-lg transition-colors flex items-center justify-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add project
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ProjectCard({
  project: p, onEdit, onDelete,
}: {
  project: CrmProject
  onEdit: (p: CrmProject) => void
  onDelete: (id: string) => void
}) {
  const lines = p.product_lines ? p.product_lines.split(',').map(s => s.trim()).filter(Boolean) : []

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow transition-shadow group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-gray-800 leading-snug">{p.title}</p>
        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(p)} title="Edit"
            className="text-gray-400 hover:text-blue-600 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button onClick={() => onDelete(p.id)} title="Delete"
            className="text-gray-400 hover:text-red-500 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {p.crm_contacts && (
        <div className="flex items-center gap-1.5 mb-2">
          <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-xs text-gray-600 truncate">
            {p.crm_contacts.company ? `${p.crm_contacts.company} · ` : ''}{p.crm_contacts.name}
          </span>
        </div>
      )}

      {lines.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {lines.map(line => (
            <span key={line} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{line}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        {p.value > 0
          ? <span className="text-xs font-semibold text-gray-700">฿{p.value.toLocaleString()}</span>
          : <span />}
        <span className="text-xs text-gray-400">
          {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </span>
      </div>
      {(p.location || p.assigned_to) && (
        <p className="text-xs text-gray-400 mt-1 truncate">
          {[p.location, p.assigned_to].filter(Boolean).join(' · ')}
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Contacts Table
// ─────────────────────────────────────────────────────────────────────────────

function ContactsTable({
  contacts, projects, search, onSearch, onEdit, onDelete, onAddProject,
}: {
  contacts: CrmContact[]
  projects: CrmProject[]
  search: string
  onSearch: (v: string) => void
  onEdit: (c: CrmContact) => void
  onDelete: (id: string) => void
  onAddProject: (c: CrmContact) => void
}) {
  return (
    <div>
      <div className="relative mb-4">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" placeholder="Search contacts..." value={search} onChange={e => onSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {contacts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
          <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-sm text-gray-400">No contacts yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Name</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Company</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Phone</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Email</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Projects</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {contacts.map(c => {
                  const count = projects.filter(p => p.contact_id === c.id).length
                  return (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-800">{c.name}</td>
                      <td className="px-5 py-3.5 text-gray-600">{c.company || '—'}</td>
                      <td className="px-5 py-3.5 text-gray-600">{c.phone || '—'}</td>
                      <td className="px-5 py-3.5 text-gray-600">{c.email || '—'}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {count}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => onAddProject(c)} title="New project for this contact"
                            className="text-gray-400 hover:text-blue-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                          <button onClick={() => onEdit(c)} title="Edit contact"
                            className="text-gray-400 hover:text-blue-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => onDelete(c.id)} title="Delete contact"
                            className="text-gray-400 hover:text-red-500 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Project Modal
// ─────────────────────────────────────────────────────────────────────────────

function ProjectModal({
  project, contacts, defaultStatus, defaultContactId, onClose, onSaved,
}: {
  project: CrmProject | null
  contacts: CrmContact[]
  defaultStatus: Status
  defaultContactId: string
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = !!(project?.id)
  const [form, setForm] = useState({
    title: project?.title ?? '',
    contact_id: project?.contact_id ?? defaultContactId,
    status: (project?.status ?? defaultStatus) as Status,
    product_lines: project?.product_lines ?? '',
    value: project?.value ?? 0,
    location: project?.location ?? '',
    assigned_to: project?.assigned_to ?? '',
    notes: project?.notes ?? '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const selectedLines = form.product_lines
    ? form.product_lines.split(',').map(s => s.trim()).filter(Boolean)
    : []

  function toggleLine(line: string) {
    const updated = selectedLines.includes(line)
      ? selectedLines.filter(l => l !== line)
      : [...selectedLines, line]
    setForm(f => ({ ...f, product_lines: updated.join(',') }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const payload = {
      title: form.title.trim(),
      contact_id: form.contact_id,
      status: form.status,
      product_lines: form.product_lines,
      value: Number(form.value) || 0,
      location: form.location.trim(),
      assigned_to: form.assigned_to.trim(),
      notes: form.notes.trim(),
    }
    const { error: err } = isEdit
      ? await supabase.from('crm_projects').update(payload).eq('id', project!.id)
      : await supabase.from('crm_projects').insert([payload])
    if (err) { setError(err.message); setSubmitting(false); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-gray-900">{isEdit ? 'Edit Project' : 'New Project'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Project Title *</label>
            <input required type="text" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Hotel Grand Pool Heating System"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Contact *</label>
              <select required value={form.contact_id}
                onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Select contact...</option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.company ? ` — ${c.company}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status *</label>
              <select required value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Product Lines</label>
            <div className="grid grid-cols-2 gap-1.5">
              {PRODUCT_LINES.map(line => {
                const checked = selectedLines.includes(line)
                return (
                  <label key={line}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-xs ${
                      checked ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleLine(line)} className="hidden" />
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                      checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                    }`}>
                      {checked && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    {line}
                  </label>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estimated Value (฿)</label>
              <input type="number" min={0} value={form.value || ''}
                onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))}
                placeholder="0"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Assigned To</label>
              <input type="text" value={form.assigned_to}
                onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                placeholder="Engineer / Sales"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Location / Site</label>
            <input type="text" value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Phuket, Grand Hotel"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={form.notes} rows={3} placeholder="Project requirements, site conditions..."
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Contact Modal
// ─────────────────────────────────────────────────────────────────────────────

function ContactModal({
  contact, onClose, onSaved,
}: {
  contact: CrmContact | null
  onClose: () => void
  onSaved: () => void
}) {
  const isEdit = contact !== null
  const [form, setForm] = useState({
    name: contact?.name ?? '',
    company: contact?.company ?? '',
    phone: contact?.phone ?? '',
    email: contact?.email ?? '',
    address: contact?.address ?? '',
    notes: contact?.notes ?? '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const payload = {
      name: form.name.trim(),
      company: form.company.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      notes: form.notes.trim(),
    }
    const { error: err } = isEdit
      ? await supabase.from('crm_contacts').update(payload).eq('id', contact.id)
      : await supabase.from('crm_contacts').insert([payload])
    if (err) { setError(err.message); setSubmitting(false); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{isEdit ? 'Edit Contact' : 'Add Contact'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
            <input required type="text" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Full name"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
            <input type="text" value={form.company}
              onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
              placeholder="Company / Hotel / Developer"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input type="tel" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="Phone number"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="Email address"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
            <input type="text" value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              placeholder="Address"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={form.notes} rows={2} placeholder="Optional notes..."
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
