import { WorkersRepository, CreateWorkerInput, UpdateWorkerInput, WorkerRecord } from "./workers.repository";

export class WorkersService {
  private readonly repo: WorkersRepository;

  constructor() {
    this.repo = new WorkersRepository();
  }

  async createWorker(input: CreateWorkerInput): Promise<WorkerRecord> {
    return this.repo.create(input);
  }

  async getWorker(id: string): Promise<WorkerRecord | null> {
    return this.repo.findById(id);
  }

  async listWorkers(params?: { limit?: number; offset?: number }): Promise<WorkerRecord[]> {
    return this.repo.findAll(params);
  }

  async updateWorker(id: string, input: UpdateWorkerInput): Promise<WorkerRecord> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error("Worker not found");
    return this.repo.updateById(id, input);
  }

  async deleteWorker(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new Error("Worker not found");
    await this.repo.deleteById(id);
  }
}
