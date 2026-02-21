/* eslint-disable prefer-template */

import type { Semp } from "../main";
import type {  EnergyRequestPeriod } from "./types";

import Base from "./base";

type TimeoutHandle = ReturnType<typeof setTimeout>;

interface TimeframeWallboxSettings {
	EnergyRequestPeriod: EnergyRequestPeriod | null;
	DeviceName: string;
	SwitchOffAtEndOfTimer: boolean;
	MaxEnergy: number;
	MinEnergy: number;
	MinPower: number;
	MaxPower: number;
	WallboxChargeTime: number;
}


interface Timeframedata {
	TimeframeId: number;
	DeviceId: string;
	EarliestStart: number;
	LatestEnd: number;
	MinEnergy: number;
	MaxEnergy: number;
	MaxPowerConsumption: number;
	MinPowerConsumption: number;
}
export default class TimeframeWallbox extends Base {

	
	deviceName: string;
	
	isActive: boolean;
	EarliestStart: number;
	LatestEnd: number;
	
	CurrentOnTime: number;
	timediff: number;
	CanceledOnDay: number;
	Status: string;
	UpdateTimesID: TimeoutHandle | null;
	
	MinEnergy: number
	MaxEnergy: number;
MinPower : number;
	MaxPower: number;
	SwitchOffAtEndOfTimer: boolean;
	WallboxChargeTimeEndles: boolean;
	WallboxChargeTime: number;
	CurrentEnergy: number;
	CurrentEnergyDiff: number;
	ID: number;

	constructor(settings: TimeframeWallboxSettings, parentAdapter: Semp | null) {

		super(parentAdapter, 0, "Timeframe");

		this.ID = 1;

		this.deviceName = settings.DeviceName;

		this.isActive = false;

		this.SwitchOffAtEndOfTimer = settings.SwitchOffAtEndOfTimer;

		this.logDebug("timeframeWallbox constructor " + JSON.stringify(settings));

		this.EarliestStart = 0; //always now
		if (settings.WallboxChargeTime == 3) {
			this.WallboxChargeTimeEndles = true;
		} else {
			this.WallboxChargeTimeEndles = false;
		}
		//2023-03-26 make charge time adjustable, default 24 h
		let maxChargeTime = 24;
		//let maxChargeTimeUserdefined = false;

		this.WallboxChargeTime = settings.WallboxChargeTime;

		if (settings.WallboxChargeTime != null) {
			this.WallboxChargeTime = settings.WallboxChargeTime;
			switch (Number(settings.WallboxChargeTime)) {
				case 1: maxChargeTime = 12; break;
				case 2: maxChargeTime = 24; break;
				case 3: maxChargeTime = 24; break; //endles
				case 4:
					//maxChargeTimeUserdefined = true;
					maxChargeTime = 24;
					break; //user defined to do

			}
		}

		this.logDebug("charge time " + settings.WallboxChargeTime + " " + typeof settings.WallboxChargeTime + " " + maxChargeTime);


		//For EV chargers LatestEnd should be set to the time that is available for excess energy charging. Can be set to 86400 (24h).
		this.LatestEnd = maxChargeTime * 60 * 60; //in 24h
		//this.LatestEnd = 12 * 60 * 60; //in 12h

		this.MinEnergy = settings.MinEnergy;
		this.MaxEnergy = settings.MaxEnergy;
		this.MinPower = settings.MinPower;
		this.MaxPower = settings.MaxPower;

		this.CurrentOnTime = 0;

		this.Prepare();

		this.timediff = 60;
		this.Status = "Off";

		this.CanceledOnDay = -1;
		this.CurrentEnergy = 0;
		this.CurrentEnergyDiff = 0;

		this.UpdateTimesID = null;
		this.UpdateTimesID = setInterval(this.Update.bind(this), this.timediff * 1000);

	}

	destructor(): void  {
		this.logDebug("timeframe destructor called " );
		if (this.UpdateTimesID != null) {

			clearInterval(this.UpdateTimesID);
			this.UpdateTimesID = null;
			this.logDebug("timeframe timer killed ");
		}
	}

