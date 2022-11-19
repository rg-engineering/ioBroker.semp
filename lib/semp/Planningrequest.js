const Timeframe = require("./Timeframe.js").Timeframe;
const TimeframeWallbox = require("./TimeframeWallbox.js").TimeframeWallbox;


/* todo

    wallbox timeframe with start in 0 sek when plug connected
    
*/

class Planningrequest {

    constructor(settings, parentadapter) {

        this.settings = settings;
        this.parentAdapter = parentadapter;
        this.timeframes = [];
        this.parentAdapter.log.debug("planningrequest constructor " + JSON.stringify(settings));

        if (this.settings.DeviceType != "EVCharger") {
            this.CreateTimeframes();
        }

        this.WallboxPlugConnected = false;

    }

    destructor() {
        for (let t = 0; t < this.timeframes.length; t++) {
            this.timeframes[t].destructor();
        }
        this.timeframes = [];
    }


    SetDeviceStatus(status) {
        for (let d = 0; d < this.timeframes.length; d++) {
            this.timeframes[d].SetDeviceStatus(status);
        }
    }


    CreateTimeframes() {

        if (typeof this.settings.EnergyRequestPeriods != undefined && this.settings.EnergyRequestPeriods != null && this.settings.EnergyRequestPeriods.length > 0) {

            this.parentAdapter.log.debug("planningrequest create time frames " + this.settings.EnergyRequestPeriods.length);

            for (let r = 0; r < this.settings.EnergyRequestPeriods.length; r++) {

                let settings = {
                    EnergyRequestPeriod: this.settings.EnergyRequestPeriods[r],
                    DeviceName: this.settings.DeviceName,
                    SwitchOffAtEndOfTimer: this.settings.SwitchOffAtEndOfTimer,
                    MaxPower: this.settings.MaxPower,
                    MinPower: this.settings.MinPower
                }

                let timeframe = null;
                if (this.settings.DeviceType == "EVCharger") {
                    timeframe = new TimeframeWallbox(settings, this.parentAdapter);
                }
                else {
                    timeframe = new Timeframe(settings, this.parentAdapter);
                }
                this.timeframes.push(timeframe);
            }
        }
        else {
            this.parentAdapter.log.warn("no planning request time frames defined");
        }
    }

    getPlanningrequestData() {

        let PlanningrequestData = [];

        if (this.WallboxPlugConnected || this.settings.DeviceType != "EVCharger") {
            for (let t = 0; t < this.timeframes.length; t++) {
                let timeframeData = this.timeframes[t].getTimeframeData();
                if (timeframeData != null) {
                    PlanningrequestData.push(timeframeData);
                }
            }
        }
        return PlanningrequestData;
    }

    Check2Switch() {

        let SwitchOff = false;
        for (let t = 0; t < this.timeframes.length; t++) {
            if (this.timeframes[t].Check2Switch()) {
                SwitchOff = true;
            }
        }

        this.parentAdapter.log.debug("Planningrequest Check2Switch " + SwitchOff);
        return SwitchOff;

    }

    CancelActiveTimeframe() {
        for (let t = 0; t < this.timeframes.length; t++) {
            this.timeframes[t].CancelActiveTimeframe();
        }
    }


    //Wallbox
    SetPlugConnected(state) {

        if (this.settings.DeviceType == "EVCharger") {
            this.WallboxPlugConnected = state;

            if (state) {
                if (this.timeframes == null || this.timeframes.length == 0) {
                    this.CreateTimeframes();
                }
            }
            else {
                this.parentAdapter.log.debug("Planningrequest all timeframes canceled ");

                for (let t = 0; t < this.timeframes.length; t++) {
                    this.timeframes[t].destructor();
                }

                this.timeframes = [];
            }
        }
    }

}


module.exports = {
    Planningrequest
};