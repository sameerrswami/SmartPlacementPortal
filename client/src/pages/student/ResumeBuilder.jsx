import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Save,
  Download,
  Printer,
  Sparkles,
  Plus,
  Trash2,
  ExternalLink,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Briefcase,
  Code2,
  Award,
  BookOpen,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';

export const DEFAULT_SAMEER_RESUME = {
  personal: {
    fullName: 'Sameer Swami',
    email: 'sameerrswami@gmail.com',
    phone: '+91 7906163577',
    location: 'Saharanpur, Uttar Pradesh',
    linkedin: 'http://www.linkedin.com/in/sameerswami/',
    github: 'https://github.com/sameerrswami',
    portfolio: '',
  },
  skills: {
    languages: ['C++', 'Python', 'C', 'JavaScript'],
    tools: ['Git', 'GitHub', 'VS Code'],
    databases: ['MongoDB', 'MySQL'],
    frameworks: ['React.js', 'Node.js', 'Express.js', 'Tailwind CSS', 'Socket.IO'],
    softSkills: ['Problem-Solving', 'Team Player', 'Adaptability', 'Quick Learner'],
    coreCS: [],
  },
  experience: [
    {
      company: 'Safety Circle India Pvt Ltd',
      role: 'Safety Training Intern',
      duration: "Feb' 26- Mar'26",
      location: '',
      bullets: [
        'Conducted safety awareness sessions across various organizations to promote workplace safety standards.',
        'Strengthened public speaking and crowd management abilities while engaging diverse audiences.',
        'Coordinated safety campaigns with teams, improving communication and execution efficiency.',
      ],
    },
  ],
  projects: [
    {
      title: 'NextGenEditor – AI Integrated Coding Arena',
      repoUrl: 'GitHub',
      liveUrl: 'Live',
      duration: "Apr' 26",
      techStack: ['React.js', 'Node.js', 'Express.js', 'MongoDB', 'Socket.IO', 'Tailwind CSS', 'JWT', 'AI APIs'],
      bullets: [
        'Engineered a scalable collaborative coding platform featuring multiplayer programming, AI-powered code analysis, coding challenges, and live leaderboards.',
        'Integrated real-time synchronization using Socket.IO and secure JWT authentication to enable seamless multi-user coding sessions.',
        'Designed a responsive MERN-stack architecture with competitive coding workflows to enhance engagement and coding performance.',
        'Tech: React.js, Node.js, Express.js, MongoDB, Socket.IO, Tailwind CSS, JWT, AI APIs',
      ],
    },
    {
      title: 'Full-Stack-Real-Time Chat Application',
      repoUrl: 'GitHub',
      liveUrl: 'Live',
      duration: "Mar' 26",
      techStack: ['React', 'JavaScript', 'Node.js', 'Express.js', 'MongoDB Atlas', 'JWT', 'Web Sockets (Socket.io)'],
      bullets: [
        'Built a scalable full-stack real-time chat platform supporting secure user authentication, instant messaging, and dynamic conversation management for multiple users.',
        'Designed WebSocket-based messaging using Socket.io to enable low-latency communication and synchronized message delivery across active user sessions.',
        'Developed modular RESTful APIs with Node.js and Express.js for authentication, message routing, and request handling, establishing a scalable backend architecture for real-time chat operations.',
        'Tech: React, JavaScript, Node.js, Express.js, MongoDB Atlas, JWT, Web Sockets (Socket.io)',
      ],
    },
  ],
  certifications: [
    {
      title: 'Software Engineer Intern Role',
      issuer: 'HackerRank',
      linkText: 'Link',
      credentialUrl: '',
      year: "Feb' 26",
    },
    {
      title: 'Fundamentals of Machine Learning and Artificial Intelligence',
      issuer: 'AWS',
      linkText: 'Link',
      credentialUrl: '',
      year: "Dec' 25",
    },
    {
      title: 'Software Testing',
      issuer: 'NPTEL',
      linkText: 'Link',
      credentialUrl: '',
      year: "Oct' 25",
    },
    {
      title: 'Master Generative AI and Generative AI Tools',
      issuer: 'Infosys SpringBoard',
      linkText: 'Link',
      credentialUrl: '',
      year: "Aug' 25",
    },
  ],
  achievements: [
    {
      title: 'Solved 600+ DSA problems on LeetCode.',
      date: "Aug' 26",
    },
    {
      title: 'Secured Elite Certification in “Software Testing” from NPTEL.',
      date: "Oct' 25",
    },
    {
      title: 'Earned Gold Badges in C++, Java, SQL, and Python on HackerRank for problem-solving.',
      date: "Sept' 25",
    },
  ],
  education: [
    {
      institution: 'Lovely Professional University',
      degree: 'Bachelor of Technology',
      branch: 'Computer Science and Engineering',
      cgpa: '8.03',
      location: 'Phagwara, Punjab',
      startYear: "Aug' 23",
      endYear: 'Present',
    },
    {
      institution: 'Asha Modern International School',
      degree: 'Intermediate',
      branch: 'Percentage: 87.2',
      cgpa: '87.2%',
      location: 'Saharanpur, Uttar Pradesh',
      startYear: "Mar' 22",
      endYear: "May' 23",
    },
    {
      institution: 'Asha Modern International School',
      degree: 'Matriculation',
      branch: 'Percentage: 90',
      cgpa: '90%',
      location: 'Saharanpur, Uttar Pradesh',
      startYear: "Mar' 20",
      endYear: "May' 21",
    },
  ],
  positions: [],
  codingProfiles: {
    leetcode: 'https://leetcode.com/u/sameerswami',
    codeforces: '',
    gfg: '',
    github: 'https://github.com/sameerrswami',
  },
};

