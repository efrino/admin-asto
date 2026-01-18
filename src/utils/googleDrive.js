// ==================== src/utils/googleDrive.js ====================
import { supabase } from "../config/supabase";

// Base URL for the Supabase Edge Function
const EDGE_FUNCTION_URL = `${
  import.meta.env.VITE_SUPABASE_URL ||
  "https://kwwcbkdftasoetbkhtsp.supabase.co"
}/functions/v1/google-drive`;

// Folder IDs (fallback jika edge function tidak tersedia)
export const FOLDER_IDS = {
  module: {
    content: "1mad2zUcVTKmNjvTwk3bVgAtAAvCy-Pfb",
    thumbnail: "16CCWrRpnANm1TuCtRwUe8M0J5PxGM8Kz",
  },
  animation: {
    content: "11Vk_75cowhb_txu96GiiR2TDz1rzgBNk",
    thumbnail: "1ZNLeUtdeT_ktA4ievQzjxLTapDI2fDx2",
  },
  meca_aid: {
    content: "1z9n-TmJWCqkmA3yui8KFqLZz7goG_a6Z",
    thumbnail: "16CCWrRpnANm1TuCtRwUe8M0J5PxGM8Kz",
  },
  meca_sheet: {
    content: "1pLYHPkjLrrxtF4ogVPosQQFwxV0yk2Gy",
    thumbnail: "1O24-qYVmoXNC56MLynmrrTD4O-3UPr2i",
  },
  quiz: {
    content: "1UTR3ymVRGJxwvsYYbqO-FlJovApiMgkg",
    thumbnail: "1Fa3lLI4GmqM3aLjMr4XO1RJ8ilU8F_1E",
  },
  error_code: {
    content: "1697CAmmza20sVJnwei29CdYemjsbfejB",
    thumbnail: "1Or98JF15h6Cw33zoPVoKQpUvPPqnYW6C",
  },
};

/**
 * Get Supabase session for authenticated requests
 */
async function getAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${
      session?.access_token ||
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3d2Nia2RmdGFzb2V0YmtodHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNzIzODcsImV4cCI6MjA4MTc0ODM4N30.FGdYHuE9uhgbPq01SLE_Ld6n11NdqnIfsf-50end-pU"
    }`,
    apikey:
      import.meta.env.VITE_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3d2Nia2RmdGFzb2V0YmtodHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxNzIzODcsImV4cCI6MjA4MTc0ODM4N30.FGdYHuE9uhgbPq01SLE_Ld6n11NdqnIfsf-50end-pU",
  };
}

/**
 * List files from Google Drive folder via Edge Function
 * @param {string} category - 'module', 'animation', 'meca_aid', or 'quiz'
 * @param {string} type - 'content' or 'thumbnail'
 * @returns {Promise<Object>} Result with success status and data
 */
export async function listDriveFiles(category = "module", type = "content") {
  try {
    const headers = await getAuthHeaders();
    const url = `${EDGE_FUNCTION_URL}?action=list&category=${category}&type=${type}`;

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to fetch files",
        data: [],
      };
    }

    return { success: true, data: result.data || [] };
  } catch (error) {
    console.error("Error listing Drive files:", error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * List files from a specific Google Drive folder by folder ID
 * @param {string} folderId - Google Drive folder ID
 * @param {object} options - Optional filters (fileTypes: array of 'pdf', 'excel', 'image', etc)
 * @returns {Promise<Object>} Result with success status and data
 */
export async function listFilesInFolder(folderId, options = {}) {
  try {
    if (!folderId) {
      return { success: false, error: "Folder ID is required", data: [] };
    }

    const headers = await getAuthHeaders();
    const url = `${EDGE_FUNCTION_URL}?action=listFolder&folderId=${folderId}`;

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to fetch files from folder",
        data: [],
      };
    }

    let files = result.data || [];

    // Apply file type filter if specified
    if (options.fileTypes && options.fileTypes.length > 0) {
      files = files.filter((file) => {
        const fileType = determineFileType(file.mimeType || file.name);
        return options.fileTypes.some((type) => {
          if (type === "excel") {
            return ["xls", "xlsx"].includes(fileType);
          }
          return fileType === type;
        });
      });
    }

    return { success: true, data: files };
  } catch (error) {
    console.error("Error listing files in folder:", error);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Get file download URL from Google Drive via Edge Function
 * @param {string} fileId - Google Drive file ID
 * @returns {Promise<Object>} Result with success status and download URL
 */
export async function getFileDownloadUrl(fileId) {
  try {
    const headers = await getAuthHeaders();
    const url = `${EDGE_FUNCTION_URL}?action=download&fileId=${fileId}`;

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    const result = await response.json();

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to get download URL",
      };
    }

    return {
      success: true,
      downloadUrl: result.downloadUrl,
      mimeType: result.mimeType,
      accessToken: result.accessToken,
      fileName: result.fileName,
    };
  } catch (error) {
    console.error("Error getting file download URL:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Download file from Google Drive
 * @param {string} fileId - Google Drive file ID
 * @returns {Promise<ArrayBuffer>} File content as ArrayBuffer
 */
export async function downloadFile(fileId) {
  try {
    const urlResult = await getFileDownloadUrl(fileId);
    if (!urlResult.success) {
      throw new Error(urlResult.error);
    }

    const response = await fetch(urlResult.downloadUrl, {
      headers: {
        Authorization: `Bearer ${urlResult.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status}`);
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error("Error downloading file:", error);
    throw error;
  }
}

/**
 * Get file metadata from Google Drive
 * @param {string} fileId - Google Drive file ID
 * @returns {Promise<Object>} File metadata
 */
export async function getFileMetadata(fileId) {
  try {
    const headers = await getAuthHeaders();
    const url = `${EDGE_FUNCTION_URL}?action=metadata&fileId=${fileId}`;

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to fetch file metadata");
    }

    return result.data;
  } catch (error) {
    console.error("Error getting file metadata:", error);
    throw error;
  }
}

/**
 * Get thumbnail URL for a Google Drive file
 * @param {string} fileId - Google Drive file ID
 * @param {number} size - Thumbnail size (default 200)
 * @returns {string} Thumbnail URL
 */
export function getThumbnailUrl(fileId, size = 200) {
  if (!fileId) return null;
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}

/**
 * Get view URL for a Google Drive file
 * @param {string} fileId - Google Drive file ID
 * @returns {string} View URL
 */
export function getViewUrl(fileId) {
  if (!fileId) return null;
  return `https://drive.google.com/file/d/${fileId}/view`;
}

