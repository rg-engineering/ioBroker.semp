// This file extends the AdapterConfig type from "@types/iobroker"

import type { SempDevice } from "./types";




// Augment the globally declared type ioBroker.AdapterConfig
declare global {
	namespace ioBroker {
		interface AdapterConfig {


            IPAddress: string;
            UUID: string;
            DeviceBaseID: string;
            SempPort: number;
            SempName: string;
            SempManufacturer: string;
            extendedLog: boolean;
            LogToCSV: boolean;
            LogToCSVPath: string;

            devices: SempDevice[];

		}
	}
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};