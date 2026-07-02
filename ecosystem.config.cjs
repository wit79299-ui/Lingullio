module.exports = {
  apps: [
    {
      name: 'lingullio',
      script: 'node_modules/.bin/next',
      args: 'dev --port 3000 --hostname 0.0.0.0',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
    },
  ],
};
