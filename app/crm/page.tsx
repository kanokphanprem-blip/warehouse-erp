'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase, CrmContact, CrmProject, CrmActivity } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

type Status = CrmProject['status']
type ActivityType = CrmActivity['type']
type View = 'list' | 'board'
type ActiveTab = 'pipeline' | 'contacts'

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
  'PoolComfort Inverter', 'PoolComfort Commercial',
  'HeatPump All-in-One', 'HeatPump Eco',
  'HeatPump High Temp', 'Storage Tank',
]

const ACTIVITY_TYPES: { key: ActivityType; label: string; icon: string }[] = [
  { key: 'follow_up', label: 'Follow Up', icon: '📅' },
  { key: 'call',      label: 'Call',      icon: '📞' },
  { key: 'meeting',   label: 'Meeting',   icon: '🤝' },
  { key: 'email',     label: 'Email',     icon: '✉️'  },
  { key: 'visit',     label: 'Site Visit',icon: '📍' },
  { key: 'note',      label: 'Note',      icon: '📝' },
]

function statusMeta(key: string) { return STATUSES.find(s => s.key === key) ?? STATUSES[0] }
function activityMeta(key: string) { return ACTIVITY_TYPES.find(a => a.key === key) ?? ACTIVITY_TYPES[0] }

function today() { return new Date().toISOString().slice(0, 10) }

