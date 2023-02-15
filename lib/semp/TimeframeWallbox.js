

/* todo
 
  


*/


class TimeframeWallbox {

    constructor(settings, parentAdapter) {

        this.ID = 1;

        this.deviceName = settings.DeviceName;

        this.isActive = false;
        this.parentAdapter = parentAdapter;
        this.SwitchOffAtEndOfTimer = settings.SwitchOffAtEndOfTimer;

        this.parentAdapter.log.debug("timeframeWallbox constructor " + JSON.stringify(settings));

        this.EarliestStart = 0; //always now
        //this.LatestEnd = 24 * 60 * 60; //in 24h
        this.LatestEnd = 12 * 60 * 60; //in 12h

        this.MinEnergy = settings.MinEnergy;
        this.MaxEnergy = settings.MaxEnergy;
        this.MinPower = settings.MinPower;
        this.MaxPower = settings.MaxPower;
        
        this.CurrentOnTime = 0;

        this.Prepare();

        this.timediff = 60;
        this.Status = "Off";

        this.CanceledOnDay = -1;
        this.CurrentEnergy = 0;
        this.CurrentEnergyDiff = 0;

        this.UpdateTimesID = null;
        this.UpdateTimesID = setInterval(this.Update.bind(this), this.timediff * 1000);

    }

    destructor() {
        this.parentAdapter.log.debug("timeframe destructor called " + this.UpdateTimesID);
        if (this.UpdateTimesID != null) {

            clearInterval(this.UpdateTimesID);
            this.UpdateTimesID = null;
            this.parentAdapter.log.debug("timeframe timer killed ");
        }
    }

    SetMinEnergy(value) {
        this.MinEnergy = value;
    }
    SetMaxEnergy(value) {
        this.MaxEnergy = value;
    }

    SetDeviceStatus(status) {
        this.Status = status;
    }

    setCurrentEnergy(energy) {

        this.CurrentEnergyDiff = energy - this.CurrentEnergy;

        this.CurrentEnergy = energy;

        //2023-02-15
        //somehow we increased minEnergy (0, max. 60kWh)
        //<MinEnergy>383</MinEnergy>
        //<MaxEnergy>60383</MaxEnergy>
        if (this.CurrentEnergyDiff < 0) {
            this.CurrentEnergyDiff = 0;
        }

        this.MinEnergy = this.MinEnergy - this.CurrentEnergyDiff;
        this.MaxEnergy = this.MaxEnergy - this.CurrentEnergyDiff;

        if (this.MinEnergy < 0) {
            this.MinEnergy = 0;
        }
        if (this.MaxEnergy < 0) {
            this.MaxEnergy = 0;
        }
    }

    async Prepare() {
        await this.createObjects();
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
            }
        }

        if (this.EarliestStart > 0 || this.LatestEnd > 0) {
            this.parentAdapter.log.debug(this.deviceName + " timeframe " + this.ID + " update earliest: " + this.EarliestStart + " latest: " + this.LatestEnd + " MinEnergy: " + this.MinEnergy + " MaxEnergy: " + this.MaxEnergy);
        }
        else {
            this.parentAdapter.log.debug(this.deviceName + " timeframe " + this.ID + " inactive");
        }
    }

    getTimeframeData() {

        let timeframeData = null;
        if (this.EarliestStart > 0 || this.LatestEnd > 0) {
            timeframeData = {

                TimeframeId: this.ID,
                DeviceId: "", //to be filled later
                EarliestStart: this.EarliestStart,
                LatestEnd: this.LatestEnd,
                MinEnergy: this.MinEnergy,
                MaxEnergy: this.MaxEnergy,

                //laut evcc auch das hier mitschicken 2023-02-12
                MaxPowerConsumption : this.MaxPower,
                MinPowerConsumption: this.MinPower
            };
        }
        return timeframeData;
    }


    Check2Switch() {
        let SwitchOff = false;
        

        if (this.EarliestStart == 0 && this.LatestEnd == 0) {

            if (this.SwitchOffAtEndOfTimer) {
                SwitchOff = true;
                this.parentAdapter.log.debug(this.deviceName + "turn device off at end of LatestEnd");
            }

            this.isActive = false;
            this.Start();
        }

        this.UpdateObjects();

        this.parentAdapter.log.debug(this.deviceName + " (" + this.ID + ") Check2Switch " + SwitchOff);

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

        let key = "Devices." + this.deviceName + ".TimeFrames." + this.ID + ".TimeOn";
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

        key = "Devices." + this.deviceName + ".TimeFrames." + this.ID + ".RemainingMaxEnergy";
        obj = {
            type: "state",
            common: {
                name: "Remaining max. Energy",
                type: "number",
                role: "value",
                unit: "Wh",
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

        let key = "Devices." + this.deviceName + ".TimeFrames." + this.ID + ".TimeOn";

        this.parentAdapter.setState(key, { ack: true, val: val });

        //=======================================================
        val = Number(this.MaxEnergy);

        key = "Devices." + this.deviceName + ".TimeFrames." + this.ID + ".RemainingMaxEnergy";

        this.parentAdapter.setState(key, { ack: true, val: val });
    }

}


module.exports = {
    TimeframeWallbox
};