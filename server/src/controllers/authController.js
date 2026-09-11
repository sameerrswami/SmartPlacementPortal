const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { getStoreStatus } = require('../config/db');

// In-Memory store fallback
const mockUsers = [];

const findMockUserById = (id) => {
  return mockUsers.find((u) => u._id === id);
};

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'super_secret_jwt_key_smart_placement_2026_dev', {
    expiresIn: '7d',
  });
};

const sanitizeUser = (user) => {
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;
  delete userObj.passwordHash;
  return userObj;
};

// @desc    Register a new user (Student or Admin)
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { name, email, password, role, department, rollNumber, cgpa } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please provide name, email, and password.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const { isMockStoreActive } = getStoreStatus();

  if (isMockStoreActive) {
    const existing = mockUsers.find((u) => u.email === normalizedEmail);
    if (existing) {
      return res.status(400).json({ message: 'A user with this email already exists.' });
    }

    const newUser = {
      _id: `mock-${Date.now()}`,
      name,
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 10),
      role: role === 'admin' ? 'admin' : 'student',
      department: department || 'Computer Science & Engineering',
      rollNumber: rollNumber || `STD-${Math.floor(1000 + Math.random() * 9000)}`,
      cgpa: Number(cgpa) || 8.0,
      graduationYear: 2026,
      phone: '+91 98765 00000',
      skills: ['React', 'JavaScript', 'Problem Solving'],
      readinessScore: 78,
      placementStatus: 'In Process',
      bio: 'Ready to kickstart campus placement journey!',
      github: '',
      linkedin: '',
      avatar: '',
      resumeUrl: '',
      resumeName: '',
      resumeSize: '',
      resumeUpdatedAt: null,
      createdAt: new Date().toISOString(),
    };

    mockUsers.push(newUser);

    return res.status(201).json({
      success: true,
      token: generateToken(newUser._id, newUser.role),
      user: sanitizeUser(newUser),
      message: 'Registration successful',
    });
  }

  // MongoDB Flow
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    return res.status(400).json({ message: 'A user with this email already exists.' });
  }

  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    role: role === 'admin' ? 'admin' : 'student',
    department: department || 'Computer Science & Engineering',
    rollNumber: rollNumber || `STD-${Math.floor(1000 + Math.random() * 9000)}`,
    cgpa: Number(cgpa) || 8.0,
  });

  if (user) {
    return res.status(201).json({
      success: true,
      token: generateToken(user._id, user.role),
      user: sanitizeUser(user),
      message: 'Registration successful',
    });
  } else {
    return res.status(400).json({ message: 'Invalid user registration data.' });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please provide both email and password.' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const { isMockStoreActive } = getStoreStatus();

  if (isMockStoreActive) {
    const user = mockUsers.find((u) => u.email === normalizedEmail);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials. User not found.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password. Please try again.' });
    }

    return res.json({
      success: true,
      token: generateToken(user._id, user.role),
      user: sanitizeUser(user),
      message: 'Login successful',
    });
  }

  // MongoDB Flow
  const user = await User.findOne({ email: normalizedEmail });
  if (user && (await user.matchPassword(password))) {
    return res.json({
      success: true,
      token: generateToken(user._id, user.role),
      user: sanitizeUser(user),
      message: 'Login successful',
    });
  } else {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  return res.json({
    success: true,
    user: sanitizeUser(req.user),
  });
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  const { isMockStoreActive } = getStoreStatus();
  const fields = [
    'name',
    'phone',
    'department',
    'cgpa',
    'graduationYear',
    'skills',
    'bio',
    'github',
    'linkedin',
    'avatar',
    'resumeUrl',
    'resumeName',
    'resumeSize',
    'resumeUpdatedAt',
  ];

  if (isMockStoreActive) {
    const user = mockUsers.find((u) => u._id === req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found in store' });
    }

    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        user[f] = req.body[f];
      }
    });

    // Recalculate readiness score dynamically
    let score = 50;
    if (user.cgpa && user.cgpa >= 8.0) score += 15;
    if (user.skills && user.skills.length >= 4) score += 15;
    if (user.github && user.github.length > 5) score += 10;
    if (user.linkedin && user.linkedin.length > 5) score += 10;
    if (user.resumeUrl && user.resumeUrl.length > 20) score += 10;
    user.readinessScore = Math.min(100, score);

    return res.json({
      success: true,
      user: sanitizeUser(user),
      message: 'Profile updated successfully',
    });
  }

  // MongoDB Flow
  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  fields.forEach((f) => {
    if (req.body[f] !== undefined) {
      user[f] = req.body[f];
    }
  });

  // Calculate score
  let score = 50;
  if (user.cgpa && user.cgpa >= 8.0) score += 15;
  if (user.skills && user.skills.length >= 4) score += 15;
  if (user.github && user.github.length > 5) score += 10;
  if (user.linkedin && user.linkedin.length > 5) score += 10;
  if (user.resumeUrl && user.resumeUrl.length > 20) score += 10;
  user.readinessScore = Math.min(100, score);

  const updatedUser = await user.save();
  return res.json({
    success: true,
    user: sanitizeUser(updatedUser),
    message: 'Profile updated successfully',
  });
};

