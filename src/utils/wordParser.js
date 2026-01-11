/**
 * Word Document Parser for Quiz/Certification Questions
 *
 * This utility parses Word documents (.docx) and extracts quiz questions
 * Supports format like:
 * - Numbered questions (1. Question text...)
 * - Multiple choice options (A. B. C. D.)
 * - Answer keys section (Kunci Jawaban)
 * - Essay questions (Soal Uraian)
 */

import mammoth from "mammoth";

/**
 * Parse Word document to plain text
 * @param {ArrayBuffer} arrayBuffer - The file content as ArrayBuffer
 * @returns {Promise<string>} - Plain text content
 */
export const parseWordDocument = async (arrayBuffer) => {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (error) {
    console.error("Error parsing Word document:", error);
    throw new Error("Gagal membaca file Word: " + error.message);
  }
};

/**
 * Parse quiz content from text and extract questions
 * @param {string} text - Plain text from Word document
 * @returns {Array} - Array of question objects
 */
export const parseQuizContent = (text) => {
  // Normalize text
  const normalizedText = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]+/g, " ")
    .replace(/…/g, "...");

  // Split into lines
  const lines = normalizedText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l);

  // Find all answer key sections and extract answers
  const answerKeys = extractAllAnswerKeys(lines);
  console.log("Extracted answer keys:", answerKeys);

  // Extract questions
  const questions = extractQuestions(lines, answerKeys);
  console.log("Extracted questions:", questions.length);

  return questions;
};

/**
 * Extract all answer keys from the document
 * Handles multiple answer sections and various formats
 */
const extractAllAnswerKeys = (lines) => {
  const answerKeys = {};
  let inAnswerSection = false;
  let questionOffset = 0; // For handling multiple quiz sections
  let currentAnswerIndex = 1;
  let consecutiveLetters = []; // Track consecutive single letters

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();

    // Detect answer key section start
    if (
      lowerLine.includes("kunci jawaban") ||
      lowerLine.includes("answer key")
    ) {
      inAnswerSection = true;
      // Check how many questions we've seen so far to set offset
      const existingKeys = Object.keys(answerKeys).length;
      if (existingKeys > 0) {
        questionOffset = existingKeys;
      }
      currentAnswerIndex = 1;
      consecutiveLetters = [];
      continue;
    }

    // Detect end of answer section (new section header)
    if (inAnswerSection) {
      // Check if this is a new section header (like "B. Soal Uraian")
      if (
        /^[A-Z]\.\s+Soal/i.test(line) ||
        /^Soal\s+(Pilihan|Uraian)/i.test(line)
      ) {
        // Process any accumulated consecutive letters
        if (consecutiveLetters.length > 0) {
          consecutiveLetters.forEach((letter, idx) => {
            answerKeys[questionOffset + idx + 1] = letter;
          });
          consecutiveLetters = [];
        }
        inAnswerSection = false;
        continue;
      }
    }

    if (inAnswerSection) {
      // Pattern 1: "1. B" or "1) B"
      const numberedMatch = line.match(/^(\d+)[.\)]\s*([A-Da-d])\s*$/);
      if (numberedMatch) {
        const qNum = parseInt(numberedMatch[1]);
        answerKeys[questionOffset + qNum] = numberedMatch[2].toUpperCase();
        continue;
      }

      // Pattern 2: Just a single letter "B" on its own line
      const singleLetterMatch = line.match(/^([A-Da-d])$/);
      if (singleLetterMatch) {
        consecutiveLetters.push(singleLetterMatch[1].toUpperCase());
        continue;
      }

      // Pattern 3: Multiple letters on one line "B B C A D"
      const multiLetterMatch = line.match(/^([A-Da-d](\s+[A-Da-d])+)$/);
      if (multiLetterMatch) {
        const letters = line.split(/\s+/).map((l) => l.toUpperCase());
        letters.forEach((letter, idx) => {
          if (/^[A-D]$/.test(letter)) {
            answerKeys[questionOffset + currentAnswerIndex + idx] = letter;
          }
        });
        currentAnswerIndex += letters.length;
        continue;
      }
    }
  }

  // Process any remaining consecutive letters
  if (consecutiveLetters.length > 0) {
    consecutiveLetters.forEach((letter, idx) => {
      const qNum = Object.keys(answerKeys).length + idx + 1;
      answerKeys[qNum] = letter;
    });
  }

  return answerKeys;
};

/**
 * Extract questions from lines
 */
