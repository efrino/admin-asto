// Excel utility functions using SheetJS (xlsx)
// Note: This requires xlsx package to be installed

// Simple CSV parser as fallback
const parseCSV = (text) => {
  const lines = text.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i]
      .split(",")
      .map((v) => v.trim().replace(/^["']|["']$/g, ""));
    if (values.length >= headers.length) {
      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || "";
      });
      data.push(row);
    }
  }

  return data;
};

// Parse Excel file (xlsx, xls) or CSV
export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target.result;

        // Check if it's a CSV file
        if (file.name.toLowerCase().endsWith(".csv")) {
          const text = new TextDecoder().decode(data);
          const parsed = parseCSV(text);
          resolve(parsed);
          return;
        }

        // For Excel files, try to use xlsx library if available
        // If not, we'll use a simple binary parser
        try {
          // Dynamic import of xlsx library
          const XLSX = await import("xlsx");
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

          // Normalize column names
          const normalizedData = jsonData.map((row) => {
            const normalized = {};
            Object.keys(row).forEach((key) => {
              const normalizedKey = key.toLowerCase().replace(/\s+/g, "_");
              normalized[normalizedKey] = row[key];
            });
            return normalized;
          });

          resolve(normalizedData);
        } catch (xlsxError) {
          console.warn(
            "xlsx library not available, falling back to basic parser"
          );
          // If xlsx is not available, reject with a helpful message
          reject(new Error("Please install xlsx package: npm install xlsx"));
        }
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
};

// Generate Excel template
export const generateExcelTemplate = () => {
  return {
    headers: [
      "nrp",
      "full_name",
      "department",
      "position",
      "password",
      "role",
      "is_active",
    ],
    sampleData: [
      {
        nrp: "NRP001",
        full_name: "John Doe",
        department: "Engineering",
        position: "Staff",
        password: "password123",
        role: "user",
        is_active: "true",
      },
      {
        nrp: "NRP002",
        full_name: "Jane Smith",
        department: "HR",
        position: "Manager",
        password: "password456",
        role: "admin",
        is_active: "true",
      },
    ],
    instructions: `
PETUNJUK PENGGUNAAN:
1. Kolom yang WAJIB diisi: nrp, full_name, password
2. Kolom opsional: department, position, role, is_active
3. Nilai role: "user" atau "admin" (default: user)
4. Nilai is_active: "true" atau "false" (default: true)
5. NRP akan otomatis diubah ke UPPERCASE
6. Jangan mengubah nama kolom di baris pertama
        `.trim(),
  };
};

// Download Excel file
export const downloadExcel = async (
  templateData,
  filename = "template.xlsx"
) => {
  try {
    // Try to use xlsx library for proper Excel generation
    const XLSX = await import("xlsx");

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Create data sheet
    const wsData = [
      templateData.headers,
      ...templateData.sampleData.map((row) =>
        templateData.headers.map((h) => row[h] || "")
      ),
    ];
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    worksheet["!cols"] = [
      { wch: 12 }, // nrp
      { wch: 25 }, // full_name
      { wch: 20 }, // department
      { wch: 20 }, // position
      { wch: 15 }, // password
      { wch: 10 }, // role
      { wch: 10 }, // is_active
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

    // Create instructions sheet
    const instructionsSheet = XLSX.utils.aoa_to_sheet([
      ["PETUNJUK PENGGUNAAN TEMPLATE"],
      [""],
      ["Kolom yang WAJIB diisi:"],
      ["- nrp: Nomor Registrasi Pegawai (akan otomatis uppercase)"],
      ["- full_name: Nama lengkap user"],
      ["- password: Password untuk login"],
      [""],
      ["Kolom OPSIONAL:"],
      ["- department: Nama departemen"],
      ["- position: Jabatan"],
      ['- role: "user" atau "admin" (default: user)'],
      ['- is_active: "true" atau "false" (default: true)'],
      [""],
      ["PENTING:"],
      ['- Jangan mengubah nama kolom di baris pertama sheet "Users"'],
      ["- Hapus baris contoh sebelum mengisi data Anda"],
      ["- Simpan file dalam format .xlsx atau .csv"],
    ]);
    instructionsSheet["!cols"] = [{ wch: 60 }];
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Petunjuk");

    // Download
    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.warn("xlsx library not available, falling back to CSV download");
    // Fallback to CSV if xlsx is not available
    downloadCSV(templateData, filename.replace(".xlsx", ".csv"));
  }
};

// Fallback CSV download
const downloadCSV = (templateData, filename) => {
  const headers = templateData.headers.join(",");
  const rows = templateData.sampleData.map((row) =>
    templateData.headers.map((h) => `"${row[h] || ""}"`).join(",")
  );

  const csvContent = [headers, ...rows].join("\n");

  // Add BOM for Excel compatibility
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

// Export users to Excel
export const exportUsersToExcel = async (
  users,
  filename = "users_export.xlsx"
) => {
  try {
    const XLSX = await import("xlsx");

    const exportData = users.map((user) => ({
      NRP: user.nrp,
      "Full Name": user.full_name,
      Department: user.department || "",
      Position: user.position || "",
      Role: user.role,
      Status: user.is_active ? "Active" : "Inactive",
      "Created At": user.created_at
        ? new Date(user.created_at).toLocaleString("id-ID")
        : "",
      "Last Login": user.last_login_at
        ? new Date(user.last_login_at).toLocaleString("id-ID")
        : "Never",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.error("Export failed:", error);
    alert("Export gagal. Pastikan xlsx package sudah terinstall.");
  }
};
