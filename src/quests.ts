import DatabaseConstructor, { Database } from 'better-sqlite3';
import { app } from 'electron';
import path from 'node:path';
import { Quest } from './types';

type DbQuest = {
  id: number;
  desc: string;
};
type DbCompletion = {
  questId: number;
  userId: string;
  userName: string;
  progress: number;
};

export default class Quests {
  private db: Database;

  constructor() {
    this.db = DatabaseConstructor(
      path.join(app.getPath('userData'), `quests.sqlite3`),
    );
    this.db.pragma('journal_mode = WAL');
    this.db
      .prepare(
        `CREATE TABLE IF NOT EXISTS quests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          desc TEXT
        )`,
      )
      .run();
    this.db
      .prepare(
        `CREATE TABLE IF NOT EXISTS completions (
          questId INTEGER,
          userId TEXT,
          userName TEXT,
          progress INTEGER DEFAULT 0,
          PRIMARY KEY (questId, userId)
        )`,
      )
      .run();
  }

  getCompletions(questId: number) {
    const completions = this.db
      .prepare('SELECT * FROM completions WHERE questId = @questId')
      .all({ questId }) as DbCompletion[];
    return {
      progress:
        completions.length > 0
          ? completions
              .map((completion) => completion.progress)
              .reduce((prev, curr) => prev + curr)
          : 0,
      completedUserIds: completions.map((completion) => completion.userId),
    };
  }

  getCurrent(): Quest | undefined {
    const quest = this.db
      .prepare('SELECT * FROM quests ORDER BY id DESC LIMIT 1')
      .get() as DbQuest | undefined;
    if (!quest) {
      return undefined;
    }

    return { ...quest, ...this.getCompletions(quest.id) };
  }

  getLast(): Quest | undefined {
    const quests = this.db
      .prepare('SELECT * FROM quests ORDER BY id DESC LIMIT 2')
      .all() as Quest[];
    if (quests.length !== 2) {
      return undefined;
    }

    const quest = quests[1];
    return { ...quest, ...this.getCompletions(quest.id) };
  }

  getGold() {
    return (
      this.db.prepare('SELECT COUNT(*) FROM completions').get() as {
        'COUNT(*)': number;
      }
    )['COUNT(*)'];
  }

  push(desc: string) {
    this.db.prepare('INSERT into quests (desc) VALUES (@desc)').run({ desc });
  }

  complete(userId: string, userName: string, progress: number) {
    const current = this.db
      .prepare('SELECT * FROM quests ORDER BY id DESC LIMIT 1')
      .get() as DbQuest | undefined;
    if (!current) {
      throw new Error('no current quest');
    }

    this.db
      .prepare(
        `INSERT into completions (questId, userId, userName, progress)
          VALUES (@questId, @userId, @userName, @progress)
          ON CONFLICT (questId, userId)
          DO UPDATE SET userName = @userName, progress = progress + @progress`,
      )
      .run({ questId: current.id, userId, userName, progress });
  }
}
