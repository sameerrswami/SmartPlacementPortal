const Question = require('../models/Question');
const User = require('../models/User');
const { getStoreStatus } = require('../config/db');
const { seedQuestions } = require('../data/seedQuestions');
const { findMockJobById } = require('./jobController');
const Job = require('../models/Job');
const { cacheService } = require('../services/cache/cacheService');
const { cacheKeys, TTL } = require('../services/cache/cacheKeys');

// In-Memory store for offline/turnkey resilience
let mockQuestions = [...seedQuestions];
const mockUserSolvedMap = {};

/**
 * Helper to get user's solved question IDs
 */
const getUserSolvedList = async (user) => {
  if (!user) return [];
  const { isMockStoreActive } = getStoreStatus();
  if (isMockStoreActive) {
    const userId = user._id ? user._id.toString() : 'student-001';
    if (!mockUserSolvedMap[userId]) {
      mockUserSolvedMap[userId] = user.solvedQuestions || [];
    }
    return mockUserSolvedMap[userId];
  }

  const dbUser = await User.findById(user._id);
  return dbUser?.solvedQuestions || [];
};

/**
 * @desc    Get all questions with extensive filters
 * @route   GET /api/questions
 * @access  Private
 */
const getQuestions = async (req, res) => {
  try {
    const {
      company,
      topic,
      difficulty,
      platform,
      status, // 'solved', 'unsolved', or 'all'
      search,
      sortBy = 'frequency',
    } = req.query;

    const userSolved = await getUserSolvedList(req.user);
    const { isMockStoreActive } = getStoreStatus();

    let list = [];
    if (isMockStoreActive) {
      list = [...mockQuestions];
    } else {
      const rawCacheKey = cacheKeys.questionsRaw();
      const cached = await cacheService.get(rawCacheKey);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        list = cached;
      } else {
        const count = await Question.countDocuments();
        if (count === 0) {
          await Question.insertMany(seedQuestions);
        }
        list = await Question.find({}).lean();
        await cacheService.set(rawCacheKey, list, TTL.QUESTIONS_LIST);
      }
    }

    // Apply filtering
    let filtered = list.filter((q) => {
      // Company filter
      if (company && company !== 'all') {
        const hasCompany = (q.companies || []).some(
          (c) => c.toLowerCase() === company.toLowerCase()
        );
        if (!hasCompany) return false;
      }

      // Topic filter
      if (topic && topic !== 'all') {
        const hasTopic = (q.topics || []).some((t) =>
          t.toLowerCase().includes(topic.toLowerCase())
        );
        if (!hasTopic) return false;
      }

      // Difficulty filter
      if (difficulty && difficulty !== 'all') {
        if (q.difficulty.toLowerCase() !== difficulty.toLowerCase()) return false;
      }

      // Platform filter
      if (platform && platform !== 'all') {
        if (q.platform.toLowerCase() !== platform.toLowerCase()) return false;
      }

      // Search keyword filter
      if (search && search.trim()) {
        const s = search.toLowerCase().trim();
        const matchesTitle = q.title.toLowerCase().includes(s);
        const matchesDesc = (q.description || '').toLowerCase().includes(s);
        const matchesTopic = (q.topics || []).some((t) => t.toLowerCase().includes(s));
        if (!matchesTitle && !matchesDesc && !matchesTopic) return false;
      }

      // Solved status filter
      const isSolved = userSolved.includes(q._id.toString());
      if (status === 'solved' && !isSolved) return false;
      if (status === 'unsolved' && isSolved) return false;

      return true;
    });

    // Attach solved flag
    const enriched = filtered.map((q) => ({
      ...q,
      isSolved: userSolved.includes(q._id.toString()),
    }));

    // Sorting
    if (sortBy === 'difficulty') {
      const order = { Easy: 1, Medium: 2, Hard: 3 };
      enriched.sort((a, b) => (order[a.difficulty] || 2) - (order[b.difficulty] || 2));
    } else if (sortBy === 'title') {
      enriched.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      // Default: frequency desc
      enriched.sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
    }

    return res.json({
      success: true,
      total: enriched.length,
      solvedCount: enriched.filter((q) => q.isSolved).length,
      questions: enriched,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get recommended questions for a specific placement drive / JD
 * @route   GET /api/questions/recommended/:jobId
 * @access  Private
 */
const getRecommendedQuestionsForJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { isMockStoreActive } = getStoreStatus();
    const mongoose = require('mongoose');

    // 1. Find the target job
    let job = null;
    if (isMockStoreActive) {
      job = findMockJobById(jobId);
    } else if (mongoose.Types.ObjectId.isValid(jobId)) {
      job = await Job.findById(jobId);
    } else {
      job = findMockJobById(jobId);
    }

    const companyName = job?.company?.name || 'Amazon';
    const targetTopics = ['Graphs', 'Trees', 'Dynamic Programming', 'Arrays & Strings', 'Heap / Priority Queue'];

    // If job has aiAnalysis with dsaTopics, use those!
    let activeDsaTopics = targetTopics;
    if (job?.aiAnalysis?.dsaTopics && Array.isArray(job.aiAnalysis.dsaTopics) && job.aiAnalysis.dsaTopics.length > 0) {
      // Simplify topics for matching (e.g. "Dynamic Programming (Knapsack, LCS...)" -> "Dynamic Programming")
      activeDsaTopics = job.aiAnalysis.dsaTopics.map((dt) => {
        if (dt.includes('Graph')) return 'Graphs';
        if (dt.includes('Tree')) return 'Trees';
        if (dt.includes('Dynamic Programming')) return 'Dynamic Programming';
        if (dt.includes('Heap')) return 'Heap / Priority Queue';
        if (dt.includes('Array') || dt.includes('Sliding Window') || dt.includes('Two Pointer')) return 'Arrays & Strings';
        if (dt.includes('Trie')) return 'Trie';
        return dt.split('(')[0].trim();
      });
      // Deduplicate
      activeDsaTopics = [...new Set(activeDsaTopics)];
    }

    // 2. Fetch all questions
    let allQuestions = [];
    if (isMockStoreActive) {
      allQuestions = [...mockQuestions];
    } else {
      const count = await Question.countDocuments();
      if (count === 0) {
        await Question.insertMany(seedQuestions);
      }
      allQuestions = await Question.find({}).lean();
    }

    const userSolved = await getUserSolvedList(req.user);

    // 3. Flow: Group questions by Topic and Rank
    // Example format:
    // Amazon SDE -> Graphs (🔥 High Priority) -> 1. Course Schedule, 2. Number of Islands, 3. Clone Graph
    // Trees (🔥 High Priority) -> 1. Binary Tree Level Order, 2. Lowest Common Ancestor
    const groupedTopics = [];
    const recommendedSet = new Set();

    activeDsaTopics.forEach((topicName) => {
      // Find questions that match this topic
      const topicMatches = allQuestions.filter((q) =>
        (q.topics || []).some((t) => t.toLowerCase().includes(topicName.toLowerCase()) || topicName.toLowerCase().includes(t.toLowerCase()))
      );

      if (topicMatches.length === 0) return;

      // Score and rank questions within this topic
      const rankedQuestions = topicMatches.map((q) => {
        const isCompanyMatch = (q.companies || []).some((c) =>
          c.toLowerCase().includes(companyName.toLowerCase()) || companyName.toLowerCase().includes(c.toLowerCase())
        );
        // Priority formula: Company match adds 50 pts, base frequency (up to 100)
        const rankScore = (isCompanyMatch ? 50 : 0) + (q.frequency || 70);
        return {
          ...q,
          isSolved: userSolved.includes(q._id.toString()),
          isCompanyMatch,
          rankScore,
        };
      });

      // Sort by rankScore descending
      rankedQuestions.sort((a, b) => b.rankScore - a.rankScore);

      // Determine priority badge
      const hasDirectCompanyMatch = rankedQuestions.some((q) => q.isCompanyMatch);
      const isHighPriority = hasDirectCompanyMatch || ['Graphs', 'Trees', 'Dynamic Programming'].includes(topicName);

      rankedQuestions.forEach((q) => recommendedSet.add(q._id.toString()));

      groupedTopics.push({
        topic: topicName,
        priority: isHighPriority ? 'High' : 'Medium',
        badge: isHighPriority ? '🔥 High Priority' : '⚡ Recommended',
        questionsCount: rankedQuestions.length,
        solvedCount: rankedQuestions.filter((q) => q.isSolved).length,
        questions: rankedQuestions,
      });
    });

    // Also build the flat list of all recommended questions
    const flatRecommended = [];
    allQuestions.forEach((q) => {
      if (recommendedSet.has(q._id.toString())) {
        const isCompanyMatch = (q.companies || []).some((c) =>
          c.toLowerCase().includes(companyName.toLowerCase()) || companyName.toLowerCase().includes(c.toLowerCase())
        );
        flatRecommended.push({
          ...q,
          isSolved: userSolved.includes(q._id.toString()),
          isCompanyMatch,
        });
      }
    });

    return res.json({
      success: true,
      company: companyName,
      jobTitle: job?.title || 'Software Development Engineer',
      totalRecommended: flatRecommended.length,
      totalSolved: flatRecommended.filter((q) => q.isSolved).length,
      completionRate: Math.round(
        (flatRecommended.filter((q) => q.isSolved).length / Math.max(1, flatRecommended.length)) * 100
      ),
      groupedTopics,
      questions: flatRecommended,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Toggle question solved state for current student
 * @route   POST /api/questions/:id/toggle-solve
 * @access  Private
 */
const toggleQuestionSolved = async (req, res) => {
  try {
    const { id } = req.params;
    const { isMockStoreActive } = getStoreStatus();
    const userId = req.user._id ? req.user._id.toString() : 'student-001';

    let isSolvedNow = false;
    let solvedCount = 0;

    if (isMockStoreActive) {
      if (!mockUserSolvedMap[userId]) {
        mockUserSolvedMap[userId] = [];
      }
      const list = mockUserSolvedMap[userId];
      const idx = list.indexOf(id);
      if (idx > -1) {
        list.splice(idx, 1);
        isSolvedNow = false;
      } else {
        list.push(id);
        isSolvedNow = true;
      }
      solvedCount = list.length;
    } else {
      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const solvedList = user.solvedQuestions || [];
      const idx = solvedList.indexOf(id);
      if (idx > -1) {
        solvedList.splice(idx, 1);
        isSolvedNow = false;
      } else {
        solvedList.push(id);
        isSolvedNow = true;
      }
      user.solvedQuestions = solvedList;
      // Adjust readiness score based on problem solutions
      user.readinessScore = Math.min(98, Math.max(50, 60 + solvedList.length * 3));
      await user.save();
      solvedCount = solvedList.length;
    }

    return res.json({
      success: true,
      questionId: id,
      isSolved: isSolvedNow,
      totalSolved: solvedCount,
      message: isSolvedNow ? 'Problem marked as solved! (+3% Readiness)' : 'Problem unmarked.',
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get student coding statistics & topic mastery
 * @route   GET /api/questions/stats
 * @access  Private
 */
const getStudentCodingStats = async (req, res) => {
  try {
    const userSolved = await getUserSolvedList(req.user);
    const { isMockStoreActive } = getStoreStatus();

    const questionsList = isMockStoreActive ? mockQuestions : await Question.find({}).lean();
    const totalQuestions = questionsList.length;
    const solvedQuestions = questionsList.filter((q) => userSolved.includes(q._id.toString()));

    const easySolved = solvedQuestions.filter((q) => q.difficulty === 'Easy').length;
    const easyTotal = questionsList.filter((q) => q.difficulty === 'Easy').length;

    const medSolved = solvedQuestions.filter((q) => q.difficulty === 'Medium').length;
    const medTotal = questionsList.filter((q) => q.difficulty === 'Medium').length;

    const hardSolved = solvedQuestions.filter((q) => q.difficulty === 'Hard').length;
    const hardTotal = questionsList.filter((q) => q.difficulty === 'Hard').length;

    // Platform distribution
    const leetCodeSolved = solvedQuestions.filter((q) => q.platform === 'LeetCode').length;
    const gfgSolved = solvedQuestions.filter((q) => q.platform === 'GeeksforGeeks').length;

    return res.json({
      success: true,
      stats: {
        totalQuestions,
        totalSolved: solvedQuestions.length,
        completionRate: Math.round((solvedQuestions.length / Math.max(1, totalQuestions)) * 100),
        difficulty: {
          easy: { solved: easySolved, total: easyTotal },
          medium: { solved: medSolved, total: medTotal },
          hard: { solved: hardSolved, total: hardTotal },
        },
        platform: {
          leetCode: leetCodeSolved,
          geeksforGeeks: gfgSolved,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Generate AI-curated interview questions for a particular drive/company
 * @route   POST /api/questions/generate
 * @access  Private
 */
const generateQuestions = async (req, res) => {
  try {
    const {
      company = 'Amazon',
      roleTitle = 'Software Development Engineer',
      topics = [],
      difficulty = 'All',
      count = 5,
    } = req.body;

    const { generateCodingQuestionsForDrive } = require('../services/geminiService');
    const { isMockStoreActive } = getStoreStatus();

    const generated = await generateCodingQuestionsForDrive({
      companyName: company,
      roleTitle,
      topics,
      difficulty,
      count: Math.min(Math.max(Number(count) || 5, 1), 15),
    });

    const savedQuestions = [];

    if (isMockStoreActive) {
      for (const q of generated) {
        const newQ = {
          _id: `q-ai-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          ...q,
          createdAt: new Date(),
        };
        mockQuestions.unshift(newQ);
        savedQuestions.push(newQ);
      }
    } else {
      for (const q of generated) {
        let existing = await Question.findOne({ title: q.title });
        if (existing) {
          if (!existing.companies.includes(company)) {
            existing.companies.push(company);
            await existing.save();
          }
          savedQuestions.push(existing);
        } else {
          const newQ = await Question.create(q);
          savedQuestions.push(newQ);
        }
      }
      await cacheService.del(cacheKeys.questionsRaw());
    }

    return res.status(201).json({
      success: true,
      message: `Successfully generated ${savedQuestions.length} interview questions for ${company}!`,
      questions: savedQuestions,
    });
  } catch (error) {
    console.error('Error generating questions:', error);
    return res.status(500).json({ message: error.message || 'Failed to generate questions' });
  }
};

module.exports = {
  getQuestions,
  getRecommendedQuestionsForJob,
  toggleQuestionSolved,
  getStudentCodingStats,
  generateQuestions,
  seedQuestions,
};
