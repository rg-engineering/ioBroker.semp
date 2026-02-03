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

/*
Plan (Pseudocode, detailliert):
1. Lokalen State `device` und `setDevice` aus Props initialisieren und bei Prop-Änderung synchronisieren.
2. Hilfsfunktionen implementieren:
   - valString(name): liest String-Wert aus device oder liefert ''.
   - valNumber(name): liest Zahl oder ''.
   - updateDevice(updated): setzt state und ruft persistDevice.
   - persistDevice(updated): serialisiert Gerät und ruft props.onChange mit string (weil onChange: (value: string) => void).
   - handleStringChangeValue(name): gibt Funktion (value: string) => void zurück, für SelectOID und ähnliche.
   - handleNumberChange(name): gibt Input-Event-Handler zurück, der Zahlen parst und updated.
   - handleBoolChange(name): gibt Checkbox-Event-Handler zurück, der checked setzt und updated.
3. Einfache `BoxDivider`-Komponente lokal definieren, damit Import-Fehler verschwinden.
4. JSX anpassen, sodass alle Verweise `device`, `valString`, `valNumber`, `handle...` und `setDevice` vorhanden sind.
5. Typen korrekt verwenden (React.ChangeEvent, SelectChangeEvent).
*/

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

    const persistDevice = (updated: SempDevice) => {
        try {
            // Hier: onChange erwartet string -> übergebe JSON
            props.onChange(JSON.stringify(updated));
        } catch (e) {
            // fallback: send empty string on error
            props.onChange('');
        }
    };

    const updateDevice = (updated: SempDevice) => {
        setDevice(updated);
        persistDevice(updated);
    };

    const valString = (name: string): string => {
        const v = (device as any)?.[name];
        return v === undefined || v === null ? '' : String(v);
    };

    const valNumber = (name: string): number | '' => {
        const v = (device as any)?.[name];
        if (v === undefined || v === null || v === '') return '';
        const n = Number(v);
        return Number.isNaN(n) ? '' : n;
    };

    const handleStringChangeValue = (name: string) => (value: string) => {
        const updated = { ...(device ?? {}), [name]: value } as SempDevice;
        updateDevice(updated);
    };

    const handleNumberChange = (name: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        const num = raw === '' ? undefined : Number(raw);
        const updated = { ...(device ?? {}), [name]: num } as SempDevice;
        updateDevice(updated);
    };

    const handleBoolChange = (name: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        const updated = { ...(device ?? {}), [name]: checked } as SempDevice;
        updateDevice(updated);
    };

    return (
        <div>
            <FormControl variant="standard" sx={{ minWidth: '20%', maxWidth: '30%' }}>
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

            {
                (device && (device as any).StatusDetectionType) === "SeparateOID" ? (
                    <SelectOID
                        settingName={I18n.t('DeviceOIDStatus')}
                        socket={props.socket}
                        theme={props.theme}
                        themeName={props.themeName}
                        themeType={props.themeType}
                        Value={valString('OIDStatus')}
                        onChange={handleStringChangeValue('OIDStatus')}
                    />
                ) : null
            }

            <div style={{ display: 'flex', gap: 16 }}>
                <TextField
                    style={{ marginBottom: 16 }}
                    id='DeviceStatusDetectionLimit'
                    label={I18n.t('DeviceStatusDetectionLimit')}
                    variant="standard"
                    type="number"
                    value={valNumber('StatusDetectionLimit')}
                    onChange={handleNumberChange('StatusDetectionLimit')}
                />

                <TextField
                    style={{ marginBottom: 16 }}
                    id='DeviceStatusDetectionLimitTimeOn'
                    label={I18n.t('DeviceStatusDetectionLimitTimeOn')}
                    variant="standard"
                    type="number"
                    value={valNumber('StatusDetectionLimitTimeOn')}
                    onChange={handleNumberChange('StatusDetectionLimitTimeOn')}
                />

                <TextField
                    style={{ marginBottom: 16 }}
                    id='DeviceStatusDetectionLimitTimeOff'
                    label={I18n.t('DeviceStatusDetectionLimitTimeOff')}
                    variant="standard"
                    type="number"
                    value={valNumber('StatusDetectionLimitTimeOff')}
                    onChange={handleNumberChange('StatusDetectionLimitTimeOff')}
                />
                <TextField
                    style={{ marginBottom: 16 }}
                    id='DeviceStatusDetectionMinRunTime'
                    label={I18n.t('DeviceStatusDetectionMinRunTime')}
                    variant="standard"
                    type="number"
                    value={valNumber('StatusDetectionMinRunTime')}
                    onChange={handleNumberChange('StatusDetectionMinRunTime')}
                />
            </div>

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
            />

            {
                (device && (device as any).HasOIDSwitch) === true ? (
                    <SelectOID
                        settingName={I18n.t('DeviceOIDSwitch')}
                        socket={props.socket}
                        theme={props.theme}
                        themeName={props.themeName}
                        themeType={props.themeType}
                        Value={valString('OIDSwitch')}
                        onChange={handleStringChangeValue('OIDSwitch')}
                    />
                ) : null
            }

            <BoxDivider
                Name={I18n.t('energy requests')}
                theme={props.theme}
            />

            <FormControlLabel
                control={
                    <Checkbox
                        color="primary"
                        checked={!!(device && (device as any).DeviceTimerActive)}
                        onChange={handleBoolChange('DeviceTimerActive')}
                        aria-label="energy request timer active"
                    />
                }
                label={I18n.t('energy request timer active')}
            />

        </div>
    );
}