/* eslint-disable prefer-template */
/* eslint-disable quote-props */
/* eslint-disable prettier/prettier */
import React from 'react';

import {
    Box,
    TextField,
    Select,
    InputLabel,
    MenuItem,
    Checkbox,
    FormControlLabel,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    FormControl
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';

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
Ausführlicher Plan / PSEUDOCODE:
1. Ziel: Lint-Fehler vom Typ "@typescript-eslint/explicit-function-return-type" beheben,
   indem allen Funktionen (insbesondere Pfeilfunktionen) explizite Rückgabetypen gegeben werden.
2. Vorgehen:
   - Definiere einen Typ für OID-Settings (`OidSetting`) zur klaren Typisierung von `createOidSetting`.
   - Ergänze `ensureDefaults` mit einem Rückgabetyp `{ device: SempDevice; changed: boolean }`.
   - Ergänze `persistDevice` mit Rückgabetyp `void`.
   - Ergänze alle Hilfsfunktionen (`handleNumberChange`, `handleBoolChange`,
     `onWallboxWriteUpdate`, `onWallboxWriteToggleActive`, `onWallboxReadUpdate`,
     `onWallboxReadToggleActive`) mit passenden Rückgabetypen (`void` oder Funktionssignaturen).
   - Annotiere die `useEffect`-Callbackfunktion mit `: void`.
   - Bei inline-Event-Handlern in JSX: Rückgabetyp `: void` hinzufügen und Parametertypen angeben,
     damit keine impliziten "any" entstehen.
3. Ziel ist minimale Codeänderung, volle Typisierung der relevanten Funktionen,
   und keine Funktionslogik verändern.
*/

type Props = {
    theme: IobTheme;
    onChange: (value: string) => void;
    device: SempDevice;
    socket: AdminConnection;
    themeName: ThemeName;
    themeType: ThemeType;
};

type OidSetting = {
    active: boolean;
    must: string;
    Name: string;
    OID: string;
    Type: string;
    SetValue: string;
    Path2Check?: string;
};

export default function WallboxSettings(props: Props): React.JSX.Element {

    // Generische Helfer für wallbox initialisierung
    const defaultWallboxReadNames: [string, string][] = [
        ["DeviceOIDPlugConnected", "mandatory"],
        ["DeviceOIDIsCharging", "optionally"], 
        ["DeviceOIDIsError", "optionally"],
        ["DeviceOIDCounter", "optionally"], 
        ["DeviceOIDStatus", "optionally"],
    ];

    const defaultWallboxWriteNames: [string, string][] = [
        ["DeviceOIDChargePower", "mandatory"], 
        ["DeviceOIDStartCharge", "optionally"], 
        ["DeviceOIDStopCharge", "optionally"], 
        ["DeviceOID3PhaseChargeEnable", "optionally"],
        ["DeviceOID3PhaseChargeDisable", "optionally"], 
        ["DeviceOIDSwitch", "optionally"]
    ];

    const createOidSetting = (name: string, must: string): OidSetting => ({
        active: must == "mandatory" ? true : false,
        must: I18n.t(must),
        Name: name,
        OID: '',
        Type: 'Boolean',
        SetValue: 'true',
        Path2Check: I18n.t('not used')
    });

    // Ensure defaults helper returns updated device and whether it changed
    const ensureDefaults = (d: SempDevice): { device: SempDevice; changed: boolean } => {
        const updated = { ...(d ?? {}) } as any;
        let changed = false;

        if (!Array.isArray(updated.wallbox_oid_read) || updated.wallbox_oid_read.length === 0) {
            updated.wallbox_oid_read = defaultWallboxReadNames.map((n) => createOidSetting(n[0], n[1]));
            changed = true;
        }

        if (!Array.isArray(updated.wallbox_oid_write) || updated.wallbox_oid_write.length === 0) {
            updated.wallbox_oid_write = defaultWallboxWriteNames.map((n) => createOidSetting(n[0], n[1]));
            changed = true;
        }

        return { device: updated as SempDevice, changed };
    };

    // Lokaler State für das Device (mit Defaults falls nötig)
    const { device: initialDevice } = ensureDefaults(props.device ?? ({} as SempDevice));
    const [device, setDevice] = React.useState<SempDevice>(initialDevice);

    // Wenn props.device sich ändert, State anpassen und Defaults ergänzen falls nötig
    React.useEffect((): void => {
        const { device: ensured, changed } = ensureDefaults(props.device ?? ({} as SempDevice));
        setDevice(ensured);
        if (changed) {
            try {
                props.onChange(JSON.stringify(ensured ?? {}));
            } catch {
                props.onChange('');
            }
        }
    }, [props.device]);

    // Persistenz-Funktion (hier minimal: ruft props.onChange mit JSON string auf)
    const persistDevice = (d: SempDevice): void => {
        try {
            props.onChange(JSON.stringify(d ?? {}));
        } catch {
            props.onChange('');
        }
    };

    // Helper: String-Werte aus device holen
    const valString = (field: keyof SempDevice): string => {
        const v = (device as any)?.[field];
        return v === undefined || v === null ? '' : String(v);
    };

    // Helper: Number-Felder als string (für inputs vom Typ number)
    const valNumber = (field: keyof SempDevice): string => {
        const v = (device as any)?.[field];
        return v === undefined || v === null ? '' : String(v);
    };


    // Numerische Felder (behandelt leeren String als Entfernen)
    const handleNumberChange = (field: keyof SempDevice): ((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void) => {
        return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
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
    };

    // Checkbox / boolean Handler
    const handleBoolChange = (field: keyof SempDevice): ((e: React.ChangeEvent<HTMLInputElement>) => void) => {
        return (e: React.ChangeEvent<HTMLInputElement>): void => {
            const val = e.target.checked;
            const updated = { ...(device ?? {}), [field]: val } as SempDevice;
            setDevice(updated);
            persistDevice(updated);
        };
    };

    // Hilfsfunktionen für wallbox_oid_write
    const onWallboxWriteUpdate = (idx: number, key: keyof OidSetting, value: OidSetting[keyof OidSetting]): void => {
        const list = Array.isArray(device.wallbox_oid_write) ? (device.wallbox_oid_write.slice() as Partial<OidSetting>[]) : [];
        while (list.length <= idx) {
            list.push({});
        }
        const item: Partial<OidSetting> = { ...(list[idx] ?? {}) };
        item[key] = value as any;
        list[idx] = item;
        const updated = { ...(device ?? {}), wallbox_oid_write: list } as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };

    const onWallboxWriteToggleActive = (idx: number, active: boolean): void => {
        const list = Array.isArray(device.wallbox_oid_write) ? (device.wallbox_oid_write.slice() as Partial<OidSetting>[]) : [];
        while (list.length <= idx) {
            list.push({});
        }
        const item: Partial<OidSetting> = { ...(list[idx] ?? {}) };
        item.active = active;
        list[idx] = item;
        const updated = { ...(device ?? {}), wallbox_oid_write: list } as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };

    // Hilfsfunktionen für wallbox_oid_read
    const onWallboxReadUpdate = (idx: number, key: keyof OidSetting, value: OidSetting[keyof OidSetting]): void => {
        const list = Array.isArray(device.wallbox_oid_read) ? (device.wallbox_oid_read.slice() as Partial<OidSetting>[]) : [];
        while (list.length <= idx) {
            list.push({});
        }
        const item: Partial<OidSetting> = { ...(list[idx] ?? {}) };
        item[key] = value as any;
        list[idx] = item;
        const updated = { ...(device ?? {}), wallbox_oid_read: list } as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };

    const onWallboxReadToggleActive = (idx: number, active: boolean): void => {
        const list = Array.isArray(device.wallbox_oid_read) ? (device.wallbox_oid_read.slice() as Partial<OidSetting>[]) : [];
        while (list.length <= idx) {
            list.push({});
        }
        const item: Partial<OidSetting> = { ...(list[idx] ?? {}) };
        item.active = active;
        list[idx] = item;
        const updated = { ...(device ?? {}), wallbox_oid_read: list } as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };

    return (

        <Box
            style={{ margin: 10 }}
        >
            <BoxDivider
                Name={I18n.t('wallbox')}
                theme={props.theme}
            />

            <Box
                style={{ margin: 10 }}
            >
                <TextField
                    style={{ marginBottom: 16 }}
                    id='DeviceBatteryCapacity'
                    label={I18n.t('DeviceBatteryCapacity')}
                    variant="standard"
                    type="number"
                    inputProps={{ min: 0 }}
                    value={valNumber('BatteryCapacity')}
                    onChange={handleNumberChange('BatteryCapacity')}
                    sx={{ minWidth: '20%', maxWidth: '20%', marginRight: '10px' }}
                />

                <FormControl variant="standard" sx={{ minWidth: '20%', maxWidth: '30%' }}>
                    <InputLabel id="device-WallboxChargeTime-label">{I18n.t('select a charge time')}</InputLabel>
                    <Select
                        labelId="device-WallboxChargeTime-label"
                        value={valString('WallboxChargeTime') || '1'}
                        onChange={(e: SelectChangeEvent<string>): void => {
                            const val = e.target.value ?? '';
                            const updated = { ...(device ?? {}), WallboxChargeTime: val } as SempDevice;
                            setDevice(updated);
                            persistDevice(updated);
                        }}
                        displayEmpty={false}
                    >
                        <MenuItem value="1">
                            <em>{I18n.t('12h')}</em>
                        </MenuItem>
                        <MenuItem value="2">
                            <em>{I18n.t('24h')}</em>
                        </MenuItem>
                        <MenuItem value="3">
                            <em>{I18n.t('endless')}</em>
                        </MenuItem>
                        <MenuItem value="4">
                            <em>{I18n.t('user defined')}</em>
                        </MenuItem>
                    </Select>
                </FormControl>
            </Box>


            <Box
                style={{ margin: 10 }}
            >

                <FormControl variant="standard" sx={{ minWidth: '20%', maxWidth: '30%' }}>
                    <InputLabel id="device-WallboxPhases-label">{I18n.t('select a number of phases')}</InputLabel>
                    <Select
                        labelId="device-WallboxPhases-label"
                        value={valString('WallboxPhases') || '1'}
                        onChange={(e: SelectChangeEvent<string>): void => {
                            const val = e.target.value ?? '';
                            const updated = { ...(device ?? {}), WallboxPhases: val } as SempDevice;
                            setDevice(updated);
                            persistDevice(updated);
                        }}
                        displayEmpty={false}
                    >
                        <MenuItem value="1">
                            <em>{I18n.t('1Phase (230V)')}</em>
                        </MenuItem>
                        <MenuItem value="2">
                            <em>{I18n.t('3Phase (400)')}</em>
                        </MenuItem>
                        <MenuItem value="3">
                            <em>{I18n.t('1 or 3 Phase Switchable')}</em>
                        </MenuItem>

                    </Select>
                </FormControl>

                {valString('WallboxPhases') === '3' ? (
                    <div>
                        <TextField
                            style={{ marginBottom: 16 }}
                            id='Wallbox3phaseSwitchLimit'
                            label={I18n.t('Wallbox3phaseSwitchLimit')}
                            variant="standard"
                            type="number"
                            inputProps={{ min: 0 }}
                            value={valNumber('Wallbox3phaseSwitchLimit')}
                            onChange={handleNumberChange('Wallbox3phaseSwitchLimit')}
                            sx={{ minWidth: '20%', maxWidth: '20%', marginRight: '10px' }}
                        />

                        <TextField
                            style={{ marginBottom: 16 }}
                            id='Wallbox3phaseSwitchDelay'
                            label={I18n.t('Wallbox3phaseSwitchDelay')}
                            variant="standard"
                            type="number"
                            inputProps={{ min: 0 }}
                            value={valNumber('Wallbox3phaseSwitchDelay')}
                            onChange={handleNumberChange('Wallbox3phaseSwitchDelay')}
                            sx={{ minWidth: '20%', maxWidth: '20%', marginRight: '10px' }}
                        />
                    </div>
                ) : null}
            </Box>

            <Box
                style={{ margin: 10 }}
            >


                <FormControlLabel
                    control={
                        <Checkbox
                            color="primary"
                            checked={!!(device && device.WallboxNeedCurrentRecommendation)}
                            onChange={handleBoolChange('WallboxNeedCurrentRecommendation')}
                            aria-label="WallboxNeedCurrentRecommendation"
                        />
                    }
                    label={I18n.t('WallboxNeedCurrentRecommendation')}
                />

                <FormControlLabel
                    control={
                        <Checkbox
                            color="primary"
                            checked={!!(device && device.SwitchOffAtEndOfTimer)}
                            onChange={handleBoolChange('SwitchOffAtEndOfTimer')}
                            aria-label="SwitchOffAtEndOfTimer"
                        />
                    }
                    label={I18n.t('SwitchOffAtEndOfTimer')}
                />

            </Box>

            <Box
                style={{ margin: 10 }}
            >


                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>{I18n.t('active')}</TableCell>
                            <TableCell></TableCell>
                            <TableCell>{I18n.t('Name')}</TableCell>
                            <TableCell>{I18n.t('OID/URL')}</TableCell>
                            <TableCell></TableCell>
                            <TableCell>{I18n.t('Type')}</TableCell>
                            <TableCell>{I18n.t('SetValue')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(device.wallbox_oid_write ?? []).map((t: any, idx: number) => (
                            <TableRow key={idx}>
                                <TableCell>
                                    <Checkbox
                                        checked={!!t.active}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onWallboxWriteToggleActive(idx, (e.target as HTMLInputElement).checked)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        fullWidth
                                        value={t.must ?? ''}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onWallboxWriteUpdate(idx, 'must', e.target.value)}
                                        variant="standard"
                                        placeholder={I18n.t('must or mandatory')}
                                    />
                                </TableCell>

                                <TableCell>
                                    <TextField
                                        fullWidth
                                        value={t.Name ?? ''}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onWallboxWriteUpdate(idx, 'Name', e.target.value)}
                                        variant="standard"
                                        placeholder={I18n.t('Name')}
                                    />
                                </TableCell>

                                <TableCell>
                                    <SelectOID
                                        settingName={I18n.t('OID')}
                                        socket={props.socket}
                                        theme={props.theme}
                                        themeName={props.themeName}
                                        themeType={props.themeType}
                                        Value={t.OID ?? ''}
                                        onChange={(value: string): void => onWallboxWriteUpdate(idx, 'OID', value)}
                                    />
                                </TableCell>

                                <TableCell>

                                </TableCell>

                                <TableCell>
                                    <FormControl variant="standard" sx={{ minWidth: '100%' }}>
                                        <Select
                                            labelId="type"
                                            value={t.Type || ''}
                                            onChange={(e: SelectChangeEvent<string>) => {
                                                const val = e.target.value ?? '';
                                                onWallboxWriteUpdate(idx, 'Type', val)
                                            }}
                                            displayEmpty={false}
                                        >
                                            <MenuItem value="Boolean">
                                                <em>{I18n.t('Boolean')}</em>
                                            </MenuItem>
                                            <MenuItem value="Number">
                                                <em>{I18n.t('Number')}</em>
                                            </MenuItem>
                                            <MenuItem value="URL">
                                                <em>{I18n.t('URL')}</em>
                                            </MenuItem>
                                        </Select>

                                    </FormControl>

                                </TableCell>

                                <TableCell>
                                    <TextField
                                        fullWidth
                                        value={t.SetValue ?? ''}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onWallboxWriteUpdate(idx, 'SetValue', e.target.value)}
                                        variant="standard"
                                        placeholder={I18n.t('SetValue')}

                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>


            </Box>

            <Box
                style={{ margin: 10 }}
            >

                <TextField
                    style={{ marginBottom: 16 }}
                    id='URLReadPollRate'
                    label={I18n.t('URLReadPollRate')}
                    variant="standard"
                    type="number"
                    value={valNumber('URLReadPollRate')}
                    onChange={handleNumberChange('URLReadPollRate')}
                />


                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>{I18n.t('active')}</TableCell>
                            <TableCell></TableCell>
                            <TableCell>{I18n.t('Name')}</TableCell>
                            <TableCell>{I18n.t('OID/URL')}</TableCell>
                            <TableCell></TableCell>
                            <TableCell>{I18n.t('Type')}</TableCell>
                            <TableCell>{I18n.t('Path2Check')}</TableCell>
                            <TableCell>{I18n.t('SetValue')}</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(device.wallbox_oid_read ?? []).map((t: any, idx: number) => (
                            <TableRow key={idx}>
                                <TableCell>
                                    <Checkbox
                                        checked={!!t.active}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onWallboxReadToggleActive(idx, (e.target as HTMLInputElement).checked)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <TextField
                                        fullWidth
                                        value={t.must ?? ''}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onWallboxReadUpdate(idx, 'must', e.target.value)}
                                        variant="standard"
                                        placeholder={I18n.t('ID')}
                                    />
                                </TableCell>

                                <TableCell>
                                    <TextField
                                        fullWidth
                                        value={t.Name ?? ''}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onWallboxReadUpdate(idx, 'Name', e.target.value)}
                                        variant="standard"
                                        placeholder={I18n.t('Name')}
                                    />
                                </TableCell>

                                <TableCell>
                                    <SelectOID
                                        settingName={I18n.t('OID')}
                                        socket={props.socket}
                                        theme={props.theme}
                                        themeName={props.themeName}
                                        themeType={props.themeType}
                                        Value={t.OID ?? ''}
                                        onChange={(value: string): void => onWallboxReadUpdate(idx, 'OID', value)}
                                    />
                                </TableCell>

                                <TableCell>

                                </TableCell>

                                <TableCell>

                                    <FormControl variant="standard" sx={{ minWidth: '100%' }}>
                                        <Select
                                            labelId="type"
                                            value={t.Type || ''}
                                            onChange={(e: SelectChangeEvent<string>) => {
                                                const val = e.target.value ?? '';
                                                onWallboxReadUpdate(idx, 'Type', val)
                                            }}
                                            displayEmpty={false}
                                        >
                                            <MenuItem value="Boolean">
                                                <em>{I18n.t('Boolean')}</em>
                                            </MenuItem>
                                            <MenuItem value="Number">
                                                <em>{I18n.t('Number')}</em>
                                            </MenuItem>
                                            <MenuItem value="URL">
                                                <em>{I18n.t('URL')}</em>
                                            </MenuItem>
                                        </Select>
                                    </FormControl>



                                </TableCell>

                                <TableCell>
                                    <TextField
                                        fullWidth
                                        value={t.Path2Check ?? ''}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onWallboxReadUpdate(idx, 'Path2Check', e.target.value)}
                                        variant="standard"
                                        placeholder={I18n.t('Path2Check')}

                                    />
                                </TableCell>

                                <TableCell>
                                    <TextField
                                        fullWidth
                                        value={t.SetValue ?? ''}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>): void => onWallboxReadUpdate(idx, 'SetValue', e.target.value)}
                                        variant="standard"
                                        placeholder={I18n.t('SetValue')}

                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

            </Box>
        </Box>
    );
} 