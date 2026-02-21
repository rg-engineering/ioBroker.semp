/* eslint-disable prefer-template */
import Timeframe from "./Timeframe";
import TimeframeWallbox from "./TimeframeWallbox";
import Base from "./base";
import type { Semp } from "../main";
import type { EnergyRequestPeriod } from "./adapter-config";



interface PlanningrequestSettings {
	EnergyRequestPeriods: EnergyRequestPeriod[];
	SwitchOffAtEndOfTimer: boolean;
	DeviceName: string;
	DeviceType: string;
	MaxEnergy: number;
	MinEnergy: number;
	MinPower: number;
	MaxPower: number;
	WallboxChargeTime: number;
	DishwasherMode: boolean;
	Type: string;
	Name: string;
}

export default class Planningrequest extends Base {

	// Fix: timeframes kann Elemente beider Typen enthalten -> Union-Array
	timeframes: (Timeframe | TimeframeWallbox)[];
	settings: PlanningrequestSettings;
	WallboxPlugConnected: boolean;


	constructor(settings: PlanningrequestSettings, parentadapter:Semp | null) {

		super(parentadapter, 0, "planning request");

		this.settings = settings;

		// Initialisierung als leeres Array des Union-Typs
		this.timeframes = [];
		this.logDebug("planningrequest constructor " + JSON.stringify(settings));

		if (this.settings.Type != "EVCharger") {
			this.CreateTimeframes();
		}

		this.WallboxPlugConnected = false;

	}

	destructor(): void {
		for (let t = 0; t < this.timeframes.length; t++) {
			this.timeframes[t].destructor();
		}
		this.timeframes = [];
	}


	SetDeviceStatus(status:string):void {
		for (let d = 0; d < this.timeframes.length; d++) {
			this.timeframes[d].SetDeviceStatus(status);
		}
	}


	CreateTimeframes(): void {

		if (this.settings.EnergyRequestPeriods !== undefined && this.settings.EnergyRequestPeriods != null && this.settings.EnergyRequestPeriods.length > 0) {

			this.logDebug("planningrequest create time frames " + this.settings.EnergyRequestPeriods.length);

			for (let r = 0; r < this.settings.EnergyRequestPeriods.length; r++) {

				const settings = {
					EnergyRequestPeriod: this.settings.EnergyRequestPeriods[r],
					DeviceName: this.settings.Name,
					//SwitchOffAtEndOfTimer: this.settings.SwitchOffAtEndOfTimer
					//xxx
					DishWasherMode: this.settings.DishwasherMode,

				};

				this.logDebug("planningrequest " + JSON.stringify(this.settings) + " " + JSON.stringify(settings));

				const timeframe = new Timeframe(settings, this.adapter);

				// OK: Union-Array akzeptiert Timeframe
				this.timeframes.push(timeframe);
			}
		} else {
			this.logWarn("no planning request time frames defined");
		}
	}

	CreateTimeframeWallbox() : void {
		this.logDebug("planningrequest create time frame for wallbox");

		const settings = {
			EnergyRequestPeriod: null,
			DeviceName: this.settings.Name,
			SwitchOffAtEndOfTimer: this.settings.SwitchOffAtEndOfTimer,
			MaxEnergy: this.settings.MaxEnergy,
			MinEnergy: this.settings.MinEnergy,
			MinPower: this.settings.MinPower,
			MaxPower: this.settings.MaxPower,
			WallboxChargeTime: this.settings.WallboxChargeTime
		};

		this.logDebug("planningrequest " + JSON.stringify(this.settings) + " " + JSON.stringify(settings));

		const timeframe = new TimeframeWallbox(settings, this.adapter);

		// OK: Union-Array akzeptiert TimeframeWallbox
		this.timeframes.push(timeframe);
	}

