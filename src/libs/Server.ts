import express, {Express} from "express";
import morgan from "morgan";

// -- ROUTES -- \\

import {ServerOptions} from "../types/serverOptions";
import {WebsocketServer} from "./WebsocketServer";
import * as fs from "node:fs";


// -- Server -- \\

export class Server {
    private readonly port: number
    private readonly app: Express

    /**
     * Constructor function for the Server class.
     *
     * @param {ServerOptions} options - The options for the server.
     */
    public constructor(options: ServerOptions) {
        this.port = options.port;
        this.app = express();
        this.app.use(morgan("dev"));
        this.app.use("/public", express.static("./src/public", {
            cacheControl: true,
            etag: true,
            lastModified: true,
        }))
        this.setAPIS()
    }
        
        /**
     * Starts the server and listens on the specified port.
     *
     * @return {boolean|string} Returns true if the server started successfully,
     * or an error message if there was an exception.
     */
    public startServer(): boolean | string {
        try {
            const server = this.app.listen(this.port)
            new WebsocketServer(server)
            return true
        } catch (e: any) {
            return e
        }
    }
    
    public async setAPIS(): Promise<void> {
        for (const file of fs.readdirSync("./src/routes")) {
            const impo = await import(`../routes/${file}`)
            this.app.use(impo.router)
        }
    }
}