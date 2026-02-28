"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Base {
    adapter;
    id;
    name;
    constructor(adapter, id, name) {
        if (adapter != null) {
            this.adapter = adapter;
        }
        else {
            this.adapter = null;
        }
        this.id = id;
        this.name = name;
        this.logDebug("instance created");
    }
    logDebug(message) {
        if (this.adapter != null) {
            this.adapter.log.debug(this.name + ": " + message);
        }
    }
    logInfo(message) {
        if (this.adapter != null) {
            this.adapter.log.info(this.name + ": " + message);
        }
    }
    logError(message) {
        if (this.adapter != null) {
            this.adapter.log.error(this.name + ": " + message);
        }
    }
    logWarn(message) {
        if (this.adapter != null) {
            this.adapter.log.warn(this.name + ": " + message);
        }
    }
    async CreateObject(key, obj) {
        await this.CreateDatapoint(key, obj.type, obj.common.name, obj.common.role, obj.common.type, obj.common.unit, obj.common.read, obj.common.write, obj.common.desc);
    }
    async CreateDatapoint(key, name, type, common_role, common_type, common_unit, common_read, common_write, common_desc) {
        if (this.adapter == null) {
            return;
        }
        let objName = "";
        if (name === undefined) {
            const names = key.split(".");
            let idx = names.length;
            objName = key;
            if (idx > 0) {
                idx--;
                objName = names[idx];
            }
        }
        else {
            objName = name;
        }
        await this.adapter.setObjectNotExistsAsync(key, {
            type: type,
            common: {
                name: objName,
                role: common_role,
                type: common_type,
                unit: common_unit ? common_unit : "",
                read: common_read,
                write: common_write,
                desc: common_desc
            },
            native: { id: key }
        });
        const obj = await this.adapter.getObjectAsync(key);
        if (obj != null) {
            if (obj.common.role != common_role
                || obj.common.type != common_type
                || obj.common.unit != common_unit
                || obj.common.read != common_read
                || obj.common.write != common_write
                || obj.common.name != name
                || obj.common.desc != common_desc) {
                await this.adapter.extendObject(key, {
                    common: {
                        name: name,
                        role: common_role,
                        type: common_type,
                        unit: common_unit ? common_unit : "",
                        read: common_read,
                        write: common_write,
                        desc: common_desc
                    }
                });
            }
        }
    }
    async SetDefault(key, value) {
        if (this.adapter == null) {
            return;
        }
        const current = await this.adapter.getStateAsync(key);
        //set default only if nothing was set before
        if (current === null || current === undefined || current.val === undefined) {
            this.logInfo("set default " + key + " to " + value);
            await this.adapter.setState(key, { ack: true, val: value });
        }
    }
    async SetState(key, ack, val) {
        if (this.adapter == null) {
            return;
        }
        await this.adapter.setState(key, { ack: ack, val: val });
    }
}
exports.default = Base;
//# sourceMappingURL=base.js.map