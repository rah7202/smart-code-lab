import { Storage } from "@google-cloud/storage";

const isTest = process.env.NODE_ENV === "test";

// ✅ Create storage instance safely
const storage = isTest
  ? null
  : new Storage(
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
        ? {
            credentials: JSON.parse(
              process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
            ),
          }
        : {
            keyFilename: "./gcp-key.json", // fallback for local dev
          }
    );

const bucket = isTest ? null : storage!.bucket("smart-code-lab");

// ===================== UPLOAD =====================
export const uploadCodeToGCS = async (code: string, roomId: string) => {
  if (isTest) {
    return `rooms/${roomId}/mock.txt`; // ✅ test safe
  }

  const file = bucket!.file(`rooms/${roomId}/${Date.now()}.txt`);

  await file.save(code, {
    contentType: "text/plain",
  });

  return file.name; // ✅ storing path, not URL
};

// ===================== GET =====================
export const getCodeFromGCS = async (filePath: string) => {
  if (isTest) {
    return "mock code"; // ✅ test safe
  }

  const file = bucket!.file(filePath);

  const [signedUrl] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 15 * 60 * 1000,
  });

  const res = await fetch(signedUrl);

  if (!res.ok) {
    throw new Error("Failed to fetch code from GCS");
  }

  return await res.text();
};