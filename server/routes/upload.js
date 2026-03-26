import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { extname } from 'path';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const router = Router();

// S3/MinIO client configuration
const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  },
  forcePathStyle: true, // Required for MinIO
});

const BUCKET = process.env.MINIO_BUCKET || 'ozi-uploads';

// Ensure bucket exists on startup
async function ensureBucket() {
  try {
    const { ListBucketsCommand, CreateBucketCommand, PutBucketPolicyCommand } = await import('@aws-sdk/client-s3');
    const { Buckets } = await s3.send(new ListBucketsCommand({}));
    const exists = Buckets?.some(b => b.Name === BUCKET);

    if (!exists) {
      await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
      console.log(`✅ MinIO bucket "${BUCKET}" created`);
    }

    // Set public read policy so images are accessible without auth
    const policy = {
      Version: '2012-10-17',
      Statement: [{
        Sid: 'PublicRead',
        Effect: 'Allow',
        Principal: '*',
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${BUCKET}/*`]
      }]
    };
    await s3.send(new PutBucketPolicyCommand({
      Bucket: BUCKET,
      Policy: JSON.stringify(policy)
    }));
  } catch (error) {
    console.error('MinIO bucket setup error:', error.message);
  }
}

ensureBucket();

// Generate the public URL for a MinIO object
function getPublicUrl(key) {
  const endpoint = process.env.MINIO_PUBLIC_URL || process.env.MINIO_ENDPOINT || 'http://localhost:9000';
  return `${endpoint}/${BUCKET}/${key}`;
}

// Multer memory storage (store in RAM, then upload to MinIO)
const storage = multer.memoryStorage();

// File filter: only images
const fileFilter = (_req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido. Use: JPG, PNG, WebP, GIF ou SVG'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// POST /api/upload — upload a single image to MinIO
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const uniqueId = crypto.randomUUID().slice(0, 8);
    const ext = extname(req.file.originalname).toLowerCase();
    const key = `cursos/${Date.now()}-${uniqueId}${ext}`;

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));

    const url = getPublicUrl(key);
    res.json({ url, key });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Erro ao fazer upload' });
  }
});

// DELETE /api/upload — delete an image from MinIO
router.delete('/', async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ error: 'Key é obrigatório' });

    await s3.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }));

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Erro ao excluir arquivo' });
  }
});

export default router;
