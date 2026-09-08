"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSempResponse = validateSempResponse;
exports.formatSempValidationIssues = formatSempValidationIssues;
const xml_js_1 = require("xml-js");
const CONTAINER_ELEMENTS = new Set([
    "Device2EM",
    "DeviceInfo",
    "Identification",
    "Characteristics",
    "Capabilities",
    "CurrentPower",
    "Timestamps",
    "Interruptions",
    "Requests",
    "DeviceStatus",
    "PowerConsumption",
    "PowerInfo",
    "PlanningRequest",
    "Timeframe",
    "Parameters",
    "Parameter",
]);
const IDENTIFICATION_FIELDS = [
    "DeviceId",
    "DeviceName",
    "DeviceType",
    "DeviceSerial",
    "DeviceVendor",
];
const TIMEFRAME_REQUIRED_FIELDS = [
    "DeviceId",
    "EarliestStart",
    "LatestEnd",
    "MaxRunningTime",
];
const MIN_MAX_PAIRS = [
    ["MinRunningTime", "MaxRunningTime"],
    ["MinPowerConsumption", "MaxPowerConsumption"],
    ["MinOnTime", "MaxOnTime"],
    ["MinOffTime", "MaxOffTime"],
];
function isObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function asArray(value) {
    if (value == null) {
        return [];
    }
    return Array.isArray(value) ? value : [value];
}
function textValue(node) {
    if (!isObject(node)) {
        return undefined;
    }
    return node._text;
}
function hasElement(parent, name) {
    return Object.prototype.hasOwnProperty.call(parent, name);
}
function isEmptyText(value) {
    return value == null || (typeof value === "string" && value.trim().length === 0);
}
function numberValue(node) {
    const value = textValue(node);
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
}
function childElementNames(node) {
    return Object.keys(node).filter(key => !key.startsWith("_"));
}
function elementNameFromPath(path) {
    const last = path.split(".").pop() ?? path;
    return last.replace(/\[\d+\]$/, "");
}
/**
 * Lightweight runtime sanity check for generated SEMP Device2EM XML.
 *
 * This is intentionally NOT a full SEMP/XSD validator. It only checks a
 * small set of high-value conditions which are useful when the Sunny Home
 * Manager silently ignores malformed/inconsistent input.
 *
 * The function never modifies the XML.
 */
