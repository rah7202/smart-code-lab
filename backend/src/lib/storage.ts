import { Storage } from "@google-cloud/storage"

const isTest = process.env.NODE_ENV === "test";

const storage = isTest
  ? null
  : new Storage({
      keyFilename: "./gcp-key.json",
    });

const bucket = isTest ? null : storage!.bucket("smart-code-lab");

export const uploadCodeToGCS = async (code: string, roomId: string) => {
  if (process.env.NODE_ENV === "test") {
    return `rooms/${roomId}/mock.txt`; // ✅ fake path
  }

  const file = bucket!.file(`rooms/${roomId}/${Date.now()}.txt`);

  await file.save(code, {
    contentType: "text/plain",
  });

  return file.name;
};

export const getCodeFromGCS = async (filePath: string) => {
  if (process.env.NODE_ENV === "test") {
    return "mock code"; // ✅ fake content
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