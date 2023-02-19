const { json } = require("node:stream/consumers");
const { Device } = require("./Device");

const SSDPServer = require("./SSDPServer").SSDPServer;
const SEMPServer = require("./SEMPServer").SEMPServer;
const DescriptionGenerator = require("./DescriptionGenerator").DescriptionGenerator;

const csvLogger = require("./csvLogger").csvLogger;

/* to do

    * point of power measurement fehlt
    * avarage power measurement (60 sek) fehlt
  

*/

class Gateway {

    constructor(
        parentAdapter,
        uuid,
        ipAddress,
        sempPort,
        friendlyName,
        manufacturer) {

        this.parentAdapter = parentAdapter;

        this.csvLogger = null;
        if (parentAdapter.config.LogToCSV) {
            this.csvLogger = new csvLogger(parentAdapter);

            let header = [
                { id: 'Time', title: 'Time' },                                      //Column1
                { id: 'DeviceId', title: 'DeviceId' },                              //Column2
                { id: 'DeviceName', title: 'DeviceName' },                          //Column3
                { id: 'Status', title: 'Status' },                                  //Column4
                { id: 'AveragePower', title: 'AveragePower' },                      //Column5
                { id: 'TimeFrameID', title: 'TimeFrameID' },                        //Column6
                { id: 'EarliestStart', title: 'EarliestStart' },                    //Column7
                { id: 'LatestEnd', title: 'LatestEnd' },                            //Column8
                { id: 'MinRunningTime', title: 'MinRunningTime' },                  //Column9
                { id: 'MaxRunningTime', title: 'MaxRunningTime' },                  //Column10
                { id: 'MinEnergy', title: 'MinEnergy' },                            //Column11
                { id: 'MaxEnergy', title: 'MaxEnergy' },                            //Column12
                { id: 'RecommendationStatus', title: 'RecommendationStatus' },      //Column13
                { id: 'RecommendationPower', title: 'RecommendationPower' },        //Column14
                { id: 'Power', title: 'Power' },                                    //Column15
                //{ id: 'LastTimeStamp', title: 'LastTimeStamp' },                    //Column16
                { id: 'Timediff', title: 'Timediff' },                              //Column17
                { id: 'Energy', title: 'Energy' }                                   //Column18
            ];

            this.csvLogger.StartLog(parentAdapter.config.LogToCSVPath, header);

            //just add headlines
            let records = [];
            const record =
            {
                Time: 'Time',
                DeviceId: 'DeviceId',
                DeviceName: 'DeviceName',
                Status: 'Status',
                AveragePower: 'AveragePower',
                TimeFrameID: 'TimeFrameID',
                EarliestStart: 'EarliestStart',
                LatestEnd: 'LatestEnd',
                MinRunningTime: 'MinRunningTime',
                MaxRunningTime: 'MaxRunningTime',
                MinEnergy: 'MinEnergy',
                MaxEnergy: 'MaxEnergy',
                RecommendationStatus: 'RecommendationStatus',
                RecommendationPower: 'RecommendationPower',
                Power: 'Power',
                //LastTimeStamp: 'LastTimeStamp',
                Timediff: 'Timediff',
                Energy: 'Energy',

            };
            records.push(record);

            //und jetzt alle schreiben
            this.csvLogger.WriteCSVLog(0, records);







        }

        this.ssdpServer = new SSDPServer("http://" + ipAddress + ":" + sempPort + "/description.xml", uuid, this);

        let descriptionXml = DescriptionGenerator.generateDescription(uuid, "http://" + ipAddress + ":" + sempPort, friendlyName, manufacturer, "/semp");
        this.sempServer = new SEMPServer(uuid, ipAddress, sempPort, descriptionXml, this, parentAdapter.config.extendedLog, this.csvLogger);

        this.devices = new Map();

        this.parentAdapter.log.debug("gateway created...")
    }

    async start() {
        try {
            await this.sempServer.start();
            await this.ssdpServer.start();

            this.parentAdapter.log.debug("gateway started...")
        } catch (e) {
            this.parentAdapter.log.error("exception in start [" + e + "]");
        }
    }

    async stop() {
        try {

            //kill device timer


            this.deleteAllDevices();


            await this.sempServer.stop();
            await this.ssdpServer.stop();
            this.parentAdapter.log.debug("gateway stopped...");
        } catch (e) {
            this.parentAdapter.log.error("exception in stop [" + e + "]");
        }
    }

    setPowerDevice(id, power) {
        let d = this.getDevice(id);
        d.setLastPower(power, null, null);
    }

