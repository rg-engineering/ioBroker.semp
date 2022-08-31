const { json } = require("node:stream/consumers");
const { Device } = require("./Device");

const SSDPServer = require("./SSDPServer").SSDPServer;
const SEMPServer = require("./SEMPServer").SEMPServer;
const DescriptionGenerator = require("./DescriptionGenerator").DescriptionGenerator;


/* to do

    * logs reduzieren
    * point of power measurement fehlt
    * avarage power measurement (60 sek) fehlt
    * status on / off anstatt tue false

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

        let descriptionXml = DescriptionGenerator.generateDescription(uuid, "http://" + ipAddress + ":" + sempPort, friendlyName, manufacturer,"/semp");
        this.sempServer = new SEMPServer(uuid, ipAddress, sempPort, descriptionXml, this);

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
            await this.sempServer.stop();
            await this.ssdpServer.stop();
            this.parentAdapter.log.debug("gateway stopped...");
        } catch (e) {
            this.parentAdapter.log.error("exception in stop [" + e + "]");
        }
    }

    /*
    addDummyDevice() {

        try {
            this.parentAdapter.log.debug("add dummy device");

            const deviceId = "F-08228121-990000000001-00";
            const name = "Dummy";
            const type = "Fridge";
            const measurementMethod = "Estimation";
            const interruptionsAllowed = true;
            const maxPower = 1000;
            const emSignalsAccepted = false;
            const status = "On";
            const vendor = "TestVendor";
            const serialNr = "123456789"
            const absoluteTimestamps = false;
            const optionalEnergy = false;
            const minOnTime = null;
            const minOffTime = null;
            const url = null;

            let d = new Device(this, deviceId, name, type, measurementMethod, interruptionsAllowed,
                maxPower, emSignalsAccepted, status, vendor, serialNr, absoluteTimestamps,
                optionalEnergy, minOnTime, minOffTime, url);

            this.setDevice(deviceId, d);
        }
        catch (e) {
            this.parentAdapter.log.error("exception in addDummyDevice [" + e + "]");
        }
    }

    UpdateDummyDevice() {
        let d = this.getDevice("F-08228121-990000000001-00");

        let power = Math.random() * 100;
        d.setLastPower(power, null, null);
    }
    */

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

    addPlanningRequest(id, earliestStart, latestEnd, minRunTime, maxRunTime) {

        let d = this.getDevice(id);
        d.addPlanningRequest(earliestStart, latestEnd, minRunTime, maxRunTime)
    }

    addDevice(device) {

        try {
            this.parentAdapter.log.debug("add device " + device.ID);

            const deviceId = device.ID;
            const name = device.Name;
            const type = device.Type;
            const measurementMethod = device.MeasurementMethod;
            const interruptionsAllowed = device.InterruptionsAllowed;
            const maxPower = device.MaxPower;
            const emSignalsAccepted = false;
            const status = "Off";
            const vendor = device.Vendor;
            const serialNr = device.SerialNr
            const absoluteTimestamps = true;
            const optionalEnergy = device.OptionalEnergy
            const minOnTime = device.MinOnTime
            const minOffTime = device.MinOffTime
            const url = null;

            let d = new Device(this, deviceId, name, type, measurementMethod, interruptionsAllowed,
                maxPower, emSignalsAccepted, status, vendor, serialNr, absoluteTimestamps,
                optionalEnergy, minOnTime, minOffTime, url);

            this.setDevice(deviceId, d);

            //just for test
            //this.addPlanningRequest(deviceId, 2 * 60 * 60, 10 * 60 * 60, 20 * 60, 40 * 60);

        }
        catch (e) {
            this.parentAdapter.log.error("exception in addDummyDevice [" + e + "]");
        }
    }


    /**
     * Adds/Replaces device
     * @param id ID of device
     * @param device Device
     */
    
    setDevice(id,device) {
        this.parentAdapter.log.debug("set device " );
        this.devices.set(id, device);
    }
    

    /**
     * Retrieves device
     * @param id ID of device
     */
    
    getDevice(id) {
        this.parentAdapter.log.debug("get device " + id);
        return this.devices.get(id);
    }
    
    /**
     * Retrieves all devices
     */
    
    getAllDevices() {
        let ds = [];
        try {
            this.parentAdapter.log.debug("get all devices ");

            for (let d of this.devices.values()) {
                ds.push(d)
            }
        }
        catch (e) {
            this.parentAdapter.log.error("exception in getAllDevices [" + e + "]");
        }
        return ds;
    }
    
    /**
     * Deletes device
     * @param id ID of device
     */
    
    deleteDevice(id) {

        this.parentAdapter.log.debug("delete device " + id);

        return this.devices.delete(id)
    }
    
    /**
     * Deletes all devices
     */
    
    deleteAllDevices() {

        this.parentAdapter.log.debug("delete all devices");

        this.devices.clear()
    }
    
    /**
     * Listener for SEMP messages
     * @param message Message
     */
    
    onSEMPMessage(message) {

        this.parentAdapter.log.debug("semp message " + JSON.stringify( message) );

        let d = this.getDevice(message.DeviceControl.DeviceId);
        if (d) {
            d.sendEMRecommendation(message)
        }
    }
    
}



module.exports = {
    Gateway
};
