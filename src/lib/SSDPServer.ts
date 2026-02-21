/* eslint-disable prefer-template */


import { Server } from "node-ssdp";
import Base from "./base";
import type Gateway from "./Gateway"; 

export default class SSDPServer extends Base {

	Gateway: Gateway;
	ssdp: Server;



	constructor(descriptionURL: string, uniqueDeviceName: string, gateway:Gateway) {

		super(gateway.adapter,0, "SSDPServer");

		this.Gateway = gateway;

		if (descriptionURL == null || descriptionURL === "") {
			this.Gateway.logError("Description url cant be empty!");
			throw new TypeError("Description url cant be empty!");
		}

		this.ssdp = new Server({
			location: descriptionURL,
			udn: "uuid:" + uniqueDeviceName,
			adInterval: 20000
		});

		this.ssdp.addUSN("upnp:rootdevice");

		this.ssdp.addUSN(uniqueDeviceName);

		this.ssdp.addUSN("urn:schemas-simple-energy-management-protocol:device:Gateway:1");

		this.Gateway.logDebug("SSDPServer created: " + descriptionURL + " " + uniqueDeviceName);
	}

	start(): void {
		this.ssdp.start();
		this.Gateway.logDebug("SSDPServer started");
	}

	stop() : void{
		this.ssdp.stop();
		this.Gateway.logDebug("SSDPServer stopped");
	}
}

