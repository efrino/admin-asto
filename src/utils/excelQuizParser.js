/**
 * Excel Parser for Quiz/Certification Questions
 *
 * Template columns:
 * - No: Question number
 * - Tipe: pilihan_ganda | uraian
 * - Pertanyaan: Question text
 * - Opsi_A, Opsi_B, Opsi_C, Opsi_D: Multiple choice options
 * - Jawaban: Correct answer (A/B/C/D for MC, or text for essay)
 * - Poin: Points for this question
 */

import * as XLSX from "xlsx";

/**
 * Parse Excel file and extract quiz questions
 * @param {ArrayBuffer} arrayBuffer - Excel file content
 * @returns {Object} Parsed result with questions and metadata
 */
export const parseExcelQuiz = (arrayBuffer) => {
  try {
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON with header row
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
    });

    if (rawData.length < 2) {
      return {
        success: false,
        error: "File Excel kosong atau tidak memiliki data",
        questions: [],
      };
    }

    // Find header row (look for "No" or "Pertanyaan" column)
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(5, rawData.length); i++) {
      const row = rawData[i];
      if (
        row &&
        row.some(
          (cell) =>
            String(cell).toLowerCase().includes("pertanyaan") ||
            String(cell).toLowerCase() === "no"
        )
      ) {
        headerRowIndex = i;
        break;
      }
    }

    const headers = rawData[headerRowIndex].map((h) =>
      normalizeHeader(String(h || ""))
    );
    const dataRows = rawData.slice(headerRowIndex + 1);

    // Parse questions
    const questions = [];
    const errors = [];

    dataRows.forEach((row, rowIndex) => {
      // Skip empty rows
      if (!row || row.every((cell) => !cell)) return;

      const rowData = {};
      headers.forEach((header, colIndex) => {
        rowData[header] = row[colIndex] || "";
      });

      // Extract question data
      const questionText =
        rowData.pertanyaan || rowData.soal || rowData.question || "";
      if (!questionText.trim()) return; // Skip rows without question

      const questionType = normalizeQuestionType(
        rowData.tipe || rowData.type || "pilihan_ganda"
      );

      const question = {
        rowNumber: headerRowIndex + rowIndex + 2, // Excel row number (1-based + header)
        question_text: questionText.trim(),
        question_type: questionType,
        options: null,
        correct_answer: "",
        points:
          parseInt(rowData.poin || rowData.points || rowData.nilai) ||
          (questionType === "essay" ? 20 : 10),
        explanation: rowData.penjelasan || rowData.explanation || null,
      };

      if (questionType === "multiple_choice") {
        // Extract options
        const options = {};
        ["a", "b", "c", "d", "e"].forEach((letter) => {
          const optionKey = `opsi_${letter}`;
          const optionValue =
            rowData[optionKey] ||
            rowData[`option_${letter}`] ||
            rowData[letter];
          if (optionValue && String(optionValue).trim()) {
            options[letter.toUpperCase()] = String(optionValue).trim();
          }
        });

        if (Object.keys(options).length < 2) {
          errors.push(
            `Baris ${question.rowNumber}: Pilihan ganda harus memiliki minimal 2 opsi`
          );
          return;
        }

        question.options = options;

        // Extract correct answer
        let answer = String(
          rowData.jawaban || rowData.answer || rowData.kunci || ""
        )
          .trim()
          .toUpperCase();

        // Handle answer formats: "A", "a", "A.", "A)", etc.
        answer = answer.replace(/[.\)\s]/g, "");

        if (answer && options[answer]) {
          question.correct_answer = answer;
        } else if (answer) {
          // Maybe the answer is the full text, find matching option
          const matchingOption = Object.entries(options).find(
            ([_, value]) =>
              String(value).toLowerCase().trim() ===
              String(rowData.jawaban || "")
                .toLowerCase()
                .trim()
          );
          if (matchingOption) {
            question.correct_answer = matchingOption[0];
          } else {
            errors.push(
              `Baris ${question.rowNumber}: Jawaban "${answer}" tidak valid`
            );
            question.correct_answer = Object.keys(options)[0]; // Default to first option
          }
        } else {
          question.correct_answer = Object.keys(options)[0]; // Default to first option
        }
      } else {
        // Essay question
        question.correct_answer = String(
          rowData.jawaban || rowData.answer || rowData.kunci || ""
        ).trim();
        question.options = null;
      }

      questions.push(question);
    });

    // Separate by type
    const multipleChoice = questions.filter(
      (q) => q.question_type === "multiple_choice"
    );
    const essay = questions.filter((q) => q.question_type === "essay");

    return {
      success: true,
      questions,
      multipleChoice,
      essay,
      total: questions.length,
      errors,
      sheetName,
    };
  } catch (error) {
    console.error("Error parsing Excel:", error);
    return {
      success: false,
      error: `Gagal membaca file Excel: ${error.message}`,
      questions: [],
    };
  }
};

