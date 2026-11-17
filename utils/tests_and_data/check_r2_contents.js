const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
  region: 'auto',
  endpoint: 'https://4ead13d5f01e9d9a1d9a3dca081d1de9.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: '07746b9807695b823b003e5942f723ee',
    secretAccessKey: '0b39cc166cece1a3cd148ef0312b7950d32cfcc929ef0147cb8b33695e974d99'
  }
});

async function listPrefixes() {
  const prefixes = new Set();
  let ContinuationToken = undefined;
  let allKeys = [];
  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: 'composer-icons',
      ContinuationToken
    }));
    (res.Contents || []).forEach(o => {
      allKeys.push(o.Key);
      const slash = o.Key.indexOf('/');
      if (slash > -1) {
        prefixes.add(o.Key.substring(0, slash));
      }
    });
    ContinuationToken = res.NextContinuationToken;
  } while (ContinuationToken);

  console.log('Total keys in bucket:', allKeys.length);
  console.log('Top level prefixes:', Array.from(prefixes));
  const iconKeys = allKeys.filter(k => k.toLowerCase().includes('icon'));
  console.log('Keys matching "icon":', iconKeys.slice(0, 20));
}

listPrefixes().catch(console.error);
