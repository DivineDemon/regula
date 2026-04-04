import { createHash } from "node:crypto";
import { Readable, Transform } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type S3Location = {
  bucket: string;
  key: string;
  region: string;
};

export type S3UploadResult = {
  location: S3Location;
  etag?: string;
  bytes: number;
  sha256Hex: string;
};

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v?.trim()) throw new Error(`Missing required env var: ${name}`);
  return v.trim();
}

export function getS3Config(): { region: string; bucket: string } {
  return {
    region: requiredEnv("AWS_REGION"),
    bucket: requiredEnv("AWS_S3_BUCKET"),
  };
}

export function makeS3Client(): S3Client {
  const { region } = getS3Config();
  // Credentials default chain includes env vars (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN).
  return new S3Client({ region });
}

class HashingCounterTransform extends Transform {
  private readonly hash = createHash("sha256");
  public bytes = 0;
  _transform(
    chunk: unknown,
    _encoding: BufferEncoding,
    callback: (error?: Error | null, data?: Buffer) => void,
  ): void {
    const buf = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk as Uint8Array);
    this.bytes += buf.byteLength;
    this.hash.update(buf);
    callback(null, buf);
  }
  digestHex(): string {
    return this.hash.digest("hex");
  }
}

export async function uploadUrlToS3(params: {
  url: string;
  key: string;
  contentType?: string;
  timeoutMs?: number;
  maxBytesHardCap?: number;
}): Promise<S3UploadResult> {
  const { region, bucket } = getS3Config();
  const client = makeS3Client();

  const timeoutMs = params.timeoutMs ?? 120_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(params.url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Regula-Isolated/1.0",
      },
    });

    if (!res.ok)
      throw new Error(
        `Origin download failed: HTTP ${res.status} ${res.statusText}`,
      );
    if (!res.body) throw new Error("Origin response had no body stream");

    // Bun's `fetch()` returns a WHATWG `ReadableStream`. Convert to a Node stream
    // for streaming multipart upload.
    const webStream = res.body as unknown as NodeReadableStream<Uint8Array>;
    const nodeStream = Readable.fromWeb(webStream);
    const xform = new HashingCounterTransform();

    // Optional absolute safety cap (protect free-tier / runaway downloads).
    const hardCap = params.maxBytesHardCap;
    if (
      typeof hardCap === "number" &&
      Number.isFinite(hardCap) &&
      hardCap > 0
    ) {
      xform.on("data", () => {
        if (xform.bytes > hardCap) {
          nodeStream.destroy(
            new Error(`Hard cap exceeded: ${xform.bytes} > ${hardCap}`),
          );
        }
      });
    }

    const upload = new Upload({
      client,
      params: {
        Bucket: bucket,
        Key: params.key,
        Body: nodeStream.pipe(xform),
        ContentType: params.contentType,
      },
    });

    const out = await upload.done();

    return {
      location: { bucket, key: params.key, region },
      etag: typeof out.ETag === "string" ? out.ETag : undefined,
      bytes: xform.bytes,
      sha256Hex: xform.digestHex(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function presignGetObjectUrl(
  loc: S3Location,
  expiresInSeconds = 10 * 60,
): Promise<string> {
  const client = makeS3Client();
  return await getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: loc.bucket,
      Key: loc.key,
    }),
    { expiresIn: expiresInSeconds },
  );
}

export async function deleteS3Object(loc: S3Location): Promise<void> {
  const client = makeS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: loc.bucket,
      Key: loc.key,
    }),
  );
}
