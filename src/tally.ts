import DatabaseConstructor, { Database } from 'better-sqlite3';
import { format } from 'date-fns';
import { app } from 'electron';
import path from 'node:path';
import { Tally as TallyType } from './types';
import { readdir } from 'fs/promises';

const ALL_QUERY = 'SELECT * FROM tally ORDER BY points DESC';
const TOP_QUERY = 'SELECT * FROM tally ORDER BY points DESC LIMIT 3';

export default class Tally {
  private db: Database;
  private currentKey: string;
  private lastKey: string;
  private keyToTallies: Map<string, TallyType[]>;

  constructor() {
    const userDataPath = app.getPath('userData');
    const currentDate = new Date();
    this.currentKey = format(currentDate, 'yyyyMM');
    this.db = DatabaseConstructor(
      path.join(userDataPath, `tally${this.currentKey}.sqlite3`),
    );
    this.db.pragma('journal_mode = WAL');
    this.db
      .prepare(
        'CREATE TABLE IF NOT EXISTS tally (userId TEXT PRIMARY KEY, userName TEXT, points, INTEGER)',
      )
      .run();
    this.keyToTallies = new Map();

    currentDate.setDate(0);
    try {
      const lastKey = format(currentDate, 'yyyyMM');
      const lastDb = DatabaseConstructor(
        path.join(userDataPath, `tally${lastKey}.sqlite3`),
        { fileMustExist: true },
      );

      this.lastKey = lastKey;
      this.keyToTallies.set(
        this.lastKey,
        lastDb.prepare(ALL_QUERY).all() as TallyType[],
      );
      lastDb.close();
    } catch {
      // just catch
    }
  }

  addPoints(userId: string, userName: string, points: number) {
    this.db
      .prepare(
        `INSERT INTO tally (userId, userName, points)
          VALUES (@userId, @userName, @points)
          ON CONFLICT (userId)
          DO UPDATE SET userName = @userName, points = points + @points`,
      )
      .run({ userId, userName, points });
  }

  getPointsForUserId(userId: string) {
    const tally = this.db
      .prepare('SELECT * FROM tally WHERE userId = @userId')
      .get({ userId }) as TallyType | undefined;
    if (!tally) {
      return 0;
    }
    return tally.points;
  }

  getPointsForUserName(userName: string) {
    const tally = this.db
      .prepare('SELECT * FROM taly WHERE userName = @userName')
      .get({ userName }) as TallyType | undefined;
    if (!tally) {
      return 0;
    }
    return tally.points;
  }

  getTop() {
    return this.db.prepare(TOP_QUERY).all() as TallyType[];
  }

  getLastTop() {
    if (!this.lastKey) {
      return [];
    }

    const tallies = this.keyToTallies.get(this.lastKey);
    if (!tallies) {
      throw new Error('no last tallies');
    }
    return tallies.slice(0, 3);
  }

  getAll() {
    return this.db.prepare(ALL_QUERY).all() as TallyType[];
  }

  hasPast() {
    return !!this.lastKey;
  }

  async getPast() {
    const userDataPath = app.getPath('userData');
    const fileNames = await readdir(userDataPath);
    fileNames
      .filter(
        (fileName) =>
          fileName.match(/^tally[0-9][0-9][0-9][0-9][0-9][0-9].sqlite3$/) &&
          fileName !== `tally${this.currentKey}.sqlite3` &&
          !this.keyToTallies.has(fileName.slice(5, 11)),
      )
      .forEach((validFileName) => {
        const pastDb = DatabaseConstructor(
          path.join(app.getPath('userData'), validFileName),
          { fileMustExist: true },
        );
        this.keyToTallies.set(
          validFileName.slice(5, 11),
          pastDb.prepare(ALL_QUERY).all() as TallyType[],
        );
        pastDb.close();
      });
    return Array.from(this.keyToTallies)
      .map(([key, tallies]) => ({ key, tallies }))
      .sort((a, b) => b.key.localeCompare(a.key));
  }
}
