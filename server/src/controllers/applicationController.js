const mongoose = require('mongoose');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const { getStoreStatus } = require('../config/db');
const { findMockJobById } = require('./jobController');
const { findMockUserById } = require('./authController');
const { addMockNotification } = require('./notificationController');

// In-Memory store for evaluation
const mockApplications = [];

// Helper to check eligibility
const checkStudentEligibility = (student, job) => {
  const issues = [];
  const elig = job.eligibility || {};

  if (elig.minCgpa && Number(student.cgpa || 0) < Number(elig.minCgpa)) {
    issues.push(`Requires minimum CGPA of ${elig.minCgpa} (Your CGPA: ${student.cgpa || 0})`);
  }

  if (elig.allowedBranches && elig.allowedBranches.length > 0) {
    const isBranchAllowed = elig.allowedBranches.some(
      (b) => b.toLowerCase().trim() === (student.department || '').toLowerCase().trim()
    );
    if (!isBranchAllowed) {
      issues.push(`Eligible branches: [${elig.allowedBranches.join(', ')}] (Your branch: ${student.department})`);
    }
  }

  if (elig.eligibleBatches && elig.eligibleBatches.length > 0) {
    const isBatchAllowed = elig.eligibleBatches.includes(Number(student.graduationYear));
    if (!isBatchAllowed) {
      issues.push(`Target batches: [${elig.eligibleBatches.join(', ')}] (Your batch: ${student.graduationYear})`);
    }
  }

  if (elig.maxBacklogs !== undefined && Number(student.backlogs || 0) > Number(elig.maxBacklogs)) {
    issues.push(`Permits maximum ${elig.maxBacklogs} backlogs (You have ${student.backlogs || 0})`);
  }

  return {
    isEligible: issues.length === 0,
    issues,
  };
};

