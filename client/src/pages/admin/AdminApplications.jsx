import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Sparkles,
  ArrowRight,
  UserCheck,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../../components/common/Table';

const STAGES = [
  'Applied',
  'Shortlisted',
  'OA',
  'Technical',
  'HR',
  'Selected',
  'Rejected',
];

export const AdminApplications = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [applications, setApplications] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [jobFilter, setJobFilter] = useState(searchParams.get('jobId') || 'all');
  const [stageFilter, setStageFilter] = useState('all');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState(null);
  const [newStatus, setNewStatus] = useState('Shortlisted');
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [appsRes, jobsRes] = await Promise.all([
        api.get('/applications'),
        api.get('/jobs'),
      ]);

      if (appsRes.success) setApplications(appsRes.applications || []);
      if (jobsRes.success) setJobs(jobsRes.jobs || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openStageModal = (app) => {
    setSelectedApp(app);
    setNewStatus(app.status);
    setNotes('');
    setModalOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedApp) return;

    try {
      setUpdating(true);
      const res = await api.put(`/applications/${selectedApp._id}/status`, {
        status: newStatus,
        notes: notes || `Candidate advanced to ${newStatus} stage by TPO.`,
      });

      if (res.success) {
        toast.success(`Candidate advanced to ${newStatus}! Notification sent.`);
        setApplications((prev) =>
          prev.map((a) => (a._id === selectedApp._id ? { ...a, status: newStatus } : a))
        );
        setModalOpen(false);
      }
    } catch (err) {
      toast.error(err.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Selected':
        return <Badge variant="success" dot>Selected / Offer</Badge>;
      case 'Rejected':
        return <Badge variant="danger" dot>Rejected</Badge>;
      case 'Shortlisted':
        return <Badge variant="purple" dot>Shortlisted</Badge>;
      case 'OA':
        return <Badge variant="warning" dot>Online Assessment</Badge>;
      case 'Technical':
        return <Badge variant="info" dot>Technical Interview</Badge>;
      case 'HR':
        return <Badge variant="info" dot>HR Round</Badge>;
      default:
        return <Badge variant="neutral" dot>Applied</Badge>;
    }
  };

  const filteredApps = applications.filter((app) => {
    const q = search.toLowerCase();
    const studentName = app.student?.name || '';
    const studentEmail = app.student?.email || '';
    const company = app.job?.company?.name || '';
    const title = app.job?.title || '';

    const matchesSearch =
      studentName.toLowerCase().includes(q) ||
      studentEmail.toLowerCase().includes(q) ||
      company.toLowerCase().includes(q) ||
      title.toLowerCase().includes(q);

    const matchesJob = jobFilter === 'all' || app.jobId === jobFilter || app.job?._id === jobFilter;
    const matchesStage = stageFilter === 'all' || app.status === stageFilter;

    return matchesSearch && matchesJob && matchesStage;
  });

  return (
    <div className="space-y-8 text-left">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Applicant Lifecycle & Shortlist Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight font-display">
            Recruitment Pipeline & Applicant Reviews
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Advance candidates through recruitment rounds (Applied → Shortlisted → OA → Technical → HR → Selected/Rejected) with automated student notifications.
          </p>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card hover className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Applicants</p>
          <h3 className="text-2xl font-black text-white mt-1">{applications.length}</h3>
          <span className="text-[10px] text-indigo-400 font-semibold">Across all drives</span>
        </Card>
        <Card hover className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Shortlisted</p>
          <h3 className="text-2xl font-black text-white mt-1">
            {applications.filter((a) => a.status === 'Shortlisted').length}
          </h3>
          <span className="text-[10px] text-purple-400 font-semibold">Cleared resume cutoffs</span>
        </Card>
        <Card hover className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">In Rounds (OA/Tech/HR)</p>
          <h3 className="text-2xl font-black text-white mt-1">
            {applications.filter((a) => ['OA', 'Technical', 'HR'].includes(a.status)).length}
          </h3>
          <span className="text-[10px] text-amber-400 font-semibold">Under assessment</span>
        </Card>
        <Card hover className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Offers Extended</p>
          <h3 className="text-2xl font-black text-white mt-1">
            {applications.filter((a) => a.status === 'Selected').length}
          </h3>
          <span className="text-[10px] text-emerald-400 font-semibold">Placed students</span>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-3 rounded-2xl flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by student name, roll number, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="sm:w-56">
          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Placement Drives</option>
            {jobs.map((j) => (
              <option key={j._id} value={j._id}>
                {j.company?.name} — {j.title}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:w-44">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Pipeline Stages</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Applications Table */}
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Candidate</TableHead>
              <TableHead>Branch & CGPA</TableHead>
              <TableHead>Placement Drive</TableHead>
              <TableHead>Compensation</TableHead>
              <TableHead>Applied Date</TableHead>
              <TableHead>Current Pipeline Stage</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {loading ? (
              <tr>
                <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                  Loading applicant records...
                </TableCell>
              </tr>
            ) : filteredApps.length === 0 ? (
              <tr>
                <TableCell colSpan={7} className="text-center py-12 text-slate-400">
                  No applicant records match the selected filters.
                </TableCell>
              </tr>
            ) : (
              filteredApps.map((app) => (
                <TableRow key={app._id}>
                  <TableCell className="font-bold text-white flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-black text-indigo-400 shrink-0">
                      {app.student?.name ? app.student.name.charAt(0) : 'S'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{app.student?.name || 'Candidate'}</p>
                      <p className="text-[11px] text-slate-400 font-normal">{app.student?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <p className="text-slate-200 font-semibold">{app.student?.department || 'CSE'}</p>
                    <p className="text-emerald-400 font-bold">CGPA: {app.student?.cgpa || 8.8}</p>
                  </TableCell>
                  <TableCell className="text-xs">
                    <p className="text-white font-bold">{app.job?.company?.name}</p>
                    <p className="text-indigo-400">{app.job?.title}</p>
                  </TableCell>
                  <TableCell className="font-extrabold text-emerald-400 text-xs">
                    {app.job?.package || 'N/A'}
                  </TableCell>
                  <TableCell className="text-xs text-slate-400">
                    {new Date(app.appliedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </TableCell>
                  <TableCell>{getStatusBadge(app.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openStageModal(app)}
                      rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                    >
                      Advance Stage
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Stage Progression Modal */}
      {modalOpen && selectedApp && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={`Update Recruitment Stage: ${selectedApp.student?.name}`}
          description={`Drive: ${selectedApp.job?.company?.name} — ${selectedApp.job?.title}`}
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={updating}
                onClick={handleUpdateStatus}
              >
                Confirm & Notify Candidate
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-left">
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-xs grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400 font-semibold block">Student Branch</span>
                <span className="text-white font-bold">{selectedApp.student?.department}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Academic CGPA</span>
                <span className="text-emerald-400 font-bold">{selectedApp.student?.cgpa} / 10.0</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Current Status</span>
                <span className="text-indigo-400 font-semibold">{selectedApp.status}</span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block">Attached Resume</span>
                {selectedApp.resumeUrl || selectedApp.student?.resumeUrl ? (
                  <a
                    href={selectedApp.resumeUrl || selectedApp.student?.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 font-bold inline-flex items-center gap-1 hover:underline mt-0.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Submitted CV</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-slate-300 font-medium truncate block">Official Verified CV</span>
                )}
              </div>
            </div>

            {/* Select Target Stage */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Advance Candidate to Stage
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {STAGES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setNewStatus(s)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      newStatus === s
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {s === 'Selected' ? '🎉 Selected / Offer' : s === 'Rejected' ? '❌ Rejected' : s}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes / Assessment Instructions */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Official Feedback / Round Details (Sent to Student)
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Cleared technical interview round. Online Assessment invitation link will be sent via HackerRank for Saturday 10:00 AM."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