function dueDateLabel(due: string): { label: string; cls: string } {
  if (!due) return { label: '', cls: '' }
  const d = new Date(due), t = new Date(today())
  const diff = Math.round((d.getTime() - t.getTime()) / 86400000)
  if (diff < 0)  return { label: `${Math.abs(diff)}d overdue`, cls: 'text-red-600 bg-red-50' }
  if (diff === 0) return { label: 'Today',                      cls: 'text-amber-600 bg-amber-50' }
  if (diff === 1) return { label: 'Tomorrow',                   cls: 'text-amber-500 bg-amber-50' }
  if (diff <= 7)  return { label: `In ${diff} days`,            cls: 'text-blue-600 bg-blue-50' }
  return { label: new Date(due).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), cls: 'text-gray-500 bg-gray-100' }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function CrmPage() {
  const [projects, setProjects]     = useState<CrmProject[]>([])
  const [contacts, setContacts]     = useState<CrmContact[]>([])
  const [activities, setActivities] = useState<CrmActivity[]>([])
  const [tab, setTab]               = useState<ActiveTab>('pipeline')
  const [view, setView]             = useState<View>('list')
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all')
  const [search, setSearch]         = useState('')
  const [contactSearch, setContactSearch] = useState('')

  const [editProject, setEditProject]       = useState<CrmProject | null | undefined>(undefined)
  const [editContact, setEditContact]       = useState<CrmContact | null | undefined>(undefined)
  const [activityProject, setActivityProject] = useState<CrmProject | null>(null)
  const [defaultStatus, setDefaultStatus]   = useState<Status>('lead')
  const [defaultContactId, setDefaultContactId] = useState('')

  async function fetchData() {
    const [pr, cr, ar] = await Promise.all([
      supabase.from('crm_projects').select('*, crm_contacts(name, company, phone)').order('created_at', { ascending: false }),
      supabase.from('crm_contacts').select('*').order('name'),
      supabase.from('crm_activities').select('*').order('due_date').order('created_at', { ascending: false }),
    ])
    setProjects((pr.data as CrmProject[]) ?? [])
    setContacts((cr.data as CrmContact[]) ?? [])
    setActivities((ar.data as CrmActivity[]) ?? [])
  }

  useEffect(() => { fetchData() }, [])

  function openNewProject(status: Status = 'lead', contactId = '') {
    setDefaultStatus(status); setDefaultContactId(contactId); setEditProject(null)
  }

  async function deleteProject(id: string) {
    if (!confirm('Delete this project?')) return
    await supabase.from('crm_activities').delete().eq('project_id', id)
    await supabase.from('crm_projects').delete().eq('id', id)
    fetchData()
  }

  async function deleteContact(id: string) {
    if (!confirm('Delete this contact? Their projects will also be removed.')) return
    const linked = projects.filter(p => p.contact_id === id)
    for (const p of linked) await supabase.from('crm_activities').delete().eq('project_id', p.id)
    await supabase.from('crm_projects').delete().eq('contact_id', id)
    await supabase.from('crm_contacts').delete().eq('id', id)
    fetchData()
  }

  async function updateProjectStatus(id: string, status: Status) {
    await supabase.from('crm_projects').update({ status }).eq('id', id)
    fetchData()
  }

  async function toggleActivity(a: CrmActivity) {
    await supabase.from('crm_activities').update({ completed: !a.completed }).eq('id', a.id)
    fetchData()
  }

  async function deleteActivity(id: string) {
    await supabase.from('crm_activities').delete().eq('id', id)
    fetchData()
  }

  // Stats
  const activeProjects = projects.filter(p => p.status !== 'completed' && p.status !== 'lost')
  const pipelineValue  = activeProjects.reduce((s, p) => s + (p.value || 0), 0)
  const completedCount = projects.filter(p => p.status === 'completed').length

  // Upcoming tasks: not completed, has due date, due within 30 days
  const t = today()
  const upcomingTasks = activities
    .filter(a => !a.completed && a.due_date && a.due_date >= t)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 10)

  const overdueTasks = activities
    .filter(a => !a.completed && a.due_date && a.due_date < t)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))

  const allPendingTasks = [...overdueTasks, ...upcomingTasks]

  // Pending count per project
  const pendingByProject: Record<string, number> = {}
  activities.filter(a => !a.completed).forEach(a => {
    pendingByProject[a.project_id] = (pendingByProject[a.project_id] ?? 0) + 1
  })

  // Filtered projects
  const filteredProjects = projects.filter(p => {
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch = !q ||
      p.title.toLowerCase().includes(q) ||
      (p.crm_contacts?.name ?? '').toLowerCase().includes(q) ||
      (p.crm_contacts?.company ?? '').toLowerCase().includes(q) ||
      p.location.toLowerCase().includes(q) ||
      p.assigned_to.toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
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

      {/* Upcoming Tasks Widget */}
      {allPendingTasks.length > 0 && (
        <TasksWidget
          tasks={allPendingTasks}
          projects={projects}
          onToggle={toggleActivity}
          onDelete={deleteActivity}
          onOpenProject={p => setActivityProject(p)}
        />
      )}

      {/* Tabs */}
      <div className="flex items-center border-b border-gray-200 mb-5">
        {(['pipeline', 'contacts'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'pipeline' ? `Pipeline (${projects.length})` : `Contacts (${contacts.length})`}
          </button>
        ))}
        {tab === 'pipeline' && (
          <div className="ml-auto flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button onClick={() => setView('list')} title="List view"
              className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button onClick={() => setView('board')} title="Board view"
              className={`p-1.5 rounded-md transition-colors ${view === 'board' ? 'bg-white shadow-sm text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {tab === 'pipeline' ? (
        view === 'list' ? (
          <ListView
            projects={filteredProjects}
            allProjects={projects}
            statusFilter={statusFilter}
            search={search}
            pendingByProject={pendingByProject}
            onStatusFilter={setStatusFilter}
            onSearch={setSearch}
            onEdit={p => { setDefaultStatus(p.status); setDefaultContactId(''); setEditProject(p) }}
            onDelete={deleteProject}
            onStatusChange={updateProjectStatus}
            onAdd={openNewProject}
            onOpenActivities={p => setActivityProject(p)}
          />
        ) : (
          <BoardView
            projects={projects}
            pendingByProject={pendingByProject}
            onEdit={p => { setDefaultStatus(p.status); setDefaultContactId(''); setEditProject(p) }}
            onDelete={deleteProject}
            onAdd={status => openNewProject(status)}
            onOpenActivities={p => setActivityProject(p)}
          />
        )
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

      {/* Modals */}
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
      {activityProject && (
        <ProjectActivitiesModal
          project={activityProject}
          activities={activities.filter(a => a.project_id === activityProject.id)}
          onClose={() => setActivityProject(null)}
          onSaved={fetchData}
          onToggle={toggleActivity}
          onDelete={deleteActivity}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Upcoming Tasks Widget
// ─────────────────────────────────────────────────────────────────────────────

function TasksWidget({
  tasks, projects, onToggle, onDelete, onOpenProject,
}: {
  tasks: CrmActivity[]
  projects: CrmProject[]
  onToggle: (a: CrmActivity) => void
  onDelete: (id: string) => void
  onOpenProject: (p: CrmProject) => void
}) {
  const [collapsed, setCollapsed] = useState(false)
  const overdueCount = tasks.filter(a => a.due_date < today()).length

  return (
    <div className="bg-white rounded-xl border border-gray-200 mb-5 overflow-hidden">
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-semibold text-gray-800">Upcoming Tasks</span>
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
            {tasks.length}
          </span>
          {overdueCount > 0 && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
              {overdueCount} overdue
            </span>
          )}
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${collapsed ? '-rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {!collapsed && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {tasks.map(a => {
            const project = projects.find(p => p.id === a.project_id)
            const due = dueDateLabel(a.due_date)
            const meta = activityMeta(a.type)
            return (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/70 transition-colors group">
                {/* Complete toggle */}
                <button onClick={() => onToggle(a)}
                  className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-emerald-500 flex items-center justify-center shrink-0 transition-colors">
                </button>

                {/* Type icon */}
                <span className="text-sm shrink-0">{meta.icon}</span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{a.description}</p>
                  {project && (
                    <button onClick={() => onOpenProject(project)}
                      className="text-xs text-blue-600 hover:text-blue-700 truncate block text-left">
                      {project.crm_contacts?.company
                        ? `${project.crm_contacts.company} · ${project.title}`
                        : project.title}
                    </button>
                  )}
                </div>

                {/* Due date */}
                {due.label && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${due.cls}`}>
                    {due.label}
                  </span>
                )}

                {/* Delete */}
                <button onClick={() => onDelete(a.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Project Activities Modal
// ─────────────────────────────────────────────────────────────────────────────

function ProjectActivitiesModal({
  project, activities, onClose, onSaved, onToggle, onDelete,
}: {
  project: CrmProject
  activities: CrmActivity[]
  onClose: () => void
  onSaved: () => void
  onToggle: (a: CrmActivity) => void
  onDelete: (id: string) => void
}) {
  const [form, setForm] = useState<{
    type: ActivityType; description: string; due_date: string
  }>({ type: 'follow_up', description: '', due_date: '' })
  const [submitting, setSubmitting] = useState(false)

  const pending   = activities.filter(a => !a.completed)
  const completed = activities.filter(a => a.completed)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.description.trim()) return
    setSubmitting(true)
    await supabase.from('crm_activities').insert([{
      project_id: project.id,
      type: form.type,
      description: form.description.trim(),
      due_date: form.due_date,
      completed: false,
    }])
    setForm({ type: 'follow_up', description: '', due_date: '' })
    setSubmitting(false)
    onSaved()
  }

  const statusMeta_ = statusMeta(project.status)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:rounded-xl shadow-xl sm:max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusMeta_.badgeBg} ${statusMeta_.badgeText}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusMeta_.dot}`} />
                {statusMeta_.label}
              </span>
              {pending.length > 0 && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  {pending.length} pending
                </span>
              )}
            </div>
            <h2 className="font-semibold text-gray-900 truncate">{project.title}</h2>
            {project.crm_contacts && (
              <p className="text-xs text-gray-400 mt-0.5">
                {[project.crm_contacts.company, project.crm_contacts.name].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-3 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Add activity form */}
        <form onSubmit={handleAdd} className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <p className="text-xs font-medium text-gray-600 mb-2">Add Update</p>
          <div className="flex gap-2 mb-2">
            {ACTIVITY_TYPES.map(t => (
              <button key={t.key} type="button"
                onClick={() => setForm(f => ({ ...f, type: t.key }))}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${
                  form.type === t.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}>
                <span>{t.icon}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder={`Add ${activityMeta(form.type).label.toLowerCase()} note...`}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
            <input
              type="date"
              value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              min={today()}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-36"
            />
            <button type="submit" disabled={submitting || !form.description.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0">
              Add
            </button>
          </div>
        </form>

        {/* Activities list */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
          {activities.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No updates yet</p>
          )}

          {/* Pending */}
          {pending.length > 0 && (
            <div className="space-y-2">
              {pending.map(a => <ActivityRow key={a.id} activity={a} onToggle={onToggle} onDelete={onDelete} />)}
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Completed</p>
              <div className="space-y-2 opacity-60">
                {completed.map(a => <ActivityRow key={a.id} activity={a} onToggle={onToggle} onDelete={onDelete} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ActivityRow({
  activity: a, onToggle, onDelete,
}: {
  activity: CrmActivity
  onToggle: (a: CrmActivity) => void
  onDelete: (id: string) => void
}) {
  const meta = activityMeta(a.type)
  const due  = dueDateLabel(a.due_date)

  return (
    <div className="flex items-start gap-3 group">
      <button onClick={() => onToggle(a)}
        className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          a.completed
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-gray-300 hover:border-emerald-500'
        }`}>
        {a.completed && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm">{meta.icon}</span>
          <span className="text-xs text-gray-400">{meta.label}</span>
          {due.label && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${due.cls}`}>
              {due.label}
            </span>
          )}
        </div>
        <p className={`text-sm mt-0.5 ${a.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
          {a.description}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          {new Date(a.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
        </p>
      </div>

      <button onClick={() => onDelete(a.id)}
        className="text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 shrink-0 mt-0.5">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// List View
// ─────────────────────────────────────────────────────────────────────────────

function ListView({
  projects, allProjects, statusFilter, search, pendingByProject,
  onStatusFilter, onSearch, onEdit, onDelete, onStatusChange, onAdd, onOpenActivities,
}: {
  projects: CrmProject[]
  allProjects: CrmProject[]
  statusFilter: Status | 'all'
  search: string
  pendingByProject: Record<string, number>
  onStatusFilter: (s: Status | 'all') => void
  onSearch: (v: string) => void
  onEdit: (p: CrmProject) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: Status) => void
  onAdd: (status?: Status) => void
  onOpenActivities: (p: CrmProject) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search projects, contacts, location..." value={search} onChange={e => onSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => onStatusFilter('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            statusFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}>
          All <span className="ml-1 opacity-70">{allProjects.length}</span>
        </button>
        {STATUSES.map(s => {
          const count = allProjects.filter(p => p.status === s.key).length
          if (count === 0 && s.key === 'lost') return null
          return (
            <button key={s.key} onClick={() => onStatusFilter(s.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                statusFilter === s.key
                  ? `${s.badgeBg} ${s.badgeText} ring-1 ring-inset ring-current/20`
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {s.label} <span className="opacity-70">{count}</span>
            </button>
          )
        })}
      </div>

      {projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-16">
          <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm text-gray-400 mb-3">
            {search || statusFilter !== 'all' ? 'No projects match the filter' : 'No projects yet'}
          </p>
          {!search && statusFilter === 'all' && (
            <button onClick={() => onAdd()} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              + Create your first project
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Project</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Contact</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Products</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Value</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Location</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Assigned</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-500">Date</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {projects.map(p => {
                  const lines   = p.product_lines ? p.product_lines.split(',').map(s => s.trim()).filter(Boolean) : []
                  const meta    = statusMeta(p.status)
                  const pending = pendingByProject[p.id] ?? 0
                  return (
                    <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/70 transition-colors group">
                      <td className="px-5 py-3.5 max-w-[200px]">
                        <div className="flex items-center gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 truncate">{p.title}</p>
                            {p.notes && <p className="text-xs text-gray-400 truncate mt-0.5">{p.notes}</p>}
                          </div>
                          {pending > 0 && (
                            <span className="shrink-0 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                              {pending}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 min-w-[140px]">
                        {p.crm_contacts ? (
                          <div>
                            <p className="text-gray-700 font-medium truncate">{p.crm_contacts.company || p.crm_contacts.name}</p>
                            {p.crm_contacts.company && <p className="text-xs text-gray-400 truncate">{p.crm_contacts.name}</p>}
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-5 py-3.5 min-w-[160px]">
                        <div className="flex flex-wrap gap-1">
                          {lines.slice(0, 2).map(l => (
                            <span key={l} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded whitespace-nowrap">{l}</span>
                          ))}
                          {lines.length > 2 && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">+{lines.length - 2}</span>}
                          {lines.length === 0 && <span className="text-gray-400 text-xs">—</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusDropdown value={p.status} onChange={s => onStatusChange(p.id, s)} />
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-gray-700 whitespace-nowrap">
                        {p.value > 0 ? `฿${p.value.toLocaleString()}` : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 max-w-[120px]">
                        <p className="truncate">{p.location || '—'}</p>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600 max-w-[100px]">
                        <p className="truncate">{p.assigned_to || '—'}</p>
                      </td>
                      <td className="px-5 py-3.5 text-right text-gray-400 text-xs whitespace-nowrap">
                        {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => onOpenActivities(p)} title="Updates"
                            className="text-gray-400 hover:text-amber-500 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button onClick={() => onEdit(p)} title="Edit"
                            className="text-gray-400 hover:text-blue-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => onDelete(p.id)} title="Delete"
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
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <p className="text-xs text-gray-400">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
            <button onClick={() => onAdd()} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New project
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Inline status dropdown
function StatusDropdown({ value, onChange }: { value: Status; onChange: (s: Status) => void }) {
  const [open, setOpen] = useState(false)
  const meta = statusMeta(value)
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${meta.badgeBg} ${meta.badgeText} hover:opacity-80 transition-opacity`}>
        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
        {meta.label}
        <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-20 py-1 w-36">
            {STATUSES.map(s => (
              <button key={s.key} onClick={() => { onChange(s.key); setOpen(false) }}
                className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-50 ${s.key === value ? 'font-semibold' : ''}`}>
                <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Board View
// ─────────────────────────────────────────────────────────────────────────────

function BoardView({
  projects, pendingByProject, onEdit, onDelete, onAdd, onOpenActivities,
}: {
  projects: CrmProject[]
  pendingByProject: Record<string, number>
  onEdit: (p: CrmProject) => void
  onDelete: (id: string) => void
  onAdd: (status: Status) => void
  onOpenActivities: (p: CrmProject) => void
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-8 sm:px-8">
      {PIPELINE_STAGES.map(status => {
        const meta = statusMeta(status)
        const cols = projects.filter(p => p.status === status)
        const colValue = cols.reduce((s, p) => s + (p.value || 0), 0)
        return (
          <div key={status} className="shrink-0 w-64 flex flex-col">
            <div className={`${meta.headerBg} rounded-t-xl px-3 py-2 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                <span className={`text-xs font-semibold ${meta.badgeText}`}>{meta.label}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full bg-white/60 ${meta.badgeText} font-medium`}>{cols.length}</span>
              </div>
              {colValue > 0 && <span className="text-xs text-gray-500">฿{colValue.toLocaleString()}</span>}
            </div>
            <div className={`flex-1 ${meta.colBg} rounded-b-xl border border-t-0 border-gray-200 p-2 space-y-2 min-h-[80px]`}>
              {cols.map(p => {
                const lines   = p.product_lines ? p.product_lines.split(',').map(s => s.trim()).filter(Boolean) : []
                const pending = pendingByProject[p.id] ?? 0
                return (
                  <div key={p.id} className="bg-white rounded-lg border border-gray-200 p-2.5 shadow-sm hover:shadow transition-shadow group">
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <p className="text-xs font-semibold text-gray-800 leading-snug flex-1">{p.title}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        {pending > 0 && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded-full font-medium">{pending}</span>
                        )}
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => onOpenActivities(p)} className="text-gray-400 hover:text-amber-500">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button onClick={() => onEdit(p)} className="text-gray-400 hover:text-blue-600">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => onDelete(p.id)} className="text-gray-400 hover:text-red-500">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                    {p.crm_contacts && (
                      <p className="text-xs text-gray-500 truncate mb-1">{p.crm_contacts.company || p.crm_contacts.name}</p>
                    )}
                    {lines.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {lines.slice(0, 2).map(l => (
                          <span key={l} className="text-[10px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded">{l}</span>
                        ))}
                        {lines.length > 2 && <span className="text-[10px] text-gray-400">+{lines.length - 2}</span>}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      {p.value > 0 ? <span className="text-xs font-semibold text-gray-700">฿{p.value.toLocaleString()}</span> : <span />}
                      <span className="text-[10px] text-gray-400">
                        {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                )
              })}
              <button onClick={() => onAdd(status)}
                className="w-full py-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-white/60 rounded-lg transition-colors flex items-center justify-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add
              </button>
            </div>
          </div>
        )
      })}
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
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                      <td className="px-5 py-3.5 font-medium text-gray-800">{c.name}</td>
                      <td className="px-5 py-3.5 text-gray-600">{c.company || '—'}</td>
                      <td className="px-5 py-3.5 text-gray-600">{c.phone || '—'}</td>
                      <td className="px-5 py-3.5 text-gray-600">{c.email || '—'}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">{count}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => onAddProject(c)} title="New project" className="text-gray-400 hover:text-blue-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                          <button onClick={() => onEdit(c)} title="Edit" className="text-gray-400 hover:text-blue-600 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => onDelete(c.id)} title="Delete" className="text-gray-400 hover:text-red-500 transition-colors">
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

  const selectedLines = form.product_lines ? form.product_lines.split(',').map(s => s.trim()).filter(Boolean) : []
  function toggleLine(line: string) {
    const updated = selectedLines.includes(line) ? selectedLines.filter(l => l !== line) : [...selectedLines, line]
    setForm(f => ({ ...f, product_lines: updated.join(',') }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true); setError('')
    const payload = {
      title: form.title.trim(), contact_id: form.contact_id, status: form.status,
      product_lines: form.product_lines, value: Number(form.value) || 0,
      location: form.location.trim(), assigned_to: form.assigned_to.trim(), notes: form.notes.trim(),
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
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Project Title *</label>
            <input required type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Hotel Grand Pool Heating System"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Contact *</label>
              <select required value={form.contact_id} onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Select contact...</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status *</label>
              <select required value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Status }))}
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
                  <label key={line} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-xs ${checked ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleLine(line)} className="hidden" />
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                      {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
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
              <input type="number" min={0} value={form.value || ''} onChange={e => setForm(f => ({ ...f, value: Number(e.target.value) }))}
                placeholder="0" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Assigned To</label>
              <input type="text" value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                placeholder="Engineer / Sales" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Location / Site</label>
            <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="e.g. Phuket, Grand Hotel" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={form.notes} rows={3} placeholder="Project requirements, site conditions..."
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
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

function ContactModal({ contact, onClose, onSaved }: { contact: CrmContact | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = contact !== null
  const [form, setForm] = useState({
    name: contact?.name ?? '', company: contact?.company ?? '',
    phone: contact?.phone ?? '', email: contact?.email ?? '',
    address: contact?.address ?? '', notes: contact?.notes ?? '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true); setError('')
    const payload = { name: form.name.trim(), company: form.company.trim(), phone: form.phone.trim(), email: form.email.trim(), address: form.address.trim(), notes: form.notes.trim() }
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
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
            <input required type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Company</label>
            <input type="text" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="Company / Hotel / Developer" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email address" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
            <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Address" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={form.notes} rows={2} placeholder="Optional notes..." onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