	SetMinEnergy(value: number): void{
		if (value >= 0) {
			this.logDebug("planningrequest set minEnergy " +value);
			if (this.timeframes.length > 0) {
				for (let t = 0; t < this.timeframes.length; t++) {
					// Fix: korrekte Syntax und Cast auf TimeframeWallbox
					(this.timeframes[t] as TimeframeWallbox).SetMinEnergy(value);
				}
			}
		}
	}

	SetMaxEnergy(value: number): void{
		if (value > 0) {
			this.logDebug("planningrequest set maxEnergy " + value);
			if (this.timeframes.length > 0) {
				for (let t = 0; t < this.timeframes.length; t++) {
					// Fix: korrekte Syntax und Cast auf TimeframeWallbox
					(this.timeframes[t] as TimeframeWallbox).SetMaxEnergy(value);
				}
			}
		}
	}


	getPlanningrequestData(): Array<any> {

		const PlanningrequestData: Array<any> = [];

		if (this.WallboxPlugConnected || this.settings.DeviceType != "EVCharger") {
			for (let t = 0; t < this.timeframes.length; t++) {
				const timeframeData = this.timeframes[t].getTimeframeData();
				if (timeframeData != null) {
					PlanningrequestData.push(timeframeData);
				}
			}
		}

		this.logDebug("planningrequest data " + JSON.stringify(PlanningrequestData));

		return PlanningrequestData;
	}


	getAllTimeframesFinished(): boolean {

        let AllFinished = true;
		if (this.timeframes.length > 0) {
			for (let t = 0; t < this.timeframes.length; t++) {
				// Fix: korrekte Syntax und Cast auf TimeframeWallbox
				const val = (this.timeframes[t] as Timeframe).GetFinished();
				if (val == false) {
					AllFinished = false;
				}
			}
		}

        return AllFinished;

	}

	Check2Switch(): {SwitchOff: boolean; restart: boolean;}{

		let SwitchOff = false;
		let restart = false;
		if (this.timeframes.length > 0) {
			for (let t = 0; t < this.timeframes.length; t++) {

				const oRet = this.timeframes[t].Check2Switch();

				if (oRet.SwitchOff) {
					SwitchOff = true;
				}
				if (oRet.restart) {
					restart = true;
					//just delete timeframe
					this.SetPlugConnected(false);
				}

			}
		} else {
			SwitchOff = true;
		}
		const ret = {
			SwitchOff: SwitchOff,
			restart: restart
		};

		this.logDebug("Planningrequest Check2Switch " + JSON.stringify(ret));
		return ret;
	}

	CancelActiveTimeframes(): void {
		for (let t = 0; t < this.timeframes.length; t++) {
			this.timeframes[t].CancelActiveTimeframe();
		}
	}


	//Wallbox
	SetCurrentEnergy(energy: number) : void{
		if (this.settings.DeviceType == "EVCharger") {
			this.logDebug("got energy used " + energy);

			for (let t = 0; t < this.timeframes.length; t++) {
				// Fix: korrekte Syntax und Cast auf TimeframeWallbox
				(this.timeframes[t] as TimeframeWallbox).setCurrentEnergy(energy);
			}
		}
	}


	SetPlugConnected(state: boolean): void {

		if (this.settings.DeviceType == "EVCharger") {
			this.WallboxPlugConnected = state;

			if (state) {
				if (this.timeframes == null || this.timeframes.length == 0) {
					this.CreateTimeframeWallbox();
				}
			} else {
				this.logDebug("Planningrequest all timeframes canceled ");

				for (let t = 0; t < this.timeframes.length; t++) {
					this.timeframes[t].destructor();
				}

				this.timeframes = [];
			}
		}
	}


	SetMaxChargeTime(state: string) : void {
		if (this.settings.DeviceType == "EVCharger") {
			for (let t = 0; t < this.timeframes.length; t++) {
				// Fix: korrekte Syntax und Cast auf TimeframeWallbox
				(this.timeframes[t] as TimeframeWallbox).SetMaxChargeTime(state);
			}
		}
	}
}


