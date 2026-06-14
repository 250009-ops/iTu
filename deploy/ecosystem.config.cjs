module.exports = {
  apps: [
    {
      name: "itestu-api",
      cwd: "/var/www/itestu/app/api",
      script: "dist/src/main.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "512M",
      error_file: "/var/log/itestu/api-error.log",
      out_file: "/var/log/itestu/api-out.log",
      merge_logs: true,
      time: true,
    },
    {
      name: "itestu-web",
      cwd: "/var/www/itestu/app/web",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 127.0.0.1",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        INTERNAL_API_URL: "http://127.0.0.1:3001/api/v1",
      },
      max_memory_restart: "768M",
      error_file: "/var/log/itestu/web-error.log",
      out_file: "/var/log/itestu/web-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
