/* eslint-disable prefer-template */

import type { Semp } from "../main";
import type {  EnergyRequestPeriod } from "./types";

import Base from "./base";


type TimeoutHandle = ReturnType<typeof setTimeout>;

interface TimeframeSettings {
	EnergyRequestPeriod: EnergyRequestPeriod,
	DeviceName: string;
	DishWasherMode: boolean;
}

interface Timeframedata {
	TimeframeId: string;
	DeviceId: string;
	EarliestStart: number;
	LatestEnd: number;
	MinRunningTime: number;
	MaxRunningTime: number;
}

export default class Timeframe extends Base {

	settings: EnergyRequestPeriod;
	deviceName: string;
	DishWasherMode: boolean;
	isActive: boolean;
	EarliestStart: number;
	LatestEnd: number;
	MinRunningTime: number;
	MaxRunningTime: number;
	CurrentOnTime: number;
	timediff: number;
	CanceledOnDay: number;
	Status: string;
	UpdateTimesID: TimeoutHandle | null;
	enabledbyUser: boolean;

	constructor(settings: TimeframeSettings, parentAdapter: Semp | null) {

		super(parentAdapter, 0, "Timeframe");

		this.settings = settings.EnergyRequestPeriod;
		this.deviceName = settings.DeviceName;
		this.DishWasherMode = settings.DishWasherMode;

		this.isActive = false;
		

		this.logDebug("timeframe constructor " + JSON.stringify(settings));

		this.EarliestStart = -1;
		this.LatestEnd = -1;
		this.MinRunningTime = -1;

		this.MaxRunningTime = -1;
		this.CurrentOnTime = -1;

		this.timediff = 60; 

		this.Status = "Off";

		this.CanceledOnDay = -1;

		this.Prepare();

		this.Start();

		this.UpdateTimesID = null;
		this.UpdateTimesID = setInterval(this.Update.bind(this), this.timediff * 1000);

		this.enabledbyUser = true;

	}

	destructor(): void {
		this.logDebug("timeframe destructor called " );
		if (this.UpdateTimesID != null) {
			clearInterval(this.UpdateTimesID);
			this.UpdateTimesID = null;
			this.logDebug("timeframe timer killed ");
		}
	}

	SetDeviceStatus(status: string): void {
		this.Status = status;
	}

	async Prepare(): Promise <void> {
		await this.createObjects();

		const key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".TimeOn";
		const curVal = await this.adapter?.getStateAsync(key);

		if (curVal != null) {
			const vals = (curVal.val as string ).split(":");
			if (vals.length > 1) {

				//todo

			}
		}

		await this.GetEnabled();

	}

	Start() : void {

		try {
			const now = new Date();
			const dayOfWeek = now.getDay();

			this.logDebug(this.deviceName + " (" + this.settings.ID + ") Start called");

			//if we have canceld it today, do not check again
			if (this.CanceledOnDay != dayOfWeek) {
				this.CanceledOnDay = -1;

				const start = this.settings.EarliestStartTime.split(":");
				const end = this.settings.LatestEndTime.split(":");
				const minRunTimes = this.settings.MinRunTime.split(":");
				const maxRunTimes = this.settings.MaxRunTime.split(":");

				let allchecked = true;
				if (start.length != 2) {
					this.logError(this.deviceName + " EarliestStartTime, unsupported time format ' " + this.settings.EarliestStartTime + " ', should be hh:mm");
					allchecked = false;
				}
				if (end.length != 2) {
					this.logError(this.deviceName + " LatestEndTime, unsupported time format ' " + this.settings.LatestEndTime + " ', should be hh:mm");
					allchecked = false;
				}
				if (minRunTimes.length != 2) {
					this.logError(this.deviceName + " MinRunTime, unsupported time format ' " + this.settings.MinRunTime + " ', should be hh:mm");
					allchecked = false;
				}
				if (maxRunTimes.length != 2) {
					this.logError(this.deviceName + " MaxRunTime, unsupported time format ' " + this.settings.MaxRunTime + " ', should be hh:mm");
					allchecked = false;
				}

				//check days
				this.logDebug(this.deviceName + " (" + this.settings.ID +  ") check run today  " + dayOfWeek + " " + this.settings.Days);
				let runToday = false;
				if (this.settings.Days == "everyDay") {
					runToday = true;
				} else if (this.settings.Days == "Monday" && dayOfWeek == 1) {
					runToday = true;
				} else if (this.settings.Days == "Tuesday" && dayOfWeek == 2) {
					runToday = true;
				} else if (this.settings.Days == "Wednesday" && dayOfWeek == 3) {
					runToday = true;
				} else if (this.settings.Days == "Thursday" && dayOfWeek == 4) {
					runToday = true;
				} else if (this.settings.Days == "Friday" && dayOfWeek == 5) {
					runToday = true;
				} else if (this.settings.Days == "Saturday" && dayOfWeek == 6) {
					runToday = true;
				} else if (this.settings.Days == "Sunday" && dayOfWeek == 0) {
					runToday = true;
				}


				if (allchecked && runToday) {

					const StartTime = new Date();
					StartTime.setHours(Number(start[0]));
					StartTime.setMinutes(Number(start[1]));
					StartTime.setSeconds(0);

					const EndTime = new Date();
					EndTime.setHours(Number(end[0]));
					EndTime.setMinutes(Number(end[1]));
					EndTime.setSeconds(0);

					const StartIn = StartTime.getTime() - now.getTime();
					const EndIn = EndTime.getTime() - now.getTime();

					if (StartIn < 0) {
						this.EarliestStart = 0;
					} else {
						this.EarliestStart = Math.floor(StartIn / 1000);
					}

					if (EndIn < 0) {
						this.LatestEnd = 0;
					} else {
						this.LatestEnd = Math.floor(EndIn / 1000);
					}

					this.MinRunningTime = (Number(minRunTimes[0]) * 60 * 60) + (Number(minRunTimes[1]) * 60);
					this.MaxRunningTime = (Number(maxRunTimes[0]) * 60 * 60) + (Number(maxRunTimes[1]) * 60);

					this.CurrentOnTime = 0;

				} else {
					this.EarliestStart = -1;
					this.LatestEnd = -1;
					this.MinRunningTime = -1;
					this.MaxRunningTime = -1;
					this.CurrentOnTime = -1;
				}
			}
			this.logDebug(this.deviceName + " timeframe " + this.settings.ID + " start earliest: " + this.EarliestStart + " latest: " + this.LatestEnd + " MinRunTime: " + this.MinRunningTime + " MaxRuntime: " + this.MaxRunningTime);
		} catch (e) {
			this.logError("exception in timeframe start [" + e + "]");
		}
	}


