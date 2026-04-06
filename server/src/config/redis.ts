import Redis, { Cluster, ClusterOptions } from 'ioredis';
import { config } from './env';
import { logger } from './logger';

const clusterOptions: ClusterOptions = {
    redisOptions: {
        password: config.redis.node.password,
        tls: config.nodeEnv === 'production' ? {} : undefined,
        connectTimeout: 10000,
    },
    clusterRetryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        return delay;
    },
    enableReadyCheck: true,
    enableOfflineQueue: true,
    scaleReads: 'slave'
};

function parseClusterNodes(nodes: string): Array<{ host: string; port: number }> {
    return nodes.split(',').map(node => {
        const [host, port] = node.trim().split(':');
        return { host, port: parseInt(port, 10) };
    });
}

export function createRedisCluster(): Cluster {
    const nodes = parseClusterNodes(`${config.redis.cluster.nodes}`);
    
    const cluster = new Redis.Cluster(nodes, clusterOptions);

    cluster.on('connect', () => logger.info('Redis Cluster connected'));
    cluster.on('ready', () => logger.info('Redis Cluster ready'));
    cluster.on('error', (err) => logger.error({ err }, 'Redis Cluster error'));
    cluster.on('close', () => logger.warn('Redis Cluster connection closed'));

    return cluster;
}

let redisCluster: Cluster | Redis | null = null;

export function getRedisCluster(): Cluster | Redis {
    if (true) {

        redisCluster = new Redis(config.redis.node);
    } else if (!redisCluster) {
        redisCluster = createRedisCluster();
    }
    return redisCluster;
}

export async function closeRedisCluster(): Promise<void> {
    if (redisCluster) {
        await redisCluster.quit();
        redisCluster = null;
        logger.info('Redis Cluster closed');
    }
}