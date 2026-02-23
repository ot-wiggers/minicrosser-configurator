import { userRepo } from '@/modules/storage/user-repo'
import bcrypt from 'bcryptjs'

export async function seedAdminUser(): Promise<void> {
  const count = await userRepo.count()
  if (count > 0) return

  const hash = await bcrypt.hash('admin', 10)
  await userRepo.create({
    id: 'admin-seed',
    username: 'admin',
    passwordHash: hash,
    role: 'admin',
    mustChangePassword: true,
    createdAt: new Date().toISOString(),
  })
}
