import { ClientsRepository, CreateClientInput, UpdateClientInput, ClientRecord } from "./clients.repository";

export class ClientsService {
  private readonly repo: ClientsRepository;

  constructor() {
    this.repo = new ClientsRepository();
  }

  async createClient(input: CreateClientInput): Promise<ClientRecord> {
    return this.repo.create(input);
  }

  async getClient(id: string): Promise<ClientRecord | null> {
    return this.repo.findById(id);
  }

  async listClients(params?: { limit?: number; offset?: number }): Promise<ClientRecord[]> {
    return this.repo.findAll(params);
  }

  async updateClient(id: string, input: UpdateClientInput): Promise<ClientRecord> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error("Client not found");
    return this.repo.updateById(id, input);
  }

  async deleteClient(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error("Client not found");
    await this.repo.deleteById(id);
  }
}
