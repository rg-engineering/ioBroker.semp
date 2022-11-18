"use strict";

/*
 * Created with @iobroker/create-adapter v2.1.1
 */

const utils = require("@iobroker/adapter-core");
const networkInterfaces = require('os').networkInterfaces;
const { v4: uuidv4 } = require('uuid');

const Gateway = require("./lib/semp/Gateway").Gateway;


/* to do

* Hinweise im admin:
	* DeviceID Format
    * UUID
    * BaseID
    * 
 * admin
 *	ID nur ändern, wenn sie nicht dem Format entspricht
 *	
 *	readme bzgl. der einstellbaren Parameter vervollständigen
 *	
 *	
 *	
 *	Geräte nach Ende der max Laufzeit ausschalten, damit sie beim nächsten Start wieder angeschaltet werden können? -> max. als Option laut Doku
 *	warum schickt shm manchmal alle Minute ein On:true, und manchmal nicht? -> wenn nicht von false auf true wechselt
 *	Anlauferkennung? -> erledigt
 *	max. Leistung: wie/wann kommt das?
 *	
 *	EnergieAnforderung zurückziehen, wenn Gerät nicht einschaltet, Zeit einstellbar -> erledigt
 *	Energieanforderung abbrechen, wenn Gerät ausschaltet, Zeit einstellbar
 *	Time umbenenenn in "Zeit für EnergieAnforderung" -> erledigz
 *	Feiertag / Urlaub zu hause für Timer hinzufügen
 *	mehrere Anforderungen pro Tag -> in Arbeit

Admin umbennenen oder Übersetzung:
 * Basis-ID der Geräte
 * Hinweis bei Zähler-tab
 * Objekt-ID Power
 * Einschätzung -> Schätzung
 * Hinweis im Schalter-tab
 * immer auf -> immer ein
 * hat Objekt-ID-Schalter ???
 * Timer-tab -> Zeitsteuerung für Energieanforderung


* Geräte aus gateway hinzufügen


*/

