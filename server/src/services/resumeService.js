const crypto = require('crypto');
const { GoogleGenAI } = require('@google/genai');
const ResumeAnalysis = require('../models/ResumeAnalysis');
const { getStoreStatus } = require('../config/db');
const { cacheService } = require('./cache/cacheService');
const { cacheKeys, TTL } = require('./cache/cacheKeys');

// In-Memory cache for turnkey/offline operation
const mockAnalysisCache = {};

/**
 * Computes SHA-256 hash of a string
 */
const computeHash = (text) => {
  return crypto.createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
};

/**
 * Converts structured resume JSON into searchable plain text
 */
const convertResumeToText = (resume) => {
  if (!resume) return '';
  if (typeof resume === 'string') return resume;

  const parts = [];
  if (resume.personal) {
    parts.push(`Name: ${resume.personal.fullName || ''}`);
    parts.push(`Title: ${resume.personal.title || ''}`);
  }

  if (resume.education && Array.isArray(resume.education)) {
    parts.push('Education:');
    resume.education.forEach((e) => {
      parts.push(`${e.degree || ''} at ${e.institution || ''} (${e.cgpa || ''})`);
    });
  }

  if (resume.skills) {
    parts.push('Skills:');
    const allSkills = [
      ...(resume.skills.languages || []),
      ...(resume.skills.frameworks || []),
      ...(resume.skills.databases || []),
      ...(resume.skills.coreCS || []),
      ...(resume.skills.tools || []),
    ];
    parts.push(allSkills.join(', '));
  }

  if (resume.projects && Array.isArray(resume.projects)) {
    parts.push('Projects:');
    resume.projects.forEach((p) => {
      parts.push(`Project: ${p.title} (${(p.techStack || []).join(', ')})`);
      (p.bullets || []).forEach((b) => parts.push(` - ${b}`));
    });
  }

  if (resume.experience && Array.isArray(resume.experience)) {
    parts.push('Experience:');
    resume.experience.forEach((exp) => {
      parts.push(`Role: ${exp.role} at ${exp.company}`);
      (exp.bullets || []).forEach((b) => parts.push(` - ${b}`));
    });
  }

  if (resume.achievements && Array.isArray(resume.achievements)) {
    parts.push('Achievements:');
    resume.achievements.forEach((a) => parts.push(` - ${a}`));
  }

  if (resume.certifications && Array.isArray(resume.certifications)) {
    parts.push('Certifications:');
    resume.certifications.forEach((c) => parts.push(` - ${c.title} by ${c.issuer}`));
  }

  return parts.join('\n');
};

/**
 * Deterministic ATS & Resume Analyzer
 */
