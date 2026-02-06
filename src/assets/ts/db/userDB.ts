import https from 'https';

const dbAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  timeout: 60000
});

export {
    dbAgent
}