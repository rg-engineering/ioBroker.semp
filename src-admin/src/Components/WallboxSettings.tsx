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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
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

export default function WallboxSettings(props: Props): React.JSX.Element {

    // Generische Helfer für wallbox initialisierung
    const defaultWallboxReadNames = [
        "DeviceOIDPlugConnected",
        "DeviceOIDIsCharging",
        "DeviceOIDIsError",
        "DeviceOIDCounter",
        "DeviceOIDStatus"
    ];

    const defaultWallboxWriteNames = [
        "DeviceOIDChargePower",
        "DeviceOIDStartCharge",
        "DeviceOIDStopCharge",
        "DeviceOID3PhaseChargeEnable",
        "DeviceOID3PhaseChargeDisable",
        "DeviceOIDSwitch"
    ];

    const createOidSetting = (name: string) => ({
        active: true,
        must: '',
        Name: name,
        OID: '',
        Type: '',
        SetValue: '',
        Path2Check: ''
    });


    // Lokaler State für das Device
    const [device, setDevice] = React.useState<SempDevice>(props.device ?? ({} as SempDevice));

    // Wenn props.device sich ändert, State anpassen
    React.useEffect(() => {
        setDevice(props.device ?? ({} as SempDevice));
    }, [props.device]);

    // Persistenz-Funktion (hier minimal: ruft props.onChange mit JSON string auf)
    const persistDevice = (d: SempDevice) => {
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

    // Generische Handler (event-basiert für TextField)
    const handleStringChange = (field: keyof SempDevice) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const val = e.target.value ?? '';
        const updated = { ...(device ?? {}), [field]: val } as SempDevice;
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

    // Hilfsfunktionen für wallbox_oid_write
    const onWallboxWriteUpdate = (idx: number, key: string, value: any) => {
        const list = Array.isArray((device as any).wallbox_oid_write) ? (device as any).wallbox_oid_write.slice() : [];
        while (list.length <= idx) list.push({});
        const item = { ...(list[idx] ?? {}) };
        item[key] = value;
        list[idx] = item;
        const updated = { ...(device ?? {}), wallbox_oid_write: list } as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };

    const onWallboxWriteToggleActive = (idx: number, active: boolean) => {
        const list = Array.isArray((device as any).wallbox_oid_write) ? (device as any).wallbox_oid_write.slice() : [];
        while (list.length <= idx) list.push({});
        const item = { ...(list[idx] ?? {}) };
        item.active = active;
        list[idx] = item;
        const updated = { ...(device ?? {}), wallbox_oid_write: list } as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };

    // Hilfsfunktionen für wallbox_oid_read
    const onWallboxReadUpdate = (idx: number, key: string, value: any) => {
        const list = Array.isArray((device as any).wallbox_oid_read) ? (device as any).wallbox_oid_read.slice() : [];
        while (list.length <= idx) list.push({});
        const item = { ...(list[idx] ?? {}) };
        item[key] = value;
        list[idx] = item;
        const updated = { ...(device ?? {}), wallbox_oid_read: list } as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };

    const onWallboxReadToggleActive = (idx: number, active: boolean) => {
        const list = Array.isArray((device as any).wallbox_oid_read) ? (device as any).wallbox_oid_read.slice() : [];
        while (list.length <= idx) list.push({});
        const item = { ...(list[idx] ?? {}) };
        item.active = active;
        list[idx] = item;
        const updated = { ...(device ?? {}), wallbox_oid_read: list } as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };

    return (

        <div>
            <BoxDivider
                Name={I18n.t('wallbox')}
                theme={props.theme}
            />

            <TextField
                style={{ marginBottom: 16 }}
                id='DeviceBatteryCapacity'
                label={I18n.t('DeviceBatteryCapacity')}
                variant="standard"
                type="number"
                value={valNumber('BatteryCapacity')}
                onChange={handleNumberChange('BatteryCapacity')}
            />


            <InputLabel id="device-WallboxChargeTime-label">{I18n.t('select a charge time')}</InputLabel>
            <Select
                labelId="device-WallboxChargeTime-label"
                value={valString('WallboxChargeTime') || '1'}
                onChange={(e) => {
                    const val = (e.target as HTMLInputElement).value ?? '';
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

            <InputLabel id="device-WallboxPhases-label">{I18n.t('select a number of phases')}</InputLabel>
            <Select
                labelId="device-WallboxPhases-label"
                value={valString('WallboxPhases') || '1'}
                onChange={(e) => {
                    const val = (e.target as HTMLInputElement).value ?? '';
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

            {valString('WallboxPhases') === '3' ? (
                <div>
                    <TextField
                        style={{ marginBottom: 16 }}
                        id='Wallbox3phaseSwitchLimit'
                        label={I18n.t('Wallbox3phaseSwitchLimit')}
                        variant="standard"
                        type="number"
                        value={valNumber('Wallbox3phaseSwitchLimit')}
                        onChange={handleNumberChange('Wallbox3phaseSwitchLimit')}
                    />

                    <TextField
                        style={{ marginBottom: 16 }}
                        id='Wallbox3phaseSwitchDelay'
                        label={I18n.t('Wallbox3phaseSwitchDelay')}
                        variant="standard"
                        type="number"
                        value={valNumber('Wallbox3phaseSwitchDelay')}
                        onChange={handleNumberChange('Wallbox3phaseSwitchDelay')}
                    />
                </div>
            ) : null}

            <FormControlLabel
                control={
                    <Checkbox
                        color="primary"
                        checked={!!(device && (device as any).WallboxNeedCurrentRecommendation)}
                        onChange={handleBoolChange('WallboxNeedCurrentRecommendation')}
                        aria-label="WallboxNeedCurrentRecommendation"
                    />
                }
                label={I18n.t('WallboxNeedCurrentRecommendation')}
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
                        <TableCell>{I18n.t('SetValue')}</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {((device as any).wallbox_oid_write ?? []).map((t: any, idx: number) => (
                        <TableRow key={idx}>
                            <TableCell>
                                <Checkbox
                                    checked={!!t.active}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onWallboxWriteToggleActive(idx, (e.target as HTMLInputElement).checked)}
                                />
                            </TableCell>
                            <TableCell>
                                <TextField
                                    fullWidth
                                    value={t.must ?? ''}
                                    onChange={(e) => onWallboxWriteUpdate(idx, 'must', e.target.value)}
                                    variant="standard"
                                    placeholder={I18n.t('ID')}
                                />
                            </TableCell>

                            <TableCell>
                                <TextField
                                    fullWidth
                                    value={t.Name ?? ''}
                                    onChange={(e) => onWallboxWriteUpdate(idx, 'Name', e.target.value)}
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
                                    onChange={(value: string) => onWallboxWriteUpdate(idx, 'OID', value)}
                                />
                            </TableCell>

                            <TableCell>

                            </TableCell>

                            <TableCell>
                                <TextField
                                    fullWidth
                                    value={t.Type ?? ''}
                                    onChange={(e) => onWallboxWriteUpdate(idx, 'Type', e.target.value)}
                                    variant="standard"
                                    placeholder={I18n.t('Type')}

                                />
                            </TableCell>

                            <TableCell>
                                <TextField
                                    fullWidth
                                    value={t.SetValue ?? ''}
                                    onChange={(e) => onWallboxWriteUpdate(idx, 'SetValue', e.target.value)}
                                    variant="standard"
                                    placeholder={I18n.t('SetValue')}

                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

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
                    {((device as any).wallbox_oid_read ?? []).map((t: any, idx: number) => (
                        <TableRow key={idx}>
                            <TableCell>
                                <Checkbox
                                    checked={!!t.active}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onWallboxReadToggleActive(idx, (e.target as HTMLInputElement).checked)}
                                />
                            </TableCell>
                            <TableCell>
                                <TextField
                                    fullWidth
                                    value={t.must ?? ''}
                                    onChange={(e) => onWallboxReadUpdate(idx, 'must', e.target.value)}
                                    variant="standard"
                                    placeholder={I18n.t('ID')}
                                />
                            </TableCell>

                            <TableCell>
                                <TextField
                                    fullWidth
                                    value={t.Name ?? ''}
                                    onChange={(e) => onWallboxReadUpdate(idx, 'Name', e.target.value)}
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
                                    onChange={(value: string) => onWallboxReadUpdate(idx, 'OID', value)}
                                />
                            </TableCell>

                            <TableCell>

                            </TableCell>

                            <TableCell>
                                <TextField
                                    fullWidth
                                    value={t.Type ?? ''}
                                    onChange={(e) => onWallboxReadUpdate(idx, 'Type', e.target.value)}
                                    variant="standard"
                                    placeholder={I18n.t('Type')}

                                />
                            </TableCell>

                            <TableCell>
                                <TextField
                                    fullWidth
                                    value={t.Path2Check ?? ''}
                                    onChange={(e) => onWallboxReadUpdate(idx, 'Path2Check', e.target.value)}
                                    variant="standard"
                                    placeholder={I18n.t('Path2Check')}

                                />
                            </TableCell>

                            <TableCell>
                                <TextField
                                    fullWidth
                                    value={t.SetValue ?? ''}
                                    onChange={(e) => onWallboxReadUpdate(idx, 'SetValue', e.target.value)}
                                    variant="standard"
                                    placeholder={I18n.t('SetValue')}

                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <div>


            </div>
        </div>
    );
}