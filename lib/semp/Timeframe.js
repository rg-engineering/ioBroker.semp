

/* todo



*/


class Timeframe {

    constructor(settings, parentAdapter) {

        this.settings = settings.EnergyRequestPeriod;
        this.deviceName = settings.DeviceName;

        this.isActive = false;
        this.parentAdapter = parentAdapter;
        this.SwitchOffAtEndOfTimer = settings.SwitchOffAtEndOfTimer;

        this.parentAdapter.log.debug("timeframe constructor " + JSON.stringify(settings));

        this.EarliestStart = -1;
        this.LatestEnd = -1;
        this.MinRunningTime = -1;
        this.MaxRunningTime = -1;
        this.CurrentOnTime = -1

        this.timediff = 60;
        this.Status = "Off";

        this.CanceledOnDay = -1;

        this.Prepare();

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

    async Prepare() {
        await this.createObjects();

        let key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".TimeOn";
        let curVal = await this.parentAdapter.getStateAsync(key);

        if (curVal != null) {
            let vals = curVal.val.split(":");
            if (vals.length > 1) {

                //todo

            }
        }

    }

    Start() {

        let now = new Date();
        let dayOfWeek = now.getDay();

        //if we have canceld it today, do not check again
        if (this.CanceledOnDay != dayOfWeek) {
            this.CanceledOnDay = -1;

            let start = this.settings.EarliestStartTime.split(":");
            let end = this.settings.LatestEndTime.split(":");
            let minRunTimes = this.settings.MinRunTime.split(":");
            let maxRunTimes = this.settings.MaxRunTime.split(":");

            let allchecked = true;
            if (start.length != 2) {
                this.parentAdapter.log.error(this.deviceName + " unsupported time format " + this.settings.EarliestStartTime + ", should be hh:mm");
                allchecked = false;
            }
            if (end.length != 2) {
                this.parentAdapter.log.error(this.deviceName + " unsupported time format " + this.settings.LatestEndTime + ", should be hh:mm");
                allchecked = false;
            }
            if (minRunTimes.length != 2) {
                this.parentAdapter.log.error(this.deviceName + " unsupported time format " + this.settings.MinRunTime + ", should be hh:mm");
                allchecked = false;
            }
            if (maxRunTimes.length != 2) {
                this.parentAdapter.log.error(this.deviceName + " unsupported time format " + this.settings.MaxRunTime + ", should be hh:mm");
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

                this.CurrentOnTime = 0;

            }
            else {
                this.EarliestStart = -1;
                this.LatestEnd = -1;
                this.MinRunningTime = -1;
                this.MaxRunningTime = -1;
                this.CurrentOnTime = -1;
            }
        }
        this.parentAdapter.log.debug(this.deviceName + " timeframe " + this.settings.ID + " start earliest: " + this.EarliestStart + " latest: " + this.LatestEnd + " MinRunTime: " + this.MinRunningTime + " MaxRuntime: " + this.MaxRunningTime);

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

                this.CurrentOnTime = this.CurrentOnTime + this.timediff;

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

        this.parentAdapter.log.debug(this.deviceName + " timeframe " + this.settings.ID + " update earliest: " + this.EarliestStart + " latest: " + this.LatestEnd + " MinRunTime: " + this.MinRunningTime + " MaxRuntime: " + this.MaxRunningTime);
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
                this.parentAdapter.log.debug(this.deviceName + "turn device off at end of MaxRunTime");
            }
        }

        if (this.EarliestStart == 0 && this.LatestEnd == 0) {

            if (this.SwitchOffAtEndOfTimer) {
                SwitchOff = true;
                this.parentAdapter.log.debug(this.deviceName + "turn device off at end of LatestEnd");
            }

            this.isActive = false;
            this.Start();
        }

        this.UpdateObjects();

        this.parentAdapter.log.debug(this.deviceName + " (" + this.settings.ID + ") Check2Switch " + SwitchOff);

        return SwitchOff;

    }

    CancelActiveTimeframe() {
        if (this.isActive) {
            this.EarliestStart = 0;
            this.LatestEnd = 0;

            //make sure not to restart today
            let now = new Date();
            let dayOfWeek = now.getDay();
            this.CanceledOnDay = dayOfWeek;


        }
    }

    //=============================================================
    async createObjects() {

        let key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".TimeOn";
        let obj = {
            type: "state",
            common: {
                name: "TimeOn",
                type: "string",
                role: "value.time",
                unit: "hh:mm",
                read: true,
                write: false
            }
        };
        await this.CreateObject(key, obj);

        key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".RemainingMaxOnTime";
        obj = {
            type: "state",
            common: {
                name: "RemainingMaxOnTime",
                type: "string",
                role: "value.time",
                unit: "hh:mm",
                read: true,
                write: false
            }
        };
        await this.CreateObject(key, obj);

    }

    async CreateObject(key, obj) {

        const obj_new = await this.parentAdapter.getObjectAsync(key);
        //adapter.log.warn("got object " + JSON.stringify(obj_new));

        if (obj_new != null) {

            if ((obj_new.common.role != obj.common.role
                || obj_new.common.type != obj.common.type
                || (obj_new.common.unit != obj.common.unit && obj.common.unit != null)
                || obj_new.common.read != obj.common.read
                || obj_new.common.write != obj.common.write
                || obj_new.common.name != obj.common.name)
                && obj.type === "state"
            ) {
                this.parentAdapter.log.warn("change object " + JSON.stringify(obj) + " " + JSON.stringify(obj_new));
                await this.parentAdapter.extendObject(key, {
                    common: {
                        name: obj.common.name,
                        role: obj.common.role,
                        type: obj.common.type,
                        unit: obj.common.unit,
                        read: obj.common.read,
                        write: obj.common.write
                    }
                });
            }
        }
        else {
            await this.parentAdapter.setObjectNotExistsAsync(key, obj);
        }
    }

    UpdateObjects() {
        let Hour = Math.floor(this.CurrentOnTime / 60 / 60);
        let Minutes = Math.floor((this.CurrentOnTime - (Hour * 60 * 60)) / 60);
        let sHour = "0";
        if (Hour < 10) {
            sHour = "0" + Hour;
        }
        else {
            sHour = Hour;
        }
        let sMinutes = "0";
        if (Minutes < 10) {
            sMinutes = "0" + Minutes;
        }
        else {
            sMinutes = Minutes;
        }

        let val = sHour + ":" + sMinutes;

        let key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".TimeOn";

        this.parentAdapter.setState(key, { ack: true, val: val });

        //=======================================================
        val = "00:00";

        Hour = Math.floor((this.LatestEnd - this.EarliestStart)/ 60 / 60);
        Minutes = Math.floor(((this.LatestEnd - this.EarliestStart) - (Hour * 60 * 60)) / 60);
        sHour = "0";
        if (Hour < 10) {
            sHour = "0" + Hour;
        }
        else {
            sHour = Hour;
        }
        sMinutes = "0";
        if (Minutes < 10) {
            sMinutes = "0" + Minutes;
        }
        else {
            sMinutes = Minutes;
        }

        val = sHour + ":" + sMinutes;


        key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".RemainingMaxOnTime";

        this.parentAdapter.setState(key, { ack: true, val: val });
    }

}


module.exports = {
    Timeframe
};