/* eslint-disable prefer-template */
const nodeSSDP = require("node-ssdp").Server;

import Base from "./base";
export default class SSDPServer extends Base {

	constructor(descriptionURL, uniqueDeviceName, gateway) {

		this.Gateway = gateway;

		if (descriptionURL == null || descriptionURL === "") {
			this.Gateway.parentAdapter.log.error("Description url cant be empty!");
			throw new TypeError("Description url cant be empty!");
		}

		this.ssdp = new nodeSSDP({
			location: descriptionURL,
			udn: "uuid:" + uniqueDeviceName,
			adInterval: 20000
		});

		this.ssdp.addUSN("upnp:rootdevice");

		this.ssdp.addUSN(uniqueDeviceName);

		this.ssdp.addUSN("urn:schemas-simple-energy-management-protocol:device:Gateway:1");

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