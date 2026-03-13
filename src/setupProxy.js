const { createProxyMiddleware } = require('http-proxy-middleware');
const https = require('https');

module.exports = function (app) {
  const target = process.env.REACT_APP_API_URL || 'http://localhost:5001';

  // Use appropriate agent based on protocol
  const http = require('http');
  const agent = target.startsWith('https') 
    ? new https.Agent({ rejectUnauthorized: false })
    : new http.Agent({ keepAlive: true });

  app.use(
    '/api',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      secure: false,
      agent,
    })
  );

  app.use(
    '/socket.io',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      secure: false,
      agent,
    })
  );
};
