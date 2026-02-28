"use strict";
/* eslint-disable prefer-template */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const csv_writer_1 = require("csv-writer");
const fs_1 = __importDefault(require("fs"));
const Path = __importStar(require("path"));
const base_1 = __importDefault(require("./base"));
class csvLogger extends base_1.default {
    parentAdapter;
    lastDay;
    csvWriters;
    logData;
    Path2Csv;
    constructor(parentAdapter) {
        super(parentAdapter, 0, "csvLogger");
        this.parentAdapter = parentAdapter;
        const now = new Date();
        this.lastDay = now.getDay();
        this.csvWriters = [];
        this.logData = [];
        this.Path2Csv = "";
    }
    RotateLog() {
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
    StartLog(file, headers) {
        try {
            this.CreateCsvWriter(file, headers);
            const data = {
                file: file,
                headers: headers
            };
            this.logData.push(data);
        }
        catch (e) {
            this.parentAdapter.log.error("exception in StartLog [" + e + "]");
        }
    }
    RestartLog(idx) {
        try {
            const file = this.logData[idx].file;
            const headers = this.logData[idx].headers;
            this.CreateCsvWriter(file, headers);
        }
        catch (e) {
            this.parentAdapter.log.error("exception in RestartLog [" + e + "]");
        }
    }
    CreateCsvWriter(file, headers) {
        const filename = this.CreateFilename(file);
        if (!filename) {
            this.parentAdapter.log.error("CreateCsvWriter: could not determine filename for " + file);
            return;
        }
        this.parentAdapter.log.info("logging on " + filename);
        const csvWriter = (csv_writer_1.createObjectCsvWriter)({
            path: filename,
            header: headers,
            fieldDelimiter: ";",
            append: true
        });
        this.csvWriters.push(csvWriter);
    }
    CreateFilename(file) {
        let newFilename = "";
        try {
            let stats = null;
            try {
                stats = fs_1.default.statSync(file);
            }
            catch (e) {
                // fs.statSync throws if file does not exist - that's OK, we catch and continue
                this.parentAdapter.log.debug("fs.statSync error (may be non-existent file): " + e);
            }
            const exist = fs_1.default.existsSync(file);
            this.parentAdapter.log.debug(" CreateFilename stats: " + JSON.stringify(stats) + " exist:" + exist);
            let targetPath = "";
            let filename = "semp";
            let extension = ".csv";
            if (!exist || (stats && stats.isFile())) {
                targetPath = Path.dirname(file);
                extension = Path.extname(file) || extension;
                filename = Path.basename(file, extension) || filename;
                this.parentAdapter.log.debug("csv filename provided: " + targetPath + " " + filename + " " + extension);
            }
            else if (stats && stats.isDirectory()) {
                targetPath = file;
                this.parentAdapter.log.debug("csv only path provided :" + targetPath);
            }
            else {
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
        }
        catch (e) {
            this.parentAdapter.log.error("exception in CreateFilename [" + e + "]");
        }
        return newFilename;
    }
    async WriteCSVLog(id, records) {
        try {
            this.RotateLog();
            this.parentAdapter.log.debug("write to csv " + JSON.stringify(records));
            if (this.csvWriters[id] != null) {
                await this.csvWriters[id].writeRecords(records);
            }
        }
        catch (e) {
            this.parentAdapter.log.error("exception in WriteCSVLog [" + e + "]");
        }
    }
    deleteOldFiles() {
        try {
            if (!this.Path2Csv || !fs_1.default.existsSync(this.Path2Csv)) {
                return;
            }
            this.walkDir(this.Path2Csv, (filePath) => {
                fs_1.default.stat(filePath, (err, stat) => {
                    if (err || !stat) {
                        return;
                    }
                    const now = Date.now();
                    const endTime = new Date(stat.mtime).getTime() + (3 * 24 * 60 * 60 * 1000); // 3 days in miliseconds
                    if (now > endTime) {
                        fs_1.default.unlink(filePath, (err) => {
                            if (err) {
                                // ignore
                            }
                        });
                    }
                });
            });
        }
        catch (e) {
            this.parentAdapter.log.error("exception in deleteOldFiles [" + e + "]");
        }
    }
    walkDir(dir, callback) {
        const entries = fs_1.default.readdirSync(dir);
        entries.forEach(f => {
            const dirPath = Path.join(dir, f);
            const stat = fs_1.default.statSync(dirPath);
            const isDirectory = stat.isDirectory();
            if (isDirectory) {
                this.walkDir(dirPath, callback);
            }
            else {
                callback(Path.join(dir, f));
            }
        });
    }
}
exports.default = csvLogger;
//# sourceMappingURL=csvLogger.js.map