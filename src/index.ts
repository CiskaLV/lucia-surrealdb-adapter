import type { Adapter, DatabaseSession, DatabaseUser, RegisteredDatabaseSessionAttributes, RegisteredDatabaseUserAttributes, UserId } from "lucia";
import { RecordId, type Surreal } from "surrealdb.js";

export class SurrealDBAdapter implements Adapter {
    private db: Surreal;

    private sessionTable: string;
    private userTable: string;

    constructor(db: Surreal, tableNames: TableNames) {
        this.db = db;
        this.sessionTable = tableNames.session;
        this.userTable = tableNames.user;
    }

    public async deleteExpiredSessions(): Promise<void> {
        await this.db.query(`DELETE FROM ${this.sessionTable} WHERE expires_at <= $time`, { time: Math.floor(Date.now() / 1000) });
    }

    public async deleteSession(sessionId: string): Promise<void> {
        await this.db.delete(this.getSessionID(sessionId));
    }

    public async deleteUserSessions(userId: UserId): Promise<void> {
        await this.db.query(`DELETE FROM ${this.sessionTable} WHERE user_id = $userId`, { userId: this.getUserID(userId) });
    }

    public async getSessionAndUser(sessionId: string): Promise<[session: DatabaseSession | null, user: DatabaseUser | null]> {
        const result = await this.db.query<SessionSchema<UserSchema>[][]>(`SELECT * FROM ${this.sessionTable} WHERE id = $sessionId FETCH user_id`, {
            sessionId: this.getSessionID(sessionId),
        });

        const session = result[0][0];
        if (!session) {
            return [null, null];
        }

        const userData = session.user_id;
        const sessionData = {
            ...session,
            user_id: userData.id,
        };

        return [transformIntoDatabaseSession(sessionData), transformIntoDatabaseUser(userData)];
    }

    public async getUserSessions(userId: UserId): Promise<DatabaseSession[]> {
        const result = await this.db.query<SessionSchema[][]>(`SELECT * FROM ${this.sessionTable} WHERE user_id = $userId`, {
            userId: this.getUserID(userId),
        });
        if (result[0].length == 0) return [];
        return result[0].map(transformIntoDatabaseSession);
    }

    public async setSession(databaseSession: DatabaseSession): Promise<void> {
        await this.db.create<SessionSchema>(this.getSessionID(databaseSession.id), {
            id: this.getSessionID(databaseSession.id),
            user_id: this.getUserID(databaseSession.userId),
            expires_at: Math.floor(databaseSession.expiresAt.getTime() / 1000),
            ...databaseSession.attributes,
        });
    }

    public async updateSessionExpiration(sessionId: string, expiresAt: Date): Promise<void> {
        await this.db.query(`UPDATE ${this.sessionTable} SET expires_at = $expiresAt WHERE id = $sessionId`, {
            sessionId: this.getSessionID(sessionId),
            expiresAt: Math.floor(expiresAt.getTime() / 1000),
        });
    }

    getUserID(userId: UserId): RecordId {
        return new RecordId(this.userTable, userId);
    }
    getSessionID(sessionId: string): RecordId {
        return new RecordId(this.sessionTable, sessionId);
    }
}

export interface TableNames {
    user: string;
    session: string;
}

type SurrealObject<T> = T & Record<string, unknown> & { id: RecordId };

type SessionSchema<T = RecordId> = SurrealObject<RegisteredDatabaseSessionAttributes> & {
    user_id: T;
    expires_at: number;
};

const transformIntoDatabaseSession = (raw: SessionSchema<RecordId>): DatabaseSession => {
    const { id, user_id: userId, expires_at: expiresAtUnix, ...attributes } = raw;
    return {
        userId: userId.id.toString() as UserId,
        id: id.id.toString(),
        expiresAt: new Date(expiresAtUnix * 1000),
        attributes,
    };
};

type UserSchema = SurrealObject<RegisteredDatabaseUserAttributes>;

const transformIntoDatabaseUser = (raw: UserSchema): DatabaseUser => {
    const { id, ...attributes } = raw;
    return {
        id: id.id.toString() as UserId,
        attributes,
    };
};
