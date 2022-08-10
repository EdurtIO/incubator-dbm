import { BaseConfig } from "@renderer/config/base.config";

export class MySQLConfig implements BaseConfig {
  columnDiskUsedRatio = `SELECT '{0}' AS db, '{1}' AS name`;
  columnItems = `
SELECT TABLE_SCHEMA AS "database", TABLE_NAME AS tableName, COLUMN_NAME AS name
  -- DATA_TYPE AS type
--   concat(DATA_TYPE, '(', CHARACTER_MAXIMUM_LENGTH, ')') AS type
FROM information_schema.columns
WHERE table_schema = '{0}' AND table_name = '{1}'
GROUP BY COLUMN_NAME
`;
  connectionFetchAll = `
SELECT
  substring_index(host, ':', 1) AS categories,
  count(1) AS value
FROM information_schema.processlist
GROUP BY state, categories
`;
  databaseCreate = `CREATE DATABASE {0}`;
  databaseDiskUsedRatio = `
SELECT
  table_schema AS name, '/' AS path,
  concat(truncate(SUM(data_length) / 1024 / 1024, 2), 'MB') AS totalSize,
  concat(truncate(sum(index_length) / 1024 / 1024, 2), 'MB') AS indexSize,
  concat(truncate(SUM(data_length) / 1024 / 1024, 2) - truncate(sum(index_length) / 1024 / 1024, 2), 'MB') AS applySize,
  round(sum(index_length) / SUM(data_length) * 100, 3) AS value
FROM information_schema.tables
GROUP BY TABLE_SCHEMA
ORDER BY totalSize DESC
  `;
  databaseFetchAll = `
SELECT schema_name AS name
FROM information_schema.schemata
`;
  databaseItems = `
SELECT schema_name AS name
FROM information_schema.schemata
GROUP BY schema_name
`;
  databaseItemsFilterFuzzy = `
SELECT schema_name AS name
FROM information_schema.schemata
WHERE schema_name LIKE '%{0}%'
GROUP BY schema_name
`;
  databaseItemsFilterPrecise = `
SELECT schema_name AS name
FROM information_schema.schemata
WHERE schema_name = '{0}'
GROUP BY schema_name
`;
  diskUsedRatio = `
SELECT
  'default' AS name, '/' AS path,
  concat(truncate(SUM(data_length) / 1024 / 1024, 2), 'MB') AS totalSize,
  concat(truncate(sum(index_length) / 1024 / 1024, 2), 'MB') AS indexSize,
  concat(truncate(SUM(data_length) / 1024 / 1024, 2) - truncate(sum(index_length) / 1024 / 1024, 2), 'MB') AS applySize,
  round((truncate(SUM(data_length) / 1024 / 1024, 2) - truncate(sum(index_length) / 1024 / 1024, 2)) / truncate(SUM(data_length) / 1024 / 1024, 2) * 100, 3) AS value
FROM information_schema.tables
`;
  processesFetchAll = `
SELECT
    id, now() AS time, info AS query, time AS elapsed,
    db, host, user, state, command
FROM information_schema.PROCESSLIST
`;
  schemaFetchAll: string;
  serverInfo = `SHOW STATUS`;
  slowQueryFetchAll: string;
  tableDiskUsedRatio = `
SELECT
  TABLE_NAME AS name, '/' AS path,
  concat(truncate(SUM(data_length) / 1024 / 1024, 2), 'MB') AS totalSize,
  concat(truncate(sum(index_length) / 1024 / 1024, 2), 'MB') AS indexSize,
  concat(truncate(SUM(data_length) / 1024 / 1024, 2) - truncate(sum(index_length) / 1024 / 1024, 2), 'MB') AS applySize,
  round(sum(index_length) / SUM(data_length) * 100, 3) AS value
FROM information_schema.tables
WHERE table_schema = '{0}'
GROUP BY TABLE_NAME
ORDER BY totalSize DESC
  `;
  tableFetchAll = `
SELECT table_name AS name
FROM information_schema.tables
WHERE table_schema = '{0}'
  `;
  tableItems = `
SELECT table_schema AS "database", TABLE_NAME AS name
FROM information_schema.tables
WHERE table_schema = '{0}'
GROUP BY TABLE_NAME
`;
  tableItemsFilterFuzzy = `
SELECT table_name AS name
FROM information_schema.tables
WHERE table_schema = '{0}' AND table_name LIKE '%{1}%'
  `;
  tableItemsFilterPrecise = `
SELECT table_name AS name
FROM information_schema.tables
WHERE table_schema = '{0}' AND table_name = '{1}'
  `;
  tableSchemaFetchAll: string;
  version = `SELECT version() AS version`;
  stopProcessor = `kill query {0}`;
  showCreateDatabase = 'SHOW CREATE DATABASE `{0}`';
  showTableWithSize = `
SELECT
  TABLE_NAME AS name, ENGINE AS engine, TABLE_ROWS AS totalRows,
  concat(round(sum(data_length/1024/1024),2), 'MB') AS totalSize
FROM information_schema.tables
WHERE table_schema = '{0}'
GROUP BY TABLE_NAME
  `;
  columnRename= `
ALTER TABLE {0} CHANGE COLUMN {1} {2} {3}
  `;
  columnAddComment = `
ALTER TABLE {0} CHANGE COLUMN {1} {2} {3} COMMENT '{4}'
  `;
  getCharacterAndCollation = `
    SELECT
      CHARACTER_SET_NAME AS 'name',
      GROUP_CONCAT(COLLATION_NAME ORDER BY COLLATION_NAME ASC) AS 'values'
    FROM information_schema.COLLATIONS
    GROUP BY CHARACTER_SET_NAME
    ORDER BY CHARACTER_SET_NAME ASC
  `;
  databaseRename: string;
}
