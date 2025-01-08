import { type PGliteOptions } from "@electric-sql/pglite";
import type { Connector } from "../types";
export type ConnectorOptions = PGliteOptions;
export default function pgliteConnector(opts?: ConnectorOptions): Connector;
