import DatabaseConstructor, { Database } from 'better-sqlite3';
import { app } from 'electron';
import path from 'node:path';
import { Quest, QuestCompletion, QuestGold } from './types';

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
    return this.db
      .prepare('SELECT * FROM completions WHERE questId = @questId')
      .all({ questId }) as DbCompletion[];
  }

  getProgressAndCompletedUserIds(questId: number) {
    const completions = this.getCompletions(questId);
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

    return { ...quest, ...this.getProgressAndCompletedUserIds(quest.id) };
  }

  getLast(): Quest | undefined {
    const quests = this.db
      .prepare('SELECT * FROM quests ORDER BY id DESC LIMIT 2')
      .all() as Quest[];
    if (quests.length !== 2) {
      return undefined;
    }

    const quest = quests[1];
    return { ...quest, ...this.getProgressAndCompletedUserIds(quest.id) };
  }

  getGold(userId: string) {
    return (
      this.db
        .prepare('SELECT COUNT(*) FROM completions WHERE userId = @userId')
        .get({ userId }) as { 'COUNT(*)': number }
    )['COUNT(*)'];
  }

  getGoldTotal() {
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

  getCurrentCompletions(): QuestCompletion[] {
    const quest = this.db
      .prepare('SELECT * FROM quests ORDER BY id DESC LIMIT 1')
      .get() as DbQuest | undefined;
    if (!quest) {
      return [];
    }

    return this.getCompletions(quest.id).sort((a, b) =>
      a.progress === b.progress
        ? a.userName.localeCompare(b.userName)
        : b.progress - a.progress,
    );
  }

  getLastCompletions(): QuestCompletion[] {
    const quests = this.db
      .prepare('SELECT * FROM quests ORDER BY id DESC LIMIT 2')
      .all() as Quest[];
    if (quests.length !== 2) {
      return [];
    }

    return this.getCompletions(quests[1].id).sort((a, b) =>
      a.progress === b.progress
        ? a.userName.localeCompare(b.userName)
        : b.progress - a.progress,
    );
  }

  getAllGolds(): QuestGold[] {
    const allGold = this.db
      .prepare('SELECT COUNT(*), userId FROM completions GROUP BY userId')
      .all() as { 'COUNT(*)': number; userId: string }[];
    const ret: QuestGold[] = [];
    allGold.map((value) => {
      const name = this.db
        .prepare(
          'SELECT userName FROM completions WHERE userId = @userId ORDER BY questId DESC LIMIT 1',
        )
        .get({ userId: value.userId }) as { userName: string } | undefined;
      if (name) {
        ret.push({
          userId: value.userId,
          userName: name.userName,
          gold: value['COUNT(*)'],
        });
      }
    });
    return ret.sort((a, b) =>
      a.gold === b.gold
        ? a.userName.localeCompare(b.userName)
        : b.gold - a.gold,
    );
  }
}
