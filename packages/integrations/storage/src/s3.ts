import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createHash } from 'node:crypto'
import type { FileStorage, PresignedUpload, StoredObject } from './index'

/**
 * S3-compatible driver.
 *
 * Works against AWS S3, Cloudflare R2, MinIO and DigitalOcean Spaces —
 * anything speaking the S3 API. `forcePathStyle` is what makes MinIO and R2
 * work, since they do not support virtual-hosted-style bucket URLs.
 *
 * Objects are never public: downloads go through a short-lived presigned
 * URL issued only after the permission check has passed.
 */

export type S3Config = {
  endpoint: string | undefined
  region: string
  accessKey: string
  secretKey: string
  bucket: string
  forcePathStyle: boolean
}

export class S3FileStorage implements FileStorage {
  readonly driver = 's3'

  private readonly client: S3Client
  private readonly bucket: string

  constructor(config: S3Config) {
    this.bucket = config.bucket
    this.client = new S3Client({
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      ...(config.endpoint ? { endpoint: config.endpoint } : {}),
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
    })
  }

  async put(key: string, body: Buffer, contentType: string): Promise<StoredObject> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Forces a download rather than letting the browser render an
        // uploaded HTML or SVG file in our origin's context.
        ContentDisposition: 'attachment',
      }),
    )

    return {
      key,
      sizeBytes: body.byteLength,
      checksum: createHash('sha256').update(body).digest('hex'),
    }
  }

  async get(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    )

    const body = response.Body
    if (!body) throw new Error(`Object ${key} has no body`)

    return Buffer.from(await body.transformToByteArray())
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }

  async presignUpload(key: string, contentType: string): Promise<PresignedUpload> {
    const expiresInSeconds = 300

    const url = await getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn: expiresInSeconds },
    )

    // The signature covers Content-Type, so the browser must send exactly
    // this header or S3 rejects the PUT.
    return { url, headers: { 'Content-Type': contentType }, key, expiresInSeconds }
  }

  async presignDownload(key: string, expiresInSeconds = 300): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: expiresInSeconds,
    })
  }
}
