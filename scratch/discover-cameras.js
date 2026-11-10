import dgram from 'dgram';

const client = dgram.createSocket('udp4');

client.on('error', (err) => {
  console.error('Socket error:', err);
});

client.on('message', (msg, rinfo) => {
  console.log(`\n========================================`);
  console.log(`>>> DISCOVERED DEVICE AT: ${rinfo.address}:${rinfo.port}`);
  console.log(msg.toString().substring(0, 400));
  console.log(`========================================\n`);
});

client.bind(() => {
  client.setBroadcast(true);

  const onvifProbe = `<?xml version="1.0" encoding="UTF-8"?>
<e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope"
  xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing"
  xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"
  xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
  <e:Header>
    <w:MessageID>uuid:${Date.now()}</w:MessageID>
    <w:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To>
    <w:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action>
  </e:Header>
  <e:Body>
    <d:Probe>
      <d:Types>dn:NetworkVideoTransmitter</d:Types>
    </d:Probe>
  </e:Body>
</e:Envelope>`;

  const sadpProbe = Buffer.from(`<?xml version="1.0" encoding="utf-8"?><Probe><Uuid>${Date.now()}</Uuid><Types>inquiry</Types></Probe>`);

  console.log('Sending broadcast probes to detect any cameras on the network...');
  try {
    client.send(onvifProbe, 3702, '239.255.255.250');
    client.send(onvifProbe, 3702, '255.255.255.255');
    client.send(onvifProbe, 3702, '192.168.0.255');

    client.send(sadpProbe, 37020, '239.255.255.250');
    client.send(sadpProbe, 37020, '255.255.255.255');
    client.send(sadpProbe, 37020, '192.168.0.255');
  } catch (e) {
    console.error('Send error:', e);
  }

  setTimeout(() => {
    client.close();
    console.log('Discovery completed.');
  }, 4000);
});
