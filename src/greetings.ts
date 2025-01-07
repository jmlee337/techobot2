import { app } from 'electron';
import path from 'node:path';
import DatabaseContstructor, { Database } from 'better-sqlite3';
import { Greeting } from './types';

const GREETING_ALL_SQL = 'SELECT * FROM greetings';
const GREETING_DELETE_SQL = 'DELETE FROM greetings WHERE userId = @userId';
const GREETING_SELECT_SQL = 'SELECT * FROM greetings WHERE userId = @userId';
const GREETING_UPDATE_SQL =
  'UPDATE greetings SET greeting = @greeting WHERE userId = @userId';
const GREETING_UPSERT_SQL =
  'REPLACE INTO greetings (userId, userName, greeting) VALUES (@userId, @userName, @greeting)';
export default class Greetings {
  private db: Database;

  constructor() {
    this.db = DatabaseContstructor(
      path.join(app.getPath('userData'), 'greetings.sqlite3'),
    );
    this.db.pragma('journal_mode = WAL');
    this.db
      .prepare(
        'CREATE TABLE IF NOT EXISTS greetings (userId TEXT PRIMARY KEY, userName TEXT, greeting TEXT)',
      )
      .run();
  }

  setGreeting(userId: string, userName: string, greeting: string) {
    this.db.prepare(GREETING_UPSERT_SQL).run({ userId, userName, greeting });
  }

  getGreeting(userId: string) {
    return this.db.prepare(GREETING_SELECT_SQL).get({ userId }) as
      | Greeting
      | undefined;
  }

  deleteGreeting(userId: string) {
    this.db.prepare(GREETING_DELETE_SQL).run({ userId });
  }

  updateGreeting(userId: string, greeting: string) {
    this.db.prepare(GREETING_UPDATE_SQL).run({ userId, greeting });
  }

  listGreetings() {
    return this.db.prepare(GREETING_ALL_SQL).all() as Greeting[];
  }
}