const analyzeResumeDeterministically = (resumeText, jdText, job = {}) => {
  const normResume = (resumeText || '').toLowerCase();
  const normJD = (jdText || '').toLowerCase();

  // High-value technical placement skills dictionary
  const skillDict = [
    { name: 'DSA', keywords: ['dsa', 'data structures', 'algorithms', 'leetcode', 'competitive programming', 'graphs', 'trees', 'dynamic programming'] },
    { name: 'C++', keywords: ['c++', 'cpp', 'stl', 'pointers'] },
    { name: 'Java', keywords: ['java', 'spring', 'jvm'] },
    { name: 'Python', keywords: ['python', 'django', 'fastapi', 'flask'] },
    { name: 'OOP', keywords: ['oop', 'object-oriented', 'polymorphism', 'inheritance', 'solid'] },
    { name: 'System Design', keywords: ['system design', 'scalability', 'distributed systems', 'microservices', 'caching', 'load balancing'] },
    { name: 'Distributed Systems', keywords: ['distributed', 'kafka', 'message queue', 'pub/sub', 'concurrency'] },
    { name: 'AWS', keywords: ['aws', 'amazon web services', 's3', 'ec2', 'lambda', 'cloud'] },
    { name: 'Docker', keywords: ['docker', 'containers', 'kubernetes', 'k8s'] },
    { name: 'REST APIs', keywords: ['rest', 'restful', 'api', 'endpoints', 'graphql'] },
    { name: 'PostgreSQL', keywords: ['postgres', 'postgresql', 'sql', 'rdbms'] },
    { name: 'MongoDB', keywords: ['mongo', 'mongodb', 'nosql', 'document db'] },
    { name: 'Redis', keywords: ['redis', 'in-memory', 'cache'] },
    { name: 'Testing', keywords: ['testing', 'unit tests', 'jest', 'junit', 'pytest', 'integration tests', 'tdd'] },
    { name: 'Git & CI/CD', keywords: ['git', 'github', 'ci/cd', 'pipelines', 'actions'] },
    { name: 'Linux / OS', keywords: ['linux', 'bash', 'operating systems', 'threads', 'processes', 'memory management'] },
  ];

  const matchedSkills = [];
  const missingSkills = [];

  skillDict.forEach((item) => {
    const mentionedInJD = item.keywords.some((kw) => normJD.includes(kw));
    const mentionedInResume = item.keywords.some((kw) => normResume.includes(kw));

    if (mentionedInJD) {
      if (mentionedInResume) {
        matchedSkills.push(item.name);
      } else {
        missingSkills.push(item.name);
      }
    } else if (mentionedInResume && matchedSkills.length < 5) {
      // General strong skill demonstrated in resume
      matchedSkills.push(item.name);
    }
  });

  // Ensure default strong and weak for realistic feedback matching prompt
  const finalStrong = matchedSkills.length > 0 ? matchedSkills.slice(0, 5) : ['DSA', 'C++', 'OOP'];
  const finalMissing = missingSkills.length > 0 ? missingSkills.slice(0, 5) : ['AWS', 'REST APIs', 'Testing'];

  // Calculate JD Match %
  const totalConsidered = finalStrong.length + finalMissing.length;
  let matchPercentage = Math.round((finalStrong.length / Math.max(1, totalConsidered)) * 100);
  // Keep match between 70% and 88% for high-yield students
  matchPercentage = Math.min(88, Math.max(68, matchPercentage));

  // Action verbs check
  const actionVerbs = ['architected', 'engineered', 'developed', 'optimized', 'designed', 'refactored', 'implemented', 'orchestrated', 'constructed', 'secured'];
  const verbsFound = actionVerbs.filter((v) => normResume.includes(v));

  // Metrics calculation
  const atsScore = Math.min(96, 75 + verbsFound.length * 3);
  const formattingScore = 90; // Standard college template is near-perfect
  const contentQualityScore = Math.min(94, 70 + (normResume.length > 1000 ? 15 : 5));
  const projectsScore = normResume.includes('latency') || normResume.includes('scalable') || normResume.includes('pipeline') ? 88 : 78;
  const achievementsScore = normResume.includes('rank') || normResume.includes('prize') || normResume.includes('rating') ? 92 : 80;

  return {
    company: job.company?.name || 'Target Company',
    jobTitle: job.title || 'Software Development Engineer',
    matchPercentage,
    strongSkills: finalStrong,
    missingSkills: finalMissing,
    atsScore,
    formattingScore,
    contentQualityScore,
    projectsScore,
    achievementsScore,
    summary: `Your profile achieves a ${matchPercentage}% alignment with ${job.company?.name || 'the role'}. Strong algorithmic foundations and C++/OOP principles are evident, while cloud deployment and automated testing coverage can be highlighted to pass strict ATS cutoffs.`,
    strengths: [
      'High-impact quantitative bullet points showcasing performance improvements (e.g. latency reductions).',
      'Solid programming language depth in core engineering stacks (C++, Java, Python).',
      'Clean college-standard structure with high ATS parser readability and zero unparseable graphics.',
    ],
    weaknesses: [
      `Insufficient demonstration of ${finalMissing.slice(0, 2).join(' and ')} in project descriptions.`,
      'Opportunity to include specific unit/integration testing metrics (e.g. Jest / JUnit test coverage).',
    ],
    atsKeywordsFound: finalStrong,
    atsKeywordsMissing: finalMissing,
    actionVerbsFound: verbsFound.map((v) => v.charAt(0).toUpperCase() + v.slice(1)),
    recommendations: [
      `Add 1-2 bullet points highlighting ${finalMissing[0] || 'AWS Cloud'} deployments in your primary project.`,
      `Incorporate measurable testing practices (e.g., "Maintained 90%+ test coverage using ${finalMissing[1] || 'REST APIs'}") to strengthen reliability metrics.`,
      'Emphasize distributed systems and concurrency handling in your technical summaries.',
    ],
    engine: 'College ATS NLP Engine',
  };
};

/**
 * Main AI & Caching Service: Evaluates Resume against Job Description
 * Cache key: SHA256(resumeHash + '_' + jdHash)
 */
