import 'dotenv/config';
import pg from 'pg';
import dns from 'dns';

const regions = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ca-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-west-3',
  'eu-central-1',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-south-1',
  'sa-east-1'
];

function resolveDns(host: string): Promise<boolean> {
  return new Promise((resolve) => {
    dns.resolve(host, (err) => {
      resolve(!err);
    });
  });
}

async function testHost(host: string, user: string, pass: string): Promise<boolean> {
  const connectionString = `postgresql://${user}:${pass}@${host}:5432/postgres`;
  const client = new pg.Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 4000
  });

  try {
    await client.connect();
    await client.query('SELECT 1');
    return true;
  } catch (err: any) {
    console.log(`  Host ${host} failed: ${err.message}`);
    return false;
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

async function scan() {
  const originalUrl = process.env.DATABASE_URL;
  if (!originalUrl) {
    console.error('DATABASE_URL is not set in environment!');
    return;
  }

  // Parse connection string: postgresql://[user]:[pass]@[host]:[port]/[db]
  const match = originalUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):/);
  if (!match) {
    console.error('Failed to parse DATABASE_URL!');
    return;
  }

  const [, user, pass] = match;

  console.log(`Scanning regions using standard pg client for user: ${user}...`);

  for (const region of regions) {
    for (const prefix of ['aws-0', 'aws-1']) {
      const host = `${prefix}-${region}.pooler.supabase.com`;
      
      const dnsOk = await resolveDns(host);
      if (!dnsOk) {
        continue;
      }

      console.log(`Testing host: ${host}...`);
      const success = await testHost(host, user, pass);
      if (success) {
        console.log(`\n🎉 SUCCESS! Connected to ${host}`);
        console.log(`Please update DATABASE_URL in .env to use:`);
        console.log(`postgresql://${user}:${pass}@${host}:5432/postgres?sslmode=require`);
        return;
      }
    }
  }

  console.log('\nScan finished. No working host found.');
}

scan();
