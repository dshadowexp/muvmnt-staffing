import { Queue, QueueEvents, QueueOptions, Worker } from "bullmq";
export declare const defualtQueueConfig: QueueOptions;
export declare abstract class BaseQueue<D, N extends string> {
    protected readonly queueName: string;
    protected readonly concurrency: number;
    protected queue: Queue;
    protected events: QueueEvents;
    protected worker: Worker | undefined;
    constructor(queueName: string, concurrency?: number);
    get q(): Queue;
    abstract createWorker(): Worker<D, void, N>;
    protected workerLogger(worker: Worker<D, void, N>): void;
}
