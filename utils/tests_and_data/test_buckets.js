const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: 'auto',
  endpoint: 'https://4ead13d5f01e9d9a1d9a3dca081d1de9.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: '07746b9807695b823b003e5942f723ee',
    secretAccessKey: '0b39cc166cece1a3cd148ef0312b7950d32cfcc929ef0147cb8b33695e974d99'
  }
});

async function check(bucket) {
  try {
    const res = await s3.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 20 }));
    console.log(`Bucket ${bucket} success! Count:`, res.Contents?.length);
    console.log(res.Contents?.map(o => o.Key));
  } catch (e) {
    console.log(`Bucket ${bucket} failed:`, e.message);
  }
}

async function run() {
  await check('composer-icons');
  await check('deadlock-match-scanner');
}
run();
