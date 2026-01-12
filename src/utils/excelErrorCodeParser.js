// ==================== src/utils/excelErrorCodeParser.js ====================
import * as XLSX from "xlsx";

/**
 * Parse Error Codes from Excel file
 * Expected columns:
 * - Code (Identity/BMS code)
 * - Title (Heading/Error name)
 * - Error_Identification (What the error is)
 * - Cause (Why it happens)
 * - Solution/Action (How to fix)
 * - Symptom (What user sees)
 * - Notes (Additional notes)
 * - Machine_Type (e.g., Type G 460 B8x4HZ)
 * - Serial_Number
 * - Severity (low/medium/high/critical)
 * - Category (optional grouping)
 */

const COLUMN_MAPPINGS = {
  // Code variations
  code: "code",
  kode: "code",
  identity: "code",
  identitas: "code",
  bms: "code",
  error_code: "code",
  kode_error: "code",

  // Title variations
  title: "title",
  judul: "title",
  heading: "title",
  nama: "title",
  error_name: "title",
  nama_error: "title",

  // Error identification variations
  error_identification: "error_identification",
  identifikasi_error: "error_identification",
  identification: "error_identification",
  identifikasi: "error_identification",
  description: "error_identification",
  deskripsi: "error_identification",

  // Cause variations
  cause: "cause",
  penyebab: "cause",
  causes: "cause",
  reason: "cause",
  alasan: "cause",

  // Solution variations
  solution: "solution",
  solusi: "solution",
  action: "solution",
  aksi: "solution",
  fix: "solution",
  perbaikan: "solution",
  tindakan: "solution",

  // Symptom variations
  symptom: "symptom",
  gejala: "symptom",
  symptoms: "symptom",
  tanda: "symptom",

  // Notes variations
  notes: "notes",
  catatan: "notes",
  note: "notes",
  keterangan: "notes",

  // Machine type variations
  machine_type: "machine_type",
  tipe_mesin: "machine_type",
  type: "machine_type",
  tipe: "machine_type",
  model: "machine_type",

  // Serial number variations
  serial_number: "serial_number",
  nomor_seri: "serial_number",
  serial: "serial_number",
  sn: "serial_number",

  // Severity variations
  severity: "severity",
  tingkat: "severity",
  level: "severity",
  prioritas: "severity",
  priority: "severity",

  // Category variations
  category: "category",
  kategori: "category",
  group: "category",
  grup: "category",
};

const SEVERITY_MAPPINGS = {
  low: "low",
  rendah: "low",
  1: "low",
  minor: "low",

  medium: "medium",
  sedang: "medium",
  2: "medium",
  moderate: "medium",

  high: "high",
  tinggi: "high",
  3: "high",
  major: "high",

  critical: "critical",
  kritis: "critical",
  4: "critical",
  urgent: "critical",
};

/**
 * Normalize column name to standard field
 */
function normalizeColumnName(colName) {
  if (!colName) return null;
  const normalized = colName
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  return COLUMN_MAPPINGS[normalized] || null;
}

/**
 * Normalize severity value
 */
function normalizeSeverity(value) {
  if (!value) return "medium";
  const normalized = value.toString().toLowerCase().trim();
  return SEVERITY_MAPPINGS[normalized] || "medium";
}

/**
 * Parse Excel file for error codes
 * @param {ArrayBuffer} arrayBuffer - Excel file content
 * @returns {Object} Parsed result with error codes and validation
 */