function validateSempResponse(xml) {
    let parsed;
    try {
        parsed = (0, xml_js_1.xml2js)(xml, {
            compact: true,
            ignoreDeclaration: true,
            ignoreDoctype: true,
            nativeType: true,
        });
    }
    catch (error) {
        return [{
                rule: "INVALID_XML",
                path: "Device2EM",
                message: `Generated SEMP response is not valid XML: ${String(error)}`,
            }];
    }
    if (!isObject(parsed) || !isObject(parsed.Device2EM)) {
        return [{
                rule: "INVALID_XML",
                path: "Device2EM",
                message: "Generated XML does not contain a Device2EM root element.",
            }];
    }
    const root = parsed.Device2EM;
    const deviceNames = buildDeviceNameMap(root);
    const issues = [];
    validateEmptyLeafElements(root, "Device2EM", {}, deviceNames, issues);
    validateIdentifications(root, deviceNames, issues);
    validatePlanningRequests(root, deviceNames, issues);
    validateMinMaxPairs(root, "Device2EM", {}, deviceNames, issues);
    return issues;
}
function buildDeviceNameMap(root) {
    const result = new Map();
    for (const item of asArray(root.DeviceInfo)) {
        if (!isObject(item) || !isObject(item.Identification)) {
            continue;
        }
        const id = textValue(item.Identification.DeviceId);
        const name = textValue(item.Identification.DeviceName);
        if (typeof id === "string" &&
            id.trim() !== "" &&
            typeof name === "string" &&
            name.trim() !== "") {
            result.set(id, name);
        }
    }
    return result;
}
function enrichContext(node, context, deviceNames) {
    const next = { ...context };
    const directId = textValue(node.DeviceId);
    const directName = textValue(node.DeviceName);
    if (typeof directId === "string" && directId.trim() !== "") {
        next.deviceId = directId;
        next.deviceName = deviceNames.get(directId) ?? next.deviceName;
    }
    if (typeof directName === "string" && directName.trim() !== "") {
        next.deviceName = directName;
    }
    // DeviceInfo stores its identifying values one level deeper.
    if (isObject(node.Identification)) {
        const id = textValue(node.Identification.DeviceId);
        const name = textValue(node.Identification.DeviceName);
        if (typeof id === "string" && id.trim() !== "") {
            next.deviceId = id;
            next.deviceName = deviceNames.get(id) ?? next.deviceName;
        }
        if (typeof name === "string" && name.trim() !== "") {
            next.deviceName = name;
        }
    }
    return next;
}
function validateEmptyLeafElements(node, path, context, deviceNames, issues) {
    const currentContext = enrichContext(node, context, deviceNames);
    for (const [key, rawChild] of Object.entries(node)) {
        if (key.startsWith("_")) {
            continue;
        }
        const children = asArray(rawChild);
        for (let index = 0; index < children.length; index++) {
            const child = children[index];
            if (!isObject(child)) {
                continue;
            }
            const childPath = children.length > 1
                ? `${path}.${key}[${index}]`
                : `${path}.${key}`;
            const nestedElements = childElementNames(child);
            const elementName = elementNameFromPath(childPath);
            if (nestedElements.length === 0) {
                if (!CONTAINER_ELEMENTS.has(elementName) && isEmptyText(child._text)) {
                    issues.push({
                        rule: "EMPTY_VALUE",
                        path: childPath,
                        message: `Element ${elementName} is present but empty. Provide a value or omit the optional element.`,
                        deviceId: currentContext.deviceId,
                        deviceName: currentContext.deviceName,
                        value: child._text,
                    });
                }
                continue;
            }
            validateEmptyLeafElements(child, childPath, currentContext, deviceNames, issues);
        }
    }
}
function validateIdentifications(root, deviceNames, issues) {
    const deviceInfos = asArray(root.DeviceInfo);
    for (let index = 0; index < deviceInfos.length; index++) {
        const deviceInfo = deviceInfos[index];
        if (!isObject(deviceInfo)) {
            continue;
        }
        const basePath = `Device2EM.DeviceInfo[${index}]`;
        if (!isObject(deviceInfo.Identification)) {
            issues.push({
                rule: "MISSING_IDENTIFICATION",
                path: `${basePath}.Identification`,
                message: "DeviceInfo does not contain an Identification element.",
            });
            continue;
        }
        const identification = deviceInfo.Identification;
        const deviceIdRaw = textValue(identification.DeviceId);
        const deviceNameRaw = textValue(identification.DeviceName);
        const context = {
            deviceId: typeof deviceIdRaw === "string" && deviceIdRaw.trim() !== ""
                ? deviceIdRaw
                : undefined,
            deviceName: typeof deviceNameRaw === "string" && deviceNameRaw.trim() !== ""
                ? deviceNameRaw
                : undefined,
        };
        if (context.deviceId && !context.deviceName) {
            context.deviceName = deviceNames.get(context.deviceId);
        }
        const missing = IDENTIFICATION_FIELDS.filter(field => !hasElement(identification, field));
        if (missing.length > 0) {
            issues.push({
                rule: "MISSING_IDENTIFICATION",
                path: `${basePath}.Identification`,
                message: `Identification is incomplete. Missing: ${missing.join(", ")}.`,
                deviceId: context.deviceId,
                deviceName: context.deviceName,
            });
        }
    }
}
function validatePlanningRequests(root, deviceNames, issues) {
    // PlanningRequest itself is optional. No PlanningRequest means: no error.
    const requests = asArray(root.PlanningRequest);
    for (let requestIndex = 0; requestIndex < requests.length; requestIndex++) {
        const request = requests[requestIndex];
        if (!isObject(request)) {
            continue;
        }
        const requestPath = `Device2EM.PlanningRequest[${requestIndex}]`;
        const timeframes = asArray(request.Timeframe);
        if (timeframes.length === 0) {
            issues.push({
                rule: "EMPTY_PLANNING_REQUEST",
                path: requestPath,
                message: "PlanningRequest is present but contains no Timeframe. Omit PlanningRequest when no demand exists.",
            });
            continue;
        }
        for (let timeframeIndex = 0; timeframeIndex < timeframes.length; timeframeIndex++) {
            const timeframe = timeframes[timeframeIndex];
            if (!isObject(timeframe)) {
                continue;
            }
            const path = `${requestPath}.Timeframe[${timeframeIndex}]`;
            const deviceIdRaw = textValue(timeframe.DeviceId);
            const deviceId = typeof deviceIdRaw === "string" && deviceIdRaw.trim() !== ""
                ? deviceIdRaw
                : undefined;
            const missing = TIMEFRAME_REQUIRED_FIELDS.filter(field => !hasElement(timeframe, field));
            if (missing.length > 0) {
                issues.push({
                    rule: "INCOMPLETE_TIMEFRAME",
                    path,
                    message: `Timeframe is incomplete. Missing: ${missing.join(", ")}.`,
                    deviceId,
                    deviceName: deviceId ? deviceNames.get(deviceId) : undefined,
                });
            }
            const earliestStart = numberValue(timeframe.EarliestStart);
            const latestEnd = numberValue(timeframe.LatestEnd);
            if (earliestStart !== undefined &&
                latestEnd !== undefined &&
                earliestStart >= latestEnd) {
                issues.push({
                    rule: "INVALID_RANGE",
                    path,
                    message: `EarliestStart (${earliestStart}) must be smaller than LatestEnd (${latestEnd}).`,
                    deviceId,
                    deviceName: deviceId ? deviceNames.get(deviceId) : undefined,
                });
            }
        }
    }
}
function validateMinMaxPairs(node, path, context, deviceNames, issues) {
    const currentContext = enrichContext(node, context, deviceNames);
    for (const [minName, maxName] of MIN_MAX_PAIRS) {
        if (!hasElement(node, minName) || !hasElement(node, maxName)) {
            continue;
        }
        const min = numberValue(node[minName]);
        const max = numberValue(node[maxName]);
        // Empty values are handled by EMPTY_VALUE.
        // Non-numeric values are intentionally not expanded into a full datatype
        // validator in version 1.
        if (min === undefined || max === undefined) {
            continue;
        }
        if (min > max) {
            issues.push({
                rule: "INVALID_RANGE",
                path,
                message: `${minName} (${min}) must not be greater than ${maxName} (${max}).`,
                deviceId: currentContext.deviceId,
                deviceName: currentContext.deviceName,
            });
        }
    }
    for (const [key, rawChild] of Object.entries(node)) {
        if (key.startsWith("_")) {
            continue;
        }
        const children = asArray(rawChild);
        for (let index = 0; index < children.length; index++) {
            const child = children[index];
            if (!isObject(child)) {
                continue;
            }
            const childPath = children.length > 1
                ? `${path}.${key}[${index}]`
                : `${path}.${key}`;
            validateMinMaxPairs(child, childPath, currentContext, deviceNames, issues);
        }
    }
}
/**
 * Formats validation issues into compact log messages.
 * Keeping formatting separate from validation makes the validator easy to unit-test.
 */
function formatSempValidationIssues(issues) {
    if (issues.length === 0) {
        return [];
    }
    const lines = [
        `SEMP validation found ${issues.length} issue(s):`,
    ];
    for (const issue of issues) {
        const device = issue.deviceName || issue.deviceId
            ? ` device=${issue.deviceName ?? "unknown"} (${issue.deviceId ?? "unknown"})`
            : "";
        lines.push(`[${issue.rule}]${device} path=${issue.path}: ${issue.message}`);
    }
    return lines;
}
//# sourceMappingURL=sempRuntimeValidator.js.map