/**
 * Normalize header names to consistent format
 */
const normalizeHeader = (header) => {
  const normalized = header
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  // Map common variations
  const mappings = {
    nomor: "no",
    number: "no",
    tipe_soal: "tipe",
    jenis_soal: "tipe",
    jenis: "tipe",
    question_type: "tipe",
    soal: "pertanyaan",
    question: "pertanyaan",
    option_a: "opsi_a",
    option_b: "opsi_b",
    option_c: "opsi_c",
    option_d: "opsi_d",
    option_e: "opsi_e",
    pilihan_a: "opsi_a",
    pilihan_b: "opsi_b",
    pilihan_c: "opsi_c",
    pilihan_d: "opsi_d",
    pilihan_e: "opsi_e",
    answer: "jawaban",
    kunci: "jawaban",
    kunci_jawaban: "jawaban",
    correct_answer: "jawaban",
    point: "poin",
    points: "poin",
    score: "poin",
    nilai: "poin",
    explanation: "penjelasan",
    keterangan: "penjelasan",
  };

  return mappings[normalized] || normalized;
};

/**
 * Normalize question type
 */
const normalizeQuestionType = (type) => {
  const lower = String(type).toLowerCase().trim();

  if (
    lower.includes("uraian") ||
    lower.includes("essay") ||
    lower.includes("esai")
  ) {
    return "essay";
  }
  if (
    lower.includes("pilihan") ||
    lower.includes("ganda") ||
    lower.includes("multiple") ||
    lower.includes("pg") ||
    lower === "mc"
  ) {
    return "multiple_choice";
  }

  // Default to multiple choice
  return "multiple_choice";
};

/**
 * Generate Excel template for quiz import
 * @returns {Blob} Excel file blob
 */
