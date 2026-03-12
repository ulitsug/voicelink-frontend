const { createProxyMiddleware } = require('http-proxy-middleware');
const https = require('https');

module.exports = function (app) {
  const target = process.env.REACT_APP_API_URL || 'https://localhost:5001';

  // Agent that accepts self-signed certs (needed for WebSocket upgrade too)
  const agent = new https.Agent({ rejectUnauthorized: false });

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
