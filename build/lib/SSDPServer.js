"use strict";
/* eslint-disable prefer-template */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_ssdp_1 = require("node-ssdp");
const base_1 = __importDefault(require("./base"));
class SSDPServer extends base_1.default {
    Gateway;
    ssdp;
    constructor(descriptionURL, uniqueDeviceName, gateway) {
        super(gateway.adapter, 0, "SSDPServer");
        this.Gateway = gateway;
        if (descriptionURL == null || descriptionURL === "") {
            this.Gateway.logError("Description url cant be empty!");
            throw new TypeError("Description url cant be empty!");
        }
        this.ssdp = new node_ssdp_1.Server({
            location: descriptionURL,
            udn: "uuid:" + uniqueDeviceName,
            adInterval: 20000
        });
        this.ssdp.addUSN("upnp:rootdevice");
        this.ssdp.addUSN(uniqueDeviceName);
        this.ssdp.addUSN("urn:schemas-simple-energy-management-protocol:device:Gateway:1");
        this.Gateway.logDebug("SSDPServer created: " + descriptionURL + " " + uniqueDeviceName);
    }
    start() {
        this.ssdp.start();
        this.Gateway.logDebug("SSDPServer started");
    }
    stop() {
        this.ssdp.stop();
        this.Gateway.logDebug("SSDPServer stopped");
    }
}
exports.default = SSDPServer;
//# sourceMappingURL=SSDPServer.js.map