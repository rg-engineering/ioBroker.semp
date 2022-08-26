const nodeSSDP = require('node-ssdp').Server;

class SSDPServer {

    constructor(descriptionURL, uniqueDeviceName, gateway) {

        this.Gateway = gateway;

        if (descriptionURL == null || descriptionURL === "") {
            throw new TypeError("Description url cant be empty!")
            this.Gateway.parentAdapter.log.error("Description url cant be empty!");
        }

        this.ssdp = new nodeSSDP({
            location: descriptionURL,
            udn: "uuid:" + uniqueDeviceName,
            adInterval: 20000
        });

        /* NOTIFY for the root-device:
         * soll:
            NOTIFY * HTTP/1.1\r\n 
            HOST: 239.255.255.250:1900\r\n 
            CACHE-CONTROL: max-age = 1800\r\n 
            SERVER: Linux/2.6.32 UPnP/1.0 SomeGateway SSDP Server/1.0.0\r\n 
            NTS: ssdp:alive\r\n 
            LOCATION: http://192.168.1.1:8080/SEMP/description.xml\r\n 
            NT: upnp:rootdevice\r\n 
            USN: uuid:2fac1234-31f8-11b4-a222-08002b34c003::upnp:rootdevice\r\n \r\n

            ist ioBroker:
            
                NOTIFY * HTTP/1.1\r\n
                HOST: 239.255.255.250:1900\r\n
                NT: upnp:rootdevice\r\n
                NTS: ssdp:alive\r\n
                USN: uuid:290B3891-0311-4854-4333-7C70BC802C2D::upnp:rootdevice\r\n
                LOCATION: http://192.168.3.43:9765/description.xml\r\n
                CACHE-CONTROL: max-age=1800\r\n
                SERVER: node.js/16.17.0 UPnP/1.1 node-ssdp/4.0.1\r\n
            
            ist Smart Appliance Enabler:
  
                NOTIFY * HTTP/1.1\r\n
                CACHE-CONTROL: max-age=1800\r\n
                LOCATION: http://192.168.3.33:34813/dev/b5fdc530-53c6-6754-ffff-ffff9efde8ab/desc\r\n
                NT: upnp:rootdevice\r\n
                HOST: 239.255.255.250:1900\r\n
                NTS: ssdp:alive\r\n
                USN: uuid:b5fdc530-53c6-6754-ffff-ffff9efde8ab::upnp:rootdevice\r\n
                SERVER: Linux/5.15.56-v7l UPnP/1.0 Cling/2.0\r\n
    

        */
        this.ssdp.addUSN("upnp:rootdevice");

        this.ssdp.addUSN(uniqueDeviceName);

        this.ssdp.addUSN("urn:schemas-simple-energy-management-protocol:device:Gateway:1")

        this.Gateway.parentAdapter.log.debug("SSDPServer created: " + descriptionURL + " " + uniqueDeviceName);
    }

    start() {
        this.ssdp.start();
        this.Gateway.parentAdapter.log.debug("SSDPServer started");
    }

    stop() {
        this.ssdp.stop();
        this.Gateway.parentAdapter.log.debug("SSDPServer stopped");
    }
}

module.exports = {
    SSDPServer
};