export const generateQuizTemplate = () => {
  // Create workbook
  const wb = XLSX.utils.book_new();

  // Sample data for template
  const templateData = [
    [
      "No",
      "Tipe",
      "Pertanyaan",
      "Opsi_A",
      "Opsi_B",
      "Opsi_C",
      "Opsi_D",
      "Jawaban",
      "Poin",
      "Penjelasan",
    ],
    [
      1,
      "pilihan_ganda",
      "Apa fungsi utama dari air compressor?",
      "Menghasilkan udara bertekanan",
      "Mendinginkan mesin",
      "Memompa oli",
      "Mengatur suhu kabin",
      "A",
      10,
      "Air compressor berfungsi untuk menghasilkan udara bertekanan yang digunakan pada sistem pneumatik",
    ],
    [
      2,
      "pilihan_ganda",
      "Berapa tekanan normal pada sistem air brake?",
      "6-8 bar",
      "10-12 bar",
      "2-4 bar",
      "15-20 bar",
      "A",
      10,
      "",
    ],
    [
      3,
      "pilihan_ganda",
      "Komponen yang berfungsi mengeringkan udara adalah...",
      "Air dryer",
      "Compressor",
      "Governor",
      "Unloader valve",
      "A",
      10,
      "",
    ],
    [
      4,
      "uraian",
      "Jelaskan prosedur pemeriksaan harian pada sistem air compressor!",
      "",
      "",
      "",
      "",
      "Prosedur pemeriksaan meliputi: cek tekanan, cek kebocoran, drain air tank, cek belt tension",
      20,
      "Jawaban harus mencakup minimal 3 poin pemeriksaan",
    ],
    [
      5,
      "uraian",
      "Apa yang terjadi jika air dryer tidak berfungsi dengan baik?",
      "",
      "",
      "",
      "",
      "",
      20,
      "",
    ],
  ];

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(templateData);

  // Set column widths
  ws["!cols"] = [
    { wch: 5 }, // No
    { wch: 15 }, // Tipe
    { wch: 50 }, // Pertanyaan
    { wch: 30 }, // Opsi_A
    { wch: 30 }, // Opsi_B
    { wch: 30 }, // Opsi_C
    { wch: 30 }, // Opsi_D
    { wch: 15 }, // Jawaban
    { wch: 8 }, // Poin
    { wch: 40 }, // Penjelasan
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, "Soal Quiz");

  // Add instruction sheet
  const instructionData = [
    ["PETUNJUK PENGISIAN TEMPLATE SOAL QUIZ"],
    [""],
    ["Kolom", "Keterangan", "Wajib"],
    ["No", "Nomor urut soal", "Tidak"],
    ["Tipe", "Tipe soal: pilihan_ganda atau uraian", "Ya"],
    ["Pertanyaan", "Teks pertanyaan/soal", "Ya"],
    ["Opsi_A", "Pilihan jawaban A (untuk pilihan ganda)", "Ya*"],
    ["Opsi_B", "Pilihan jawaban B (untuk pilihan ganda)", "Ya*"],
    ["Opsi_C", "Pilihan jawaban C (untuk pilihan ganda)", "Tidak"],
    ["Opsi_D", "Pilihan jawaban D (untuk pilihan ganda)", "Tidak"],
    ["Jawaban", "Jawaban benar (A/B/C/D untuk PG, teks untuk uraian)", "Ya"],
    ["Poin", "Nilai/poin untuk soal ini (default: PG=10, Uraian=20)", "Tidak"],
    ["Penjelasan", "Penjelasan jawaban (opsional)", "Tidak"],
    [""],
    ["*Minimal 2 opsi untuk pilihan ganda"],
    [""],
    ["TIPE SOAL:"],
    ["- pilihan_ganda : Soal dengan pilihan A, B, C, D"],
    ["- uraian : Soal essay yang dijawab dengan teks bebas"],
    [""],
    ["CATATAN:"],
    ["- Untuk soal uraian, kolom Opsi_A sampai Opsi_D dikosongkan"],
    [
      "- Jawaban untuk uraian bersifat opsional (sebagai kunci jawaban untuk admin)",
    ],
    ["- Pastikan tidak ada baris kosong di antara soal"],
  ];

  const wsInstruction = XLSX.utils.aoa_to_sheet(instructionData);
  wsInstruction["!cols"] = [{ wch: 15 }, { wch: 50 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, wsInstruction, "Petunjuk");

  // Generate blob
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
};

/**
 * Download template Excel file
 */
export const downloadQuizTemplate = () => {
  const blob = generateQuizTemplate();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "Template_Soal_Quiz.xlsx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Validate parsed questions
 * @param {Array} questions - Array of parsed questions
 * @returns {Object} Validation result
 */
export const validateQuestions = (questions) => {
  const errors = [];
  const warnings = [];

  questions.forEach((q, index) => {
    const rowNum = q.rowNumber || index + 1;

    // Check question text
    if (!q.question_text || q.question_text.length < 5) {
      errors.push(`Soal #${rowNum}: Pertanyaan terlalu pendek atau kosong`);
    }

    // Check multiple choice specifics
    if (q.question_type === "multiple_choice") {
      const optionCount = q.options ? Object.keys(q.options).length : 0;
      if (optionCount < 2) {
        errors.push(
          `Soal #${rowNum}: Pilihan ganda harus memiliki minimal 2 opsi`
        );
      }
      if (!q.correct_answer) {
        errors.push(`Soal #${rowNum}: Jawaban benar tidak ditentukan`);
      } else if (q.options && !q.options[q.correct_answer]) {
        errors.push(
          `Soal #${rowNum}: Jawaban "${q.correct_answer}" tidak ada dalam opsi`
        );
      }
    }

    // Check essay specifics
    if (q.question_type === "essay" && !q.correct_answer) {
      warnings.push(
        `Soal #${rowNum}: Soal uraian tidak memiliki kunci jawaban (opsional)`
      );
    }

    // Check points
    if (q.points <= 0) {
      warnings.push(`Soal #${rowNum}: Poin tidak valid, menggunakan default`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    totalQuestions: questions.length,
    multipleChoiceCount: questions.filter(
      (q) => q.question_type === "multiple_choice"
    ).length,
    essayCount: questions.filter((q) => q.question_type === "essay").length,
  };
};

export default {
  parseExcelQuiz,
  generateQuizTemplate,
  downloadQuizTemplate,
  validateQuestions,
};