	SetMinEnergy(value: number):void {
		this.logDebug("wallbox timeframe set minEnergy " + value);
		this.MinEnergy = value;
	}
	SetMaxEnergy(value: number): void {
		this.logDebug("wallbox timeframe set maxEnergy " + value);
		this.MaxEnergy = value;
	}

	SetDeviceStatus(status: string): void {
		this.Status = status;
	}

	setCurrentEnergy(energy: number): void {

		this.CurrentEnergyDiff = energy - this.CurrentEnergy;

		this.CurrentEnergy = energy;

		//2023-02-15
		//somehow we increased minEnergy (0, max. 60kWh)
		//<MinEnergy>383</MinEnergy>
		//<MaxEnergy>60383</MaxEnergy>
		if (this.CurrentEnergyDiff < 0) {
			this.CurrentEnergyDiff = 0;
		}

		this.MinEnergy = this.MinEnergy - this.CurrentEnergyDiff;
		this.MaxEnergy = this.MaxEnergy - this.CurrentEnergyDiff;

		if (this.MinEnergy < 0) {
			this.MinEnergy = 0;
		}
		if (this.MaxEnergy < 0) {
			this.MaxEnergy = 0;
		}
	}

	async Prepare(): Promise<void> {
		await this.createObjects();
	}

	Update(): void {
		this.EarliestStart = this.EarliestStart - this.timediff;
		if (this.EarliestStart < 0) {
			this.EarliestStart = 0;
		}
		this.LatestEnd = this.LatestEnd - this.timediff;
		if (this.LatestEnd < 0) {
			this.LatestEnd = 0;
		}

		if (this.EarliestStart == 0 && this.LatestEnd > 0) {
			this.isActive = true;

			if (this.Status == "On") {
				this.CurrentOnTime = this.CurrentOnTime + this.timediff;
			}
		}

		if (this.EarliestStart > 0 || this.LatestEnd > 0) {
			this.logDebug(this.deviceName + " timeframe " + this.ID + " update earliest: " + this.EarliestStart + " latest: " + this.LatestEnd + " MinEnergy: " + this.MinEnergy + " MaxEnergy: " + this.MaxEnergy);
		} else {
			this.logDebug(this.deviceName + " timeframe " + this.ID + " inactive");
		}
	}

	async getTimeframeData(): Promise<Timeframedata | null>  {

		let timeframeData = null;
		if (this.EarliestStart > 0 || this.LatestEnd > 0) {
			timeframeData = {

				TimeframeId: this.ID,
				DeviceId: "", //to be filled later
				EarliestStart: this.EarliestStart,
				LatestEnd: this.LatestEnd,
				MinEnergy: this.MinEnergy,
				MaxEnergy: this.MaxEnergy,

				//laut evcc auch das hier mitschicken 2023-02-12
				MaxPowerConsumption: this.MaxPower,
				MinPowerConsumption: this.MinPower
			};
		}

		this.logDebug(this.deviceName + " ( " + this.ID + ") timeframe data " + JSON.stringify(timeframeData));

		const key = "Devices." + this.deviceName + ".TimeFrames." + this.ID + ".LastSent";

		await this.SetState(key,  true,  JSON.stringify(timeframeData) );

		return timeframeData;
	}


	Check2Switch(): {
		SwitchOff: boolean,
		restart: boolean
	} {
		let SwitchOff = false;
		let restart = false;


		if (this.EarliestStart == 0 && this.LatestEnd == 0) {

			if (this.SwitchOffAtEndOfTimer) {
				SwitchOff = true;
				this.logDebug(this.deviceName + " turn device off at end of max runtime");
			}

			if (this.WallboxChargeTimeEndles) {
				restart = true;
				this.logDebug(this.deviceName + " restart timeframe");
			}

			this.isActive = false;
			//this.Start();
		}

		this.UpdateObjects();

		this.logDebug(this.deviceName + " (" + this.ID + ") check end of max runtime: " + SwitchOff);


		const ret = {
			SwitchOff: SwitchOff,
			restart: restart
		};


		return ret;

	}

