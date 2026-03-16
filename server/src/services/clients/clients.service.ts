import { ClientsRepository, ClientProfile } from './clients.repository'
import type { ClientProfileBodyType } from '../../schemas/client.schema'

export class ClientsService {
  private readonly repo: ClientsRepository

  constructor() {
    this.repo = new ClientsRepository()
  }

  // ─── Get current client profile ─────────────────────────────────────────────

  async getProfile(userId: string): Promise<ClientProfile | null> {
    return this.repo.findByUserId(userId)
  }

  // ─── Create or update profile for current user ─────────────────────────────

  async upsertProfile(userId: string, payload: ClientProfileBodyType): Promise<ClientProfile> {
    const { name, addressLine1, addressLine2, city, province, postalCode, clientType } = payload

    return this.repo.upsert(userId, {
      name,
      addressLine1,
      addressLine2: addressLine2 ?? null,
      city,
      province,
      postalCode,
      clientType,
    })
  }

  // ─── Delete profile for current user ───────────────────────────────────────

  async deleteProfile(userId: string): Promise<void> {
    await this.repo.delete(userId)
  }
}

