import fs from 'fs'
import sqlite3 from 'sqlite3'

const DATA_DIRECTORY = "./data";

if (!fs.existsSync(DATA_DIRECTORY)) {
  fs.mkdirSync(DATA_DIRECTORY, { recursive: true }, (err) => {
    if (err) {
      console.error('Error creating directory:', err);
    } else {
      console.log('Directory created successfully.');
    }
  });
} else {
  console.log('Directory already exists.');
}

const db = new sqlite3.Database(`${DATA_DIRECTORY}/data.db`);

class Table {
  constructor(name, columns) {
    this.name = name;
    db.run(`CREATE TABLE IF NOT EXISTS ${name} (${columns.join(', ')})`);
  }

  addRow(columns, values, callback) {
    const params = columns.map(() => '?');
    const sql = `INSERT INTO ${this.name} (${columns.join(', ')}) VALUES (${params.join(', ')})`;
    db.run(sql, values, callback);
  }
}

class Route extends Table {
  static get KeyId() { return "id"; } // Primary key
  static get KeyRouteId() { return "route_id"; } // Ride with GPS route id of the route
  static get KeyDate() { return "date"; } // Date with time of the training ride
  static get KeyUserId() { return "user_id"; } // The user_id that added the route

  constructor() {
    super("route", [
      `${Route.KeyId} INTEGER PRIMARY KEY AUTOINCREMENT`,
      `${Route.KeyRouteId} INTEGER`,
      `${Route.KeyDate} TEXT`,
      `${Route.KeyUserId} INTEGER`,
    ]);
  }

  parseRoute(url_or_route_id) {
    const url_regex = /^https:\/\/ridewithgps.com\/routes\/([0-9]+)$/;
    const route_id_regex = /^([0-9]+)$/;

    var route_id = null;

    var match = url_or_route_id.match(url_regex);
    if (match) {
      route_id = match[1];
    }

    match = url_or_route_id.match(route_id_regex);
    if (match) {
      route_id = match[1];
    }

    return route_id;
  }

  addRoute(user_id, route_id, date, callback) {
    this.addRow([Route.KeyUserId, Route.KeyRouteId, Route.KeyDate], [user_id, route_id, date.toISOString()], callback);
  }

  getNextRoute(callback) {
    const columns = [Route.KeyRouteId, Route.KeyDate];
    const currentDate = new Date().toISOString();
    const sql = `SELECT ${columns.join(', ')} FROM ${this.name} WHERE ${Route.KeyDate} > ? ORDER BY ${Route.KeyDate} ASC LIMIT 1`;
    db.all(sql, [currentDate], (err, rows) => {
      if (err) {
        callback(err, null);
      } else {
        console.log(rows);
        if (rows && rows.length > 0) {
          callback(err, Object.values(rows[0]));
        } else {
          callback(err, null);
        }
      }
    });
  }

  getAllRoutes(callback) {
    const columns = [Route.KeyRouteId, Route.KeyDate];
    const sql = `SELECT ${columns.join(', ')} FROM ${this.name} ORDER BY ${Route.KeyDate} ASC`;
    db.all(sql, (err, rows) => {
      if (err) {
        callback(err, null);
      } else {
        if (rows && rows.length > 0) {
          const values = []
          rows.forEach((row) => {
            console.log(row);
            values.push(Object.values(row));
          })
          callback(err, values);
        } else {
          callback(err, null);
        }
      }
    })
  }

  undo(user_id, callback) {
    const columns = [Route.KeyId, Route.KeyRouteId, Route.KeyDate];
    var sql = `SELECT ${columns.join(', ')} FROM ${this.name} WHERE ${Route.KeyUserId} = ? ORDER BY ${Route.KeyId} LIMIT 1`;
    db.all(sql, [user_id], (err, rows) => {
      if (err) {
        callback(err, null);
      } else if (rows && rows.length > 0) {
        const values = Object.values(rows[0]);
        sql = `DELETE FROM ${this.name} WHERE ${Route.KeyId} = ?`;
        db.run(sql, [values[0]], (err) => {
          if (err) {
            callback(err, null);
          } else {
            callback(err, [values[1], values[2]]);
          }
        });
      } else {
        callback(err, null);
      }
    });
  }
};

export const routeTable = new Route();