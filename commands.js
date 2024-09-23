import 'dotenv/config';
import { InstallGlobalCommands } from './utils.js';

const GUILD_ONLY_INTEGRATION = [0];
const GUILD_ONLY_CONTEXT = [0];

const LOGIN_COMMAND = {
  name: 'login',
  description: 'Log in to Ride With GPS',
  type: 1,
  integration_types: GUILD_ONLY_INTEGRATION,
  contexts: GUILD_ONLY_CONTEXT,
};

const NEXT_ROUTE_COMMAND = {
  name: 'next_route',
  description: 'Provides a link to the upcoming route.',
  type: 1,
  integration_types: GUILD_ONLY_INTEGRATION,
  contexts: GUILD_ONLY_CONTEXT,
};

const ADD_ROUTE_COMMAND = {
  name: "add_route",
  description: "Adds an upcoming training route",
  type: 1,
  integration_types: GUILD_ONLY_INTEGRATION,
  contexts: GUILD_ONLY_CONTEXT,
  options: [
    {
      type: 3,
      name: "route_id",
      description: "The ID or link to the route.",
      required: true,
    },
    {
      type: 3,
      name: "date",
      description: "The date/time to meet.",
      required: true,
    },
  ],
};

const ALL_ROUTES_COMMAND = {
  name: "all_routes",
  description: "Lists all the routes in the database.",
  type: 1,
  integration_types: GUILD_ONLY_INTEGRATION,
  contexts: GUILD_ONLY_CONTEXT,
};

const UNDO_COMMAND = {
  name: "undo",
  description: "Reverts the last admin command.",
  type: 1,
  integration_types: GUILD_ONLY_INTEGRATION,
  contexts: GUILD_ONLY_CONTEXT, // Guild only
};

const ALL_COMMANDS = [NEXT_ROUTE_COMMAND, ADD_ROUTE_COMMAND, ALL_ROUTES_COMMAND, UNDO_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
