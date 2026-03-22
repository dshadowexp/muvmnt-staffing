"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRedisCluster = createRedisCluster;
exports.getRedisCluster = getRedisCluster;
exports.closeRedisCluster = closeRedisCluster;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
const logger_1 = require("./logger");
const clusterOptions = {
    redisOptions: {
        password: env_1.config.redis.node.password,
        tls: env_1.config.nodeEnv === 'production' ? {} : undefined,
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
function parseClusterNodes(nodes) {
    return nodes.split(',').map(node => {
        const [host, port] = node.trim().split(':');
        return { host, port: parseInt(port, 10) };
    });
}
function createRedisCluster() {
    const nodes = parseClusterNodes(`${env_1.config.redis.cluster.nodes}`);
    const cluster = new ioredis_1.default.Cluster(nodes, clusterOptions);
    cluster.on('connect', () => logger_1.logger.info('Redis Cluster connected'));
    cluster.on('ready', () => logger_1.logger.info('Redis Cluster ready'));
    cluster.on('error', (err) => logger_1.logger.error({ err }, 'Redis Cluster error'));
    cluster.on('close', () => logger_1.logger.warn('Redis Cluster connection closed'));
    return cluster;
}
let redisCluster = null;
function getRedisCluster() {
    if (true) {
        console.log(env_1.config.redis.node);
        redisCluster = new ioredis_1.default(env_1.config.redis.node);
    }
    else if (!redisCluster) {
        redisCluster = createRedisCluster();
    }
    return redisCluster;
}
async function closeRedisCluster() {
    if (redisCluster) {
        await redisCluster.quit();
        redisCluster = null;
        logger_1.logger.info('Redis Cluster closed');
    }
}
//# sourceMappingURL=redis.js.map