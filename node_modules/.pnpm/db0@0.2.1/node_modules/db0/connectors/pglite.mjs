import { PGlite } from "@electric-sql/pglite";
export default function pgliteConnector(opts = {}) {
  let _client;
  function getClient() {
    if (_client) {
      return _client;
    }
    _client = new PGlite(opts);
    return _client;
  }
  async function query(sql, params = []) {
    const client = await getClient();
    const normalizedSql = normalizeParams(sql);
    const result = await client.query(normalizedSql, params);
    return result;
  }
  return {
    name: "pglite",
    dialect: "postgresql",
    exec(sql) {
      return query(sql);
    },
    prepare(sql) {
      const stmt = {
        _sql: sql,
        _params: [],
        bind(...params) {
          if (params.length > 0) {
            this._params = params;
          }
          return this;
        },
        async all(...params) {
          const result = await query(
            this._sql,
            params.length > 0 ? params : this._params
          );
          return result.rows;
        },
        async run(...params) {
          const result = await query(
            this._sql,
            params.length > 0 ? params : this._params
          );
          return {
            success: true,
            // Adding the success property to match the expected type
            result,
            rows: result.rows
          };
        },
        async get(...params) {
          const result = await query(
            this._sql,
            params.length > 0 ? params : this._params
          );
          return result.rows[0];
        }
      };
      return stmt;
    }
  };
}
function normalizeParams(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}
