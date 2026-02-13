/* eslint-disable prefer-template */

import { createObjectCsvWriter } from "csv-writer";
import fs from "fs";
import * as Path from "path";

import type { Semp } from "../main";
import Base from "./base";

export default class csvLogger extends Base {

	parentAdapter: Semp;
	lastDay: number;
	csvWriters: { writeRecords: (records: any[]) => Promise<void> }[];
	logData: { file: string; headers: { id: string; title?: string }[] }[];
	Path2Csv: string;

	constructor(parentAdapter: Semp) {

		super(parentAdapter, 0, "csvLogger");

		this.parentAdapter = parentAdapter;

		const now = new Date();
		this.lastDay = now.getDay();

		this.csvWriters = [];
		this.logData = [];

		this.Path2Csv = "";
	}

	RotateLog(): void {

		//get date
		const now = new Date();
		const day = now.getDay();

		if (day != this.lastDay) {
			this.lastDay = day;
			this.parentAdapter.log.warn("need to rotate " + this.csvWriters.length);

			//close logs
			this.csvWriters = [];

			//delete older files
			this.deleteOldFiles();

			//create new logs
			for (let i = 0; i < this.logData.length; i++) {
				this.RestartLog(i);
			}

			this.parentAdapter.log.warn("rotated " + this.csvWriters.length);
		}
	}


	StartLog(file: string, headers: { id: string; title?: string }[]): void {
		try {
			this.CreateCsvWriter(file, headers);

			const data = {
				file: file,
				headers: headers
			};
			this.logData.push(data);
		} catch (e) {
			this.parentAdapter.log.error("exception in StartLog [" + e + "]");
		}
	}

	RestartLog(idx: number): void {
		try {
			const file = this.logData[idx].file;
			const headers = this.logData[idx].headers;

			this.CreateCsvWriter(file, headers);
		} catch (e) {
			this.parentAdapter.log.error("exception in RestartLog [" + e + "]");
		}
	}

	CreateCsvWriter(file: string, headers: { id: string; title?: string }[]): void {
		const filename = this.CreateFilename(file);

		if (!filename) {
			this.parentAdapter.log.error("CreateCsvWriter: could not determine filename for " + file);
			return;
		}

		this.parentAdapter.log.info("logging on " + filename);
		const csvWriter = createObjectCsvWriter({
			path: filename,
			header: headers,
			fieldDelimiter: ";",
			append: true
		});

		this.csvWriters.push(csvWriter as { writeRecords: (records: any[]) => Promise<void> });
	}


	CreateFilename(file: string): string {
		let newFilename = "";
		try {

			let stats: fs.Stats | null = null;
			try {
				stats = fs.statSync(file);
			} catch (e) {
				// fs.statSync throws if file does not exist - that's OK, we catch and continue
				this.parentAdapter.log.debug("fs.statSync error (may be non-existent file): " + e);
			}

			const exist = fs.existsSync(file);

			this.parentAdapter.log.debug(" CreateFilename stats: " + JSON.stringify(stats) + " exist:" + exist);


			let targetPath = "";
			let filename = "semp";
			let extension = ".csv";

			if (!exist || (stats && stats.isFile())) {

				targetPath = Path.dirname(file);
				extension = Path.extname(file) || extension;
				filename = Path.basename(file, extension) || filename;

				this.parentAdapter.log.debug("csv filename provided: " + targetPath + " " + filename + " " + extension);

			} else if (stats && stats.isDirectory()) {
				targetPath = file;

				this.parentAdapter.log.debug("csv only path provided :" + targetPath);
			} else {
				this.parentAdapter.log.error("invalid path / file for csv logging " + file);
				return "";
			}

			const now = new Date();
			const year = now.getFullYear();
			const month = ("0" + (now.getMonth() + 1)).slice(-2);
			const date = ("0" + now.getDate()).slice(-2);
			const datestring = year + month + date;

			this.Path2Csv = targetPath;

			newFilename = Path.join(targetPath, filename + "_" + datestring + extension);

		} catch (e) {
			this.parentAdapter.log.error("exception in CreateFilename [" + e + "]");
		}
		return newFilename;
	}

	async WriteCSVLog(id: number, records: any[]): Promise<void> {

		try {

			this.RotateLog();

			this.parentAdapter.log.debug("write to csv " + JSON.stringify(records));
			if (this.csvWriters[id] != null) {
				await this.csvWriters[id].writeRecords(records);
			}
		} catch (e) {
			this.parentAdapter.log.error("exception in WriteCSVLog [" + e + "]");
		}
	}

	deleteOldFiles(): void {
		try {
			if (!this.Path2Csv || !fs.existsSync(this.Path2Csv)) {
				return;
			}
			this.walkDir(this.Path2Csv, (filePath: string) => {
				fs.stat(filePath, (err, stat) => {
					if (err || !stat) {
						return;
					}
					const now = Date.now();
					const endTime = new Date(stat.mtime).getTime() + (3 * 24 * 60 * 60 * 1000); // 3 days in miliseconds

					if (now > endTime) {
						fs.unlink(filePath, (err) => {
							if (err) {
								// ignore
							}
						});
					}
				});
			});
		} catch (e) {
			this.parentAdapter.log.error("exception in deleteOldFiles [" + e + "]");
		}
	}

	walkDir(dir: string, callback: (filePath: string) => void): void {
		const entries = fs.readdirSync(dir);
		entries.forEach(f => {
			const dirPath = Path.join(dir, f);
			const stat = fs.statSync(dirPath);
			const isDirectory = stat.isDirectory();
			if (isDirectory) {
				this.walkDir(dirPath, callback);
			} else {
				callback(Path.join(dir, f));
			}
		});
	}


}

module.exports = {
	csvLogger
};