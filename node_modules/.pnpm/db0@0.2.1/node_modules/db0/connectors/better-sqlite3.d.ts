import type { Connector } from "../types";
export interface ConnectorOptions {
    cwd?: string;
    path?: string;
    name?: string;
}
export default function sqliteConnector(opts: ConnectorOptions): Connector;