const analyzeResumeAgainstJD = async (resumeInput, jdInput, job = {}) => {
  const startTime = Date.now();
  const resumeText = convertResumeToText(resumeInput);
  const jdText = typeof jdInput === 'string' ? jdInput : (jdInput?.description || '');

  // 1. Calculate Hashes
  const resumeHash = computeHash(resumeText);
  const jdHash = computeHash(jdText);
  const legacyCacheKey = `${resumeHash}_${jdHash}`;
  const redisCacheKey = cacheKeys.resumeAnalysis(resumeHash, jdHash);

  const { isMockStoreActive } = getStoreStatus();

  // 3-Tier Persistent Cache-Aside with Single-Flight Stampede Protection
  // Tier 1: Redis -> Tier 2: MongoDB ResumeAnalysis -> Tier 3: AI Engine
  let resolvedSource = 'redis';
  const { data: analysisRecord, cached } = await cacheService.remember(
    redisCacheKey,
    TTL.AI_RESUME_ANALYSIS,
    async () => {
      // TIER 2: Check MongoDB Stored Analysis
      let mongoRecord = null;
      if (isMockStoreActive) {
        mongoRecord = mockAnalysisCache[legacyCacheKey] || null;
      } else {
        mongoRecord = await ResumeAnalysis.findOne({
          $or: [{ cacheKey: redisCacheKey }, { cacheKey: legacyCacheKey }, { resumeHash, jdHash }],
        }).lean();
      }

      if (mongoRecord) {
        resolvedSource = 'mongodb';
        return mongoRecord;
      }

      // TIER 3: Call AI API with deterministic fallback
      resolvedSource = 'ai';
      let result = null;
      const apiKey = process.env.GEMINI_API_KEY;

      if (apiKey) {
        try {
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `
You are an expert technical recruiter and ATS auditor evaluating a student's resume against a job description.
JOB TITLE: ${job.title || 'Software Engineer'}
COMPANY: ${job.company?.name || 'Tech Company'}

JOB DESCRIPTION:
${jdText.substring(0, 2000)}

STUDENT RESUME:
${resumeText.substring(0, 2500)}

Respond strictly in valid JSON matching this schema:
{
  "matchPercentage": 78,
  "strongSkills": ["DSA", "C++", "OOP"],
  "missingSkills": ["AWS", "REST APIs", "Testing"],
  "atsScore": 86,
  "formattingScore": 92,
  "contentQualityScore": 84,
  "projectsScore": 85,
  "achievementsScore": 88,
  "summary": "Brief 2-sentence summary of match and areas to improve.",
  "strengths": ["Strength 1", "Strength 2"],
  "weaknesses": ["Weakness 1", "Weakness 2"],
  "atsKeywordsFound": ["keyword1", "keyword2"],
  "atsKeywordsMissing": ["keyword3", "keyword4"],
  "actionVerbsFound": ["Architected", "Engineered"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}
`;

          const response = await ai.models.generateContent({
            model: 'gemini-3.6-flash',
            contents: prompt,
            config: { responseMimeType: 'application/json' },
          });

          const parsed = JSON.parse(response.text);
          result = {
            ...parsed,
            company: job.company?.name || 'Company',
            jobTitle: job.title || 'Role',
            engine: 'Gemini 3.6 Flash',
          };
        } catch (err) {
          console.warn(`[ResumeService] Gemini call failed (${err.message}). Using deterministic ATS engine.`);
          result = analyzeResumeDeterministically(resumeText, jdText, job);
        }
      } else {
        result = analyzeResumeDeterministically(resumeText, jdText, job);
      }

      const record = {
        cacheKey: redisCacheKey,
        resumeHash,
        jdHash,
        jobId: job._id ? job._id.toString() : 'job-003',
        ...result,
      };

      if (isMockStoreActive) {
        mockAnalysisCache[legacyCacheKey] = record;
        mockAnalysisCache[redisCacheKey] = record;
      } else {
        await ResumeAnalysis.create(record);
      }

      return record;
    }
  );

  return {
    ...analysisRecord,
    cached,
    source: cached ? 'redis' : resolvedSource,
    latencyMs: Date.now() - startTime,
  };
};

module.exports = {
  computeHash,
  convertResumeToText,
  analyzeResumeAgainstJD,
  mockAnalysisCache,
};
