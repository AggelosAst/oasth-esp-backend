import {Oasth} from "./libs/Oasth";
import {Server} from "./libs/Server";
import {CsvWriter} from "./libs/CsvWriter";
import {DateTime} from "luxon";
import {Stop} from "./types/stopsAndDetails";
import {BusLocationData} from "./types/BusLocationData";
import {ClosestStop} from "./types/closestStop";
import haversine from "haversine";
import * as fs from "node:fs";

const csvWriter = new CsvWriter()

const oasth = new Oasth({
	options: {
		reuseSessions: false
	}
})

oasth.getSessionToken().then(_ => {
	oasth.getLines().then(async _ => {
		oasth.startRenewSchedule()
		const server: Server = new Server({
			port: 4040
		})
		server.startServer()
	})
})

