/* eslint-disable prefer-template */
/*
 * Created with @iobroker/create-adapter v2.6.5
 */


//https://www.iobroker.net/#en/documentation/dev/adapterdev.md

import * as utils from "@iobroker/adapter-core";
import Gateway from "./lib/Gateway";
//import { networkInterfaces } from "os";

import { v4 as uuidv4 } from "uuid";

export class Semp extends utils.Adapter {

    gw: Gateway | null = null;

	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({
			...options,
			name: "semp",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		this.on("objectChange", this.onObjectChange.bind(this));
		this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	private async onReady(): Promise<void> {
		this.log.debug(JSON.stringify(this.config));


		try {
			//"290B3891-0311-4854-4333-7C70BC802C2D"
			const uuid = this.config.UUID;
			const ip = this.config.IPAddress;
			//9765
			const sempPort = this.config.SempPort;
			//"ioBroker Gateway"
			const name = this.config.SempName;
			//"ioBroker"
			const manufacturer = this.config.SempManufacturer;

			this.log.debug("check BaseID " + this.config.DeviceBaseID + " type " + typeof this.config.DeviceBaseID);
			const BaseId = this.config.DeviceBaseID;
			this.CheckBaseId(BaseId);



			if (!ip) {
				this.log.error("IP not specified!");
			} else if (!sempPort) {
				this.log.error("Port not specified!");
			} else if (!uuid) {
				this.log.error("UUID not specified!");
			} else {

				this.gw = new Gateway(this, uuid, ip, sempPort, name, manufacturer);
				if (this.gw != null) {
					await this.gw.start();
					this.log.debug("Started all!");

					await this.AddDevices();

					this.UpdateData();
				}
			}

			/*
			// examples for the checkPassword/checkGroup functions
			let result = await this.checkPasswordAsync("admin", "iobroker");
			this.log.info("check user admin pw iobroker: " + result);
	
			result = await this.checkGroupAsync("admin", "admin");
			this.log.info("check group user admin group admin: " + result);
			*/
		} catch (e) {
			this.log.error("exception in onReady [" + e + "]");
		}


	}

	UpdateData():void {
		this.log.debug("UpdateData");
		try {
			for (let d = 0; d < this.config.devices.length; d++) {

				this.log.debug("device " + JSON.stringify(this.config.devices[d]));

				

				//this.log.debug("result " + JSON.stringify(this.config.devices[d].EnergyRequestPeriods));
			}


		} catch (e) {
			this.log.error("exception in UpdateData [" + e + "]");
		}

		this.log.debug("result " + JSON.stringify(this.config.devices));

	}

	//add all devices which are configured in admin page
	async AddDevices(): Promise<void> {

		if (this.gw == null) {
			this.log.error("Gateway is not initialized");
			return;
		}

		for (let d = 0; d < this.config.devices.length; d++) {

			const device = this.config.devices[d];

			this.log.debug("add device " + JSON.stringify(device));

			if (device.IsActive) {
				await this.gw.addDevice(device);
				//await this.SubscribeDevice(device);

				if (device.MeasurementMethod == "Estimation") {
					this.gw.setPowerDevice(device.ID, device.MaxPower);
				}
				if (device.StatusDetectionType == "AlwaysOn") {
					this.gw.setOnOffDevice(device.ID, true);
				}
			}
		}
	}



	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 */
	private async onUnload(callback: () => void): Promise<void> {
		try {
			// Here you must clear all timeouts or intervals that may still be active
			// clearTimeout(timeout1);
			// clearTimeout(timeout2);
			// ...

			if (this.gw != null) {
				await this.gw.stop();
			}

			callback();
		} catch (e) {
			this.log.error("exception in onUnload " + e);
			callback();
		}
	}

	// If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
	// You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
	// /**
	//  * Is called if a subscribed object changes
	//  */
	private onObjectChange(id: string, obj: ioBroker.Object | null | undefined): void {
		if (obj) {
			// The object was changed
			this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
		} else {
			// The object was deleted
			this.log.info(`object ${id} deleted`);
		}
	}

	/**
	 * Is called if a subscribed state changes
	 */

	private  onStateChange(id: string, state: ioBroker.State | null | undefined): void {
		if (state) {
			// The state was changed
			const ids = id.split(".");

			if (!state.ack || ids[0] != "semp") {

				const bRet = this.UpdateDevice(id, state);

				if (!bRet) {
					this.log.warn(`state ${id} changed: ${state.val} (ack = ${state.ack}) but not handled`);
				} else {
					if (ids[0] == "semp") {
						this.setForeignState(id, { ack: true });
					}
				}
			}
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
	}

	UpdateDevice(id: string, state: ioBroker.State ): boolean {

		let bRet = false;

		if (this.gw == null) {
			this.log.error("UpdateDevice: Gateway is not initialized");
			return false;
		}

		if (state == null) {
			this.log.error("UpdateDevice: state is null");
			return false;
        }


		//find device and OID
		for (let d = 0; d < this.config.devices.length; d++) {

			const device = this.config.devices[d];
			if (device.IsActive) {
				if (device.OID_Power === id) {
					this.gw.setPowerDevice(device.ID, Number(state.val) );
					bRet = true;
				}
				if (device.OID_Status === id && state.val!=null) {
					this.gw.setOnOffDevice(device.ID, state.val);
					bRet = true;
				}
				//wallbox




				
				if (device.Type == "EVCharger" && device.wallbox_oid_read != null) {
					let OID_PlugConnected = "";
					let OID_IsCharging = "";
					let OID_IsError = "";
					let OID_Counter = "";
					let OID_Status = "";

					/*
					for (let o = 0; o < device.WallboxOIDs.length; o++) {
						if (device.WallboxOIDs[o].active) {
							if (device.WallboxOIDs[o].Name == "DeviceOIDPlugConnected") {
								OID_PlugConnected = device.WallboxOIDs[o].OID;
							} else if (device.WallboxOIDs[o].Name == "DeviceOIDIsCharging") {
								OID_IsCharging = device.WallboxOIDs[o].OID;
							} else if (device.WallboxOIDs[o].Name == "DeviceOIDIsError") {
								OID_IsError = device.WallboxOIDs[o].OID;
							} else if (device.WallboxOIDs[o].Name == "DeviceOIDCounter") {
								OID_Counter = device.WallboxOIDs[o].OID;
							} else if (device.WallboxOIDs[o].Name == "DeviceOIDStatus") {
								OID_Status = device.WallboxOIDs[o].OID;
							}
						}
					}
					*/

					for (let o = 0; o < device.wallbox_oid_read.length; o++) {
						if (device.wallbox_oid_read[o].active) {
							if (device.wallbox_oid_read[o].Name == "DeviceOIDPlugConnected") {
								OID_PlugConnected = device.wallbox_oid_read[o].OID;
							} else if (device.wallbox_oid_read[o].Name == "DeviceOIDIsCharging") {
								OID_IsCharging = device.wallbox_oid_read[o].OID;
							} else if (device.wallbox_oid_read[o].Name == "DeviceOIDIsError") {
								OID_IsError = device.wallbox_oid_read[o].OID;
							} else if (device.wallbox_oid_read[o].Name == "DeviceOIDCounter") {
								OID_Counter = device.wallbox_oid_read[o].OID;
							} else if (device.wallbox_oid_read[o].Name == "DeviceOIDStatus") {
								OID_Status = device.wallbox_oid_read[o].OID;
							}
						}
					}


					if (OID_PlugConnected === id && state.val!=null) {
						this.gw.setWallboxPlugConnected(device.ID, state.val);
						bRet = true;
					}
					if (OID_IsCharging === id && state.val != null) {
						this.gw.setWallboxIsCharging(device.ID, state.val);
						bRet = true;
					}
					if (OID_IsError === id && state.val != null) {
						this.gw.setWallboxIsError(device.ID, state.val);
						bRet = true;
					}
					if (OID_Counter === id) {
						this.gw.setPowerDevice(device.ID, Number(state.val));
						bRet = true;
					}
					if (OID_Status === id && state.val != null) {
						this.gw.setOnOffDevice(device.ID, state.val);
						bRet = true;
					}
				}
				//state semp.0.Devices.newDevice2.MaxEnergy changed: 1102(ack = false) but not handled
				const ids = id.split(".");
				if (ids.length > 3 && ids[3] == device.Name && state.val != null ) {
					if (ids[4] == "MinEnergy") {
						this.log.info("main: got minEnergy " + state.val);
						if (typeof state.val == "number" || typeof state.val == "string") {
							this.gw.setMinEnergy(device.ID, state.val);
						}
						bRet = true;
					} else if (ids[4] == "MaxEnergy") {
						if (typeof state.val == "number" || typeof state.val == "string") {
							this.gw.setMaxEnergy(device.ID, state.val);
						}
						bRet = true;
					} else if (ids[4] == "EnableFastCharging") {
						if (typeof state.val == "boolean" || typeof state.val == "string" || typeof state.val == "number") {

							this.gw.EnableFastCharging(device.ID, state.val);
						}
						bRet = true;
					} else if (ids[4] == "MaxChargeTime") {
						//semp.0.Devices.Wallbox1.MaxChargeTime
						if ( typeof state.val == "string" || typeof state.val == "number") {

							this.gw.SetMaxChargeTime(device.ID, state.val);
						}
							bRet = true;
					}

				}
			}
		}

		return bRet;
	}


	// If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.messagebox" property to be set to true in io-package.json
	//  */
	private async onMessage(obj: ioBroker.Message): Promise<void> {
		this.log.info("on message " + JSON.stringify(obj));
		if (typeof obj === "object" && obj.command) {
			//if (obj.command === "getIP") {
			//	this.log.info("get IP");
			//
			//	const myIP = this.GetIP();
			//	// Send response in callback if required
			//	if (obj.callback) {
			//		this.sendTo(obj.from, obj.command, myIP, obj.callback);
			//	}
			//} else if (obj.command === "getUUID") {
			if (obj.command === "getUUID") {
				this.log.info("get UUID");

				const uuid = this.GetUUID();
				// Send response in callback if required
				if (obj.callback) {
					this.sendTo(obj.from, obj.command, uuid, obj.callback);
				}
			} else if (obj.command === "getDeviceBaseID") {
				this.log.info("get DeviceBaseID");

				const devicebaseid = await this.GetDeviceBaseID();
				// Send response in callback if required
				if (obj.callback) {
					this.sendTo(obj.from, obj.command, devicebaseid, obj.callback);
				}
			} else {
				this.log.warn("unknown command " + obj.command);
			}
		}
	}

	/*
	GetIP(): string {
		let ip = "";
		const nets = networkInterfaces();

		for (const name of Object.keys(nets)) {
			const list = nets[name] || [];
			for (const net of list) {
				// net.family can be string "IPv4" or number 4 depending on Node version
				if ((net.family === "IPv4" || net.family === 4) && !net.internal) {
					ip = net.address;
				}
			}
		}
		return ip;
	}
	*/

	GetUUID(): string {
		let uuid = "000-todo";

		uuid = uuidv4();

		return uuid;
	}

	async GetDeviceBaseID(): Promise<string> {
		let devicebaseid = "12345678";

		const ret = await this.getForeignObjectAsync("system.config");

		if (ret != null) {
			//this.log.debug("system config " + JSON.stringify(ret));

			// Safely read latitude
			const common: any = (ret as any).common;
			if (common && typeof common.latitude === "number" && !Number.isNaN(common.latitude)) {
				const latitude: number = common.latitude;

				devicebaseid = ("00000000" + Math.round(latitude * 100000000)).slice(-8);

				this.CheckBaseId(devicebaseid);

				this.log.debug("new created BaseID " + devicebaseid + " type " + typeof devicebaseid);
			} else {
				this.log.warn("system.config.common.latitude is not a valid number, using default devicebaseid " + devicebaseid);
			}


		}
		return devicebaseid;
	}

	CheckBaseId(id: string | number): boolean {

		/*
		base id muss nummer, 8 ziffern und kein punkt
		*/

		let valid = false;
		this.log.debug("check BaseID " + id + " type " + typeof id);

		// normalize to string
		const s = String(id);

		// only digits and length 8
		const re = /^\d{8}$/;
		if (re.test(s)) {
			this.log.debug("BaseID: valid 8-digit number");
			valid = true;
		} else {
			this.log.error("BaseID: wrong format, must be 8 digits (no dots). value: " + s);
			valid = false;
		}

		return valid;
	}


}

if (require.main !== module) {
	// Export the constructor in compact mode
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new Semp(options);
} else {
	// otherwise start the instance directly
	(() => new Semp())();
}