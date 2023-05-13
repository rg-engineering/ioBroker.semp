const Timeframe = require("./Timeframe.js").Timeframe;
const TimeframeWallbox = require("./TimeframeWallbox.js").TimeframeWallbox;


/* todo

    
    
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

        if (this.settings.EnergyRequestPeriods !== undefined && this.settings.EnergyRequestPeriods != null && this.settings.EnergyRequestPeriods.length > 0) {

            this.parentAdapter.log.debug("planningrequest create time frames " + this.settings.EnergyRequestPeriods.length);

            for (let r = 0; r < this.settings.EnergyRequestPeriods.length; r++) {

                let settings = {
                    EnergyRequestPeriod: this.settings.EnergyRequestPeriods[r],
                    DeviceName: this.settings.DeviceName,
                    SwitchOffAtEndOfTimer: this.settings.SwitchOffAtEndOfTimer
                }

                let timeframe = new Timeframe(settings, this.parentAdapter);

                this.timeframes.push(timeframe);
            }
        }
        else {
            this.parentAdapter.log.warn("no planning request time frames defined");
        }
    }

    CreateTimeframeWallbox() {
        this.parentAdapter.log.debug("planningrequest create time frame for wallbox");

        let settings = {
            EnergyRequestPeriod: null,
            DeviceName: this.settings.DeviceName,
            SwitchOffAtEndOfTimer: this.settings.SwitchOffAtEndOfTimer,
            MaxEnergy: this.settings.MaxEnergy,
            MinEnergy: this.settings.MinEnergy,
            MinPower: this.settings.MinPower,
            MaxPower: this.settings.MaxPower


        }

        let timeframe = new TimeframeWallbox(settings, this.parentAdapter);

        this.timeframes.push(timeframe);
    }

    SetMinEnergy(value) {
        if (value >= 0) {
            this.parentAdapter.log.debug("planningrequest set minEnergy " +value);
            if (this.timeframes.length > 0) {
                for (let t = 0; t < this.timeframes.length; t++) {
                    this.timeframes[t].SetMinEnergy(value);
                }
            }
        }
    }

    SetMaxEnergy(value) {
        if (value > 0) {
            this.parentAdapter.log.debug("planningrequest set maxEnergy " + value);
            if (this.timeframes.length > 0) {
                for (let t = 0; t < this.timeframes.length; t++) {
                    this.timeframes[t].SetMaxEnergy(value);
                }
            }
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
        let restart = false;
        if (this.timeframes.length > 0) {
            for (let t = 0; t < this.timeframes.length; t++) {

                let oRet = this.timeframes[t].Check2Switch();

                if (oRet.SwitchOff) {
                    SwitchOff = true;
                }
                if (oRet.restart) {
                    restart = true;
                    //just delete timeframe
                    SetPlugConnected(false);
                }

                /*
                if (this.timeframes[t].Check2Switch().SwitchOff) {
                    SwitchOff = true;
                }
                if (this.timeframes[t].Check2Switch().restart) {
                    restart = true;
                    //just delete timeframe
                    SetPlugConnected(false);
                }
                */
            }
            
        }
        else {
            SwitchOff = true;
        }
        let ret = {
            SwitchOff: SwitchOff,
            restart: restart
        }

        this.parentAdapter.log.debug("Planningrequest Check2Switch " + JSON.stringify(ret));
        return ret;
    }

    CancelActiveTimeframe() {
        for (let t = 0; t < this.timeframes.length; t++) {
            this.timeframes[t].CancelActiveTimeframe();
        }
    }


    //Wallbox
    SetCurrentEnergy(energy) {
        if (this.settings.DeviceType == "EVCharger") {
            this.parentAdapter.log.debug("got energy used " + energy);

            for (let t = 0; t < this.timeframes.length; t++) {
                this.timeframes[t].setCurrentEnergy(energy);
            }
        }
    }


    SetPlugConnected(state) {

        if (this.settings.DeviceType == "EVCharger") {
            this.WallboxPlugConnected = state;

            if (state) {
                if (this.timeframes == null || this.timeframes.length == 0) {
                    this.CreateTimeframeWallbox(); 
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


    SetMaxChargeTime(state) {
        if (this.settings.DeviceType == "EVCharger") {
            for(let t = 0; t < this.timeframes.length; t++) {
                this.timeframes[t].SetMaxChargeTime(state);
            }
        }
    }
}


module.exports = {
    Planningrequest
};