# Documentation for iobroker.semp

## Settings 

### Main

![Main](../admin/docs/Settings_Main_de.PNG)

* IP Address

* UUID

* SEM-Port

* SEMP-name

* SEMP-Vendor

* extended log

### Devices

![Devices](../admin/docs/Settings_Devices_de.PNG)

* Base-ID of devices

### Device Main

![Devices](../admin/docs/Settings_Device_Main_de.PNG)

#### Device Counter

![Devices](../admin/docs/Settings_Device_Counter_de.PNG)

#### Device Switch

![Devices](../admin/docs/Settings_Device_Switch_de.PNG)

#### Device Energy Requests

![Devices](../admin/docs/Settings_Device_Timer_de.PNG)


## use cases

### cancel request if device does not turn on

Sometimes a device does not need the requested energy (e.g. a heat pump). In this case, it might make sense to cancel the energy request at the SHM. The SHM can thus make the available energy available to other devices.

### multi energy requests

* energy request periods must not overlap (better to have minimum five minutes time difference)
* number of energy request periods are not limited

![Devices](../admin/docs/Portal_Planning.PNG)