// @desc    Get portal stats for Student / Admin dashboards
// @route   GET /api/auth/stats
// @access  Private
const getPortalStats = async (req, res) => {
  const role = req.user.role;
  const { isMockStoreActive } = getStoreStatus();
  const Job = require('../models/Job');
  const Application = require('../models/Application');

  if (role === 'admin') {
    let totalStudents = 0;
    let placedStudents = 0;
    let activeDrives = 0;
    let upcomingDrives = 0;

    if (!isMockStoreActive) {
      try {
        const [studentsCount, placedCount, jobsCount] = await Promise.all([
          User.countDocuments({ role: 'student' }),
          Application.countDocuments({ status: 'Selected' }),
          Job.countDocuments({ status: 'published' }),
        ]);
        totalStudents = studentsCount;
        placedStudents = placedCount;
        activeDrives = jobsCount;
      } catch (e) {
        console.error('Error computing admin portal stats:', e);
      }
    }

    const placementRate = totalStudents > 0 ? Math.round((placedStudents / totalStudents) * 100 * 10) / 10 : 0;

    return res.json({
      success: true,
      data: {
        totalStudents,
        placedStudents,
        placementRate,
        activeDrives,
        upcomingDrives,
        avgPackageLPA: 0,
        highestPackageLPA: 0,
        topRecruiters: [],
        recentApplicants: [],
        branchStats: [],
      },
    });
  }

  // Student stats
  let appliedDrives = 0;
  let shortlistedDrives = 0;
  let pendingInterviews = 0;
  let offersReceived = 0;
  let activeDrivesList = [];

  if (!isMockStoreActive && req.user?._id) {
    try {
      const [userApps, jobs] = await Promise.all([
        Application.find({ studentId: req.user._id }),
        Job.find({ status: 'published' }).sort({ createdAt: -1 }).limit(6),
      ]);

      appliedDrives = userApps.length;
      shortlistedDrives = userApps.filter((a) => ['Shortlisted', 'OA', 'Technical', 'HR', 'Selected'].includes(a.status)).length;
      pendingInterviews = userApps.filter((a) => ['Technical', 'HR'].includes(a.status)).length;
      offersReceived = userApps.filter((a) => a.status === 'Selected').length;

      const appliedJobIds = new Set(userApps.map((a) => a.jobId?.toString()));

      activeDrivesList = jobs.map((j) => ({
        id: j._id,
        company: j.company?.name || 'Company',
        role: j.title,
        ctc: j.package || 'Negotiable',
        location: j.location || 'Pan India',
        deadline: new Date(j.deadline).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        eligibility: `CGPA >= ${j.eligibility?.minCgpa || 7.0}`,
        status: appliedJobIds.has(j._id.toString()) ? 'Applied' : 'Not Applied',
        logo: (j.company?.name || 'C').charAt(0).toUpperCase(),
      }));
    } catch (e) {
      console.error('Error fetching student stats:', e);
    }
  }

  return res.json({
    success: true,
    data: {
      appliedDrives,
      shortlistedDrives,
      pendingInterviews,
      offersReceived,
      targetCompany: '',
      upcomingSchedules: [],
      activeDrives: activeDrivesList,
    },
  });
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  getPortalStats,
  findMockUserById,
  mockUsers,
};