export function parseExcelErrorCodes(arrayBuffer) {
  try {
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    // Get first sheet (or sheet named 'Error Codes' / 'Errors')
    let sheetName =
      workbook.SheetNames.find(
        (name) =>
          name.toLowerCase().includes("error") ||
          name.toLowerCase().includes("kode")
      ) || workbook.SheetNames[0];

    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      return {
        success: false,
        errors: ["Tidak dapat membaca sheet dari file Excel"],
        errorCodes: [],
      };
    }

    // Convert to JSON with header
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    if (rawData.length < 2) {
      return {
        success: false,
        errors: ["File Excel harus memiliki header dan minimal 1 baris data"],
        errorCodes: [],
      };
    }

    // Get headers (first row)
    const headers = rawData[0].map((h) => h?.toString().trim() || "");

    // Map headers to standard fields
    const columnMap = {};
    headers.forEach((header, index) => {
      const normalizedField = normalizeColumnName(header);
      if (normalizedField) {
        columnMap[normalizedField] = index;
      }
    });

    // Validate required columns
    const requiredFields = ["code", "title", "cause", "solution"];
    const missingFields = requiredFields.filter(
      (field) => !(field in columnMap)
    );

    if (missingFields.length > 0) {
      return {
        success: false,
        errors: [
          `Kolom wajib tidak ditemukan: ${missingFields.join(", ")}`,
          "Pastikan file memiliki kolom: Code, Title, Cause, Solution",
        ],
        errorCodes: [],
        detectedColumns: Object.keys(columnMap),
      };
    }

    // Parse data rows
    const errorCodes = [];
    const errors = [];

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNum = i + 1;

      // Skip empty rows
      if (!row || row.every((cell) => !cell || cell.toString().trim() === "")) {
        continue;
      }

      const getValue = (field) => {
        const idx = columnMap[field];
        if (idx === undefined) return "";
        const value = row[idx];
        return value ? value.toString().trim() : "";
      };

      const code = getValue("code");
      const title = getValue("title");
      const cause = getValue("cause");
      const solution = getValue("solution");

      // Validate required fields
      const rowErrors = [];
      if (!code) rowErrors.push("Code kosong");
      if (!title) rowErrors.push("Title kosong");
      if (!cause) rowErrors.push("Cause kosong");
      if (!solution) rowErrors.push("Solution kosong");

      if (rowErrors.length > 0) {
        errors.push(`Baris ${rowNum}: ${rowErrors.join(", ")}`);
        continue;
      }

      // Build error code object
      const errorCode = {
        _rowNum: rowNum,
        code: code,
        title: title,
        cause: cause,
        solution: solution,
        error_identification: getValue("error_identification"),
        symptom: getValue("symptom"),
        notes: getValue("notes"),
        machine_type: getValue("machine_type"),
        serial_number: getValue("serial_number"),
        severity: normalizeSeverity(getValue("severity")),
        category: getValue("category"),
      };

      errorCodes.push(errorCode);
    }

    // Check for duplicate codes
    const codeSet = new Set();
    const duplicates = [];
    errorCodes.forEach((ec) => {
      if (codeSet.has(ec.code)) {
        duplicates.push(ec.code);
      }
      codeSet.add(ec.code);
    });

    if (duplicates.length > 0) {
      errors.push(
        `Kode duplikat ditemukan: ${[...new Set(duplicates)].join(", ")}`
      );
    }

    return {
      success: errorCodes.length > 0,
      errorCodes,
      total: errorCodes.length,
      errors,
      warnings: errors.length > 0 ? errors : [],
      sheetName,
      detectedColumns: Object.keys(columnMap),
      bySeverity: {
        low: errorCodes.filter((e) => e.severity === "low").length,
        medium: errorCodes.filter((e) => e.severity === "medium").length,
        high: errorCodes.filter((e) => e.severity === "high").length,
        critical: errorCodes.filter((e) => e.severity === "critical").length,
      },
    };
  } catch (error) {
    console.error("Error parsing Excel:", error);
    return {
      success: false,
      errors: [`Gagal membaca file: ${error.message}`],
      errorCodes: [],
    };
  }
}

/**
 * Generate Excel template for Error Codes
 * @returns {Blob} Excel file as blob
 */
