import Redis, { Cluster } from 'ioredis';
export declare function createRedisCluster(): Cluster;
export declare function getRedisCluster(): Cluster | Redis;
export declare function closeRedisCluster(): Promise<void>;
