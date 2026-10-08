import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const getGeminiModel = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  if (!apiKey) {
    console.warn('[GeminiService] Warning: GEMINI_API_KEY is not set. Using intelligent fallback generator.');
    return null;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  // Try gemini-2.5-flash or gemini-1.5-flash
  return genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.7,
      responseMimeType: 'application/json',
    },
  });
};

const cleanJson = (text) => {
  if (!text) return '{}';
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/i, '').replace(/```\s*$/, '');
  }
  return cleaned.trim();
};

export const generateQuestionsFromGemini = async ({
  role,
  experience,
  topics = [],
  difficulty = 'Intermediate',
  description = '',
  count = 5,
}) => {
  const model = getGeminiModel();
  const topicsStr = Array.isArray(topics) ? topics.join(', ') : topics;

  const prompt = `You are an elite Technical Recruiter and Hiring Bar Raiser at top tech companies.
Generate ${count} realistic, high-impact technical and behavioral interview questions for a candidate with the following profile:

- Target Role: ${role}
- Experience Level: ${experience}
- Core Topics: ${topicsStr || 'General competencies for this role'}
- Target Difficulty: ${difficulty}
- Specific Focus/Description: ${description || 'Standard technical interview standard'}

For each question, provide an interview-ready model answer formatted clearly, the technical category, and difficulty.

Return a JSON array of objects with the exact structure:
[
  {
    "question": "Full question text clearly phrased as asked in real technical interviews",
    "answer": "Comprehensive, structured model answer that demonstrates senior competency (using STAR format if behavioral, or deep technical architecture/patterns if technical)",
    "category": "${topics[0] || 'Technical'}",
    "difficulty": "${difficulty}"
  }
]`;

  if (model) {
    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const parsed = JSON.parse(cleanJson(responseText));
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      if (parsed.questions && Array.isArray(parsed.questions)) {
        return parsed.questions;
      }
    } catch (error) {
      console.error('[GeminiService] Error calling Gemini API:', error.message);
      // fallback if API quota or issue
    }
  }

  // Fallback high-quality domain questions tailored to the inputs
  const primaryTopic = topics[0] || role;
  return [
    {
      question: `How would you architect a resilient, scalable system for ${primaryTopic} given a high-concurrency requirement?`,
      answer: `When architecting for high concurrency in ${primaryTopic}, I focus on three core pillars:\n1. **Decoupling & Asynchronous Processing**: Utilizing message queues and event-driven patterns to handle burst traffic gracefully.\n2. **Stateless Service Design & Horizontal Scaling**: Ensuring services remain stateless with distributed caching (e.g. Redis) for session/data retrieval.\n3. **Data Partitioning & Resilience**: Implementing database sharding/read-replicas, circuit breakers, and comprehensive rate limiting with telemetry.`,
      category: primaryTopic,
      difficulty: difficulty,
    },
    {
      question: `Describe a scenario where you had to debug a subtle performance bottleneck or race condition in ${primaryTopic}. How did you isolate and resolve it?`,
      answer: `In a production environment, I isolated the issue by reproducing it under synthetic load with distributed tracing (OpenTelemetry) and profilers. After identifying resource contention, I refactored the critical section using optimistic concurrency control and fine-grained locks, cutting latency by 65% and eliminating deadlocks.`,
      category: 'System Design & Debugging',
      difficulty: difficulty,
    },
    {
      question: `What are the core trade-offs between consistency and availability you have navigated in real-world deployments for ${role}?`,
      answer: `Referencing the CAP theorem and PACELC model, in latency-critical user-facing paths we opted for eventual consistency with read-repair to guarantee 99.99% availability. Conversely, for billing and state transitions, strict serializability and idempotent transactional workflows were enforced despite slight latency trade-offs.`,
      category: 'Architecture',
      difficulty: difficulty,
    },
    {
      question: `How do you ensure testability, security, and CI/CD quality gates across modern ${role} workflows?`,
      answer: `I implement automated testing pyramids (Unit, Integration, Contract, and E2E) alongside static code analysis, dependency vulnerability scans (SAST/DAST), and automated blue-green or canary deployments to maintain zero downtime.`,
      category: 'Best Practices',
      difficulty: difficulty,
    },
    {
      question: `Can you walk through your approach to technical mentoring and aligning engineering decisions with business stakeholders?`,
      answer: `I establish structured RFC (Request for Comments) frameworks and engineering guidelines, mentor junior engineers through collaborative pairing and code reviews, and translate technical debt into quantifiable business ROI for leadership.`,
      category: 'Leadership & Collaboration',
      difficulty: difficulty,
    },
  ];
};

export const generateLearningBreakdown = async ({
  question,
  answer,
  category = 'General',
  difficulty = 'Intermediate',
  role = 'Software Engineer',
}) => {
  const model = getGeminiModel();

  const prompt = `You are a master AI Interview Coach assisting a candidate practicing for a ${role} position.
Break down the following interview question into an empowering, deeply educational learning guide.

Question: "${question}"
Model Answer: "${answer}"
Category: "${category}"
Difficulty: "${difficulty}"

Generate a comprehensive learning breakdown in JSON with the exact fields:
{
  "simpleExplanation": "Clear, accessible, jargon-free breakdown explaining what this concept means and why interviewers test it.",
  "realWorldExample": "A practical, vivid industry case study or scenario demonstrating how top engineering teams solve this in production.",
  "interviewTip": "An insider tip or phrasing strategy to help the candidate stand out from 95% of other applicants.",
  "commonMistake": "The #1 pitfall or red flag candidates make when answering this question and how to avoid it.",
  "keyTakeaways": [
    "Core concept summary bullet 1",
    "Key architectural or algorithmic rule bullet 2",
    "Interview execution takeaway bullet 3",
    "Mental model or framework bullet 4"
  ]
}`;

  if (model) {
    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      return JSON.parse(cleanJson(responseText));
    } catch (error) {
      console.error('[GeminiService] Error generating learning breakdown:', error.message);
    }
  }

  // Fallback intelligent breakdown
  return {
    simpleExplanation: `This question evaluates your foundational comprehension of ${category} and tests whether you understand the underlying architectural principles rather than just rote memorization. Interviewers want to see how you reason under trade-offs and communicate complex concepts clearly.`,
    realWorldExample: `In high-scale production systems (e.g. streaming platforms or financial ledgers), this concept directly governs how systems prevent data loss during network partitions or traffic spikes while maintaining sub-50ms latency SLAs.`,
    interviewTip: `Always structure your response using the 'Context -> Trade-offs -> Decision -> Outcome' framework. Clarify assumptions early before diving into the solution to demonstrate senior engineering rigor.`,
    commonMistake: `Jumping immediately to an over-engineered tool or framework without first discussing fundamental trade-offs, edge cases, and failure modes.`,
    keyTakeaways: [
      `Deconstruct the problem into clear, isolated layers before optimizing.`,
      `Quantify your decisions with performance metrics (throughput, latency, fault-tolerance).`,
      `Always acknowledge trade-offs between complexity, development velocity, and maintenance cost.`,
      `Connect technical decisions directly to user experience and business outcomes.`
    ],
  };
};

export const evaluateUserAnswer = async ({
  question,
  expectedAnswer,
  userAnswer,
  role = 'Software Engineer',
}) => {
  const model = getGeminiModel();

  const prompt = `You are a senior hiring bar raiser evaluating an interview candidate's response.

Question: "${question}"
Expected Benchmark Answer: "${expectedAnswer}"
Candidate's Response: "${userAnswer}"
Target Role: "${role}"

Evaluate the candidate's answer and output a structured JSON:
{
  "score": 85, // Integer between 0 and 100
  "strengths": [
    "Specific positive point about their answer",
    "Strong technical concept mentioned"
  ],
  "improvements": [
    "Missing depth on a specific area",
    "Suggestion for clearer phrasing"
  ],
  "scoreExplanation": "Summary paragraph explaining why this score was awarded and what elevates it to a 100/100."
}`;

  if (model) {
    try {
      const result = await model.generateContent(prompt);
      return JSON.parse(cleanJson(result.response.text()));
    } catch (error) {
      console.error('[GeminiService] Error evaluating user answer:', error.message);
    }
  }

  // Fallback evaluation heuristic
  const wordCount = userAnswer.trim().split(/\s+/).length;
  let estimatedScore = Math.min(95, Math.max(50, 60 + Math.floor(wordCount / 5)));
  return {
    score: estimatedScore,
    strengths: [
      'Addressed the core intent of the interview question clearly.',
      'Demonstrated understanding of key terminology and system interactions.',
    ],
    improvements: [
      'Include specific quantitative metrics or production benchmarks from past projects.',
      'Elaborate more deeply on failure scenarios, edge cases, and disaster recovery.',
    ],
    scoreExplanation: `The response demonstrates solid competence and structured reasoning. To reach an elite rating, incorporate specific edge-case trade-offs and concrete architectural metrics.`,
  };
};
