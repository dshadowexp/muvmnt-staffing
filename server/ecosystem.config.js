module.exports = {
    apps: [
        {
            name: 'muvmnt-staffing',
            script: './dist/server.js',
            instances: 'max', // Use all available CPU cores
            exec_mode: 'cluster',
            env: {
                NODE_ENV: 'production',
                REDIS_CLUSTER: "false", // Set to "true" to enable Redis Cluster, otherwise it will use a single Redis instance
                PG_CONNECT: "true", // Set to "true" to enable PostgreSQL connection
            },
            error_file: './logs/error.log',
            out_file: './logs/out.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            merge_logs: true,
            autorestart: true,
            max_memory_restart: '1G',
            min_uptime: '10s',
            max_restarts: 10,
            restart_delay: 4000,
            kill_timeout: 5000,
            listen_timeout: 3000,
            wait_ready: true
        }
    ]
};