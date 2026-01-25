/* eslint-disable prettier/prettier */
/* eslint-disable prefer-template */
/* eslint-disable quote-props */

import React from 'react';

import type { AdminConnection, IobTheme, ThemeName, ThemeType } from '@iobroker/adapter-react-v5';
import { type ConfigItemPanel, JsonConfigComponent } from '@iobroker/json-config';
import type { SempAdapterConfig } from "../types";


interface SettingsProps {
    common: ioBroker.InstanceCommon;
    native: SempAdapterConfig;
    instance: number;
    adapterName: string;
    socket: AdminConnection;
    changeNative: (native: ioBroker.AdapterConfig) => void;
    themeName: ThemeName;
    themeType: ThemeType;
    theme: IobTheme;
    systemConfig: ioBroker.SystemConfigObject;
    alive: boolean;
}


const schema: ConfigItemPanel = {
    "type": "panel",
    "label": "Main settings",
    "items": {
        "icontest": {
            "type": "staticImage",
            "src": "./semp.png",
            "newLine": true,
            "xs": 12,
            "sm": 2,
            "md": 2,
            "lg": 1,
            "xl": 1
        },

        "dividerHdr1": {
            "newLine": true,
            "type": "header",
            "text": "general configuration",
            "size": 2
        },
        "IPAddress": {
            "newLine": true,
            "type": "text",
            "label": "IPAddress",
            "help": "IP address SunnyHomeManger",
            "xs": 12,
            "sm": 12,
            "md": 4,
            "lg": 4,
            "xl": 4
        },
        "UUID": {
            "newLine": false,
            "type": "text",
            "label": "UUID",
            "help": "unique ID of Semp-Adapter",
            "xs": 12,
            "sm": 12,
            "md": 4,
            "lg": 4,
            "xl": 4
        },
        "SempPort": {
            "newLine": true,
            "type": "number",
            "label": "SempPort",
            "help": "SemPort_help",
            "default": 9522,
            "min": 1, 
            "xs": 12,
            "sm": 12,
            "md": 4,
            "lg": 4,
            "xl": 4
        },
        "SempName": {
            "newLine": true,
            "type": "text",
            "label": "SempName",
            "help": "SempName_help",
            "xs": 12,
            "sm": 12,
            "md": 4,
            "lg": 4,
            "xl": 4
        },
        "SempManufacturer": {
            "newLine": false,
            "type": "text",
            "label": "SempManufacturer",
            "help": "SempManufacturer_help",
            "xs": 12,
            "sm": 12,
            "md": 4,
            "lg": 4,
            "xl": 4
        },
        "dividerHdr2": {
            "newLine": true,
            "type": "header",
            "text": "logging configuration",
            "size": 2
        },
        "extendedLog": {
            "newLine": true,
            "type": "checkbox",
            "label": "extendedLog",
            "help": "extendedLog_help",
            "default": false, 
            "xs": 12,
            "sm": 12,
            "md": 4,
            "lg": 4,
            "xl": 4
        },
        "LogToCSV": {
            "newLine": false,
            "type": "checkbox",
            "label": "LogToCSV",
            "help": "LogToCSV_help",
            "default": false,
            "xs": 12,
            "sm": 12,
            "md": 4,
            "lg": 4,
            "xl": 4
        },
        "LogToCSVPath": {
            "newLine": false,
            "type": "text",
            "label": "LogToCSVPath",
            "help": "LogToCSVPath_help",
            "hidden": "if (!data.LogToCSV) return true;",
            "xs": 12,
            "sm": 12,
            "md": 4,
            "lg": 4,
            "xl": 4
        },
    }
}


export default function MainSettings(props: SettingsProps): React.JSX.Element {


    console.log("settings: " + JSON.stringify(props.native));

    return (
        <div style={{ width: 'calc(100% - 8px)', minHeight: '100%' }}>
            <JsonConfigComponent
                common={props.common}
                socket={props.socket}
                themeName={props.themeName}
                themeType={props.themeType}
                adapterName="daswetter"
                instance={props.instance || 0}
                isFloatComma={props.systemConfig.common.isFloatComma}
                dateFormat={props.systemConfig.common.dateFormat}
                schema={schema}
                onChange={(params): void => {

                    console.log("MainSettings onChange params: " + JSON.stringify(params));

                    const native: SempAdapterConfig = JSON.parse(JSON.stringify(props.native));
                    //console.log("MainSettings onChange native: " + JSON.stringify(native));

                    //Daten kopieren
                    native.IPAddress = params.IPAddress;
                    native.UUID = params.UUID;
                    native.SempPort = params.SempPort;
                    native.SempName = params.SempName;
                    native.SempManufacturer = params.SempManufacturer;
                    native.extendedLog = params.extendedLog;
                    native.LogToCSV = params.LogToCSV;
                    native.LogToCSVPath = params.LogToCSVPath;
                    
                    props.changeNative(native);
                }}
                //data={props.native.params}
                data={props.native}
                onError={() => {}}
                theme={props.theme}
                withoutSaveButtons
            />
        </div>
    );
}
