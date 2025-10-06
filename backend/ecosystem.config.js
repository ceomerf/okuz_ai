module.exports = {
  apps: [
    {
      name: 'okuz-api',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
        DATABASE_URL: 'postgresql://okuz:okuz_password@127.0.0.1:5432/okuz_ai?schema=public',
        REDIS_URL: 'redis://127.0.0.1:6379'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002,
        DATABASE_URL: 'postgresql://okuz:okuz_password@127.0.0.1:5432/okuz_ai?schema=public',
        REDIS_URL: 'redis://127.0.0.1:6379'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s'
    },
    {
      name: 'generate-plan-worker',
      script: 'node',
      args: 'dist/planning/workers/generate-plan.worker.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://okuz:okuz_password@127.0.0.1:5432/okuz_ai?schema=public',
        REDIS_URL: 'redis://127.0.0.1:6379'
      },
      out_file: './logs/generate-plan-out.log',
      error_file: './logs/generate-plan-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
