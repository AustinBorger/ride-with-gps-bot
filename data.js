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
  static get KeyId() { return "id"; }
  static get KeyRouteId() { return "route_id"; }
  static get KeyDate() { return "date"; }

  constructor() {
    super("route", [`${Route.KeyId} INTEGER PRIMARY KEY AUTOINCREMENT`, `${Route.KeyRouteId} INTEGER`, `${Route.KeyDate} TEXT`]);
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

  addRoute(route_id, date, callback) {
    this.addRow([Route.KeyRouteId, Route.KeyDate], [route_id, date.toISOString()], callback);
  }

  getNextRoute(callback) {
    const currentDate = new Date().toISOString();
    const sql = `SELECT ${Route.KeyRouteId}, ${Route.KeyDate} FROM ${this.name} WHERE ${Route.KeyDate} > ? ORDER BY ${Route.KeyDate} ASC LIMIT 1`;
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
    const sql = `SELECT ${Route.KeyRouteId}, ${Route.KeyDate} FROM ${this.name} ORDER BY ${Route.KeyDate} ASC`;
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
};

export const routeTable = new Route();