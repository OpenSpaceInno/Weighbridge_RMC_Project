import * as ftp from 'basic-ftp';

async function testParser() {
  const client = new ftp.Client();
  client.ftp.verbose = false;

  try {
    await client.access({
      host: 'ftp.activitsol.com',
      port: 2121,
      user: 'demo',
      password: 'Password@123',
      secure: false
    });

    const list = await client.list('/Dharani');
    console.log(`Fetched ${list.length} files from FTP`);

    const plateRegex = /^(?:Unkown|[A-Za-z0-9]+)_([A-Z0-9]{4,15})\(CH(\d+)_(\d{4})_(\d{2})_(\d{2})_(\d{2})(\d{2})(\d{2})\)\.jpg$/i;

    const detections = [];

    for (const item of list) {
      const match = item.name.match(plateRegex);
      if (match) {
        const plate = match[1].toUpperCase();
        const ch = match[2];
        const year = match[3];
        const month = match[4];
        const day = match[5];
        const hour = match[6];
        const min = match[7];
        const sec = match[8];
        const timestamp = `${year}-${month}-${day} ${hour}:${min}:${sec}`;

        detections.push({
          fileName: item.name,
          plate,
          channel: ch,
          timestamp,
          fileSize: item.size,
          rawModifiedAt: item.rawModifiedAt
        });
      }
    }

    detections.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    console.log(`Parsed ${detections.length} ANPR plate detection events:`);
    console.table(detections.slice(0, 10));

    if (detections.length > 0) {
      console.log('Latest real plate detected on FTP:', detections[0]);
    }

  } catch (err) {
    console.error('FTP error:', err);
  } finally {
    client.close();
  }
}

testParser();
