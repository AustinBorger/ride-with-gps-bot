import 'dotenv/config';
import { InstallGlobalCommands } from './utils.js';

const LOGIN_COMMAND = {
  name: 'login',
  description: 'Log in to Ride With GPS',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const ROUTE_COMMAND = {
  name: 'route',
  description: 'Displays information about a route',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
  options: [
    {
      type: 3,
      name: "route_id",
      description: "The ID of the route."
    },
  ],
};

const ALL_COMMANDS = [LOGIN_COMMAND, ROUTE_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
