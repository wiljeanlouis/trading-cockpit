import { createCloudRunApp } from './app';
import { loadConfig } from './config';

const config = loadConfig();
const server = createCloudRunApp({
  spreadsheetId: config.spreadsheetId,
  auth: config.auth,
  cors: config.cors,
  staticAssetsPath: config.staticAssetsPath
});

server.listen(config.port, '0.0.0.0', () => {
  console.log(`Trading Cockpit API listening on :${config.port}`);
});
