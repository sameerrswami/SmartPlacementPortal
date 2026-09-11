const Resume = require('../models/Resume');
const Job = require('../models/Job');
const { getStoreStatus } = require('../config/db');
const { findMockJobById } = require('./jobController');
const { analyzeResumeAgainstJD, convertResumeToText } = require('../services/resumeService');

// In-Memory store for offline resilience
const mockResumes = {};

const getDefaultResumeData = (user) => ({
  personal: {
    fullName: user?.name || 'Sameer Swami',
    email: user?.email || 'sameerrswami@gmail.com',
    phone: user?.phone || '+91 7906163577',
    location: 'Saharanpur, Uttar Pradesh',
    linkedin: user?.linkedin || 'http://www.linkedin.com/in/sameerswami/',
    github: user?.github || 'https://github.com/sameerrswami',
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
});

/**
 * @desc    Get current student's saved resume
 * @route   GET /api/resumes/my
 * @access  Private
 */
const getMyResume = async (req, res) => {
  try {
    const userId = req.user._id ? req.user._id.toString() : 'student-001';
    const { isMockStoreActive } = getStoreStatus();

    if (isMockStoreActive) {
      if (!mockResumes[userId]) {
        mockResumes[userId] = {
          _id: `resume-${userId}`,
          user: userId,
          ...getDefaultResumeData(req.user),
        };
      }
      return res.json({ success: true, resume: mockResumes[userId] });
    }

    let resume = await Resume.findOne({ user: req.user._id });
    if (!resume) {
      resume = await Resume.create({
        user: req.user._id,
        ...getDefaultResumeData(req.user),
      });
    }

    return res.json({ success: true, resume });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Save/update current student's resume
 * @route   POST /api/resumes/my
 * @access  Private
 */
const saveMyResume = async (req, res) => {
  try {
    const userId = req.user._id ? req.user._id.toString() : 'student-001';
    const { isMockStoreActive } = getStoreStatus();
    const updatedData = req.body;

    if (isMockStoreActive) {
      mockResumes[userId] = {
        _id: `resume-${userId}`,
        user: userId,
        ...updatedData,
        updatedAt: new Date().toISOString(),
      };
      return res.json({
        success: true,
        message: 'Resume saved successfully in college placement format!',
        resume: mockResumes[userId],
      });
    }

    let resume = await Resume.findOne({ user: req.user._id });
    if (!resume) {
      resume = new Resume({ user: req.user._id, ...updatedData });
    } else {
      Object.assign(resume, updatedData);
    }
    await resume.save();

    return res.json({
      success: true,
      message: 'Resume saved successfully in college placement format!',
      resume,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Analyze resume against a job description (with resumeHash + jdHash cache)
 * @route   POST /api/resumes/analyze
 * @access  Private
 */
const analyzeResume = async (req, res) => {
  try {
    const { resume, resumeText, jobId, jdText } = req.body;
    const { isMockStoreActive } = getStoreStatus();

    let job = null;
    let targetJdText = jdText || '';

    if (jobId) {
      if (isMockStoreActive) {
        job = findMockJobById(jobId);
      } else if (mongoose.Types.ObjectId.isValid(jobId)) {
        job = await Job.findById(jobId);
      } else {
        job = findMockJobById(jobId);
      }
      if (job && !targetJdText) {
        targetJdText = job.description;
      }
    }

    if (!targetJdText && !job) {
      // Default standard fallback drive
      job = {
        title: 'Software Development Engineer (SDE-1)',
        company: { name: 'Amazon' },
        description: 'Amazon is hiring SDEs proficient in Data Structures, Algorithms, C++, OOP, Microservices, and Distributed Systems.',
      };
      targetJdText = job.description;
    }

    const inputResume = resume || resumeText || getDefaultResumeData(req.user);
    const analysis = await analyzeResumeAgainstJD(inputResume, targetJdText, job || {});

    return res.json({
      success: true,
      cached: analysis.cached,
      latencyMs: analysis.latencyMs,
      analysis,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get match analysis for a target drive using student's current resume
 * @route   GET /api/resumes/match/:jobId
 * @access  Private
 */
const getResumeJobMatch = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.user._id ? req.user._id.toString() : 'student-001';
    const { isMockStoreActive } = getStoreStatus();

    // 1. Get job
    let job = null;
    if (isMockStoreActive) {
      job = findMockJobById(jobId);
    } else if (mongoose.Types.ObjectId.isValid(jobId)) {
      job = await Job.findById(jobId);
    } else {
      job = findMockJobById(jobId);
    }
    if (!job) {
      return res.status(404).json({ message: 'Job drive not found' });
    }

    // 2. Get student resume
    let studentResume = null;
    if (isMockStoreActive) {
      studentResume = mockResumes[userId] || getDefaultResumeData(req.user);
    } else {
      studentResume = await Resume.findOne({ user: req.user._id });
      if (!studentResume) {
        studentResume = getDefaultResumeData(req.user);
      }
    }

    // 3. Analyze with strict caching
    const analysis = await analyzeResumeAgainstJD(studentResume, job.description, job);

    return res.json({
      success: true,
      cached: analysis.cached,
      latencyMs: analysis.latencyMs,
      job: {
        id: job._id,
        company: job.company?.name,
        title: job.title,
      },
      analysis,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMyResume,
  saveMyResume,
  analyzeResume,
  getResumeJobMatch,
  getDefaultResumeData,
};
