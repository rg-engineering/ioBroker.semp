/* eslint-disable prefer-template */
/* eslint-disable quote-props */
/* eslint-disable prettier/prettier */
import React from 'react';

import {
    Box,
    FormControl,
    TextField,
    Select,
    InputLabel,
    MenuItem,
    Checkbox,
    FormControlLabel,
} from '@mui/material';
import type {
    SelectChangeEvent
} from '@mui/material';
import { I18n } from '@iobroker/adapter-react-v5';
import type {
    IobTheme,
    ThemeName,
    ThemeType,
    AdminConnection
} from '@iobroker/adapter-react-v5';

import type { SempDevice } from "../types";
import SelectOID from './SelectOID'; // vorhandene Komponente importieren (oder anpassen)
import BoxDivider from './BoxDivider'



type Props = {
    theme: IobTheme;
    onChange: (value: string) => void;
    device: SempDevice;
    socket: AdminConnection;
    themeName: ThemeName;
    themeType: ThemeType;
};



export default function SwitchSettings(props: Props): React.JSX.Element {
    const [device, setDevice] = React.useState<SempDevice>(props.device ?? ({} as SempDevice));

    React.useEffect(() => {
        setDevice(props.device ?? ({} as SempDevice));
    }, [props.device]);

    const persistDevice = (updated: SempDevice): void => {
        try {
            // Hier: onChange erwartet string -> übergebe JSON
            props.onChange(JSON.stringify(updated));
        } catch (e) {
            // fallback: send empty string on error
            console.error('Failed to persist device:', e);
        }
    };



    const updateDevice = (updated: SempDevice): void => {
        setDevice(updated);
        persistDevice(updated);
    };

    const valString = (name: string): string => {
        const v = (device as any)?.[name];
        return v === undefined || v === null ? '' : String(v);
    };

    const valNumber = (name: string): number | '' => {
        const v = (device as any)?.[name];
        if (v === undefined || v === null || v === '') {
            return '';
        }
        const n = Number(v);
        return Number.isNaN(n) ? '' : n;
    };

    const handleStringChangeValue = (name: string): ((value: string) => void) => (value: string): void => {
        const updated = { ...(device ?? {}), [name]: value } as SempDevice;
        updateDevice(updated);
    };

    const handleNumberChange = (name: string): ((e: React.ChangeEvent<HTMLInputElement>) => void) => (e: React.ChangeEvent<HTMLInputElement>): void => {
        const raw = e.target.value;
        const num = raw === '' ? undefined : Number(raw);
        const updated = { ...(device ?? {}), [name]: num } as SempDevice;
        updateDevice(updated);
    };

    const handleBoolChange = (name: string): ((e: React.ChangeEvent<HTMLInputElement>) => void) => (e: React.ChangeEvent<HTMLInputElement>): void => {
        const checked = e.target.checked;
        const updated = { ...(device ?? {}), [name]: checked } as SempDevice;
        updateDevice(updated);
    };


    return (
        <Box
            style={{ margin: 10 }}
        >

            <BoxDivider
                Name={I18n.t('switch')}
                theme={props.theme}
            />

            <Box
                style={{ margin: 10 }}
            >

                {/* Flex-Container: Select + optionaler SelectOID nebeneinander */}
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <FormControl variant="standard" sx={{ minWidth: '20%', maxWidth: '40%' }}>
                        <InputLabel id="device-StatusDetectionType-label">{I18n.t('select a type')}</InputLabel>
                        <Select
                            labelId="device-StatusDetectionType-label"
                            value={valString('StatusDetectionType') || 'SeparateOID'}
                            onChange={(e: SelectChangeEvent<string>) => {
                                const val = e.target.value ?? '';
                                const updated = { ...(device ?? {}), StatusDetectionType: val } as SempDevice;
                                updateDevice(updated);
                            }}
                            displayEmpty={false}
                        >
                            <MenuItem value="SeparateOID">
                                <em>{I18n.t('SeparateOID')}</em>
                            </MenuItem>
                            <MenuItem value="FromPowerValue">
                                <em>{I18n.t('FromPowerValue')}</em>
                            </MenuItem>
                            <MenuItem value="AlwaysOn">
                                <em>{I18n.t('AlwaysOn')}</em>
                            </MenuItem>
                        </Select>
                    </FormControl>

                    {/* SelectOID in Box mit Breitenbegrenzung, nur sichtbar bei SeparateOID */}
                    {
                        (device && (device as any).StatusDetectionType) === "SeparateOID" ? (
                            
                                <SelectOID
                                    settingName={I18n.t('OIDStatus')}
                                    socket={props.socket}
                                    theme={props.theme}
                                    themeName={props.themeName}
                                    themeType={props.themeType}
                                    Value={valString('OID_Status')}
                                    onChange={handleStringChangeValue('OID_Status')}
                                />
                            
                        ) : null
                    }
                </Box>
            </Box>

            <Box
                style={{ margin: 10 }}
            >
                {
                    (device && (device as any).StatusDetectionType) === "FromPowerValue" ? (

                        <div>
                            <TextField
                                style={{ marginBottom: 16 }}
                                id='DeviceStatusDetectionLimit'
                                label={I18n.t('DeviceStatusDetectionLimit')}
                                variant="standard"
                                type="number"
                                inputProps={{ min: 0 }}
                                value={valNumber('StatusDetectionLimit')}
                                onChange={handleNumberChange('StatusDetectionLimit')}
                                sx={{ minWidth: '20%', maxWidth: '20%', marginRight: '10px' }}
                            />

                            <TextField
                                style={{ marginBottom: 16 }}
                                id='DeviceStatusDetectionLimitTimeOn'
                                label={I18n.t('DeviceStatusDetectionLimitTimeOn')}
                                variant="standard"
                                type="number"
                                inputProps={{ min: 0 }}
                                value={valNumber('StatusDetectionLimitTimeOn')}
                                onChange={handleNumberChange('StatusDetectionLimitTimeOn')}
                                sx={{ minWidth: '20%', maxWidth: '20%', marginRight: '10px' }}
                            />

                            <TextField
                                style={{ marginBottom: 16 }}
                                id='DeviceStatusDetectionLimitTimeOff'
                                label={I18n.t('DeviceStatusDetectionLimitTimeOff')}
                                variant="standard"
                                type="number"
                                inputProps={{ min: 0 }}
                                value={valNumber('StatusDetectionLimitTimeOff')}
                                onChange={handleNumberChange('StatusDetectionLimitTimeOff')}
                                sx={{ minWidth: '20%', maxWidth: '20%', marginRight: '10px' }}
                            />
                            <TextField
                                style={{ marginBottom: 16 }}
                                id='DeviceStatusDetectionMinRunTime'
                                label={I18n.t('DeviceStatusDetectionMinRunTime')}
                                variant="standard"
                                type="number"
                                inputProps={{ min: 0 }}
                                value={valNumber('StatusDetectionMinRunTime')}
                                onChange={handleNumberChange('StatusDetectionMinRunTime')}
                                sx={{ minWidth: '20%', maxWidth: '20%', marginRight: '10px' }}
                            />
                        </div>
                    ) : null
                }

            </Box>

            <Box
                style={{ margin: 10 }}
                sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}
            >
                <FormControlLabel
                    control={
                        <Checkbox
                            color="primary"
                            checked={!!(device && (device as any).HasOIDSwitch)}
                            onChange={handleBoolChange('HasOIDSwitch')}
                            aria-label="device has OID switch"
                        />
                    }
                    label={I18n.t('Has OID Switch')}
                    sx={{ minWidth: '20%', maxWidth: '40%', marginRight: '10px' }}
                />

                {
                    (device && (device as any).HasOIDSwitch) === true ? (
                        <SelectOID
                            settingName={I18n.t('OIDSwitch')}
                            socket={props.socket}
                            theme={props.theme}
                            themeName={props.themeName}
                            themeType={props.themeType}
                            Value={valString('OID_Switch')}
                            onChange={handleStringChangeValue('OID_Switch')}
                        />
                    ) : null
                }
            </Box>
        </Box>
    );
}