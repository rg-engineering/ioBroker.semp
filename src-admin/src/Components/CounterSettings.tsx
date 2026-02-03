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
    React.useEffect(() => {
        setDevice(props.device);
    }, [props.device]);

    // Kurzer Helfer für sichere Felderausgabe (verwende lokalen device)
    const valString = (field: keyof SempDevice) => (device && (device as any)[field] !== undefined ? String((device as any)[field]) : '');
    const valNumber = (field: keyof SempDevice) => (device && (device as any)[field] !== undefined ? (device as any)[field] : '');

    // Persist-Funktion: ruft props.onChange mit einem string payload auf (Original-Props erwarten string)
    const persistDevice = (updated: SempDevice) => {
        try {
            if (props.onChange) {
                props.onChange(JSON.stringify(updated));
            }
        } catch (e) {
            // Fehler still ignorieren, keine Seiteneffekt-Logik hier
        }
    };

    // Generische Handler (event-basiert für TextField)
    const handleStringChange = (field: keyof SempDevice) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const val = e.target.value ?? '';
        const updated = { ...(device ?? {}), [field]: val } as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };

    // Direkter Wert-Handler (z.B. SelectOID liefert wohl direkt einen string)
    const handleStringChangeValue = (field: keyof SempDevice) => (val: string) => {
        const value = val ?? '';
        const updated = { ...(device ?? {}), [field]: value } as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };

    // Numerische Felder (behandelt leeren String als Entfernen)
    const handleNumberChange = (field: keyof SempDevice) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const raw = e.target.value;
        const updated = { ...(device ?? {}) } as any;
        if (raw === '' || raw === null) {
            // Entferne Feld oder setze auf undefined
            delete updated[field];
        } else {
            const num = Number(raw);
            updated[field] = Number.isNaN(num) ? raw : num;
        }
        const updatedTyped = updated as SempDevice;
        setDevice(updatedTyped);
        persistDevice(updatedTyped);
    };

    // Checkbox / boolean Handler
    const handleBoolChange = (field: keyof SempDevice) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.checked;
        const updated = { ...(device ?? {}), [field]: val } as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };


    return (
        <div>
            <FormControl variant="standard" sx={{ minWidth: '30%', maxWidth: '50%' }}>
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
                (device && (device as any).MeasurementMethod) === "Measurement" ? (
                    <div style={{ display: 'flex', gap: 16 }}>
                        <SelectOID
                            settingName={I18n.t('DeviceOIDPower')}
                            socket={props.socket}
                            theme={props.theme}
                            themeName={props.themeName}
                            themeType={props.themeType}
                            Value={valString('OIDPower')}
                            onChange={handleStringChangeValue('OIDPower')}
                        />
                    </div>
                ) : null
            }

            <FormControl variant="standard" sx={{ minWidth: '20%', maxWidth: '30%' }}>
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
        </div>
    );
}