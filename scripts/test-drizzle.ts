import 'dotenv/config';
import { db } from '../server/db';
import { users } from '../shared/schema';

async function test() {
  console.log("Testing user insert...");
  try {
    await db.insert(users).values({
      id: 'local-development-user',
      email: 'mock@example.com',
      credits: 50,
      subscriptionStatus: 'none',
    }).onConflictDoNothing();
    console.log("Insert success!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}
test();
