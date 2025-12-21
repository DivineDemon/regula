import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

if (
  !process.env.AWS_ACCESS_KEY_ID ||
  !process.env.AWS_SECRET_ACCESS_KEY ||
  !process.env.AWS_REGION ||
  !process.env.AWS_S3_BUCKET
) {
  throw new Error(
    "AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_S3_BUCKET must be set in environment variables",
  );
}

/**
 * AWS S3 client for file storage
 */
export const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET;

/**
 * S3 storage helper functions
 */
export const storage = {
  /**
   * Upload a file to S3
   */
  async upload(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType?: string,
    metadata?: Record<string, string>,
  ): Promise<boolean> {
    try {
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: metadata,
      });

      await s3Client.send(command);
      return true;
    } catch (error) {
      console.error(`S3 upload error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Download a file from S3
   */
  async download(key: string): Promise<Buffer | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      const response = await s3Client.send(command);
      if (!response.Body) {
        return null;
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      // AWS SDK v3 Body can be ReadableStream or async iterable
      const body = response.Body as
        | AsyncIterable<Uint8Array>
        | ReadableStream<Uint8Array>
        | undefined;
      if (body && Symbol.asyncIterator in body) {
        for await (const chunk of body as AsyncIterable<Uint8Array>) {
          chunks.push(chunk);
        }
      } else if (body instanceof ReadableStream) {
        const reader = body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }
      } else {
        return null;
      }
      return Buffer.concat(chunks);
    } catch (error) {
      console.error(`S3 download error for key ${key}:`, error);
      return null;
    }
  },

  /**
   * Delete a file from S3
   */
  async delete(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      await s3Client.send(command);
      return true;
    } catch (error) {
      console.error(`S3 delete error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Check if a file exists in S3
   */
  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      await s3Client.send(command);
      return true;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        (("name" in error && error.name === "NotFound") ||
          ("$metadata" in error &&
            typeof error.$metadata === "object" &&
            error.$metadata !== null &&
            "httpStatusCode" in error.$metadata &&
            error.$metadata.httpStatusCode === 404))
      ) {
        return false;
      }
      console.error(`S3 exists check error for key ${key}:`, error);
      return false;
    }
  },

  /**
   * Generate a presigned URL for temporary access to a file
   * @param key - S3 object key
   * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
   */
  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      console.error(`S3 presigned URL error for key ${key}:`, error);
      return null;
    }
  },

  /**
   * Generate a presigned URL for uploading a file
   * @param key - S3 object key
   * @param contentType - Content type of the file
   * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
   */
  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn = 3600,
  ): Promise<string | null> {
    try {
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType,
      });

      const url = await getSignedUrl(s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      console.error(`S3 presigned upload URL error for key ${key}:`, error);
      return null;
    }
  },
};

/**
 * Helper function to generate S3 keys for different content types
 */
export const s3Keys = {
  /**
   * Generate key for document storage (versions content)
   */
  document(
    organizationId: string,
    targetId: string,
    versionId: string,
  ): string {
    return `organizations/${organizationId}/targets/${targetId}/versions/${versionId}.txt`;
  },

  /**
   * Generate key for PDF storage
   */
  pdf(organizationId: string, targetId: string, versionId: string): string {
    return `organizations/${organizationId}/targets/${targetId}/versions/${versionId}.pdf`;
  },

  /**
   * Generate key for exports
   */
  export(
    organizationId: string,
    exportId: string,
    format: "csv" | "pdf",
  ): string {
    return `organizations/${organizationId}/exports/${exportId}.${format}`;
  },

  /**
   * Generate key for user uploads
   */
  upload(organizationId: string, userId: string, filename: string): string {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    return `organizations/${organizationId}/uploads/${userId}/${timestamp}-${sanitizedFilename}`;
  },
};
