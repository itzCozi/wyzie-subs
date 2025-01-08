import mysql from "mysql2/promise";
import type { Connector } from "../types";
export default function mysqlConnector(opts: mysql.ConnectionOptions): Connector;
