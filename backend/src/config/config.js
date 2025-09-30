import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load game configuration from YAML
const configPath = path.join(__dirname, '../../config/game_config.yaml');
const gameConfig = yaml.load(fs.readFileSync(configPath, 'utf8'));

export default gameConfig;