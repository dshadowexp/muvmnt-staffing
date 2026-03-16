import { WorkersRepository, WorkerProfile } from './workers.repository'
import type { WorkerProfileBodyType } from '../../schemas/worker.schema'

export class WorkersService {
  private readonly repo: WorkersRepository

  constructor() {
    this.repo = new WorkersRepository()
  }

  // ─── Get current worker profile ─────────────────────────────────────────────

  async getProfile(userId: string): Promise<WorkerProfile | null> {
    return this.repo.findByUserId(userId)
  }

  // ─── Create or update profile for current user ─────────────────────────────

  async upsertProfile(userId: string, payload: WorkerProfileBodyType): Promise<WorkerProfile> {
    const { firstName, lastName, dateOfBirth, addressLine1, addressLine2, city, province, postalCode, role, yearsExperience } = payload

    return this.repo.upsert(userId, {
      firstName,
      lastName,
      dateOfBirth,
      addressLine1,
      addressLine2: addressLine2 ?? null,
      city,
      province,
      postalCode,
      role,
      yearsExperience,
    })
  }

  // ─── Delete profile for current user ───────────────────────────────────────

  async deleteProfile(userId: string): Promise<void> {
    await this.repo.delete(userId)
  }
}

