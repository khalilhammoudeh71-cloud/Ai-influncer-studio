import 'dotenv/config';
import pg from 'pg';

async function testConnection() {
  const directUrl = 'postgresql://postgres:Fodm_2910555@db.rccpmlxvhklmcdktwsbs.supabase.co:5432/postgres';
  console.log('Attempting direct connection to Supabase via IPv6 direct host...');
  console.log('URL:', directUrl.replace(/:[^:@]+@/, ':****@'));

  const client = new pg.Client({
    connectionString: directUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('🎉 Connection successful!');
    const res = await client.query('SELECT NOW() as current_time;');
    console.log('Database time:', res.rows[0].current_time);
  } catch (err: any) {
    console.error('Connection failed:');
    console.error('Message:', err.message);
    console.error('Code:', err.code);
    console.error('Full Error:', err);
  } finally {
    await client.end();
  }
}

testConnection();