const extractQuestions = (lines, answerKeys) => {
  const questions = [];
  let currentQuestion = null;
  let globalQuestionNumber = 0;
  let inEssaySection = false;
  let skipSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();

    // Detect section changes
    if (lowerLine.includes("soal uraian") || lowerLine.includes("soal essay")) {
      inEssaySection = true;
      skipSection = false;
      continue;
    }

    if (
      lowerLine.includes("soal pilihan ganda") ||
      lowerLine.includes("pilihan ganda")
    ) {
      inEssaySection = false;
      skipSection = false;
      continue;
    }

    // Skip answer key sections
    if (
      lowerLine.includes("kunci jawaban") ||
      lowerLine.includes("answer key")
    ) {
      skipSection = true;
      continue;
    }

    // Resume after answer key section when we see new question section
    if (
      skipSection &&
      (/^[A-Z]\.\s+Soal/i.test(line) || /^\d+\./i.test(line))
    ) {
      if (/^\d+\./.test(line)) {
        skipSection = false;
      } else {
        continue;
      }
    }

    if (skipSection) continue;

    // Skip header lines
    if (isHeaderLine(line)) continue;

    // Check if this is a new question (starts with number)
    const questionMatch = line.match(/^(\d+)[.\)]\s*(.+)/);
    if (questionMatch) {
      // Save previous question
      if (currentQuestion && currentQuestion.question_text) {
        if (!inEssaySection) {
          // Look up answer from answer keys
          if (answerKeys[globalQuestionNumber]) {
            currentQuestion.correct_answer = answerKeys[globalQuestionNumber];
          } else if (!currentQuestion.correct_answer) {
            currentQuestion.correct_answer = "A"; // Default
          }
        }
        questions.push(formatQuestion(currentQuestion, inEssaySection));
      }

      globalQuestionNumber++;
      currentQuestion = {
        number: globalQuestionNumber,
        question_text: questionMatch[2].trim(),
        options: {},
        correct_answer: null,
        question_type: inEssaySection ? "essay" : "multiple_choice",
      };
      continue;
    }

    // Check if this is an option (A. B. C. D.)
    const optionMatch = line.match(/^([A-Da-d])[.\)]\s*(.+)/);
    if (optionMatch && currentQuestion && !inEssaySection) {
      const optionKey = optionMatch[1].toUpperCase();
      currentQuestion.options[optionKey] = optionMatch[2].trim();
      continue;
    }

    // Check if this line continues the question text (before options)
    if (currentQuestion && Object.keys(currentQuestion.options).length === 0) {
      // Make sure it's not an option line
      if (!line.match(/^[A-Da-d][.\)]/)) {
        currentQuestion.question_text += " " + line;
      }
    }
  }

  // Don't forget the last question
  if (currentQuestion && currentQuestion.question_text) {
    if (!inEssaySection) {
      if (answerKeys[globalQuestionNumber]) {
        currentQuestion.correct_answer = answerKeys[globalQuestionNumber];
      } else if (!currentQuestion.correct_answer) {
        currentQuestion.correct_answer = "A";
      }
    }
    questions.push(formatQuestion(currentQuestion, inEssaySection));
  }

  // Filter and validate
  return questions.filter((q) => {
    if (!q.question_text || q.question_text.length < 5) return false;
    if (q.question_type === "multiple_choice") {
      if (!q.options || Object.keys(q.options).length < 2) return false;
    }
    return true;
  });
};

/**
 * Check if line is a header/title line to skip
 */
const isHeaderLine = (line) => {
  const headerPatterns = [
    /^Soal\s+Sertifikasi/i,
    /^Tes\s+Kompetensi/i,
    /^Materi\s+/i,
    /^[A-Z]\.\s*Soal\s+(Pilihan|Uraian)/i,
  ];
  return headerPatterns.some((pattern) => pattern.test(line));
};

/**
 * Format question object for database insertion
 */
const formatQuestion = (rawQuestion, isEssay = false) => {
  return {
    question_text: rawQuestion.question_text.trim(),
    question_type: isEssay ? "essay" : "multiple_choice",
    options: isEssay ? null : rawQuestion.options,
    correct_answer: isEssay ? "" : rawQuestion.correct_answer || "A",
    explanation: null,
    points: isEssay ? 20 : 10,
  };
};

/**
 * Parse both multiple choice and essay questions
 */
export const parseAllQuestions = (text) => {
  const allQuestions = parseQuizContent(text);

  return {
    multipleChoice: allQuestions.filter(
      (q) => q.question_type === "multiple_choice"
    ),
    essay: allQuestions.filter((q) => q.question_type === "essay"),
    total: allQuestions.length,
  };
};

export default {
  parseWordDocument,
  parseQuizContent,
  parseAllQuestions,
};