	CancelActiveTimeframe(): void {
		if (this.isActive) {
			this.EarliestStart = 0;
			this.LatestEnd = 0;

			//make sure not to restart today
			const now = new Date();
			const dayOfWeek = now.getDay();
			this.CanceledOnDay = dayOfWeek;
		}
	}

	//=============================================================
	async createObjects() : Promise<void> {

		let key = "Devices." + this.deviceName + ".TimeFrames." + this.ID + ".TimeOn";
		let obj = {
			type: "state",
			common: {
				name: "TimeOn",
				type: "string",
				role: "value.time",
				unit: "hh:mm",
				read: true,
				write: false,
				desc: "how long the device is already on"
			}
		};
		await this.CreateObject(key, obj);

		key = "Devices." + this.deviceName + ".TimeFrames." + this.ID + ".RemainingMaxEnergy";
		obj = {
			type: "state",
			common: {
				name: "Remaining max. Energy",
				type: "number",
				role: "value",
				unit: "Wh",
				read: true,
				write: false,
				desc: "how much energy the device still needs"
			}
		};
		await this.CreateObject(key, obj);

		key = "Devices." + this.deviceName + ".TimeFrames." + this.ID + ".UsingExcessEnergy";
		obj = {
			type: "state",
			common: {
				name: "device is using excess energy",
				type: "boolean",
				role: "value",
				unit: "",
				read: true,
				write: false,
				desc: "info, whether excess energy is used"
			}
		};
		await this.CreateObject(key, obj);

		key = "Devices." + this.deviceName + ".TimeFrames." + this.ID + ".LastSent";
		obj = {
			type: "state",
			common: {
				name: "debug: last sent data for this timeframe",
				type: "string",
				role: "value",
				unit: "",
				read: true,
				write: false,
				desc: "info, what data were sent to SHM"
			}
		};
		await this.CreateObject(key, obj);

	}

	

	async UpdateObjects(): Promise <void> {
		const Hour = Math.floor(this.CurrentOnTime / 60 / 60);
		const Minutes = Math.floor((this.CurrentOnTime - (Hour * 60 * 60)) / 60);
		let sHour = "0";
		if (Hour < 10) {
			sHour = "0" + Hour;
		} else {
			sHour = String( Hour);
		}
		let sMinutes = "0";
		if (Minutes < 10) {
			sMinutes = "0" + Minutes;
		} else {
			sMinutes = String(Minutes);
		}

		let val = sHour + ":" + sMinutes;

		let key = "Devices." + this.deviceName + ".TimeFrames." + this.ID + ".TimeOn";

		await this.SetState(key,  true,  val );

		//=======================================================
		let isExcessEnergy = false;

		if (this.MinEnergy == 0 && this.Status == "On") {
			isExcessEnergy = true;
		}

		key = "Devices." + this.deviceName + ".TimeFrames." + this.ID + ".UsingExcessEnergy";
		await this.SetState(key,  true, isExcessEnergy );

		//=======================================================
		val = String(this.MaxEnergy);

		key = "Devices." + this.deviceName + ".TimeFrames." + this.ID + ".RemainingMaxEnergy";

		await this.SetState(key,  true,  val );
	}

	SetMaxChargeTime(state: string) : void {

		if (this.WallboxChargeTime != null && this.WallboxChargeTime == 4) {
			const vals = state.split(":");

			const maxChargeTime = Number(vals[0]) + Number(vals[1]) / 60;


			this.LatestEnd = maxChargeTime * 60 * 60; //in 24h

			this.logDebug("set user defined max charge time " + state + " " + maxChargeTime + " " + this.LatestEnd);
		} else {
			this.logWarn("trying to set user defined max charge time, but not enabled " + this.WallboxChargeTime + " " + state);
		}
	}
}

