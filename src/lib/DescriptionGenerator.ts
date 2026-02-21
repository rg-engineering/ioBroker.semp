/* eslint-disable prefer-template */
/**
 * Generates a SSDP Semp description xml file with parameters.
 * 
 * @author Paul Orlob
 * @module DescriptionGenerator
 */

export default class DescriptionGenerator {

    //Generates an xml description

	/* to do
        * manufacturerURL
        * modelDescription
        * modelName
        * modelNumber
        * modelURL

    */

	static generateDescription(
		uuid:string,
		serverAddress:string,
		friendlyName:string,
		manufacturer:string,
		basePath:string) : string {

		if (!uuid) {
			throw new TypeError("uuid must be specified!");
		}
		if (!serverAddress) {
			throw new TypeError("server address must be specified!");
		}

		const xmlString = "<?xml version=\"1.0\" encoding=\"utf-8\" standalone=\"yes\" ?>\n" +
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


