function sqlTemplate(strings, ...values) {
  if (!isTemplateStringsArray(strings) || !Array.isArray(values)) {
    throw new Error("[db0] invalid template invokation");
  }
  const staticIndexes = [];
  let result = strings[0] || "";
  for (let i = 1; i < strings.length; i++) {
    if (result.endsWith("{") && strings[i].startsWith("}")) {
      result = result.slice(0, -1) + values[i - 1] + strings[i].slice(1);
      staticIndexes.push(i - 1);
      continue;
    }
    result += `?${strings[i] ?? ""}`;
  }
  const dynamicValues = values.filter((_, i) => !staticIndexes.includes(i));
  return [result.trim(), dynamicValues];
}
function isTemplateStringsArray(strings) {
  return Array.isArray(strings) && "raw" in strings && Array.isArray(strings.raw);
}

const SQL_WITH_RES_RE = /^select/i;
function createDatabase(connector) {
  return {
    get dialect() {
      return connector.dialect;
    },
    exec: (sql) => {
      return Promise.resolve(connector.exec(sql));
    },
    prepare: (sql) => {
      return connector.prepare(sql);
    },
    sql: async (strings, ...values) => {
      const [sql, params] = sqlTemplate(strings, ...values);
      if (SQL_WITH_RES_RE.test(sql)) {
        const rows = await connector.prepare(sql).all(...params);
        return {
          rows
        };
      } else {
        const res = await connector.prepare(sql).run(...params);
        return res;
      }
    }
  };
}

const connectors = {
  sqlite: "db0/connectors/better-sqlite3",
  postgresql: "db0/connectors/postgresql",
  pglite: "db0/connectors/pglite",
  "cloudflare-d1": "db0/connectors/cloudflare-d1",
  libsql: "db0/connectors/libsql/node",
  "libsql-node": "db0/connectors/libsql/node",
  "libsql-http": "db0/connectors/libsql/http",
  "libsql-web": "db0/connectors/libsql/web",
  bun: "db0/connectors/bun-sqlite",
  "bun-sqlite": "db0/connectors/bun-sqlite",
  planetscale: "db0/connectors/planetscale"
};

export { connectors, createDatabase };
