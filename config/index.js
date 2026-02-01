/**
 * Configuration Index
 * 
 * Central export point for all configuration files.
 * Import configurations like: import { app, database, auth } from '/config/index.js'
 */

import app from './app.js';
import database from './database.js';
import auth from './auth.js';
import api from './api.js';

export { app, database, auth, api };

export default {
    app,
    database,
    auth,
    api,
};
