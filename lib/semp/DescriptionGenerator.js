/**
 * @fileOverview Generates a SSDP Semp description xml file with parameters.
 * @author Paul Orlob
 * @module DescriptionGenerator
 */

class DescriptionGenerator {

    /**
     * Generates an xml description
     * @param {string} uuid - A globally unique uuid
     * @param {string} serverAddress - Server address to write in description
     * @param {string} friendlyName - gateway name
     * @param {string} manufacturer - manufacturer name
     * @param {string} basePath - Base path for semp requests
     * @returns {string} - Description xml
     * @throws {TypeError} if uuid or server address are not specified
     * @example
     * generateDescription("2fac1234-31f8-11b4-a222-08002b34c003",
     *      "http://192.168.188.23:8080",
     *      "gateway", "testManufacturer", "/semp")
     */


    /* to do
        * manufacturerURL
        * modelDescription
        * modelName
        * modelNumber
        * modelURL

    */

    static generateDescription(
        uuid,
        serverAddress,
        friendlyName,
        manufacturer,
        basePath) {

        if (!uuid) {
            throw new TypeError("uuid must be specified!")
        }
        if (!serverAddress) {
            throw new TypeError("server address must be specified!")
        }

        let xmlString = "<?xml version=\"1.0\" encoding=\"utf-8\" standalone=\"yes\" ?>\n" +
            "<root xmlns=\"urn:schemas-upnp-org:device-1-0\">\n" +
            "<specVersion>\n" +
            "<major>1</major>\n" +
            "<minor>0</minor>\n" +
            "</specVersion>\n" +
            "<device>\n" +
            "<deviceType>urn:schemas-simple-energy-management-protocol:device:Gateway:1</deviceType>\n" +
            "<friendlyName>" + friendlyName + "</friendlyName>\n" +
            "<manufacturer>" + manufacturer + "</manufacturer>\n" +
            "<manufacturerURL>www.iobroker.net</manufacturerURL>" +
            "<modelDescription>interface to ioBroker</modelDescription>" +
            "<modelName>Semp_Gateway</modelName>\n" +
            "<modelNumber>0.1</modelNumber > " +
            "<modelURL>www.iobroker.net</modelURL>" +
            "<UDN>uuid:" + uuid + "</UDN>\n" +
            "<semp:X_SEMPSERVICE xmlns:semp=\"urn:schemas-simple-energy-management-protocol:service-1-0\">\n" +
            "<semp:server>" + serverAddress + "</semp:server>\n" +
            "<semp:basePath>" + basePath + "</semp:basePath>\n" +
            "<semp:transport>HTTP/Pull</semp:transport>\n" +
            "<semp:exchangeFormat>XML</semp:exchangeFormat>\n" +
            "<semp:wsVersion>1.1.5</semp:wsVersion>\n" +
            "</semp:X_SEMPSERVICE>\n" +
            "</device>\n" +
            "</root>";

        return xmlString;
    }
}

/*
SAE
eXtensible Markup Language
    <?xml
        version="1.0"
        encoding="utf-8"
        standalone="yes"
        ?>
    <root
        xmlns="urn:schemas-upnp-org:device-1-0">
        <specVersion>
            <major>
                1
                </major>
            <minor>
                0
                </minor>
            </specVersion>
        <device>
            <deviceType>
                urn:schemas-simple-energy-management-protocol:device:Gateway:1
                </deviceType>
            <friendlyName>
                SmartApplianceEnabler
                </friendlyName>
            <manufacturer>
                avanux.de
                </manufacturer>
            <manufacturerURL>
                http://www.avanux.de
                </manufacturerURL>
            <modelDescription>
                Enable smart appliance behaviour of legacy devices
                </modelDescription>
            <modelName>
                SmartApplianceEnabler
                </modelName>
            <modelNumber>
                0.1
                </modelNumber>
            <modelURL>
                http://www.avanux.de/SmartApplianceEnablerV1
                </modelURL>
            <UDN>
                uuid:b5fdc530-53c6-6754-ffff-ffff9efde8ab
                </UDN>
            <semp:X_SEMPSERVICE
                xmlns:semp="urn:schemas-simple-energy-management-protocol:service-1-0">
                <semp:server>
                    http://192.168.3.33:8080
                    </semp:server>
                <semp:basePath>
                    /semp
                    </semp:basePath>
                <semp:transport>
                    HTTP/Pull
                    </semp:transport>
                <semp:exchangeFormat>
                    XML
                    </semp:exchangeFormat>
                <semp:wsVersion>
                    1.1.5
                    </semp:wsVersion>
                </semp:X_SEMPSERVICE>
            </device>
        </root>



ist:






*/

module.exports = {
    DescriptionGenerator
};