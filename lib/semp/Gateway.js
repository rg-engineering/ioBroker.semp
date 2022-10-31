const { json } = require("node:stream/consumers");
const { Device } = require("./Device");

const SSDPServer = require("./SSDPServer").SSDPServer;
const SEMPServer = require("./SEMPServer").SEMPServer;
const DescriptionGenerator = require("./DescriptionGenerator").DescriptionGenerator;


/* to do

    * logs reduzieren
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

        this.ssdpServer = new SSDPServer("http://" + ipAddress + ":" + sempPort + "/description.xml", uuid, this);

        let descriptionXml = DescriptionGenerator.generateDescription(uuid, "http://" + ipAddress + ":" + sempPort, friendlyName, manufacturer, "/semp");
        this.sempServer = new SEMPServer(uuid, ipAddress, sempPort, descriptionXml, this, parentAdapter.config.extendedLog, parentAdapter.config.LogToCSV, parentAdapter.config.LogToCSVPath);

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

            let d = new Device(this, device);

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

                let requests = dev.planningrequest.getPlanningrequestData();

                for (let r = 0; r < requests.length; r++) {
                    requests[r].DeviceId = d.deviceInfo.Identification.DeviceId;
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
