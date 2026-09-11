const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    personal: {
      fullName: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      location: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      github: { type: String, default: '' },
      portfolio: { type: String, default: '' },
    },
    education: [
      {
        institution: { type: String, default: '' },
        degree: { type: String, default: '' },
        branch: { type: String, default: '' },
        cgpa: { type: String, default: '' },
        location: { type: String, default: '' },
        startYear: { type: String, default: '' },
        endYear: { type: String, default: '' },
      },
    ],
    skills: {
      languages: {
        type: [String],
        default: [],
      },
      frameworks: {
        type: [String],
        default: [],
      },
      databases: {
        type: [String],
        default: [],
      },
      coreCS: {
        type: [String],
        default: [],
      },
      tools: {
        type: [String],
        default: [],
      },
      softSkills: {
        type: [String],
        default: [],
      },
    },
    projects: [
      {
        title: { type: String, default: '' },
        techStack: { type: [String], default: [] },
        duration: { type: String, default: '' },
        liveUrl: { type: String, default: '' },
        repoUrl: { type: String, default: '' },
        bullets: {
          type: [String],
          default: [],
        },
      },
    ],
    experience: [
      {
        company: { type: String, default: '' },
        role: { type: String, default: '' },
        location: { type: String, default: '' },
        duration: { type: String, default: '' },
        bullets: {
          type: [String],
          default: [],
        },
      },
    ],
    achievements: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    certifications: [
      {
        title: { type: String, default: '' },
        issuer: { type: String, default: '' },
        year: { type: String, default: '' },
        linkText: { type: String, default: 'Link' },
        credentialUrl: { type: String, default: '' },
      },
    ],
    positions: [
      {
        role: { type: String, default: '' },
        organization: { type: String, default: '' },
        duration: { type: String, default: '' },
        description: { type: String, default: '' },
      },
    ],
    codingProfiles: {
      leetcode: { type: String, default: '' },
      codeforces: { type: String, default: '' },
      gfg: { type: String, default: '' },
      github: { type: String, default: '' },
    },
    rawText: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Resume', resumeSchema);