    setOnOffDevice(id, state) {

        let newState = "";
        if (typeof state === "boolean") {
            if (state) {
                newState = "On";
            }
            else {
                newState = "Off";
            }
        }
        else if (typeof state === "string") {
            if (state.toLowerCase().includes("on")) {
                newState = "On";
            }
            else {
                newState = "Off";
            }

        }

        let d = this.getDevice(id);
        d.setOnOff(newState)
    }

    //====================================
    //wallbox
    setWallboxPlugConnected(id, state) {
        let d = this.getDevice(id);
        if (d != null) {
            d.setWallboxPlugConnected(state);
        }
        else {
            this.parentAdapter.log.error("unknown device with id " + id);
        }
    }

    setWallboxIsCharging(id, state) {
        let d = this.getDevice(id);
        if (d != null) {
            d.setWallboxIsCharging(state);
        }
        else {
            this.parentAdapter.log.error("unknown device with id " + id);
        }
    }
    setWallboxIsError(id, state) {
        let d = this.getDevice(id);
        if (d != null) {
            d.setWallboxIsError(state);
        }
        else {
            this.parentAdapter.log.error("unknown device with id " + id);
        }
    }
    setMinEnergy(id, state) {
        let d = this.getDevice(id);
        if (d != null) {
            this.parentAdapter.log.debug("GW set minEnergy " + state);
            d.setMinEnergy(state);
        }
        else {
            this.parentAdapter.log.error("unknown device with id " + id);
        }
    }
    setMaxEnergy(id, state) {
        let d = this.getDevice(id);
        if (d != null) {
            this.parentAdapter.log.debug("GW set maxEnergy " + state);
            d.setMaxEnergy(state);
        }
        else {
            this.parentAdapter.log.error("unknown device with id " + id);
        }
    }

    StartFastCharging(id) {
        let d = this.getDevice(id);
        if (d != null) {
            this.parentAdapter.log.debug("GW start fast charging ");
            d.startFastCharging();
        }
        else {
            this.parentAdapter.log.error("unknown device with id " + id);
        }
    }



    //====================================

    addDevice(device) {

        try {
            this.parentAdapter.log.debug("add device " + device.ID);

            /*
            const deviceId = device.ID;
            const name = device.Name;
            const type = device.Type;
            const measurementMethod = device.MeasurementMethod;
            const interruptionsAllowed = device.InterruptionsAllowed;
            const maxPower = device.MaxPower;
            const emSignalsAccepted = true;
            const status = "Off";
            const vendor = device.Vendor;
            const serialNr = device.SerialNr
            const absoluteTimestamps = false;
            const optionalEnergy = device.OptionalEnergy
            const minOnTime = device.MinOnTime
            const minOffTime = device.MinOffTime
            */

            let d = new Device(this, device, this.csvLogger);

            this.setDevice(device.ID, d);

        }
        catch (e) {
            this.parentAdapter.log.error("exception in addDevice [" + e + "]");
        }
    }

    setDevice(id, device) {
        this.parentAdapter.log.debug("set device ");
        this.devices.set(id, device);
    }


    getDevice(id) {
        //this.parentAdapter.log.debug("get device " + id);
        return this.devices.get(id);
    }

    getAllDevices() {
        let ds = [];
        try {
            this.parentAdapter.log.debug("get all devices ");


            for (let d of this.devices.values()) {

                //this.parentAdapter.log.debug("devices " + d.deviceInfo );

                let dev = this.getDevice(d.deviceInfo.Identification.DeviceId);

                //check switch off device?
                dev.Check2Switch();

                let requests = [];

                if (dev.planningrequest != null) {
                    requests = dev.planningrequest.getPlanningrequestData();

                    for (let r = 0; r < requests.length; r++) {
                        requests[r].DeviceId = d.deviceInfo.Identification.DeviceId;
                    }
                }
                let planningRequest = {
                    Timeframe: requests
                };

                //this.parentAdapter.log.debug("got " + JSON.stringify(requests));

                let device = {
                    deviceInfo: d.deviceInfo,
                    deviceStatus: d.deviceStatus,
                    planningRequest: planningRequest
                }
                ds.push(device);

            }
        }
        catch (e) {
            this.parentAdapter.log.error("exception in getAllDevices [" + e + "]");
        }

        this.parentAdapter.log.debug("get all devices " + JSON.stringify(ds));

        return ds;
    }

    deleteDevice(id) {

        this.parentAdapter.log.debug("delete device " + id);

        return this.devices.delete(id)
    }

    deleteAllDevices() {

        this.parentAdapter.log.debug("delete all devices");

        this.devices.clear()
    }

    async onSEMPMessage(message) {

        this.parentAdapter.log.debug("semp message " + JSON.stringify(message));

        let d = this.getDevice(message.DeviceControl.DeviceId);
        if (d) {
            await d.sendEMRecommendation(message)
        }
    }
}



module.exports = {
    Gateway
};
