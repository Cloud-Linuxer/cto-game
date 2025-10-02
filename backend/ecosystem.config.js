module.exports = {
  apps: [
    {
      name: 'cto-game-backend',
      script: 'npm',
      args: 'run start:dev',
      cwd: '/home/cto-game/backend',
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      error_file: '/tmp/backend-pm2-error.log',
      out_file: '/tmp/backend-pm2-out.log',
      log_file: '/tmp/backend-pm2-combined.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
