import { ConsoleLogger } from './dlb-lib/util/ConsoleLogger.js';
import { LOG_LEVEL_NAMES } from './dlb-lib/util/AbstractLogger.js';
import { StudioClientState } from './StudioClientState.js';
import config from './config.js';

const LOGTAG = "StudioController";
const logger = new ConsoleLogger(config.logLevel);
logger.info(LOGTAG, "Initialized Logger with log level '"
    + config.logLevel
    + "' ('"
    + LOG_LEVEL_NAMES[config.logLevel]
    + "').");

// Initialize the ClientState object and take actions
const state = new StudioClientState(logger);
state.loadFromCookie();

export default state;
