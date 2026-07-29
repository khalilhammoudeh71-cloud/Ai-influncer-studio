import 'dotenv/config';
import { db } from '../server/db';
import { users } from '../shared/schema';

async function test() {
  console.log("Testing user insert...");
  try {
    await db.insert(users).values({
      id: 'mock-user-id',
      email: 'khalilhammoudeh71@gmail.com',
      credits: 99999,
      subscriptionStatus: 'active',
    }).onConflictDoNothing();
    console.log("Insert success!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    process.exit(0);
  }
}
test();
