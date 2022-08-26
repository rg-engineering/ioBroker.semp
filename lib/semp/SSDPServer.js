const nodeSSDP = require('node-ssdp').Server;

class SSDPServer {

    constructor(descriptionURL, uniqueDeviceName, gateway) {

        this.Gateway = gateway;

        if (descriptionURL == null || descriptionURL === "") {
            throw new TypeError("Description url cant be empty!")
            this.Gateway.parentAdapter.log.error("Description url cant be empty!");
        }

        this.ssdp = new nodeSSDP({
            location: descriptionURL,
            udn: "uuid:" + uniqueDeviceName,
            adInterval: 20000
        });

        this.ssdp.addUSN("upnp:rootdevice");

        this.ssdp.addUSN(uniqueDeviceName);

        this.ssdp.addUSN("urn:schemas-simple-energy-management-protocol:device:Gateway:1")

        this.Gateway.parentAdapter.log.debug("SSDPServer created: " + descriptionURL + " " + uniqueDeviceName);
    }

    start() {
        this.ssdp.start();
        this.Gateway.parentAdapter.log.debug("SSDPServer started");
    }

    stop() {
        this.ssdp.stop();
        this.Gateway.parentAdapter.log.debug("SSDPServer stopped");
    }
}

module.exports = {
    SSDPServer
};