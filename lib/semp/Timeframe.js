

/* todo

    * Gerät ausschalten, wenn Zeit abgelaufen ist

*/


class Timeframe {

    constructor(settings, parentAdapter, SwitchOffAtEndOfTimer) {

        this.settings = settings;
        this.isActive = false;
        this.parentAdapter = parentAdapter;
        this.SwitchOffAtEndOfTimer = SwitchOffAtEndOfTimer;

        this.parentAdapter.log.debug("timeframe constructor " + JSON.stringify(settings));

        this.EarliestStart = -1;
        this.LatestEnd = -1;
        this.MinRunningTime = -1;
        this.MaxRunningTime = -1;

        this.timediff = 60;
        this.Status = "Off";

        this.Start();

        this.UpdateTimesID = null;
        this.UpdateTimesID = setInterval(this.Update.bind(this), this.timediff * 1000);

    }

    destructor() {
        this.parentAdapter.log.debug("destructor called ");
        if (this.UpdateTimesID != null) {
            clearInterval(this.UpdteTimesID);
            this.UpdteTimesID = null;
        }
    }

    SetDeviceStatus(status) {
        this.Status = status;
    }

    Start() {

        let now = new Date();
        let dayOfWeek = now.getDay();

        let start = this.settings.EarliestStartTime.split(":");
        let end = this.settings.LatestEndTime.split(":");
        let minRunTimes = this.settings.MinRunTime.split(":");
        let maxRunTimes = this.settings.MaxRunTime.split(":");

        let allchecked = true;
        if (start.length != 2) {
            this.parentAdapter.log.error("unsupported time format " + this.settings.EarliestStartTime + ", should be hh:mm");
            allchecked = false;
        }
        if (end.length != 2) {
            this.parentAdapter.log.error("unsupported time format " + this.settings.LatestEndTime + ", should be hh:mm");
            allchecked = false;
        }
        if (minRunTimes.length != 2) {
            this.parentAdapter.log.error("unsupported time format " + this.settings.MinRunTime + ", should be hh:mm");
            allchecked = false;
        }
        if (maxRunTimes.length != 2) {
            this.parentAdapter.log.error("unsupported time format " + this.settings.MaxRunTime + ", should be hh:mm");
            allchecked = false;
        }

        //check days
        this.parentAdapter.log.debug("check run today  " + dayOfWeek + " " + this.settings.Days);
        let runToday = false;
        if (this.settings.Days == "everyDay") {
            runToday = true;
        }
        else if (this.settings.Days == "Monday" && dayOfWeek == 1) {
            runToday = true;
        }
        else if (this.settings.Days == "Tuesday" && dayOfWeek == 2) {
            runToday = true;
        }
        else if (this.settings.Days == "Wednesday" && dayOfWeek == 3) {
            runToday = true;
        }
        else if (this.settings.Days == "Thursday" && dayOfWeek == 4) {
            runToday = true;
        }
        else if (this.settings.Days == "Friday" && dayOfWeek == 5) {
            runToday = true;
        }
        else if (this.settings.Days == "Saturday" && dayOfWeek == 6) {
            runToday = true;
        }
        else if (this.settings.Days == "Sunday" && dayOfWeek == 0) {
            runToday = true;
        }

        if (allchecked && runToday) {

            //Start < End check fehlt noch
            //disable TimerActive fehlt noch
            let StartTime = new Date();
            StartTime.setHours(start[0]);
            StartTime.setMinutes(start[1]);
            StartTime.setSeconds(0);

            let EndTime = new Date();
            EndTime.setHours(end[0]);
            EndTime.setMinutes(end[1]);
            EndTime.setSeconds(0);

            let StartIn = StartTime.getTime() - now.getTime();
            let EndIn = EndTime.getTime() - now.getTime();

            if (StartIn < 0) {
                this.EarliestStart = 0;
            }
            else {
                this.EarliestStart = Math.floor(StartIn / 1000);
            }

            if (EndIn < 0) {
                this.LatestEnd = 0;
            }
            else {
                this.LatestEnd = Math.floor(EndIn / 1000);
            }

            this.MinRunningTime = (minRunTimes[0] * 60 * 60) + (minRunTimes[1] * 60);
            this.MaxRunningTime = (maxRunTimes[0] * 60 * 60) + (maxRunTimes[1] * 60);

        }
        else {
            this.EarliestStart = -1;
            this.LatestEnd = -1;
            this.MinRunningTime = -1;
            this.MaxRunningTime = -1;
        }

        this.parentAdapter.log.debug("timeframe start earliest: " + this.EarliestStart + " latest: " + this.LatestEnd + " MinRunTime: " + this.MinRunningTime + " MaxRuntime: " + this.MaxRunningTime);

    }

    Update() {

        this.EarliestStart = this.EarliestStart - this.timediff;
        if (this.EarliestStart < 0) {
            this.EarliestStart = 0;
        }
        this.LatestEnd = this.LatestEnd - this.timediff;
        if (this.LatestEnd < 0) {
            this.LatestEnd = 0;
        }

        if (this.EarliestStart == 0 && this.LatestEnd > 0) {
            this.isActive = true;

            if (this.Status == "On") {
                this.MinRunningTime = this.MinRunningTime - this.timediff;
                if (this.MinRunningTime < 0) {
                    this.MinRunningTime = 0;
                }
                this.MaxRunningTime = this.MaxRunningTime - this.timediff;
                if (this.MaxRunningTime < 0) {
                    this.MaxRunningTime = 0;
                }
            }

        }

        this.parentAdapter.log.debug("timeframe update earliest: " + this.EarliestStart + " latest: " + this.LatestEnd + " MinRunTime: " + this.MinRunningTime + " MaxRuntime: " + this.MaxRunningTime);
    }

    getTimeframeData() {

        let timeframeData = null;
        if (this.EarliestStart > 0 || this.LatestEnd > 0) {
            timeframeData = {

                TimeframeId: this.settings.ID,
                DeviceId: "", //to be filled later
                EarliestStart: this.EarliestStart,
                LatestEnd: this.LatestEnd,
                MinRunningTime: this.MinRunningTime,
                MaxRunningTime: this.MaxRunningTime,
            };
        }
        return timeframeData;
    }


    Check2Switch() {
        let SwitchOff = false;
        if (this.isActive) {

            if (this.MaxRunningTime == 0) {
                SwitchOff = true;
                this.parentAdapter.log.debug("turn device off at end of MaxRunTime");
            }
        }

        if (this.EarliestStart == 0 && this.LatestEnd == 0) {

            if (this.SwitchOffAtEndOfTimer) {
                SwitchOff = true;
                this.parentAdapter.log.debug("turn device off at end of LatestEnd");
            }

            this.isActive = false;
            this.Start();
        }

        return SwitchOff;

    }

    CancelActiveTimeframe() {
        if (this.isActive) {
            this.EarliestStart = 0;
            this.LatestEnd = 0;
        }
    }

}


module.exports = {
    Timeframe
};