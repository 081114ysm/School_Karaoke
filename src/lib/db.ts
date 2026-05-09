import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL ?? 'file:dev.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
})

const dbReady = (async () => {
  await client.execute(`CREATE TABLE IF NOT EXISTS Reservation (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    date       TEXT NOT NULL,
    timeSlot   TEXT NOT NULL,
    supervisor TEXT NOT NULL,
    students   TEXT NOT NULL,
    pin        TEXT NOT NULL DEFAULT '',
    createdAt  TEXT DEFAULT (datetime('now', 'localtime'))
  )`)
  try {
    await client.execute("ALTER TABLE Reservation ADD COLUMN pin TEXT NOT NULL DEFAULT ''")
  } catch {}
  await client.execute(`CREATE TABLE IF NOT EXISTS DisabledDate (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    date   TEXT UNIQUE NOT NULL,
    reason TEXT
  )`)
})()

export interface Reservation {
  id: number
  date: string
  timeSlot: string
  supervisor: string
  students: string
  pin: string
  createdAt: string
}

export interface DisabledDate {
  id: number
  date: string
  reason: string | null
}

export const reservations = {
  findAll: async (): Promise<Reservation[]> => {
    await dbReady
    const r = await client.execute('SELECT * FROM Reservation ORDER BY date ASC, timeSlot ASC')
    return r.rows as unknown as Reservation[]
  },

  findByDateAndSlot: async (date: string, timeSlot: string): Promise<Reservation | undefined> => {
    await dbReady
    const r = await client.execute({
      sql: 'SELECT * FROM Reservation WHERE date = ? AND timeSlot = ?',
      args: [date, timeSlot],
    })
    return r.rows[0] as unknown as Reservation | undefined
  },

  findByMonth: async (yearMonth: string): Promise<Reservation[]> => {
    await dbReady
    const r = await client.execute({
      sql: 'SELECT * FROM Reservation WHERE date LIKE ?',
      args: [`${yearMonth}-%`],
    })
    return r.rows as unknown as Reservation[]
  },

  create: async (date: string, timeSlot: string, supervisor: string, students: string, pin: string): Promise<Reservation> => {
    await dbReady
    const r = await client.execute({
      sql: 'INSERT INTO Reservation (date, timeSlot, supervisor, students, pin) VALUES (?, ?, ?, ?, ?) RETURNING *',
      args: [date, timeSlot, supervisor, students, pin],
    })
    return r.rows[0] as unknown as Reservation
  },

  delete: async (id: number): Promise<{ rowsAffected: number }> => {
    await dbReady
    const r = await client.execute({ sql: 'DELETE FROM Reservation WHERE id = ?', args: [id] })
    return { rowsAffected: r.rowsAffected }
  },
}

export const disabledDates = {
  findAll: async (): Promise<DisabledDate[]> => {
    await dbReady
    const r = await client.execute('SELECT * FROM DisabledDate ORDER BY date ASC')
    return r.rows as unknown as DisabledDate[]
  },

  findByDate: async (date: string): Promise<DisabledDate | undefined> => {
    await dbReady
    const r = await client.execute({ sql: 'SELECT * FROM DisabledDate WHERE date = ?', args: [date] })
    return r.rows[0] as unknown as DisabledDate | undefined
  },

  create: async (date: string, reason: string | null): Promise<DisabledDate> => {
    await dbReady
    const r = await client.execute({
      sql: 'INSERT INTO DisabledDate (date, reason) VALUES (?, ?) RETURNING *',
      args: [date, reason ?? null],
    })
    return r.rows[0] as unknown as DisabledDate
  },

  delete: async (id: number): Promise<{ rowsAffected: number }> => {
    await dbReady
    const r = await client.execute({ sql: 'DELETE FROM DisabledDate WHERE id = ?', args: [id] })
    return { rowsAffected: r.rowsAffected }
  },
}
