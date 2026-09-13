const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Interview = require('../models/Interview');
const Resume = require('../models/Resume');
const { getStoreStatus } = require('../config/db');
const { getDefaultResumeData } = require('./resumeController');
const { cacheService } = require('../services/cache/cacheService');
const { cacheKeys, TTL } = require('../services/cache/cacheKeys');

/**
 * Mock data for resilient store fallback
 */
const MOCK_STUDENTS = [];

/**
 * @desc    Get comprehensive Admin Intelligence (KPIs, funnel, college-wide weaknesses, distributions)
 * @route   GET /api/admin/intelligence
 * @access  Private (Admin only)
 */
const getAdminIntelligence = async (req, res) => {
  try {
    const cacheKey = cacheKeys.adminIntelligence();
    const cachedIntelligence = await cacheService.get(cacheKey);
    if (cachedIntelligence) {
      return res.json({
        ...cachedIntelligence,
        cached: true,
        source: 'redis',
      });
    }

    const { isMockStoreActive } = getStoreStatus();

    // 1. Core KPIs
    let totalStudents = 0;
    let activeJobs = 0;
    let totalApplications = 0;
    let shortlistedCount = 0;
    let interviewsCount = 0;
    let placedCount = 0;

    if (!isMockStoreActive) {
      const [studentsDb, jobsDb, appsDb] = await Promise.all([
        User.countDocuments({ role: 'student' }),
        Job.countDocuments({ status: 'published' }),
        Application.find(),
      ]);

      totalStudents = studentsDb;
      activeJobs = jobsDb;
      totalApplications = appsDb.length;
      shortlistedCount = appsDb.filter((a) => ['Shortlisted', 'OA', 'Technical', 'HR', 'Selected'].includes(a.status)).length;
      interviewsCount = appsDb.filter((a) => ['Technical', 'HR', 'Selected'].includes(a.status)).length;
      placedCount = appsDb.filter((a) => a.status === 'Selected').length;
    }

    const placementPercentage = totalStudents > 0 ? Math.round((placedCount / totalStudents) * 100 * 10) / 10 : 0;

    // 2. Placement Funnel Stages
    const placementFunnel = [
      { stage: 'Applied', count: totalApplications, percentage: totalApplications > 0 ? 100 : 0, color: 'indigo' },
      { stage: 'Shortlisted', count: shortlistedCount, percentage: totalApplications > 0 ? Math.round((shortlistedCount / totalApplications) * 100) : 0, color: 'purple' },
      { stage: 'Online Assessment (OA)', count: Math.min(shortlistedCount, totalApplications), percentage: totalApplications > 0 ? Math.round((Math.min(shortlistedCount, totalApplications) / totalApplications) * 100) : 0, color: 'cyan' },
      { stage: 'Technical Rounds', count: interviewsCount, percentage: totalApplications > 0 ? Math.round((interviewsCount / totalApplications) * 100) : 0, color: 'teal' },
      { stage: 'HR & Leadership', count: placedCount, percentage: totalApplications > 0 ? Math.round((placedCount / totalApplications) * 100) : 0, color: 'amber' },
      { stage: 'Selected / Placed', count: placedCount, percentage: totalApplications > 0 ? Math.round((placedCount / totalApplications) * 100) : 0, color: 'emerald' },
    ];

    // 3. Dynamic company applications
    const companyApplications = [];

    // 4. Timeline
    const applicationsTimeline = [];

    // 5. Readiness Distribution
    const readinessDistribution = [
      { tier: 'High Readiness (80%+)', count: 0, percentage: 0, color: 'emerald', benchmark: 'Immediate Drive Placement' },
      { tier: 'Near Ready (65-79%)', count: 0, percentage: 0, color: 'indigo', benchmark: 'Needs 1-2 Focused Re-preps' },
      { tier: 'Needs Focus (< 65%)', count: 0, percentage: 0, color: 'rose', benchmark: 'Remediation Bootcamp Required' },
    ];

    // 6. Weakness Analytics
    const collegeWeaknesses = [];

    const responseData = {
      success: true,
      kpis: {
        totalStudents,
        activeJobs,
        totalApplications,
        shortlistedCount,
        interviewsCount,
        placedCount,
        placementPercentage,
        averagePackageLPA: 0,
        highestPackageLPA: 0,
      },
      placementFunnel,
      companyApplications,
      applicationsTimeline,
      readinessDistribution,
      collegeWeaknesses,
    };

    await cacheService.set(cacheKey, responseData, TTL.ADMIN_INTELLIGENCE);

    return res.json(responseData);
  } catch (error) {
    console.error('Error fetching admin intelligence:', error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get student cohort roster with readiness & weakness stats
 * @route   GET /api/admin/students
 * @access  Private (Admin only)
 */
const getStudentsRoster = async (req, res) => {
  try {
    const { isMockStoreActive } = getStoreStatus();

    let students = [];
    if (!isMockStoreActive) {
      const dbUsers = await User.find({ role: 'student' }).select('-password');
      students = dbUsers.map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        rollNumber: u.rollNumber || '',
        department: u.department || '',
        graduationYear: u.graduationYear || 2026,
        cgpa: u.cgpa || 0,
        activeBacklogs: u.activeBacklogs || 0,
        phone: u.phone || '',
        skills: u.skills || [],
        readinessScore: u.readinessScore || 0,
        placed: u.placementStatus === 'Placed',
        placedCompany: u.placedCompany || null,
        createdAt: u.createdAt,
      }));
    }

    return res.json({
      success: true,
      count: students.length,
      students,
    });
  } catch (error) {
    console.error('Error getting students roster:', error);
    return res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get Student 360 Deep-Dive (Profile, Applications, Resume, Readiness, Mock Interviews, Weaknesses, Progress)
 * @route   GET /api/admin/students/:id
 * @access  Private (Admin only)
 */
const getStudentDeepDive = async (req, res) => {
  try {
    const { id } = req.params;
    const { isMockStoreActive } = getStoreStatus();

    // 1. Find Student
    let student = null;
    if (!isMockStoreActive) {
      student = await User.findById(id).select('-password');
    }

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    // 2. Fetch real Applications for this student
    let applications = [];
    if (!isMockStoreActive) {
      const dbApps = await Application.find({ studentId: student._id }).populate('jobId');
      applications = dbApps.map((a) => ({
        id: a._id,
        company: a.jobId?.company?.name || 'Company',
        role: a.jobId?.title || 'Position',
        package: a.jobId?.package || 'Negotiable',
        status: a.status,
        appliedAt: a.appliedAt || a.createdAt,
        currentRound: a.timeline && a.timeline.length > 0 ? a.timeline[a.timeline.length - 1].stage : a.status,
      }));
    }

    // 3. College Resume Summary
    let resume = null;
    if (!isMockStoreActive) {
      resume = await Resume.findOne({ user: student._id });
    }
    if (!resume) {
      resume = getDefaultResumeData(student);
    }

    // 4. Real Interview History
    let interviews = [];
    if (!isMockStoreActive) {
      interviews = await Interview.find({ user: student._id }).sort({ createdAt: -1 });
    }

    // 5. Weakness Breakdown
    const weaknesses = {
      critical: [],
      needsImprovement: [],
      strong: [],
    };

    // 6. Preparation Progress
    const preparation = {
      readinessScore: student.readinessScore || 0,
      solvedCodingProblems: 0,
      totalCodingProblems: 0,
      topicsMastered: (student.skills || []).slice(0, 4),
      topicsPending: [],
      resumeATSScore: 0,
      mockInterviewsCompleted: interviews.length,
    };

    return res.json({
      success: true,
      student,
      applications,
      resume,
      interviews,
      weaknesses,
      preparation,
    });
  } catch (error) {
    console.error('Error fetching student deep dive:', error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAdminIntelligence,
  getStudentsRoster,
  getStudentDeepDive,
};
