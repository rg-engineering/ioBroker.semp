const axios = require('axios');


/*



*/

class Device {


    /**
     * Creates new device
     * @param deviceId Device ID. Formatting is explained in SEMP docs: F-11223344-112233445566-00
     * @param name Name
     * @param type Type of device: See SEMP docs
     * @param measurementMethod Enum: {Measurement, Estimation, None}
     * @param interruptionsAllowed If device can be interrupted while running
     * @param maxPower Maximum power draw
     * @param emSignalsAccepted If signals of the EM are currently being considered
     * @param status On, Off, Offline
     * @param vendor Vendor
     * @param serialNr Serial Nr of device
     * @param absoluteTimestamps True if device uses absoulte Timestamps since 1970
     * @param optionalEnergy If device can consume more energy than needed (ex. battery)
     * @param minOnTime Minimum time that the device has to stay on
     * @param minOffTime
     * @param url Url to config page or similar
     */
    constructor(gateway, deviceId, name, type, measurementMethod, interruptionsAllowed,
        maxPower, emSignalsAccepted, status, vendor, serialNr, absoluteTimestamps,
        optionalEnergy = false, minOnTime, minOffTime, url) {

        this.Gateway = gateway;

        this.deviceInfo = null;
        this.deviceStatus = null;
        this.planningRequest = {
            Timeframe: []
        };
        this.hookURL;
        this.lastRecommendation;


        this.deviceInfo = {
            Identification: {
                DeviceId: deviceId,
                DeviceName: name,
                DeviceType: type,
                DeviceSerial: serialNr,
                DeviceVendor: vendor
            },
            Characteristics: {
                MaxPowerConsumption: maxPower
            },
            Capabilities: {
                CurrentPower: { Method: measurementMethod },
                Timestamps: { AbsoluteTimestamps: absoluteTimestamps },
                Interruptions: { InterruptionsAllowed: interruptionsAllowed },
                Requests: { OptionalEnergy: optionalEnergy },
            }
        };

        if (url) {
            this.deviceInfo.Identification.DeviceURL = url
        }
        if (minOnTime) {
            this.deviceInfo.Characteristics.MinOnTime = minOnTime
        }
        if (minOffTime) {
            this.deviceInfo.Characteristics.MinOffTime = minOffTime
        }


        this.deviceStatus = {
            DeviceId: deviceId,
            EMSignalsAccepted: emSignalsAccepted,
            Status: status,
        };

        this.Gateway.parentAdapter.log.debug("device created " + deviceId);

    }

    /**
     * Schedules a run
     * @param earliestStart relative time from now that the operation should min start in seconds
     * @param latestEnd relative time from now that the operation has to be finished in seconds
     * @param minRunTime minimum runtime in seconds
     * @param maxRunTime maximum runtime in seconds
     */
    addPlanningRequest(earliestStart, latestEnd, minRunTime, maxRunTime) {

        this.Gateway.parentAdapter.log.debug(this.deviceInfo.Identification.DeviceId + " addPlanningRequest");

        if (minRunTime > maxRunTime) {
            throw Error("Min run time cant be greater than max run time!");
        }

        for (let frame of this.planningRequest.Timeframe) {
            if (latestEnd < frame.LatestEnd && latestEnd > frame.EarliestStart || earliestStart < frame.LatestEnd && earliestStart > frame.EarliestStart) {
                throw Error("Overlapping timefres arent valid!")
            }
        }

        let timeframe = {
            DeviceId: this.deviceInfo.Identification.DeviceId,
            EarliestStart: earliestStart,
            LatestEnd: latestEnd,
            MinRunningTime: minRunTime,
            MaxRunningTime: maxRunTime
        };

        this.planningRequest.Timeframe.push(timeframe);
    }

    /**
     * Clears all planning requests
     */
    clearPlanningRequests() {

        this.Gateway.parentAdapter.log.debug(this.deviceInfo.Identification.DeviceId + " clearPlanningRequests");

        this.planningRequest.Timeframe = []
    }

    getPlanningRequests() {

        this.Gateway.parentAdapter.log.debug(this.deviceInfo.Identification.DeviceId + " getPlanningRequests");

        return this.planningRequest.Timeframe
    }

    /**
     * Sets average power of last 60s interval
     * @param watts Power in W
     * @param minPower minimum power in interval
     * @param maxPower maximum power in interval
     */
    setLastPower(watts, minPower, maxPower) {

        this.Gateway.parentAdapter.log.debug(this.deviceInfo.Identification.DeviceId + " setLastPower " + watts);

        let powerInfo = {
            AveragePower: Math.round(watts),
            Timestamp: 0,
            AveragingInterval: 60
        };

        if (maxPower) {
            powerInfo.MaxPower = Math.round(maxPower);
        }
        if (minPower) {
            powerInfo.MinPower = Math.round(minPower);
        }

        this.deviceStatus.PowerConsumption = {
            PowerInfo: [powerInfo]
        };

    }

    setOnOff(state) {
        this.Gateway.parentAdapter.log.debug(this.deviceInfo.Identification.DeviceId + " setState " + state);
        this.deviceStatus.Status = state;
    }


    sendEMRecommendation(em2dev) {

        this.Gateway.parentAdapter.log.debug(this.deviceInfo.Identification.DeviceId + " Send recommendation " + JSON.stringify(em2dev));

        this.lastRecommendation = em2dev;
        if (this.hookURL) {
            axios.post(this.hookURL, em2dev).catch((err) => {
                
                this.Gateway.parentAdapter.log.error("Error while sending to hookURL " + err);
            })
        }
    }

     static timeSecs() {
        return Math.round(new Date().getTime() / 1000)
    }
}

module.exports = {
    Device
};