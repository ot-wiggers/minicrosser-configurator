import { db } from './db'
import type { UserRecord } from '@/modules/catalog/db-types'

export const userRepo = {
  async getByUsername(username: string): Promise<UserRecord | undefined> {
    return db.users.where('username').equals(username).first()
  },
  async getById(id: string): Promise<UserRecord | undefined> {
    return db.users.get(id)
  },
  async create(record: UserRecord): Promise<void> {
    await db.users.put(record)
  },
  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await db.users.update(id, { passwordHash, mustChangePassword: false })
  },
  async count(): Promise<number> {
    return db.users.count()
  },
}
