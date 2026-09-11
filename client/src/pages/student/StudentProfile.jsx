import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Building2,
  Award,
  GraduationCap,
  Globe,
  Link2,
  Plus,
  X,
  Save,
  CheckCircle2,
  FileText,
  Upload,
  ExternalLink,
  Trash2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { CircularProgress, ProgressBar } from '../../components/common/Progress';

export const StudentProfile = () => {
  const { user, updateProfile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [uploadingResume, setUploadingResume] = useState(false);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    department: user?.department || '',
    cgpa: user?.cgpa || '',
    graduationYear: user?.graduationYear || 2026,
    bio: user?.bio || '',
    github: user?.github || '',
    linkedin: user?.linkedin || '',
  });

  const [skills, setSkills] = useState(
    Array.isArray(user?.skills) ? user.skills : []
  );
  const [newSkill, setNewSkill] = useState('');
  const [saving, setSaving] = useState(false);

  const handleResumeUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File exceeds 5MB limit. Please upload a smaller PDF or document.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate extension / MIME
    const validExtensions = ['.pdf', '.doc', '.docx'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt && file.type !== 'application/pdf') {
      toast.error('Please upload a PDF or DOC/DOCX file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploadingResume(true);
    const reader = new FileReader();

    reader.onload = async () => {
      try {
        const base64Data = reader.result;
        const formattedSize =
          file.size > 1024 * 1024
            ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.round(file.size / 1024)} KB`;

        const res = await updateProfile({
          resumeUrl: base64Data,
          resumeName: file.name,
          resumeSize: formattedSize,
          resumeUpdatedAt: new Date().toISOString(),
        });

        if (res?.success) {
          toast.success('Resume uploaded and saved to your profile!');
        }
      } catch (err) {
        toast.error(err.message || 'Failed to upload resume');
      } finally {
        setUploadingResume(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      toast.error('Failed to read resume file from disk.');
      setUploadingResume(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsDataURL(file);
  };

  const handleDeleteResume = async () => {
    if (!window.confirm('Are you sure you want to remove your uploaded resume?')) return;
    setUploadingResume(true);
    try {
      const res = await updateProfile({
        resumeUrl: '',
        resumeName: '',
        resumeSize: '',
        resumeUpdatedAt: null,
      });
      if (res?.success) {
        toast.info('Resume removed from profile.');
      }
    } catch (err) {
      toast.error('Could not remove resume');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleViewResume = () => {
    if (!user?.resumeUrl) {
      toast.warning('No resume file uploaded yet.');
      return;
    }

    try {
      if (user.resumeUrl.startsWith('data:')) {
        const parts = user.resumeUrl.split(';base64,');
        const contentType = parts[0].split(':')[1] || 'application/pdf';
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);
        for (let i = 0; i < rawLength; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }
        const blob = new Blob([uInt8Array], { type: contentType });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } else {
        window.open(user.resumeUrl, '_blank');
      }
    } catch (e) {
      const link = document.createElement('a');
      link.href = user.resumeUrl;
      link.download = user.resumeName || 'Resume.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleAddSkill = (e) => {
    e?.preventDefault();
    if (!newSkill.trim()) return;
    if (skills.includes(newSkill.trim())) {
      toast.warning('Skill already added!');
      return;
    }
    setSkills([...skills, newSkill.trim()]);
    setNewSkill('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const result = await updateProfile({
      ...formData,
      skills,
    });
    setSaving(false);
  };

  return (
    <div className="space-y-8 text-left max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight font-display">
            Student Profile & Placement Portfolio
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            Manage your academic credentials, verified skills, and resume for recruiters.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="md"
          isLoading={saving}
          onClick={handleSubmit}
          leftIcon={<Save className="w-4 h-4" />}
        >
          Save Profile Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Quick Profile Card & Readiness Score */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="text-center flex flex-col items-center">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-indigo-500/25 border-2 border-indigo-400/30">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'S'}
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 bg-slate-900 rounded-full">
                <Badge variant="success" size="sm" dot>Active</Badge>
              </div>
            </div>

            <h3 className="text-lg font-bold text-white">{user?.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
            <p className="text-xs font-semibold text-indigo-400 mt-1">
              Roll No: {user?.rollNumber || 'CS2026-089'}
            </p>

            <div className="w-full my-5 border-t border-slate-800" />

            {/* Circular Readiness Gauge */}
            <div className="space-y-3">
              <CircularProgress
                value={user?.readinessScore || 92}
                size={110}
                strokeWidth={9}
                label="Readiness"
              />
              <div>
                <p className="text-xs font-bold text-white">Tier-1 Company Eligible</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Calculated based on CGPA, verified skills, and completed portfolio links.
                </p>
              </div>
            </div>
          </Card>

          {/* Resume Card */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Placement Resume</CardTitle>
              {user?.resumeUrl ? (
                <Badge variant="success" size="sm" dot>Uploaded</Badge>
              ) : (
                <Badge variant="neutral" size="sm">No File</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.doc,.docx"
                onChange={handleResumeUpload}
                className="hidden"
              />

              {user?.resumeUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <FileText className="w-8 h-8 text-rose-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate" title={user.resumeName || 'Uploaded Resume'}>
                        {user.resumeName || `${user?.name?.replace(/\s+/g, '_') || 'Student'}_Resume.pdf`}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {user.resumeUpdatedAt
                          ? `Updated ${new Date(user.resumeUpdatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`
                          : 'Active verified copy'}{' '}
                        • {user.resumeSize || 'PDF Document'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleViewResume}
                      leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                    >
                      View / Preview
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      isLoading={uploadingResume}
                      onClick={() => fileInputRef.current?.click()}
                      leftIcon={<Upload className="w-3.5 h-3.5" />}
                    >
                      Replace File
                    </Button>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs"
                    disabled={uploadingResume}
                    onClick={handleDeleteResume}
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  >
                    Remove Uploaded Resume
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-900/50 hover:bg-slate-900 cursor-pointer transition-all group text-center"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform mb-2">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                      Click to upload your resume
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Supports PDF, DOC, DOCX (Max 5MB)
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="w-full"
                    isLoading={uploadingResume}
                    leftIcon={<Upload className="w-4 h-4" />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Select Resume File
                  </Button>
                </div>
              )}

              {/* Resume Builder Link */}
              <div className="pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => navigate('/student/resume/builder')}
                  className="w-full flex items-center justify-between text-left p-2.5 rounded-xl bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:text-indigo-200 transition-colors group text-xs cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="font-semibold">Need an ATS-compliant resume?</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Editable Details & Skills */}
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Academic & Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    leftIcon={<User className="w-4 h-4" />}
                  />
                  <Input
                    label="Contact Phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    leftIcon={<Phone className="w-4 h-4" />}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5 text-left">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Department
                    </label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm px-3.5 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
                    >
                      <option value="Computer Science & Engineering">Computer Science & Engg</option>
                      <option value="Information Technology">Information Technology</option>
                      <option value="Electronics & Communication">Electronics & Comm</option>
                      <option value="Electrical Engineering">Electrical Engineering</option>
                    </select>
                  </div>

                  <Input
                    label="Cumulative CGPA"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={formData.cgpa}
                    onChange={(e) => setFormData({ ...formData, cgpa: Number(e.target.value) })}
                    leftIcon={<Award className="w-4 h-4" />}
                  />

                  <Input
                    label="Graduation Year"
                    type="number"
                    value={formData.graduationYear}
                    onChange={(e) => setFormData({ ...formData, graduationYear: Number(e.target.value) })}
                    leftIcon={<GraduationCap className="w-4 h-4" />}
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Professional Bio / Summary
                  </label>
                  <textarea
                    rows={3}
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm px-4 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20"
                    placeholder="Describe your technical focus areas and career objectives..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="GitHub Profile URL"
                    value={formData.github}
                    onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                    placeholder="https://github.com/username"
                    leftIcon={<Globe className="w-4 h-4" />}
                  />
                  <Input
                    label="LinkedIn Profile URL"
                    value={formData.linkedin}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                    placeholder="https://linkedin.com/in/username"
                    leftIcon={<Link2 className="w-4 h-4" />}
                  />
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Skills Matrix */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Skills & Technical Competencies</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">
                  Recruiters filter candidates by tagged technologies and core strengths.
                </p>
              </div>
              <Badge variant="purple" size="sm">{skills.length} Skills</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleAddSkill} className="flex gap-2.5">
                <Input
                  placeholder="Add a new skill (e.g. Next.js, Kubernetes, Java)..."
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add Skill
                </Button>
              </form>

              <div className="flex flex-wrap gap-2 pt-2">
                {skills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-semibold text-slate-200 hover:border-slate-600 transition-all"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-slate-400 hover:text-rose-400 transition-colors p-0.5"
                      aria-label={`Remove ${skill}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
