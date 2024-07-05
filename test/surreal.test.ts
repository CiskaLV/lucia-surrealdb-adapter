import { testAdapter, databaseUser } from "@lucia-auth/adapter-test";
import { RecordId, Surreal } from "surrealdb.js";

import { SurrealDBAdapter } from "../src/index.js";

let client: Surreal | undefined;
const URL = Bun.env.URL || "";
const NAMESPACE = Bun.env.NAMESPACE || "";
const DATABASE = Bun.env.DATABASE || "";
const USER = Bun.env.USER || "";
const PASSWORD = Bun.env.PASSWORD || "";

export async function initDb(): Promise<Surreal | undefined> {
    if (client) return client;
    const db = new Surreal();
    try {
        await db.connect(URL, { namespace: NAMESPACE, database: DATABASE });
        await db.signin({ username: USER, password: PASSWORD });
        return db;
    } catch (err) {
        console.error("Failed to connect to SurrealDB:", err);
        throw err;
    }
}

const db = await initDb();
if (!db) {
    console.error("Failed to connect to SurrealDB");
    process.exit(1);
}

const adapter = new SurrealDBAdapter(db, { session: "session", user: "user" });
const userid = new RecordId("user", databaseUser.id);

db.delete("user");
db.delete("session");

db.create(userid, { id: userid, ...databaseUser.attributes });

await testAdapter(adapter);
