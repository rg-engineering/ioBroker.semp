const Timeframe = require("./Timeframe.js").Timeframe;


/* todo

    settings für tiemframe als objekt, nicht einzeln
    
*/

class Planningrequest {

    constructor(settings, parentadapter) {

        this.settings = settings;
        this.parentAdapter = parentadapter;
        this.timeframes = [];
        this.parentAdapter.log.debug("planningrequest constructor " + JSON.stringify(settings));

        this.CreateTimeframes(settings.SwitchOffAtEndOfTimer);

    }

    destructor() {
        this.timeframes = [];
    }


    SetDeviceStatus(status) {
        for (let d = 0; d < this.timeframes.length; d++) {
            this.timeframes[d].SetDeviceStatus(status);
        }
    }


    CreateTimeframes(SwitchOffAtEndOfTimer) {
        this.parentAdapter.log.debug("planningrequest create time frames " + this.settings.EnergyRequestPeriods.length);
        if (this.settings.EnergyRequestPeriods.length > 0) {
            for (let r = 0; r < this.settings.EnergyRequestPeriods.length; r++) {
                let timeframe = new Timeframe(this.settings.EnergyRequestPeriods[r], this.parentAdapter, SwitchOffAtEndOfTimer);
                this.timeframes.push(timeframe);
            }
        }
    }

    getPlanningrequestData() {

        let PlanningrequestData = [];

        for (let t = 0; t < this.timeframes.length; t++) {
            let timeframeData = this.timeframes[t].getTimeframeData();
            if (timeframeData != null) {
                PlanningrequestData.push(timeframeData);
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

        return SwitchOff;

    }

    CancelActiveTimeframe() {
        for (let t = 0; t < this.timeframes.length; t++) {
            this.timeframes[t].CancelActiveTimeframe();
        }
    }

}


module.exports = {
    Planningrequest
};