export function generateErrorCodeTemplate() {
  const wb = XLSX.utils.book_new();

  // Sample data with Indonesian headers
  const sampleData = [
    // Headers
    [
      "Code",
      "Title",
      "Error_Identification",
      "Cause",
      "Solution",
      "Symptom",
      "Notes",
      "Machine_Type",
      "Serial_Number",
      "Severity",
      "Category",
    ],
    // Sample rows
    [
      "BMS 1048624",
      "Axle load sensor, wheel 1",
      "Implausible signal - The fault code is generated when the signal from the sensor is higher than permitted.",
      "Vehicles without axle load sensor:\n* Fault in the connections.\n* Fault in the control module.\n\nVehicles with axle load sensor:\n* Fault in the cable harness or connections.\n* Fault in the sensor.\n* Fault in the control module.",
      "Vehicles without axle load sensor:\n* Check the connections.\n\nVehicles with axle load sensor:\n* Check the cable harness and connections.\n* Check the sensor.",
      "The axle load measurement does not work.",
      "Yellow warning indication of a fault in the EBS control system is displayed. Scania does not normally use axle load sensors.",
      "Type G 460 B8x4HZ",
      "9338146",
      "medium",
      "EBS",
    ],
    [
      "BMS 2015001",
      "Engine coolant temperature sensor",
      "Signal out of range - Temperature reading is outside expected parameters.",
      "* Faulty coolant temperature sensor.\n* Damaged wiring to sensor.\n* Short circuit in connector.\n* ECU malfunction.",
      "* Check sensor connector for corrosion.\n* Measure sensor resistance.\n* Inspect wiring harness.\n* Replace sensor if faulty.",
      "Temperature gauge reads incorrectly or shows warning.",
      "Engine may go into limp mode if temperature cannot be read.",
      "Type R 500 A6x2",
      "9445678",
      "high",
      "Engine",
    ],
    [
      "BMS 3022105",
      "Brake pad wear indicator",
      "Open circuit detected in brake wear sensor circuit.",
      "* Brake pads worn past service limit.\n* Broken sensor wire.\n* Damaged connector.",
      "* Inspect brake pads and replace if necessary.\n* Check sensor wiring continuity.\n* Replace sensor if damaged.",
      "Brake warning light illuminated on dashboard.",
      "Vehicle should not be operated until brake system is inspected.",
      "Type S 730 A6x4",
      "9512345",
      "critical",
      "Brakes",
    ],
  ];

  // Create main sheet
  const ws = XLSX.utils.aoa_to_sheet(sampleData);

  // Set column widths
  ws["!cols"] = [
    { wch: 15 }, // Code
    { wch: 30 }, // Title
    { wch: 50 }, // Error_Identification
    { wch: 60 }, // Cause
    { wch: 60 }, // Solution
    { wch: 40 }, // Symptom
    { wch: 50 }, // Notes
    { wch: 20 }, // Machine_Type
    { wch: 15 }, // Serial_Number
    { wch: 12 }, // Severity
    { wch: 15 }, // Category
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Error Codes");

  // Create instructions sheet
  const instructions = [
    ["=== PETUNJUK PENGISIAN TEMPLATE ERROR CODES ==="],
    [""],
    ["KOLOM WAJIB (REQUIRED):"],
    ["1. Code", "Kode unik error (contoh: BMS 1048624)"],
    ["2. Title", "Judul/nama error (contoh: Axle load sensor, wheel 1)"],
    ["3. Cause", "Penyebab error (gunakan * untuk bullet points)"],
    [
      "4. Solution",
      "Solusi/tindakan perbaikan (gunakan * untuk bullet points)",
    ],
    [""],
    ["KOLOM OPSIONAL:"],
    ["5. Error_Identification", "Deskripsi identifikasi error"],
    ["6. Symptom", "Gejala yang terlihat"],
    ["7. Notes", "Catatan tambahan"],
    ["8. Machine_Type", "Tipe mesin (contoh: Type G 460 B8x4HZ)"],
    ["9. Serial_Number", "Nomor seri mesin"],
    ["10. Severity", "Tingkat keparahan: low, medium, high, critical"],
    ["11. Category", "Kategori error (contoh: EBS, Engine, Brakes)"],
    [""],
    ["CATATAN:"],
    ["- Header bisa menggunakan bahasa Indonesia atau Inggris"],
    ["- Severity default: medium"],
    ["- Gunakan baris baru (Enter) untuk memisahkan paragraf dalam satu sel"],
    ["- Gunakan * di awal baris untuk membuat bullet points"],
    ["- Kode error harus unik (tidak boleh duplikat)"],
    [""],
    ["CONTOH SEVERITY:"],
    ["- low / rendah: Error minor, tidak mengganggu operasi"],
    ["- medium / sedang: Error perlu ditangani segera"],
    ["- high / tinggi: Error serius, perlu perbaikan cepat"],
    ["- critical / kritis: Error darurat, hentikan operasi"],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions["!cols"] = [{ wch: 25 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, "Petunjuk");

  // Generate file
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([wbout], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/**
 * Download Error Code template
 */
export function downloadErrorCodeTemplate() {
  const blob = generateErrorCodeTemplate();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Template_Error_Codes.xlsx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validate error codes array
 * @param {Array} errorCodes - Array of error code objects
 * @returns {Object} Validation result
 */
export function validateErrorCodes(errorCodes) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(errorCodes) || errorCodes.length === 0) {
    return {
      valid: false,
      errors: ["Tidak ada error codes untuk divalidasi"],
      warnings: [],
    };
  }

  // Check for duplicate codes
  const codeCount = {};
  errorCodes.forEach((ec, idx) => {
    if (!ec.code) {
      errors.push(`Error #${idx + 1}: Kode tidak boleh kosong`);
    } else {
      codeCount[ec.code] = (codeCount[ec.code] || 0) + 1;
    }

    if (!ec.title) {
      errors.push(`Error #${idx + 1}: Title tidak boleh kosong`);
    }

    if (!ec.cause) {
      errors.push(`Error #${idx + 1}: Cause tidak boleh kosong`);
    }

    if (!ec.solution) {
      errors.push(`Error #${idx + 1}: Solution tidak boleh kosong`);
    }

    // Warnings for optional but recommended fields
    if (!ec.severity || ec.severity === "medium") {
      warnings.push(
        `Error #${idx + 1} (${ec.code}): Severity tidak diset, default: medium`
      );
    }
  });

  // Report duplicates
  Object.entries(codeCount).forEach(([code, count]) => {
    if (count > 1) {
      errors.push(`Kode duplikat: "${code}" muncul ${count} kali`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export default {
  parseExcelErrorCodes,
  generateErrorCodeTemplate,
  downloadErrorCodeTemplate,
  validateErrorCodes,
};