// @desc    Apply for a job (Student only)
// @route   POST /api/applications/apply
// @access  Private/Student
const applyJob = async (req, res) => {
  try {
    const { jobId } = req.body;
    const student = req.user;

    if (!jobId) {
      return res.status(400).json({ message: 'Please provide jobId' });
    }

    const { isMockStoreActive } = getStoreStatus();

    if (isMockStoreActive) {
      const job = findMockJobById(jobId);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      if (job.status !== 'published') {
        return res.status(400).json({ message: 'This placement drive is not open for applications' });
      }

      // Check deadline
      if (new Date(job.deadline) < new Date()) {
        return res.status(400).json({ message: 'Application deadline has already passed' });
      }

      // Check duplicate
      const alreadyApplied = mockApplications.find(
        (a) => a.jobId === jobId && a.studentId === student._id
      );
      if (alreadyApplied) {
        return res.status(400).json({ message: 'You have already applied for this placement drive' });
      }

      // Run eligibility check
      const { isEligible, issues } = checkStudentEligibility(student, job);
      if (!isEligible) {
        return res.status(400).json({
          message: 'You do not satisfy the eligibility prerequisites for this drive.',
          issues,
        });
      }

      const newApp = {
        _id: `app-${Date.now()}`,
        jobId,
        studentId: student._id,
        status: 'Applied',
        appliedAt: new Date().toISOString(),
        resumeUrl: student.resumeUrl || 'https://smartplacementportal.vercel.app/resumes/default.pdf',
        timeline: [
          {
            stage: 'Applied',
            date: new Date().toISOString(),
            notes: 'Application registered and locked with official verified credentials.',
            updatedBy: 'Student Self-Service',
          },
        ],
      };

      mockApplications.unshift(newApp);

      // Trigger notification
      addMockNotification({
        recipient: student._id,
        targetRole: 'student',
        type: 'application_status',
        title: `Applied: ${job.company.name} (${job.title})`,
        message: `Your application has been received for ${job.company.name}. TPO screening is underway.`,
        link: '/student/applications',
      });

      return res.status(201).json({
        success: true,
        message: `Successfully applied to ${job.company.name}!`,
        application: {
          ...newApp,
          job,
        },
      });
    }

    // MongoDB Flow
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(404).json({ message: 'Job not found' });
    }
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.status !== 'published') {
      return res.status(400).json({ message: 'This placement drive is not open for applications' });
    }

    if (new Date(job.deadline) < new Date()) {
      return res.status(400).json({ message: 'Application deadline has passed' });
    }

    const existing = await Application.findOne({ job: jobId, student: student._id });
    if (existing) {
      return res.status(400).json({ message: 'You have already applied for this placement drive' });
    }

    const { isEligible, issues } = checkStudentEligibility(student, job);
    if (!isEligible) {
      return res.status(400).json({
        message: 'You do not satisfy the eligibility prerequisites for this drive.',
        issues,
      });
    }

    const application = await Application.create({
      job: jobId,
      student: student._id,
      status: 'Applied',
      resumeUrl: student.resumeUrl || 'https://smartplacementportal.vercel.app/resumes/default.pdf',
      timeline: [
        {
          stage: 'Applied',
          date: new Date(),
          notes: 'Application registered and locked with official verified credentials.',
          updatedBy: 'Student Self-Service',
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: `Successfully applied to ${job.company.name}!`,
      application,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Get all applications of logged-in student
// @route   GET /api/applications/my
// @access  Private/Student
const getStudentApplications = async (req, res) => {
  try {
    const { isMockStoreActive } = getStoreStatus();

    if (isMockStoreActive) {
      const studentId = req.user._id;
      const userApps = mockApplications
        .filter((a) => a.studentId === studentId)
        .map((a) => ({
          ...a,
          job: findMockJobById(a.jobId) || {
            title: 'Unknown Role',
            company: { name: 'Unknown Company', logo: '🏢' },
            package: 'N/A',
            location: 'Remote',
          },
        }));

      return res.json({
        success: true,
        count: userApps.length,
        applications: userApps,
      });
    }

    const applications = await Application.find({ student: req.user._id })
      .populate('job')
      .sort({ appliedAt: -1 });

    return res.json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Get all applications (Admin only, filterable by job and status)
// @route   GET /api/applications
// @access  Private/Admin
const getAllApplications = async (req, res) => {
  try {
    const { jobId, status, search } = req.query;
    const { isMockStoreActive } = getStoreStatus();

    if (isMockStoreActive) {
      let filtered = mockApplications.map((a) => {
        const student = findMockUserById(a.studentId) || {
          name: 'Student Candidate',
          email: 'student@portal.com',
          department: 'Computer Science & Engineering',
          cgpa: 8.8,
          rollNumber: 'CS2026-089',
        };
        const job = findMockJobById(a.jobId) || {
          title: 'Software Engineer',
          company: { name: 'Tech Corp', logo: 'T' },
          package: '20 LPA',
        };
        return {
          ...a,
          student,
          job,
        };
      });

      if (jobId) {
        filtered = filtered.filter((a) => a.jobId === jobId);
      }

      if (status && status !== 'all') {
        filtered = filtered.filter((a) => a.status.toLowerCase() === status.toLowerCase());
      }

      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (a) =>
            a.student.name.toLowerCase().includes(q) ||
            a.student.email.toLowerCase().includes(q) ||
            a.job.company.name.toLowerCase().includes(q) ||
            a.job.title.toLowerCase().includes(q)
        );
      }

      return res.json({
        success: true,
        count: filtered.length,
        applications: filtered,
      });
    }

    // MongoDB Flow
    let query = {};
    if (jobId) query.job = jobId;
    if (status && status !== 'all') query.status = status;

    const applications = await Application.find(query)
      .populate('job')
      .populate('student', 'name email department rollNumber cgpa phone')
      .sort({ appliedAt: -1 });

    return res.json({
      success: true,
      count: applications.length,
      applications,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Update application status / pipeline stage (Admin only)
// @route   PUT /api/applications/:id/status
// @access  Private/Admin
const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, roundDetails } = req.body;

    const validStages = ['Applied', 'Shortlisted', 'OA', 'Technical', 'HR', 'Selected', 'Rejected'];
    if (!validStages.includes(status)) {
      return res.status(400).json({ message: `Invalid stage. Valid: ${validStages.join(', ')}` });
    }

    const { isMockStoreActive } = getStoreStatus();

    if (isMockStoreActive) {
      const app = mockApplications.find((a) => a._id === id);
      if (!app) {
        return res.status(404).json({ message: 'Application not found' });
      }

      const job = findMockJobById(app.jobId);
      const student = findMockUserById(app.studentId);

      app.status = status;
      app.timeline.push({
        stage: status,
        date: new Date().toISOString(),
        notes: notes || `Candidate advanced to ${status} stage.`,
        updatedBy: req.user.name || 'Placement Officer',
      });

      // Automated notification to student
      addMockNotification({
        recipient: app.studentId,
        targetRole: 'student',
        type: 'application_status',
        title: `Status Update: ${job?.company?.name || 'Drive'} — ${status}`,
        message: notes
          ? `Your application for ${job?.company?.name} has been updated to "${status}". Note: ${notes}`
          : `Congratulations! Your application for ${job?.company?.name} has advanced to the "${status}" round.`,
        link: '/student/applications',
      });

      return res.json({
        success: true,
        message: `Application advanced to stage: ${status}`,
        application: {
          ...app,
          job,
          student,
        },
      });
    }

    // MongoDB Flow
    const application = await Application.findById(id).populate('job');
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    application.status = status;
    application.timeline.push({
      stage: status,
      date: new Date(),
      notes: notes || `Candidate advanced to ${status} stage.`,
      updatedBy: req.user.name || 'Placement Officer',
    });

    await application.save();

    return res.json({
      success: true,
      message: `Application advanced to stage: ${status}`,
      application,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  applyJob,
  getStudentApplications,
  getAllApplications,
  updateApplicationStatus,
  checkStudentEligibility,
  mockApplications,
};
