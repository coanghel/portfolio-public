const { database } = require("./config");
const knex = require("knex")({
  client: "mysql2",
  connection: database,
});

knex.schema.hasTable("gdrive_watches").then((exists) => {
  if (!exists) {
    return knex.schema.createTable("gdrive_watches", (table) => {
      table.string("watch_id").primary();
      table.string("watch_resource_id");
      table.string("file_id");
      table.bigInteger("expiration");
    });
  }
});
knex.schema.hasTable("routeData").then((exists) => {
  if (!exists) {
    return knex.schema.createTable("routeData", (table) => {
      table.string("file_id");
      table.integer("row_num");
      table.primary(["file_id", "row_num"]);
    });
  }
});

module.exports = knex;