class Semp extends utils.Adapter {



	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: "semp",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		// this.on("objectChange", this.onObjectChange.bind(this));
		this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));

		this.gw = null;
		//this.DummyDeviceUpdateIntervalID = null;

		//this.RequestTimerID = null;
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {

		try {
			//"290B3891-0311-4854-4333-7C70BC802C2D"
			let uuid = this.config.UUID;
			let ip = this.config.IPAddress;
			//9765
			let sempPort = this.config.SempPort;
			//"ioBroker Gateway"
			let name = this.config.SempName;
			//"ioBroker"
			let manufacturer = this.config.SempManufacturer;

			if (!ip) {
				this.log.error("IP not specified!");
			}
			else if (!sempPort) {
				this.log.error("Port not specified!");
			}
			else if (!uuid) {
				this.log.error("UUID not specified!");
			}
			else {

				this.gw = new Gateway(this, uuid, ip, sempPort, name, manufacturer);
				if (this.gw != null) {
					await this.gw.start();
					this.log.debug("Started all!");

					//=================================
					//just for test:
					//this.gw.addDummyDevice();

					//this.DummyDeviceUpdateIntervalID = setInterval(this.UpdateDummyDevice.bind(this), 1 * 60 * 1000);
					//=================================

					await this.AddDevices();
					//this.checkRequests();
					//this.StartRequstIntervall();

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

	UpdateData() {
		this.log.debug("UpdateData");
		try {
			for (let d = 0; d < this.config.devices.length; d++) {

				this.log.debug("device " + JSON.stringify(this.config.devices[d]));

				if (this.config.devices[d].IsActive && this.config.devices[d].TimerActive) {
					if (this.config.devices[d].EnergyRequestPeriods == null || this.config.devices[d].EnergyRequestPeriods.length == 0) {
						this.log.warn("use old energy request data with new data structure, please save it in admin");

						//is this necessary here???
						//just make it backwards compatible 0.0.4 -> 0.0.3
						let EnergyRequestPeriods = [];
						let energyRequest = {
							ID: 1,
							Days: this.config.devices[d].TimerDays,
							EarliestStartTime: this.config.devices[d].TimerStart,
							LatestEndTime: this.config.devices[d].TimerEnd,
							MinRunTime: this.config.devices[d].TimerMinRunTime,
							MaxRunTime: this.config.devices[d].TimerMaxRunTime,
							CancelRequestNotOn: this.config.devices[d].TimerCancelIfNotOn,
							MaxTimeToOn: this.config.devices[d].TimerCancelIfNotOnTime,
							CancelRequestAfterOff: false,
							MinTimeAfterOff: "10"
						}

						EnergyRequestPeriods.push(energyRequest);

						this.config.devices[d]["EnergyRequestPeriods"] = EnergyRequestPeriods;

					}
				}

				this.log.debug("result " + JSON.stringify(this.config.devices[d].EnergyRequestPeriods));
			}


		} catch (e) {
			this.log.error("exception in UpdateData [" + e + "]");
		}

		this.log.debug("result " + JSON.stringify(this.config.devices));

	}

	//add all devices which are configured in admin page
	async AddDevices() {

		for (let d = 0; d < this.config.devices.length; d++) {

			let device = this.config.devices[d];

			this.log.debug("add device " + JSON.stringify(device));

			if (device.IsActive) {
				this.gw.addDevice(device);
				await this.SubscribeDevice(device);

				if (device.MeasurementMethod == "Estimation") {
					this.gw.setPowerDevice(device.ID, device.MaxPower, device.StatusDetection);
				}
				if (device.StatusDetection == "AlwaysOn") {
					this.gw.setOnOffDevice(device.ID, true);
                }
			}
        }
    }

	async SubscribeDevice(device) {

		//is done in device itself
    }

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {

			if (this.gw != null) {
				this.gw.stop();
			}
			callback();
		} catch (e) {
			callback();
		}
	}

	async onStateChange(id, state) {
		if (state) {
			// The state was changed
			let bRet = this.UpdateDevice(id, state);

			if (!bRet) {
				this.log.warn(`state ${id} changed: ${state.val} (ack = ${state.ack}) but not handled`);
            }
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
	}

	UpdateDevice(id, state) {

		let bRet = false;
		//find device and OID
		for (let d = 0; d < this.config.devices.length; d++) {

			let device = this.config.devices[d];
			if (device.IsActive) {
				if (device.OID_Power === id) {
					this.gw.setPowerDevice(device.ID, state.val);
					bRet = true;
				}
				if (device.OID_Status === id) {
					this.gw.setOnOffDevice(device.ID, state.val);
					bRet = true;
				}
				//wallbox
				if (device.OID_PlugConnected === id) {
					this.gw.setWallboxPlugConnected(device.ID, state.val);
					bRet = true;
				}
				if (device.OID_IsCharging === id) {
					this.gw.setWallboxIsCharging(device.ID, state.val);
					bRet = true;
				}
				if (device.OID_IsError === id) {
					this.gw.setWallboxIsError(device.ID, state.val);
					bRet = true;
				}

			}
		}

		return bRet;
    }

	async onMessage(obj) {
		this.log.info("on message " + JSON.stringify(obj));
		if (typeof obj === "object" && obj.command) {
			if (obj.command === "getIP") {
				this.log.info("get IP");

				let myIP = this.GetIP();
				// Send response in callback if required
				if (obj.callback) this.sendTo(obj.from, obj.command, myIP, obj.callback);
			}
			else if (obj.command === "getUUID") {
				this.log.info("get UUID");

				let uuid = this.GetUUID();
				// Send response in callback if required
				if (obj.callback) this.sendTo(obj.from, obj.command, uuid, obj.callback);
			}
			else if (obj.command === "getDeviceBaseID") {
				this.log.info("get DeviceBaseID");

				let devicebaseid = await this.GetDeviceBaseID();
				// Send response in callback if required
				if (obj.callback) this.sendTo(obj.from, obj.command, devicebaseid, obj.callback);
			}
			else {
				this.log.warn("unknown command " + obj.command);
			}
		}
	}


	GetIP() {
		let ip = "";
		const nets = networkInterfaces();

		for (const name of Object.keys(nets)) {
			for (const net of nets[name]) {
				if (net.family === 'IPv4' && !net.internal) {
					ip = net.address;
				}
			}
		}
		return ip;
    }

	GetUUID() {
		let uuid = "000-todo";

		uuid = uuidv4();

		return uuid;
	}

	async GetDeviceBaseID() {
		let devicebaseid = "12345678";

		const ret = await this.getForeignObjectAsync("system.config");

		if (ret != null) {
			this.log.debug("system config " + JSON.stringify(ret));

			let latidude = ret.common.latitude;

			devicebaseid = ("00000000" + latidude * 100000000).slice(-8);
		}
		return devicebaseid;
    }

}

if (require.main !== module) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Semp(options);
} else {
	// otherwise start the instance directly
	new Semp();
}