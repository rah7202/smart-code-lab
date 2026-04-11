import { Storage } from "@google-cloud/storage"

const storage = new Storage({
  keyFilename: "./gcp-key.json",
});

const bucket = storage.bucket("smart-code-lab"); // your bucket name

export const uploadCodeToGCS = async (code: string, roomId: string) => {
  const file = bucket.file(`rooms/${roomId}/${Date.now()}.txt`);

  await file.save(code, {
    contentType: "text/plain",
  });

  // Use signed URLs with expiration
  const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
  });
  return file.name;
};

export const getCodeFromGCS = async (filePath: string) => {
  const file = bucket.file(filePath);

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