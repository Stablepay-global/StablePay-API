// PM2 Ecosystem Configuration for StablePay API
module.exports = {
  apps: [
    {
      name: 'stablepay-api',
      script: 'server/index.ts',
      interpreter: 'npx',
      interpreter_args: 'tsx',
      instances: 1, // or 'max' for cluster mode
      exec_mode: 'fork', // or 'cluster'
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 4000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Restart policy
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Advanced settings
      kill_timeout: 5000,
      listen_timeout: 3000,
      
      // Health monitoring
      health_check_http: {
        url: 'http://localhost:4000/api/health',
        interval: 30000,
        timeout: 5000
      }
    }
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: 'your-production-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/stablepay-api.git',
      path: '/var/www/stablepay-api',
      'pre-deploy-local': '',
      'post-deploy': 'npm ci --production && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
