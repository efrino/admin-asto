// Supabase Edge Function untuk Google Drive API
// Deploy dengan: supabase functions deploy google-drive

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Service Account Credentials (set via environment variables for security)
const SERVICE_ACCOUNT = {
  client_email: Deno.env.get("GOOGLE_CLIENT_EMAIL") || "meca-drive-access@meca-learning-app.iam.gserviceaccount.com",
  private_key: Deno.env.get("GOOGLE_PRIVATE_KEY")?.replace(/\\n/g, '\n') || "",
};

// Folder IDs mapping
const FOLDER_IDS = {
  module: {
    content: "1mad2zUcVTKmNjvTwk3bVgAtAAvCy-Pfb",
    thumbnail: "16CCWrRpnANm1TuCtRwUe8M0J5PxGM8Kz"
  },
  animation: {
    content: "11Vk_75cowhb_txu96GiiR2TDz1rzgBNk",
    thumbnail: "1ZNLeUtdeT_ktA4ievQzjxLTapDI2fDx2"
  },
  meca_aid: {
    content: "1mad2zUcVTKmNjvTwk3bVgAtAAvCy-Pfb", // Same as module, adjust if different
    thumbnail: "16CCWrRpnANm1TuCtRwUe8M0J5PxGM8Kz"
  }
};

// Generate JWT for Google API authentication
async function getAccessToken(): Promise<string> {
  const privateKey = SERVICE_ACCOUNT.private_key;
  
  if (!privateKey) {
    throw new Error("Private key not configured");
  }

  // Import private key
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKey.replace(pemHeader, "").replace(pemFooter, "").replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const now = Math.floor(Date.now() / 1000);
  const jwt = await create(
    { alg: "RS256", typ: "JWT" },
    {
      iss: SERVICE_ACCOUNT.client_email,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    },
    cryptoKey
  );

  // Exchange JWT for access token
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  
  if (!tokenData.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }
  
  return tokenData.access_token;
}

// List files from a Google Drive folder
async function listFiles(folderId: string, accessToken: string) {
  const query = `'${folderId}' in parents and trashed = false`;
  const fields = "files(id,name,mimeType,thumbnailLink,webViewLink,webContentLink,size,createdTime,modifiedTime)";
  
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&orderBy=name&pageSize=100`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`Google Drive API error: ${data.error.message}`);
  }

  return data.files || [];
}

// Get file metadata
async function getFileMetadata(fileId: string, accessToken: string) {
  const fields = "id,name,mimeType,thumbnailLink,webViewLink,webContentLink,size,createdTime,modifiedTime,videoMediaMetadata";
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?fields=${encodeURIComponent(fields)}`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return await response.json();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const category = url.searchParams.get("category") || "module";
    const type = url.searchParams.get("type") || "content"; // content or thumbnail
    const fileId = url.searchParams.get("fileId");

    // Get access token
    const accessToken = await getAccessToken();

    let result;

    switch (action) {
      case "list": {
        // List files from folder
        const folderConfig = FOLDER_IDS[category as keyof typeof FOLDER_IDS];
        if (!folderConfig) {
          throw new Error(`Invalid category: ${category}`);
        }
        
        const folderId = type === "thumbnail" ? folderConfig.thumbnail : folderConfig.content;
        const files = await listFiles(folderId, accessToken);
        
        // Format response with additional info
        result = files.map((file: any) => ({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          thumbnailUrl: file.thumbnailLink || `https://drive.google.com/thumbnail?id=${file.id}&sz=w200`,
          viewUrl: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
          downloadUrl: file.webContentLink,
          size: file.size,
          createdTime: file.createdTime,
          modifiedTime: file.modifiedTime,
          fileType: getFileType(file.mimeType),
        }));
        break;
      }

      case "metadata": {
        // Get single file metadata
        if (!fileId) {
          throw new Error("fileId is required for metadata action");
        }
        result = await getFileMetadata(fileId, accessToken);
        break;
      }

      case "folders": {
        // Return folder configuration
        result = FOLDER_IDS;
        break;
      }

      default:
        throw new Error(`Invalid action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Unknown error occurred" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper to determine file type from MIME type
function getFileType(mimeType: string): string {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("video/")) return "mp4";
  if (mimeType.startsWith("image/")) return "image";
  return "other";
}
