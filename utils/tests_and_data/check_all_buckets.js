const { S3Client, ListBucketsCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: 'auto',
  endpoint: 'https://4ead13d5f01e9d9a1d9a3dca081d1de9.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: '07746b9807695b823b003e5942f723ee',
    secretAccessKey: '0b39cc166cece1a3cd148ef0312b7950d32cfcc929ef0147cb8b33695e974d99'
  }
});

async function main() {
  const bRes = await s3.send(new ListBucketsCommand({}));
  console.log('Buckets:', bRes.Buckets.map(b => b.Name));

  for (const b of bRes.Buckets) {
    const objs = await s3.send(new ListObjectsV2Command({ Bucket: b.Name, MaxKeys: 50 }));
    console.log(`Bucket ${b.Name} sample keys:`, (objs.Contents || []).map(o => o.Key).slice(0, 10));
  }
}

main().catch(console.error);