	async GetEnabled(): Promise<void> {
		const key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".active";

		const current = await this.adapter?.getStateAsync(key);

		//this.parentAdapter.log.debug(key +  ": timeframe " + JSON.stringify(current));

		if (current != null) {

			if (current.val == true || current.val == "true") {
				this.enabledbyUser = true;
				//this.parentAdapter.log.debug( "timeframe enabled " );
			} else {
				this.enabledbyUser = false;
				//this.parentAdapter.log.debug( "timeframe disabled ");
			}
		}
	}


	async Update(): Promise<void> {

		await this.GetEnabled();

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

				this.MinRunningTime = this.MinRunningTime - this.timediff;
				if (this.MinRunningTime < 0) {
					this.MinRunningTime = 0;
				}
				this.MaxRunningTime = this.MaxRunningTime - this.timediff;
				if (this.MaxRunningTime < 0) {
					this.MaxRunningTime = 0;
				}
			}
		}
		if (this.EarliestStart > 0 || this.LatestEnd > 0) {
			this.logDebug(this.deviceName + " timeframe " + this.settings.ID + " update earliest: " + this.EarliestStart + " latest: " + this.LatestEnd + " MinRunTime: " + this.MinRunningTime + " MaxRuntime: " + this.MaxRunningTime);
		} else {
			this.logDebug(this.deviceName + " timeframe " + this.settings.ID + " inactive");
		}
	}

	async getTimeframeData(): Promise<Timeframedata | null> {

		let timeframeData = null;

		//const key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".active";

		//const current = await this.parentAdapter.getStateAsync(key);

		//this.parentAdapter.log.warn(key +  ": timeframe enabled " + JSON.stringify(current));

		//if (current != null) {

		if (this.enabledbyUser ) {
			if (this.EarliestStart > 0 || this.LatestEnd > 0) {
				timeframeData = {

					TimeframeId: this.settings.ID,
					DeviceId: "", //to be filled later
					EarliestStart: this.EarliestStart,
					LatestEnd: this.LatestEnd,
					MinRunningTime: this.MinRunningTime,
					MaxRunningTime: this.MaxRunningTime,
				};
			}

			//this.parentAdapter.log.debug(this.deviceName + " ( " + this.settings.ID + ") timeframe data " + JSON.stringify(timeframeData));

			const key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".LastSent";

			await this.SetState(key,  true, JSON.stringify(timeframeData) );
		} else {

			if (!this.enabledbyUser) {
				this.logDebug(this.deviceName + " ( " + this.settings.ID + ") timeframe disabled by user ");
			}

		}

		//else {
		//	this.parentAdapter.log.error(this.deviceName + " ( " + this.settings.ID + ") timeframe active not readable ");
		//}


		return timeframeData;
	}


	Check2Switch(): {
		SwitchOff: boolean;
		restart: boolean;
	} {
		let SwitchOff = false;
		const restart = false;

		if (this.isActive) {
			this.logDebug(this.deviceName + " (" + this.settings.ID + ")  000");
			if (this.MaxRunningTime == 0) {
				//SwitchOff = true; //done below
				this.logDebug(this.deviceName + " turn device off at end of MaxRunTime");
				//this.LatestEnd = 0; //stop energy request too
				this.CancelActiveTimeframe();
			} else {
				this.logDebug(this.deviceName + " (" + this.settings.ID + ")  111");
			}


			if (this.EarliestStart == 0 && this.LatestEnd == 0) {


				//xxx hier im Spülmaschinen-Modus nicht ausschalten
				if (this.DishWasherMode) {
					this.logDebug(this.deviceName + " not to turn device off at end of LatestEnd, dishwasher");
				} else {
					SwitchOff = true;
					this.logDebug(this.deviceName + " turn device off at end of LatestEnd");
					
				}
				this.isActive = false;
				this.Start();
			} else {
				this.logDebug(this.deviceName + " (" + this.settings.ID + ")  222 is active " + this.EarliestStart + " " + this.LatestEnd);
			}
		} else {
			this.Start();
			this.logDebug(this.deviceName + " (" + this.settings.ID + ")  333 not yet active");
		}
		this.UpdateObjects();

		this.logDebug(this.deviceName + " (" + this.settings.ID + ") check end of max runtime " + SwitchOff + " " + this.isActive);

		const ret = {
			SwitchOff: SwitchOff,
			restart: restart
		};

		return ret;

	}

	CancelActiveTimeframe() : void {
		if (this.isActive) {
			this.EarliestStart = 0;
			this.LatestEnd = 0;

			//make sure not to restart today
			const now = new Date();
			const dayOfWeek = now.getDay();
			this.CanceledOnDay = dayOfWeek;
		}
	}


	GetFinished(): boolean {
		let bRet = false;

		if (this.EarliestStart == 0 && this.LatestEnd == 0) {
			bRet = true;
		}

		return bRet;
	}


	//=============================================================
	async createObjects(): Promise<void> {

		let key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".TimeOn";
		let obj = {
			type: "state",
			common: {
				name: "On Time",
				type: "string",
				role: "value.time",
				unit: "hh:mm",
				read: true,
				write: false,
				desc: "how long the device is already on"
			}
		};
		await this.CreateObject(key, obj);

		key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".RemainingMaxOnTime";
		obj = {
			type: "state",
			common: {
				name: "remaining max. On Time",
				type: "string",
				role: "value.time",
				unit: "hh:mm",
				read: true,
				write: false,
				desc: "how long the device remains on"
			}
		};
		await this.CreateObject(key, obj);

		key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".UsingExcessEnergy";
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


		key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".LastSent";
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

		key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".active";
		obj = {
			type: "state",
			common: {
				name: "timeframe is active",
				type: "boolean",
				role: "value",
				unit: "",
				read: true,
				write: true,
				desc: "switch to enable / disable timeframe"
			}
		};
		await this.CreateObject(key, obj);
		await this.SetDefault(key, "true");

	}

	


	async UpdateObjects(): Promise <void> {
		let Hour = Math.floor(this.CurrentOnTime / 60 / 60);
		let Minutes = Math.floor((this.CurrentOnTime - (Hour * 60 * 60)) / 60);
		let sHour = "0";
		if (Hour < 10) {
			sHour = "0" + Hour;
		} else {
			sHour = String(Hour);
		}
		let sMinutes = "0";
		if (Minutes < 10) {
			sMinutes = "0" + Minutes;
		} else {
			sMinutes = String(Minutes);
		}

		let val = sHour + ":" + sMinutes;

		let key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".TimeOn";

		await this.SetState(key,   true, val );

		//=======================================================
		let isExcessEnergy = false;

		if (this.MinRunningTime == 0 && this.Status == "On") {
			isExcessEnergy = true;
		}

		key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".UsingExcessEnergy";
		await this.SetState(key, true, isExcessEnergy );

		//=======================================================
		val = "00:00";

		Hour = Math.floor((this.LatestEnd - this.EarliestStart) / 60 / 60);
		Minutes = Math.floor(((this.LatestEnd - this.EarliestStart) - (Hour * 60 * 60)) / 60);
		sHour = "0";
		if (Hour < 10) {
			sHour = "0" + Hour;
		} else {
			sHour = String(Hour);
		}
		sMinutes = "0";
		if (Minutes < 10) {
			sMinutes = "0" + Minutes;
		} else {
			sMinutes = String(Minutes);
		}

		val = sHour + ":" + sMinutes;


		key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".RemainingMaxOnTime";

		await this.SetState(key, true, val);
	}



}