/**
 * Get embed URL for a Google Drive file
 * @param {string} fileId - Google Drive file ID
 * @returns {string} Embed URL
 */
export function getEmbedUrl(fileId) {
  if (!fileId) return null;
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * Extract file ID from Google Drive URL
 * @param {string} url - Google Drive URL or file ID
 * @returns {string} File ID
 */
export function extractFileId(url) {
  if (!url) return "";

  // Already just an ID
  if (/^[a-zA-Z0-9_-]+$/.test(url) && url.length > 20) {
    return url;
  }

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
    /\/folders\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return url;
}

/**
 * Determine file type from MIME type or filename
 * @param {string} mimeTypeOrName - MIME type or filename
 * @returns {string} File type (pdf, mp4, image, xlsx, xls)
 */
export function determineFileType(mimeTypeOrName) {
  if (!mimeTypeOrName) return "unknown";

  const lower = mimeTypeOrName.toLowerCase();

  // PDF
  if (lower.includes("pdf") || lower.endsWith(".pdf")) return "pdf";

  // Excel files
  if (lower.includes("spreadsheetml") || lower.endsWith(".xlsx")) return "xlsx";
  if (lower.includes("ms-excel") || lower.endsWith(".xls")) return "xls";
  if (lower.includes("google-apps.spreadsheet")) return "xlsx"; // Google Sheets

  // Video
  if (
    lower.includes("video") ||
    lower.endsWith(".mp4") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".mov")
  )
    return "mp4";

  // Image
  if (
    lower.includes("image") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".webp")
  )
    return "image";

  // SWF (Flash)
  if (lower.includes("flash") || lower.endsWith(".swf")) return "swf";

  return "unknown";
}

/**
 * Check if file is PDF or Excel
 * @param {object} file - File object with mimeType or name
 * @returns {boolean}
 */
export function isPdfOrExcel(file) {
  const type = determineFileType(file.mimeType || file.name);
  return ["pdf", "xls", "xlsx"].includes(type);
}

/**
 * Filter files to only PDF and Excel
 * @param {array} files - Array of file objects
 * @returns {array} Filtered files
 */
export function filterPdfAndExcel(files) {
  if (!Array.isArray(files)) return [];
  return files.filter((file) => isPdfOrExcel(file));
}

/**
 * Check if file is a folder
 * @param {object} file - File object with mimeType
 * @returns {boolean}
 */
export function isFolder(file) {
  return file.mimeType === "application/vnd.google-apps.folder";
}

/**
 * Filter to get only folders
 * @param {array} files - Array of file objects
 * @returns {array} Filtered folders
 */
export function filterFolders(files) {
  if (!Array.isArray(files)) return [];
  return files.filter((file) => isFolder(file));
}

/**
 * Filter to get only files (non-folders)
 * @param {array} files - Array of file objects
 * @returns {array} Filtered files
 */
export function filterNonFolders(files) {
  if (!Array.isArray(files)) return [];
  return files.filter((file) => !isFolder(file));
}

/**
 * Format file size to human readable
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size
 */
export function formatFileSize(bytes) {
  if (!bytes) return "-";

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Get folder ID for category and type
 * @param {string} category - Category name
 * @param {string} type - 'content' or 'thumbnail'
 * @returns {string} Folder ID
 */
export function getFolderId(category, type = "content") {
  const categoryFolders = FOLDER_IDS[category] || FOLDER_IDS.module;
  return type === "thumbnail"
    ? categoryFolders.thumbnail
    : categoryFolders.content;
}

/**
 * Open Google Drive folder in new tab
 * @param {string} categoryOrFolderId - Category name or direct folder ID
 * @param {string} type - 'content' or 'thumbnail' (only used if first param is category)
 */
export function openDriveFolder(categoryOrFolderId, type = "content") {
  let folderId;

  // Check if it's a category name or direct folder ID
  if (FOLDER_IDS[categoryOrFolderId]) {
    folderId = getFolderId(categoryOrFolderId, type);
  } else {
    // Assume it's a direct folder ID
    folderId = categoryOrFolderId;
  }

  if (folderId) {
    window.open(`https://drive.google.com/drive/folders/${folderId}`, "_blank");
  }
}
