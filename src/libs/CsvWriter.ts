import * as csv from "csv"
import * as fs from "node:fs";
const csvWriter = require("csv-writer")

export class CsvWriter {
	public alreadyAdded: string[] = []
	public static Instance: CsvWriter
	
	public constructor() {
		CsvWriter.Instance = this
	}
	public async Save(bus_no: string, bus_line: string, arrivalTime: number, startTime: number): Promise<boolean> {
		return new Promise(async (resolve, reject) => {
			//if (this.alreadyAdded.includes(bus_no)) return resolve(false);
			const writer = csvWriter.createObjectCsvWriter({
				path: "data.csv",
				append: true,
				header: ["bus_no", "bus_line", "arrival_time", "start_time"]
			})
			await writer.writeRecords([{
				"bus_no": bus_no,
				"bus_line": bus_line,
				"arrival_time": arrivalTime,
				"start_time": startTime
			}]).then((_: any) => {
				this.alreadyAdded.push(bus_no)
				resolve(true)
			})
		})
	}
}