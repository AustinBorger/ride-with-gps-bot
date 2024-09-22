import 'dotenv/config';
import express from 'express';
import {
  InteractionType,
  InteractionResponseFlags,
  InteractionResponseType,
  verifyKeyMiddleware,
} from 'discord-interactions';
import pkg from 'discord.js';
const discord = pkg;
import { getRandomEmoji } from './utils.js';
import './commands.js';
import './data.js';
import crypto from 'crypto';
import session from 'express-session';
import http from 'http';
import https from 'https';
import { routeTable } from './data.js';

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;

const client = new discord.Client({
  intents: [
    discord.GatewayIntentBits.DirectMessages
  ],
});

client.login(process.env.DISCORD_TOKEN);

// Ride with GPS API key
const RWG_KEY = process.env.RWG_KEY;
const RWG_CLIENTID = process.env.RWG_CLIENTID;
const RWG_SECRET = process.env.RWG_SECRET;

const ROUTE_INTERACTIONS = "/interactions";
const ROUTE_LOGIN = "/login";
const ROUTE_REDIRECT = "/redirect";

var login_token_to_user = {};
var user_to_oauth = {};

var session_secret = crypto.randomBytes(32).toString('hex');
app.use(session({
  secret: session_secret,
  resave: false,
  saveUninitialized: true,
}));

function get_redirect_uri(req) {
  return req.protocol + '://' + req.hostname + ROUTE_REDIRECT;
}

function reply_message(res, content) {
  return res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content: content,
      flags: InteractionResponseFlags.EPHEMERAL,
    },
  });
}

function reply_unknown_route(res, arg) {
  return reply_message(res, `Unknown route "${arg}"`);
}

function reply_invalid_date(res, arg) {
  return reply_message(res, `Invalid date "${arg}"`);
}

function get_route(route, arg, res, callback) {
  const get_options = {
    hostname: "ridewithgps.com",
    path: "/routes/" + route + ".json",
    method: "GET",
  };

  const my_req = https.request(get_options, (rwg_res) => {
    const statusCode = rwg_res.statusCode;
    var data = '';

    if (statusCode === 404) {
      reply_unknown_route(res, arg);
      return;
    }

    rwg_res.on("data", (chunk) => {
      if (statusCode === 200) {
        data += chunk;
      }
    });

    rwg_res.on("end", () => {
      callback(data);
    })
  });

  my_req.end();
}

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post(ROUTE_INTERACTIONS, verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  // Interaction type and data
  const { type, data, context } = req.body;

  const userId = context === 0 ? req.body.member.user.id : req.body.user.id;

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = data;

    if (name === 'route') {
      routeTable.getNextRoute((err, row) => {
        if (err) {
          reply_message(res, `Error retrieving route: ${err}`);
        } else if (row) {
          reply_message(res, `https://ridewithgps.com/routes/${row[0]}`);
        } else {
          reply_message(res, "No upcoming routes.");
        }
      });
    } else if (name === 'login') {
      const token = crypto.randomBytes(32).toString('hex');
      login_token_to_user[token] = userId;
      const url = req.protocol + '://' + req.hostname + ROUTE_LOGIN + "/" + token;
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          content: 'Login here: ' + url,
          flags: InteractionResponseFlags.EPHEMERAL,
        },
      });
    } else if (name === 'set_route') {
      const route_arg = options[0].value;
      const date_arg = options[1].value;
      const route = routeTable.parseRoute(route_arg);
      if (route == null) {
        return reply_unknown_route(res, route_arg);
      }

      const date = new Date(date_arg);
      if (isNaN(date)) {
        return reply_invalid_date(res, date_arg);
      }

      // Check that the route exists in Ride with GPS
      get_route(route, route_arg, res, (_) => {
        routeTable.addRoute(route, date, (err) => {
          if (err) {
            const msg = `Failed to add route: ${err}`;
            console.log(msg);
            reply_message(res, msg);
          } else {
            const msg = `Added route ${route}, ${date.toISOString()}`;
            console.log(msg);
            reply_message(res, msg);
          }
        });
      });
    } else if (name === 'all_routes') {
      routeTable.getAllRoutes((err, rows) => {
        if (rows) {
          var content = "";
          console.log(rows);
          rows.forEach((row) => {
            content += `${row[0]}, ${row[1]}\n`;
          });
          console.log(content);
          reply_message(res, content);
        } else {
          reply_message(res, "Empty database.");
        }
      });
    } else {
      console.error(`unknown command: ${name}`);
      return res.status(400).json({ error: 'unknown command' });
    }
  } else {
    console.error('unknown interaction type', type);
    return res.status(400).json({ error: 'unknown interaction type' });
  }
});

app.get(ROUTE_LOGIN + "/:token", async function (req, res) {
  const token = req.params.token;

  if (!login_token_to_user.hasOwnProperty(token)) {
    return res.status(400).json({ error: 'expired token' });
  }

  req.session.token = token;

  const redirect_uri = get_redirect_uri(req);

  const url = "https://ridewithgps.com" + "/oauth/authorize?client_id=" + RWG_CLIENTID + "&redirect_uri=" + redirect_uri + "&response_type=code";
  return res.redirect(url);
});

app.get(ROUTE_REDIRECT, async function (req, res) {
  const access_grant = req.query.code;
  const token = req.session.token;
  const user_id = login_token_to_user[token];

  const redirect_uri = get_redirect_uri(req);

  const postData = JSON.stringify({
    grant_type: "authorization_code",
    code: access_grant,
    client_id: RWG_CLIENTID,
    client_secret: RWG_SECRET,
    redirect_uri: redirect_uri,
  });

  const options = {
    hostname: "ridewithgps.com",
    path: "/oauth/token.json",
    method: "POST",
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length
    },
  };

  const my_req = https.request(options, (rwg_res) => {
    if (rwg_res.statusCode != 200) {
      res.json({ code: rwg_res.statusCode, message: rwg_res.statusMessage });
    }

    rwg_res.on("data", (data) => {
      if (rwg_res.statusCode === 200) {
        const { access_token } = JSON.parse(data);
        user_to_oauth[user_id] = access_token;
        res.json({ message: "success!" });
        const user = client.users.fetch(user_id, false).then((user) => {
          user.send("You are logged in!");
        });
      }
    });
  });

  my_req.on("error", (error) => {
    console.log(error);
  });

  my_req.write(postData);
  my_req.end();
});

app.listen(PORT, () => {
  console.log('Listening on port', PORT);
});