export const ResumeBuilder = () => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('personal');

  const resumePrintRef = useRef(null);

  useEffect(() => {
    const fetchResume = async () => {
      try {
        setLoading(true);
        const res = await api.get('/resumes/my');
        if (res.success && res.resume) {
          const hasData = res.resume.projects?.length > 0 || res.resume.skills?.languages?.length > 0;
          setResume(hasData ? res.resume : { ...DEFAULT_SAMEER_RESUME, user: res.resume.user });
        } else {
          setResume({ ...DEFAULT_SAMEER_RESUME });
        }
      } catch (err) {
        toast.error(err.message || 'Failed to load resume');
        setResume({ ...DEFAULT_SAMEER_RESUME });
      } finally {
        setLoading(false);
      }
    };

    fetchResume();
  }, []);

  const handleResetToDefault = () => {
    if (window.confirm('Reset resume to Sameer Swami default template? Any unsaved changes will be replaced.')) {
      setResume({ ...DEFAULT_SAMEER_RESUME, user: resume?.user });
      toast.success('Loaded Sameer Swami default placement template!');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await api.post('/resumes/my', resume);
      if (res.success) {
        toast.success('Resume saved successfully in university placement format!');
      }
    } catch (err) {
      toast.error(err.message || 'Could not save resume');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper state updaters
  const updatePersonal = (field, value) => {
    setResume((prev) => ({
      ...prev,
      personal: { ...prev.personal, [field]: value },
    }));
  };

  const updateEducation = (idx, field, value) => {
    const next = [...(resume.education || [])];
    next[idx] = { ...next[idx], [field]: value };
    setResume((prev) => ({ ...prev, education: next }));
  };

  const addEducation = () => {
    setResume((prev) => ({
      ...prev,
      education: [
        ...(prev.education || []),
        { institution: '', degree: '', branch: '', cgpa: '', startYear: '2022', endYear: '2026' },
      ],
    }));
  };

  const removeEducation = (idx) => {
    setResume((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== idx),
    }));
  };

  const updateProject = (idx, field, value) => {
    const next = [...(resume.projects || [])];
    next[idx] = { ...next[idx], [field]: value };
    setResume((prev) => ({ ...prev, projects: next }));
  };

  const updateProjectBullet = (pIdx, bIdx, value) => {
    const next = [...(resume.projects || [])];
    const bullets = [...(next[pIdx].bullets || [])];
    bullets[bIdx] = value;
    next[pIdx].bullets = bullets;
    setResume((prev) => ({ ...prev, projects: next }));
  };

  const addProjectBullet = (pIdx) => {
    const next = [...(resume.projects || [])];
    next[pIdx].bullets = [...(next[pIdx].bullets || []), ''];
    setResume((prev) => ({ ...prev, projects: next }));
  };

  const removeProjectBullet = (pIdx, bIdx) => {
    const next = [...(resume.projects || [])];
    next[pIdx].bullets = next[pIdx].bullets.filter((_, i) => i !== bIdx);
    setResume((prev) => ({ ...prev, projects: next }));
  };

  const addProject = () => {
    setResume((prev) => ({
      ...prev,
      projects: [
        ...(prev.projects || []),
        {
          title: 'New Technical Project',
          techStack: ['Node.js', 'React', 'MongoDB'],
          duration: '2026',
          liveUrl: '',
          repoUrl: '',
          bullets: ['Engineered scalable web services using clean architecture.'],
        },
      ],
    }));
  };

  const removeProject = (idx) => {
    setResume((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== idx),
    }));
  };

  const updateExperience = (idx, field, value) => {
    const next = [...(resume.experience || [])];
    next[idx] = { ...next[idx], [field]: value };
    setResume((prev) => ({ ...prev, experience: next }));
  };

  const updateExperienceBullet = (expIdx, bIdx, value) => {
    const next = [...(resume.experience || [])];
    const bullets = [...(next[expIdx].bullets || [])];
    bullets[bIdx] = value;
    next[expIdx].bullets = bullets;
    setResume((prev) => ({ ...prev, experience: next }));
  };

  const addExperienceBullet = (expIdx) => {
    const next = [...(resume.experience || [])];
    next[expIdx].bullets = [...(next[expIdx].bullets || []), ''];
    setResume((prev) => ({ ...prev, experience: next }));
  };

  const removeExperienceBullet = (expIdx, bIdx) => {
    const next = [...(resume.experience || [])];
    next[expIdx].bullets = next[expIdx].bullets.filter((_, i) => i !== bIdx);
    setResume((prev) => ({ ...prev, experience: next }));
  };

  const addExperience = () => {
    setResume((prev) => ({
      ...prev,
      experience: [
        ...(prev.experience || []),
        {
          company: 'Tech Enterprise',
          role: 'Software Engineering Intern',
          location: 'Bengaluru, India',
          duration: 'May 2025 - Jul 2025',
          bullets: ['Developed high-performance software modules.'],
        },
      ],
    }));
  };

  const removeExperience = (idx) => {
    setResume((prev) => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== idx),
    }));
  };

  if (loading || !resume) {
    return (
      <div className="py-20 text-center space-y-4 max-w-xl mx-auto">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Loading university placement resume template...</p>
      </div>
    );
  }

  const { personal, education, skills, projects, experience, achievements, certifications, positions, codingProfiles } = resume;

  return (
    <div className="space-y-6 text-left max-w-7xl mx-auto">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel card-area-resume p-4 rounded-2xl print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-orange-500/15 text-orange-400 border border-orange-500/30">
              <GraduationCap className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-black text-white font-display">
              College Placement Resume Builder
            </h1>
            <Badge variant="resume" size="sm">Standardized Template</Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Official single-page placement format enforced by Training & Placement Cell (TPO).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetToDefault}
            className="text-slate-300 hover:text-white border border-slate-700/60"
            leftIcon={<RefreshCw className="w-3.5 h-3.5 text-indigo-400" />}
          >
            Load Template
          </Button>

          <Button
            variant="ai"
            size="sm"
            onClick={() => navigate('/student/resume/analyzer')}
            leftIcon={<Sparkles className="w-3.5 h-3.5 text-fuchsia-200" />}
          >
            AI Analyze ATS
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleSave}
            isLoading={saving}
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            Save
          </Button>

          <Button
            variant="resume"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Download className="w-3.5 h-3.5" />}
          >
            Download PDF
          </Button>
        </div>
      </div>

      {/* Main Two-Column Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT COLUMN: FORM EDITOR ================= */}
        <div className="lg:col-span-6 space-y-4 print:hidden">
          {/* Section Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'personal', label: 'Personal' },
              { id: 'skills', label: 'Skills' },
              { id: 'experience', label: 'Internship' },
              { id: 'projects', label: 'Projects' },
              { id: 'certifications', label: 'Certificates' },
              { id: 'achievements', label: 'Achievements' },
              { id: 'education', label: 'Education' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all border ${
                  activeSection === s.id
                    ? 'bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500 text-white border-orange-400/50 shadow-md shadow-orange-500/25 ring-1 ring-white/20'
                    : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Form Card */}
          <Card className="max-h-[75vh] overflow-y-auto pr-1">
            {/* 1. Personal Section */}
            {activeSection === 'personal' && (
              <div className="space-y-4 p-1">
                <CardTitle className="text-sm">Personal & Contact Details</CardTitle>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold">Full Name</label>
                    <input
                      type="text"
                      value={personal.fullName || ''}
                      onChange={(e) => updatePersonal('fullName', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold">Email Address</label>
                    <input
                      type="email"
                      value={personal.email || ''}
                      onChange={(e) => updatePersonal('email', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold">Phone Number</label>
                    <input
                      type="text"
                      value={personal.phone || ''}
                      onChange={(e) => updatePersonal('phone', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold">Location / City</label>
                    <input
                      type="text"
                      value={personal.location || ''}
                      onChange={(e) => updatePersonal('location', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold">LinkedIn Profile URL</label>
                    <input
                      type="text"
                      value={personal.linkedin || ''}
                      onChange={(e) => updatePersonal('linkedin', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold">GitHub Profile URL</label>
                    <input
                      type="text"
                      value={personal.github || ''}
                      onChange={(e) => updatePersonal('github', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 2. Education Section */}
            {activeSection === 'education' && (
              <div className="space-y-4 p-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Academic History</CardTitle>
                  <Button variant="ghost" size="sm" onClick={addEducation} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                    Add Entry
                  </Button>
                </div>

                {(education || []).map((edu, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5 relative">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-indigo-400">Entry #{idx + 1}</span>
                      {education.length > 1 && (
                        <button
                          onClick={() => removeEducation(idx)}
                          className="text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-slate-400 block mb-0.5">Institution / College</label>
                        <input
                          type="text"
                          value={edu.institution}
                          onChange={(e) => updateEducation(idx, 'institution', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-0.5">Degree / Certification</label>
                        <input
                          type="text"
                          value={edu.degree}
                          onChange={(e) => updateEducation(idx, 'degree', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-0.5">CGPA / Percentage</label>
                        <input
                          type="text"
                          value={edu.cgpa}
                          onChange={(e) => updateEducation(idx, 'cgpa', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-0.5">Duration / Years</label>
                        <input
                          type="text"
                          value={`${edu.startYear} - ${edu.endYear}`}
                          onChange={(e) => {
                            const [start, end] = e.target.value.split('-');
                            updateEducation(idx, 'startYear', (start || '').trim());
                            updateEducation(idx, 'endYear', (end || '').trim());
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3. Skills Section */}
            {activeSection === 'skills' && (
              <div className="space-y-4 p-1 text-xs">
                <CardTitle className="text-sm">Categorized Technical Skills</CardTitle>
                <div className="space-y-3">
                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold">Programming Languages (Comma separated)</label>
                    <input
                      type="text"
                      value={(skills.languages || []).join(', ')}
                      onChange={(e) =>
                        setResume((prev) => ({
                          ...prev,
                          skills: { ...prev.skills, languages: e.target.value.split(',').map((s) => s.trim()) },
                        }))
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold">Frameworks & Web Technologies</label>
                    <input
                      type="text"
                      value={(skills.frameworks || []).join(', ')}
                      onChange={(e) =>
                        setResume((prev) => ({
                          ...prev,
                          skills: { ...prev.skills, frameworks: e.target.value.split(',').map((s) => s.trim()) },
                        }))
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold">Databases & Caching</label>
                    <input
                      type="text"
                      value={(skills.databases || []).join(', ')}
                      onChange={(e) =>
                        setResume((prev) => ({
                          ...prev,
                          skills: { ...prev.skills, databases: e.target.value.split(',').map((s) => s.trim()) },
                        }))
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold">Core CS Fundamentals</label>
                    <input
                      type="text"
                      value={(skills.coreCS || []).join(', ')}
                      onChange={(e) =>
                        setResume((prev) => ({
                          ...prev,
                          skills: { ...prev.skills, coreCS: e.target.value.split(',').map((s) => s.trim()) },
                        }))
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold">Tools, Cloud & DevOps</label>
                    <input
                      type="text"
                      value={(skills.tools || []).join(', ')}
                      onChange={(e) =>
                        setResume((prev) => ({
                          ...prev,
                          skills: { ...prev.skills, tools: e.target.value.split(',').map((s) => s.trim()) },
                        }))
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white"
                      placeholder="Git, GitHub, VS Code"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold">Soft Skills (Comma separated)</label>
                    <input
                      type="text"
                      value={(skills.softSkills || []).join(', ')}
                      onChange={(e) =>
                        setResume((prev) => ({
                          ...prev,
                          skills: { ...prev.skills, softSkills: e.target.value.split(',').map((s) => s.trim()) },
                        }))
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-white"
                      placeholder="Problem-Solving, Team Player, Adaptability, Quick Learner"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 4. Projects Section */}
            {activeSection === 'projects' && (
              <div className="space-y-4 p-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Key Technical Projects</CardTitle>
                  <Button variant="ghost" size="sm" onClick={addProject} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                    Add Project
                  </Button>
                </div>

                {(projects || []).map((proj, pIdx) => (
                  <div key={pIdx} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3 relative">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-indigo-400">Project #{pIdx + 1}</span>
                      {projects.length > 1 && (
                        <button
                          onClick={() => removeProject(pIdx)}
                          className="text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-slate-400 block mb-0.5">Project Title</label>
                        <input
                          type="text"
                          value={proj.title}
                          onChange={(e) => updateProject(pIdx, 'title', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-0.5">Tech Stack (comma separated)</label>
                        <input
                          type="text"
                          value={(proj.techStack || []).join(', ')}
                          onChange={(e) =>
                            updateProject(pIdx, 'techStack', e.target.value.split(',').map((s) => s.trim()))
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <label className="text-slate-400 font-semibold">Bullet Points (Action Verb + Metric)</label>
                        <button
                          onClick={() => addProjectBullet(pIdx)}
                          className="text-indigo-400 hover:text-indigo-300 text-[11px] font-bold"
                        >
                          + Add Bullet
                        </button>
                      </div>
                      {(proj.bullets || []).map((bullet, bIdx) => (
                        <div key={bIdx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={bullet}
                            onChange={(e) => updateProjectBullet(pIdx, bIdx, e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white text-[11px]"
                          />
                          <button
                            onClick={() => removeProjectBullet(pIdx, bIdx)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 5. Experience Section */}
            {activeSection === 'experience' && (
              <div className="space-y-4 p-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Internships & Professional Experience</CardTitle>
                  <Button variant="ghost" size="sm" onClick={addExperience} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                    Add Internship
                  </Button>
                </div>

                {(experience || []).map((exp, expIdx) => (
                  <div key={expIdx} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3 relative">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-indigo-400">Experience #{expIdx + 1}</span>
                      <button
                        onClick={() => removeExperience(expIdx)}
                        className="text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-slate-400 block mb-0.5">Company Name</label>
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) => updateExperience(expIdx, 'company', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-0.5">Role Title</label>
                        <input
                          type="text"
                          value={exp.role}
                          onChange={(e) => updateExperience(expIdx, 'role', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-0.5">Duration</label>
                        <input
                          type="text"
                          value={exp.duration}
                          onChange={(e) => updateExperience(expIdx, 'duration', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-0.5">Location</label>
                        <input
                          type="text"
                          value={exp.location}
                          onChange={(e) => updateExperience(expIdx, 'location', e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <label className="text-slate-400 font-semibold">Key Achievements & Impact</label>
                        <button
                          onClick={() => addExperienceBullet(expIdx)}
                          className="text-indigo-400 hover:text-indigo-300 text-[11px] font-bold"
                        >
                          + Add Bullet
                        </button>
                      </div>
                      {(exp.bullets || []).map((bullet, bIdx) => (
                        <div key={bIdx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={bullet}
                            onChange={(e) => updateExperienceBullet(expIdx, bIdx, e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-white text-[11px]"
                          />
                          <button
                            onClick={() => removeExperienceBullet(expIdx, bIdx)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 6. Achievements Section */}
            {activeSection === 'achievements' && (
              <div className="space-y-4 p-1 text-xs">
                <CardTitle className="text-sm">Competitive Coding & Honors</CardTitle>
                <div className="space-y-2">
                  {(achievements || []).map((ach, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={ach}
                        onChange={(e) => {
                          const next = [...achievements];
                          next[idx] = e.target.value;
                          setResume((prev) => ({ ...prev, achievements: next }));
                        }}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-2 text-white"
                      />
                      <button
                        onClick={() =>
                          setResume((prev) => ({
                            ...prev,
                            achievements: prev.achievements.filter((_, i) => i !== idx),
                          }))
                        }
                        className="text-slate-500 hover:text-rose-400 p-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setResume((prev) => ({
                        ...prev,
                        achievements: [...prev.achievements, 'Global Top 1% in competitive programming.'],
                      }))
                    }
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Add Achievement
                  </Button>
                </div>
              </div>
            )}

            {/* 7. Certifications & Positions */}
            {activeSection === 'certifications' && (
              <div className="space-y-4 p-1 text-xs">
                <CardTitle className="text-sm">Certifications & Positions of Responsibility</CardTitle>
                <div className="space-y-3">
                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold">Certifications (Title - Issuer)</label>
                    {(certifications || []).map((c, i) => (
                      <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                        <input
                          type="text"
                          value={c.title}
                          placeholder="Certification Title"
                          onChange={(e) => {
                            const next = [...certifications];
                            next[i].title = e.target.value;
                            setResume((prev) => ({ ...prev, certifications: next }));
                          }}
                          className="col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-2 text-white"
                        />
                        <input
                          type="text"
                          value={c.issuer}
                          placeholder="Issuer (e.g. AWS)"
                          onChange={(e) => {
                            const next = [...certifications];
                            next[i].issuer = e.target.value;
                            setResume((prev) => ({ ...prev, certifications: next }));
                          }}
                          className="bg-slate-900 border border-slate-800 rounded-xl p-2 text-white"
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold">Coding Profiles</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="LeetCode Profile URL"
                        value={codingProfiles?.leetcode || ''}
                        onChange={(e) =>
                          setResume((prev) => ({
                            ...prev,
                            codingProfiles: { ...prev.codingProfiles, leetcode: e.target.value },
                          }))
                        }
                        className="bg-slate-900 border border-slate-800 rounded-xl p-2 text-white text-[11px]"
                      />
                      <input
                        type="text"
                        placeholder="Codeforces Profile URL"
                        value={codingProfiles?.codeforces || ''}
                        onChange={(e) =>
                          setResume((prev) => ({
                            ...prev,
                            codingProfiles: { ...prev.codingProfiles, codeforces: e.target.value },
                          }))
                        }
                        className="bg-slate-900 border border-slate-800 rounded-xl p-2 text-white text-[11px]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ================= RIGHT COLUMN: LIVE COLLEGE RESUME SHEET ================= */}
        <div className="lg:col-span-6 w-full flex justify-center">
          <div
            ref={resumePrintRef}
            id="college-resume-sheet"
            className="w-full max-w-[650px] bg-white text-slate-900 p-8 sm:p-9 rounded-2xl shadow-2xl border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0 font-sans leading-normal text-[11px]"
            style={{ minHeight: '842px', fontFamily: '"Calibri", "Segoe UI", Arial, sans-serif' }}
          >
            {/* Header: Name and 2-Column Links/Contacts */}
            <div className="pb-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {personal.fullName || 'Sameer Swami'}
              </h1>

              <div className="mt-2 grid grid-cols-2 text-[10.5px] leading-snug">
                {/* Left Column: LinkedIn & GitHub */}
                <div className="space-y-0.5">
                  <p>
                    <span className="font-semibold text-slate-900">LinkedIn:</span>{' '}
                    <a
                      href={personal.linkedin || 'http://www.linkedin.com/in/sameerswami/'}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 hover:underline"
                    >
                      {personal.linkedin || 'http://www.linkedin.com/in/sameerswami/'}
                    </a>
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">GitHub:</span>{' '}
                    <a
                      href={personal.github || 'https://github.com/sameerrswami'}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 hover:underline"
                    >
                      {personal.github || 'https://github.com/sameerrswami'}
                    </a>
                  </p>
                </div>

                {/* Right Column: Email & Mobile */}
                <div className="space-y-0.5 text-right">
                  <p>
                    <span className="font-semibold text-slate-900">Email:</span>{' '}
                    <a
                      href={`mailto:${personal.email || 'sameerrswami@gmail.com'}`}
                      className="text-slate-900 hover:underline"
                    >
                      {personal.email || 'sameerrswami@gmail.com'}
                    </a>
                  </p>
                  <p>
                    <span className="font-semibold text-slate-900">Mobile:</span>{' '}
                    <span className="text-slate-900">{personal.phone || '+91 7906163577'}</span>
                  </p>
                </div>
              </div>
            </div>

            <hr className="border-t border-slate-900 my-2" />

            {/* 1. SKILLS */}
            <div className="mt-2">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-900 pb-0.5 mb-1.5">
                SKILLS
              </h2>
              <ul className="space-y-0.5 text-[10.5px] leading-snug pl-1">
                {skills?.languages?.length > 0 && (
                  <li className="flex items-start gap-1.5">
                    <span className="font-bold text-slate-900">•</span>
                    <div>
                      <span className="font-bold text-slate-900">Languages:</span>{' '}
                      <span>{skills.languages.join(', ')}</span>
                    </div>
                  </li>
                )}
                {skills?.tools?.length > 0 && (
                  <li className="flex items-start gap-1.5">
                    <span className="font-bold text-slate-900">•</span>
                    <div>
                      <span className="font-bold text-slate-900">Tools/Platforms:</span>{' '}
                      <span>{skills.tools.join(', ')}</span>
                    </div>
                  </li>
                )}
                {skills?.databases?.length > 0 && (
                  <li className="flex items-start gap-1.5">
                    <span className="font-bold text-slate-900">•</span>
                    <div>
                      <span className="font-bold text-slate-900">Databases:</span>{' '}
                      <span>{skills.databases.join(', ')}</span>
                    </div>
                  </li>
                )}
                {skills?.frameworks?.length > 0 && (
                  <li className="flex items-start gap-1.5">
                    <span className="font-bold text-slate-900">•</span>
                    <div>
                      <span className="font-bold text-slate-900">Frameworks/Libraries:</span>{' '}
                      <span>{skills.frameworks.join(', ')}</span>
                    </div>
                  </li>
                )}
                {(skills?.softSkills?.length > 0 || skills?.coreCS?.length > 0) && (
                  <li className="flex items-start gap-1.5">
                    <span className="font-bold text-slate-900">•</span>
                    <div>
                      <span className="font-bold text-slate-900">Soft Skills:</span>{' '}
                      <span>{(skills?.softSkills || skills?.coreCS || []).join(', ')}</span>
                    </div>
                  </li>
                )}
              </ul>
            </div>

            {/* 2. INTERNSHIP */}
            {experience && experience.length > 0 && (
              <div className="mt-2">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-900 pb-0.5 mb-1.5">
                  INTERNSHIP
                </h2>
                <div className="space-y-2 text-[10.5px]">
                  {experience.map((exp, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between items-baseline font-bold text-slate-950">
                        <span>{exp.company}</span>
                        <span className="font-normal text-slate-700">{exp.duration}</span>
                      </div>
                      <div className="flex items-start gap-1.5 font-medium text-slate-900">
                        <span>•</span>
                        <span>{exp.role}</span>
                      </div>
                      <ul className="pl-5 space-y-0.5 text-slate-800">
                        {(exp.bullets || []).map((bullet, bIdx) => (
                          <li key={bIdx} className="flex items-start gap-2">
                            <span className="text-[8px] mt-0.5">◦</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. PROJECTS */}
            {projects && projects.length > 0 && (
              <div className="mt-2">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-900 pb-0.5 mb-1.5">
                  PROJECTS
                </h2>
                <div className="space-y-2 text-[10.5px]">
                  {projects.map((proj, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between items-baseline">
                        <div className="font-bold text-slate-950 flex items-center gap-1.5">
                          <span>•</span>
                          <span>{proj.title}</span>
                          {(proj.repoUrl || proj.liveUrl) && (
                            <span className="font-normal text-blue-700">
                              {proj.repoUrl && (
                                <a
                                  href={proj.repoUrl.startsWith('http') ? proj.repoUrl : 'https://github.com/sameerrswami'}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:underline"
                                >
                                  {' '}| GitHub
                                </a>
                              )}
                              {proj.liveUrl && (
                                <a
                                  href={proj.liveUrl.startsWith('http') ? proj.liveUrl : '#'}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="hover:underline"
                                >
                                  {' '}| Live
                                </a>
                              )}
                            </span>
                          )}
                        </div>
                        <span className="font-normal text-slate-700 shrink-0">{proj.duration}</span>
                      </div>
                      <ul className="pl-5 space-y-0.5 text-slate-800">
                        {(proj.bullets || []).map((bullet, bIdx) => (
                          <li key={bIdx} className="flex items-start gap-2">
                            <span className="text-[8px] mt-0.5">◦</span>
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. CERTIFICATES */}
            {certifications && certifications.length > 0 && (
              <div className="mt-2">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-900 pb-0.5 mb-1.5">
                  CERTIFICATES
                </h2>
                <ul className="space-y-0.5 text-[10.5px] leading-snug">
                  {certifications.map((c, idx) => (
                    <li key={idx} className="flex justify-between items-baseline">
                      <div className="flex items-start gap-1.5 text-slate-900">
                        <span className="font-bold">•</span>
                        <span>
                          <strong className="font-medium">{c.title}</strong> | {c.issuer}
                          {c.credentialUrl ? (
                            <a
                              href={c.credentialUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-700 hover:underline ml-1"
                            >
                              | Link
                            </a>
                          ) : (
                            <span className="text-blue-700 ml-1">| Link</span>
                          )}
                        </span>
                      </div>
                      <span className="font-normal text-slate-700 shrink-0">{c.year}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 5. ACHIEVEMENTS */}
            {achievements && achievements.length > 0 && (
              <div className="mt-2">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-900 pb-0.5 mb-1.5">
                  ACHIEVEMENTS
                </h2>
                <ul className="space-y-0.5 text-[10.5px] leading-snug">
                  {achievements.map((ach, idx) => {
                    const text = typeof ach === 'object' ? ach.title : ach;
                    const date = typeof ach === 'object' ? ach.date : '';
                    return (
                      <li key={idx} className="flex justify-between items-baseline text-slate-900">
                        <div className="flex items-start gap-1.5">
                          <span className="font-bold">•</span>
                          <span>{text}</span>
                        </div>
                        {date && <span className="font-normal text-slate-700 shrink-0 pl-2">{date}</span>}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* 6. EDUCATION */}
            {education && education.length > 0 && (
              <div className="mt-2">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 border-b border-slate-900 pb-0.5 mb-1.5">
                  EDUCATION
                </h2>
                <div className="space-y-2 text-[10.5px] leading-snug">
                  {education.map((edu, idx) => (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between items-baseline">
                        <div className="flex items-center gap-1.5 font-bold text-slate-950">
                          <span>•</span>
                          <span>{edu.institution}</span>
                        </div>
                        <span className="text-slate-700 font-normal">{edu.location}</span>
                      </div>
                      <div className="flex justify-between items-baseline pl-3.5 text-slate-800">
                        <span>{edu.degree}</span>
                        <span className="text-slate-700 font-normal">
                          {edu.startYear} {edu.endYear ? `– ${edu.endYear}` : ''}
                        </span>
                      </div>
                      {edu.branch && (
                        <div className="pl-3.5 text-slate-800">
                          <span>{edu.branch}</span>
                        </div>
                      )}
                      {edu.cgpa && (
                        <div className="pl-3.5 font-bold text-slate-900">
                          <span>{edu.cgpa.includes('Percentage') || edu.cgpa.includes('%') ? edu.cgpa : `CGPA: ${edu.cgpa}`}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
