/* eslint-disable prefer-template */
/* eslint-disable quote-props */
/* eslint-disable prettier/prettier */
import React from 'react';

import {
    Box,
    FormControl,
    Select,
    InputLabel,
    MenuItem,
    Badge
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

export default function CounterSettings(props: Props): React.JSX.Element {

    // Lokaler State für device, damit alle helper Zugriff haben
    const [device, setDevice] = React.useState<SempDevice | undefined>(props.device);

    // Wenn props.device sich ändert, State aktualisieren
    React.useEffect((): void => {
        setDevice(props.device);
    }, [props.device]);


    type Primitive = string | number | boolean | null | undefined;

    type PrimitiveKeys<T> = {
        [K in keyof T]: T[K] extends Primitive ? K : never
    }[keyof T];

    // Kurzer Helfer für sichere Felderausgabe (verwende lokalen device)
    //const valString = (field: keyof SempDevice): string => (device && (device )[field] !== undefined ? String((device)[field]) : '');
    const valString = (field: PrimitiveKeys<SempDevice>): string =>
        device && device[field] !== undefined
            ? String(device[field])
            : '';
    
    //const valNumber = (field: keyof SempDevice): string | number => (device && (device as any)[field] !== undefined ? (device as any)[field] : '');

    // Persist-Funktion: ruft props.onChange mit einem string payload auf (Original-Props erwarten string)
    const persistDevice = (updated: SempDevice): void => {
        try {
            if (props.onChange) {
                props.onChange(JSON.stringify(updated));
            }
        } catch (e) {
            // Fehler still ignorieren, keine Seiteneffekt-Logik hier
            console.error('Failed to persist device:', e);
        }
    };
        

    
    // Direkter Wert-Handler (z.B. SelectOID liefert wohl direkt einen string)
    const handleStringChangeValue = (field: keyof SempDevice): (val: string) => void => {
        return (val: string): void => {
            const value = val ?? '';
            const updated = { ...(device ?? {}), [field]: value } as SempDevice;
            setDevice(updated);
            persistDevice(updated);
        };
    };

    

    return (
        <Box
            style={{ margin: 10 }}
        >

            <BoxDivider
                Name={I18n.t('counter')}
                theme={props.theme}
            />


            <Box
                style={{ margin: 10 }}
                sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexWrap: 'wrap' }}
            >

                <Badge color="primary" id='hint_counter' sx={{ display: 'block', mb: 2, minWidth: '100%' }}>
                    {I18n.t('hint_counter')}
                </Badge>

                


                <FormControl variant="standard" sx={{ minWidth: '20%',  maxWidth: '40%' }}>
                    <InputLabel id="device-MeasurementMethod-label">{I18n.t('select a type')}</InputLabel>
                    <Select
                        labelId="device-MeasurementMethod-label"
                        value={valString('MeasurementMethod') || 'Measurement'}
                        onChange={(e: SelectChangeEvent<string>) => {
                            const val = e.target.value ?? '';
                            const updated = { ...(device ?? {}), MeasurementMethod: val } as SempDevice;
                            setDevice(updated);
                            persistDevice(updated);
                        }}
                        displayEmpty={false}
                    >
                        <MenuItem value="Measurement">
                            <em>{I18n.t('Measurement')}</em>
                        </MenuItem>
                        <MenuItem value="Estimation">
                            <em>{I18n.t('Estimation')}</em>
                        </MenuItem>
                    </Select>
                </FormControl>
            

            
                {

                    (device && device.MeasurementMethod === "Measurement") ? (

                        <SelectOID
                            settingName={I18n.t('OIDPower')}
                            socket={props.socket}
                            theme={props.theme}
                            themeName={props.themeName}
                            themeType={props.themeType}
                            Value={valString('OID_Power')}
                            onChange={handleStringChangeValue('OID_Power')}
                        />

                    ) : null
                }
            </Box>

            <Box
                style={{ margin: 10 }}
            >
                <FormControl variant="standard" sx={{ minWidth: '20%', maxWidth: '50%' }}>
                    <InputLabel id="device-MeasurementUnit-label">{I18n.t('select a unit')}</InputLabel>
                    <Select
                        labelId="device-MeasurementUnit-label"
                        value={valString('MeasurementUnit') || 'W'}
                        onChange={(e: SelectChangeEvent<string>) => {
                            const val = e.target.value ?? '';
                            const updated = { ...(device ?? {}), MeasurementUnit: val } as SempDevice;
                            setDevice(updated);
                            persistDevice(updated);
                        }}
                        displayEmpty={false}
                    >
                        <MenuItem value="W">
                            <em>{I18n.t('W')}</em>
                        </MenuItem>
                        <MenuItem value="kW">
                            <em>{I18n.t('kW')}</em>
                        </MenuItem>
                    </Select>
                </FormControl>

            </Box>
        </Box>

    );
}