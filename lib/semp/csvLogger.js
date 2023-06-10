
const fs = require('fs');
const Path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

class csvLogger {

    constructor(parentAdapter) {

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
        let day = now.getDay();

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

            let data = {
                file: file,
                headers: headers
            }
            this.logData.push(data);
        }
        catch (e) {
            this.parentAdapter.log.error("exception in StartLog [" + e + "]");
        }
    }

    RestartLog(idx) {
        try {
            let file = this.logData[idx].file;
            let headers = this.logData[idx].headers;

            this.CreateCsvWriter(file, headers);
        }
        catch (e) {
            this.parentAdapter.log.error("exception in RestartLog [" + e + "]");
        }
    }

    CreateCsvWriter(file, headers) {
        let filename = this.CreateFilename(file);

        this.parentAdapter.log.info("logging on " + filename);
        let csvWriter = createCsvWriter({
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

            /*
            exception in CreateFilename[Error: ENOENT: no such file or directory, stat '/home/datalogger/projects/test1234.csv']
            wenn file nicht vorhanden
            */

            let stats = null;
            try {
                let stats = fs.statSync(file);
            }
            catch (e) {
                this.parentAdapter.log.error("exception in fs.statSync [" + e + "]");
            }

            let exist = fs.existsSync(file);

            this.parentAdapter.log.warn(" CreateFilename " + JSON.stringify(stats) + " " + exist);


            let path = "";
            let filename = "semp";
            let extension = ".csv"

            if (!exist || stats.isFile()) {

                path = Path.dirname(file);
                extension = Path.extname(file);
                filename = Path.basename(file, extension);

                this.parentAdapter.log.debug("csv filename provided: " + path + " " + filename + " " + extension);

            }
            else if (stats.isDirectory()) {
                path = file;

                this.parentAdapter.log.debug("csv only path provided :" + path );
            }
            else {
                this.parentAdapter.log.error("invalid path / file for csv logging " + file);
            }

            const now = new Date();
            let year = now.getFullYear();
            let month = ("0" + (now.getMonth() + 1)).slice(-2);
            let date = ("0" + now.getDate()).slice(-2);
            let datestring = year + month + date;

            this.Path2Csv = path;

            newFilename = path + "/" + filename + "_" + datestring  + extension;

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
            this.walkDir(this.Path2Csv, function (filePath) {
                fs.stat(filePath, function (err, stat) {
                    var now = new Date().getTime();
                    var endTime = new Date(stat.mtime).getTime() + (3 * 24 * 60 * 60 * 1000); // 3 days in miliseconds

                    if (err) {
                        //this.parentAdapter.log.error("error deleting old files " + err);
                        return;
                    }

                    if (now > endTime) {
                        //this.parentAdapter.log.info("deleting " + filePath);
                        return fs.unlink(filePath, function (err) {
                            if (err) {
                                //this.parentAdapter.log.error("error deleting old files " + err);
                                return;
                            }
                        });
                    }
                })
            });
        }
        catch (e) {
            this.parentAdapter.log.error("exception in deleteOldFiles [" + e + "]");
        }
    }

    walkDir(dir, callback) {
        fs.readdirSync(dir).forEach(f => {
            let dirPath = Path.join(dir, f);
            let isDirectory = fs.statSync(dirPath).isDirectory();
            isDirectory ?
                this.walkDir(dirPath, callback) : callback(Path.join(dir, f));
        });
    };


}

module.exports = {
    csvLogger
};