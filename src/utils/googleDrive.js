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
    content: "1mad2zUcVTKmNjvTwk3bVgAtAAvCy-Pfb",
    thumbnail: "16CCWrRpnANm1TuCtRwUe8M0J5PxGM8Kz",
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
 * @param {string} category - 'module', 'animation', or 'meca_aid'
 * @param {string} type - 'content' or 'thumbnail'
 * @returns {Promise<Array>} List of files
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
      throw new Error(result.error || "Failed to fetch files");
    }

    return result.data;
  } catch (error) {
    console.error("Error listing Drive files:", error);
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
 * @returns {string} File type (pdf, mp4, image)
 */
export function determineFileType(mimeTypeOrName) {
  const lower = mimeTypeOrName.toLowerCase();

  if (lower.includes("pdf") || lower.endsWith(".pdf")) return "pdf";
  if (
    lower.includes("video") ||
    lower.endsWith(".mp4") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".mov")
  )
    return "mp4";
  if (
    lower.includes("image") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".png") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".webp")
  )
    return "image";

  return "pdf"; // default
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
 * @param {string} category - Category name
 * @param {string} type - 'content' or 'thumbnail'
 */
export function openDriveFolder(category, type = "content") {
  const folderId = getFolderId(category, type);
  window.open(`https://drive.google.com/drive/folders/${folderId}`, "_blank");
}
