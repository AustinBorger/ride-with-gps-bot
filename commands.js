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
      description: "The ID of the route.",
    },
  ],
};

const SET_ROUTE_COMMAND = {
  name: "set_route",
  description: "Sets the upcoming training route",
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
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
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const ALL_COMMANDS = [ROUTE_COMMAND, SET_ROUTE_COMMAND, ALL_ROUTES_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
