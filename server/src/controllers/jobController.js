const mongoose = require('mongoose');
const Job = require('../models/Job');
const Application = require('../models/Application');
const { getStoreStatus } = require('../config/db');
const { addMockNotification } = require('./notificationController');
const { analyzeJobDescription, generateDeterministicAnalysis } = require('../services/geminiService');
const { cacheService } = require('../services/cache/cacheService');
const { cacheKeys, TTL } = require('../services/cache/cacheKeys');

// In-memory jobs store (clean state - no demo data)
const mockJobs = [];

const findMockJobById = (id) => mockJobs.find((j) => j._id === id);

// @desc    Get all jobs (with search, branch filter, eligibility)
// @route   GET /api/jobs
// @access  Private (Student & Admin)
const getJobs = async (req, res) => {
  try {
    const { search, branch, minCgpa, status, minPackage } = req.query;
    const { isMockStoreActive } = getStoreStatus();

    // Cache-Aside Check for read-heavy listing queries
    const filterHash = cacheKeys.computeHash({
      ...req.query,
      role: req.user?.role,
    });
    const cacheKey = cacheKeys.jobsList(filterHash);

    const cachedList = await cacheService.get(cacheKey);
    if (cachedList) {
      return res.json({
        ...cachedList,
        cached: true,
        source: 'redis',
      });
    }

    if (isMockStoreActive) {
      let filtered = [...mockJobs];

      // If student, only show published jobs (unless query specifically requests)
      if (req.user && req.user.role === 'student') {
        filtered = filtered.filter((j) => j.status === 'published');
      } else if (status) {
        filtered = filtered.filter((j) => j.status === status);
      }

      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(
          (j) =>
            j.title.toLowerCase().includes(q) ||
            j.company.name.toLowerCase().includes(q) ||
            j.location.toLowerCase().includes(q)
        );
      }

      if (branch && branch !== 'all') {
        filtered = filtered.filter((j) =>
          j.eligibility.allowedBranches.some((b) => b.toLowerCase().includes(branch.toLowerCase()))
        );
      }

      if (minCgpa) {
        filtered = filtered.filter((j) => j.eligibility.minCgpa <= Number(minCgpa));
      }

      if (minPackage) {
        filtered = filtered.filter((j) => j.packageLpa >= Number(minPackage));
      }

      const mockResult = {
        success: true,
        count: filtered.length,
        jobs: filtered,
      };
      await cacheService.set(cacheKey, mockResult, TTL.JOB_LISTINGS);
      return res.json({
        ...mockResult,
        cached: false,
        source: 'mock-store',
      });
    }

    // MongoDB Flow
    let query = {};
    if (req.user && req.user.role === 'student') {
      query.status = 'published';
    } else if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'company.name': { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    if (branch && branch !== 'all') {
      query['eligibility.allowedBranches'] = { $regex: branch, $options: 'i' };
    }

    if (minCgpa) {
      query['eligibility.minCgpa'] = { $lte: Number(minCgpa) };
    }

    if (minPackage) {
      query.packageLpa = { $gte: Number(minPackage) };
    }

    const jobs = await Job.find(query).sort({ createdAt: -1 });

    const result = {
      success: true,
      count: jobs.length,
      jobs,
    };
    await cacheService.set(cacheKey, result, TTL.JOB_LISTINGS);

    return res.json({
      ...result,
      cached: false,
      source: 'database',
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Get single job by ID
// @route   GET /api/jobs/:id
// @access  Private
const getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const { isMockStoreActive } = getStoreStatus();

    // Cache-Aside Check for job details
    const cacheKey = cacheKeys.jobDetail(id);
    const cachedJob = await cacheService.get(cacheKey);
    if (cachedJob) {
      return res.json({
        success: true,
        job: cachedJob,
        cached: true,
        source: 'redis',
      });
    }

    if (isMockStoreActive) {
      const job = findMockJobById(id);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }
      await cacheService.set(cacheKey, job, TTL.JOB_DETAILS);
      return res.json({ success: true, job, cached: false, source: 'mock-store' });
    }

    let job = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      job = await Job.findById(id);
    }
    if (!job) {
      job = findMockJobById(id);
    }
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    await cacheService.set(cacheKey, job, TTL.JOB_DETAILS);
    return res.json({ success: true, job, cached: false, source: 'database' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new job/drive (Admin only)
// @route   POST /api/jobs
// @access  Private/Admin
const createJob = async (req, res) => {
  try {
    const {
      company,
      title,
      description,
      package: pkg,
      location,
      deadline,
      status,
      eligibility,
      openings,
    } = req.body;

    if (!company?.name || !title || !description || !pkg || !deadline) {
      return res.status(400).json({ message: 'Please provide company name, job title, JD, package, and deadline.' });
    }

    // Extract numeric LPA
    const numMatch = pkg.match(/\d+(\.\d+)?/);
    const packageLpa = numMatch ? parseFloat(numMatch[0]) : 10;

    const { isMockStoreActive } = getStoreStatus();

    if (isMockStoreActive) {
      const newJob = {
        _id: `job-${Date.now()}`,
        company: {
          name: company.name,
          logo: company.logo || company.name.charAt(0).toUpperCase(),
          website: company.website || '',
          industry: company.industry || 'Information Technology',
          description: company.description || '',
        },
        title,
        description,
        package: pkg,
        packageLpa,
        location: location || 'Bengaluru / Hybrid',
        deadline: new Date(deadline).toISOString(),
        status: status || 'published',
        eligibility: {
          minCgpa: Number(eligibility?.minCgpa) || 7.0,
          allowedBranches: eligibility?.allowedBranches || ['Computer Science & Engineering', 'Information Technology'],
          eligibleBatches: eligibility?.eligibleBatches || [2026],
          maxBacklogs: Number(eligibility?.maxBacklogs) || 0,
        },
        openings: Number(openings) || 10,
        createdAt: new Date().toISOString(),
      };

      mockJobs.unshift(newJob);

      // If created as published, notify all students!
      if (newJob.status === 'published') {
        addMockNotification({
          title: `New Placement Drive: ${newJob.company.name}`,
          message: `${newJob.company.name} is hiring for ${newJob.title} (${newJob.package}). Check eligibility and apply before deadline.`,
          type: 'job_published',
          link: '/student/jobs',
          targetRole: 'student',
        });
      }

      // Invalidate job listings and admin analytics cache on creation
      await cacheService.delPattern('jobs:list:*');
      await cacheService.del(cacheKeys.adminIntelligence());

      return res.status(201).json({
        success: true,
        message: 'Job drive created successfully',
        job: newJob,
      });
    }

    // MongoDB Flow
    const newJob = await Job.create({
      company: {
        name: company.name,
        logo: company.logo || company.name.charAt(0).toUpperCase(),
        website: company.website || '',
        industry: company.industry || 'Information Technology',
        description: company.description || '',
      },
      title,
      description,
      package: pkg,
      packageLpa,
      location: location || 'Bengaluru / Hybrid',
      deadline: new Date(deadline),
      status: status || 'published',
      eligibility: {
        minCgpa: Number(eligibility?.minCgpa) || 7.0,
        allowedBranches: eligibility?.allowedBranches || ['Computer Science & Engineering', 'Information Technology'],
        eligibleBatches: eligibility?.eligibleBatches || [2026],
        maxBacklogs: Number(eligibility?.maxBacklogs) || 0,
      },
      openings: Number(openings) || 10,
      postedBy: req.user._id,
    });

    // Invalidate job listings and admin analytics cache on creation
    await cacheService.delPattern('jobs:list:*');
    await cacheService.del(cacheKeys.adminIntelligence());

    return res.status(201).json({
      success: true,
      message: 'Job drive created successfully',
      job: newJob,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Update a job/drive (Admin only)
// @route   PUT /api/jobs/:id
// @access  Private/Admin
const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { isMockStoreActive } = getStoreStatus();

    if (isMockStoreActive) {
      const job = findMockJobById(id);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      if (req.body.company) Object.assign(job.company, req.body.company);
      if (req.body.title) job.title = req.body.title;
      if (req.body.description && req.body.description !== job.description) {
        job.description = req.body.description;
        job.aiAnalysis = null; // Invalidate cached AI analysis when JD changes
      }
      if (req.body.package) {
        job.package = req.body.package;
        const numMatch = req.body.package.match(/\d+(\.\d+)?/);
        job.packageLpa = numMatch ? parseFloat(numMatch[0]) : job.packageLpa;
      }
      if (req.body.location) job.location = req.body.location;
      if (req.body.deadline) job.deadline = new Date(req.body.deadline).toISOString();
      if (req.body.status) job.status = req.body.status;
      if (req.body.openings !== undefined) job.openings = Number(req.body.openings);
      if (req.body.eligibility) Object.assign(job.eligibility, req.body.eligibility);

      // Invalidate affected caches
      await cacheService.del(cacheKeys.jobDetail(id));
      await cacheService.delPattern('jobs:list:*');
      await cacheService.del(cacheKeys.adminIntelligence());

      return res.json({
        success: true,
        message: 'Job drive updated successfully',
        job,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Invalidate stored AI analysis if JD text is altered
    if (req.body.description && req.body.description !== job.description) {
      job.aiAnalysis = null;
    }

    Object.assign(job, req.body);
    if (req.body.package) {
      const numMatch = req.body.package.match(/\d+(\.\d+)?/);
      job.packageLpa = numMatch ? parseFloat(numMatch[0]) : job.packageLpa;
    }

    await job.save();

    // Invalidate affected caches
    await cacheService.del(cacheKeys.jobDetail(id));
    await cacheService.delPattern('jobs:list:*');
    await cacheService.del(cacheKeys.adminIntelligence());

    return res.json({
      success: true,
      message: 'Job drive updated successfully',
      job,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a job/drive (Admin only)
// @route   DELETE /api/jobs/:id
// @access  Private/Admin
const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { isMockStoreActive } = getStoreStatus();

    if (isMockStoreActive) {
      const index = mockJobs.findIndex((j) => j._id === id);
      if (index === -1) {
        return res.status(404).json({ message: 'Job not found' });
      }
      mockJobs.splice(index, 1);
      await cacheService.del(cacheKeys.jobDetail(id));
      await cacheService.delPattern('jobs:list:*');
      await cacheService.del(cacheKeys.adminIntelligence());
      return res.json({ success: true, message: 'Job drive deleted successfully' });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    await Job.findByIdAndDelete(id);
    await Application.deleteMany({ job: id });

    await cacheService.del(cacheKeys.jobDetail(id));
    await cacheService.delPattern('jobs:list:*');
    await cacheService.del(cacheKeys.adminIntelligence());

    return res.json({ success: true, message: 'Job drive deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle publish status (draft <-> published)
// @route   PUT /api/jobs/:id/publish
// @access  Private/Admin
const togglePublishJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { isMockStoreActive } = getStoreStatus();

    if (isMockStoreActive) {
      const job = findMockJobById(id);
      if (!job) {
        return res.status(404).json({ message: 'Job not found' });
      }

      const nextStatus = job.status === 'published' ? 'draft' : 'published';
      job.status = nextStatus;

      if (nextStatus === 'published') {
        addMockNotification({
          title: `Drive Published: ${job.company.name}`,
          message: `${job.company.name} drive for ${job.title} (${job.package}) is now open for student applications!`,
          type: 'job_published',
          link: '/student/jobs',
          targetRole: 'student',
        });
      }

      await cacheService.del(cacheKeys.jobDetail(id));
      await cacheService.delPattern('jobs:list:*');
      await cacheService.del(cacheKeys.adminIntelligence());

      return res.json({
        success: true,
        message: `Job drive is now ${nextStatus}`,
        job,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    job.status = job.status === 'published' ? 'draft' : 'published';
    await job.save();

    await cacheService.del(cacheKeys.jobDetail(id));
    await cacheService.delPattern('jobs:list:*');
    await cacheService.del(cacheKeys.adminIntelligence());


    return res.json({
      success: true,
      message: `Job drive is now ${job.status}`,
      job,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Get job preparation workspace & AI JD intelligence (with 3-tier persistent caching & stampede protection)
// @route   GET /api/jobs/:id/prepare
// @access  Private
const getJobPreparation = async (req, res) => {
  try {
    const { id } = req.params;
    const { isMockStoreActive } = getStoreStatus();

    let job = null;
    if (isMockStoreActive) {
      job = findMockJobById(id);
    } else {
      if (mongoose.Types.ObjectId.isValid(id)) {
        job = await Job.findById(id);
      }
      if (!job) {
        job = findMockJobById(id);
      }
    }

    if (!job) {
      return res.status(404).json({ message: 'Job drive not found' });
    }

    // Compute deterministic JD hash
    const jdHash = cacheKeys.computeHash(
      `${job.description} ${job.title} ${job.company?.name || ''}`
    );
    const cacheKey = cacheKeys.jdAnalysis(jdHash);

    // 3-Tier Persistent Cache-Aside with Single-Flight Stampede Protection
    // Tier 1: Redis -> Tier 2: MongoDB aiAnalysis -> Tier 3: AI Engine
    let resolvedSource = 'redis';
    const { data: analysis, cached } = await cacheService.remember(
      cacheKey,
      TTL.AI_JD_ANALYSIS,
      async () => {
        // TIER 2: Check MongoDB Stored AI Result (Source of Truth)
        if (job.aiAnalysis) {
          resolvedSource = 'mongodb';
          return job.aiAnalysis;
        }

        // TIER 3: Compute fresh AI intelligence
        resolvedSource = 'ai';
        const computedAnalysis = await analyzeJobDescription(job);
        job.aiAnalysis = computedAnalysis;
        if (!isMockStoreActive && job.save) {
          await job.save();
        }
        return computedAnalysis;
      }
    );

    return res.json({
      success: true,
      cached,
      source: cached ? 'redis' : resolvedSource,
      job,
      analysis,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  togglePublishJob,
  getJobPreparation,
  mockJobs,
  findMockJobById,
};
