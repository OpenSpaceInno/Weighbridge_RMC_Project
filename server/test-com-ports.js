import { SerialPort } from 'serialport';

async function testPort(portName) {
  console.log(`Testing ${portName}...`);
  return new Promise((resolve) => {
    try {
      const port = new SerialPort({
        path: portName,
        baudRate: 2400,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        autoOpen: false,
      });

      port.open((err) => {
        if (err) {
          console.log(`Failed to open ${portName}:`, err.message);
          return resolve(false);
        }
        console.log(`Opened ${portName}! Listening for 4 seconds...`);

        let receivedBytes = 0;
        port.on('data', (data) => {
          receivedBytes += data.length;
          console.log(`[${portName} DATA]:`, data.toString('utf8'));
        });

        setTimeout(() => {
          console.log(`Finished listening on ${portName}, received ${receivedBytes} bytes.`);
          port.close(() => resolve(receivedBytes > 0));
        }, 4000);
      });
    } catch (e) {
      console.log(`Error testing ${portName}:`, e.message);
      resolve(false);
    }
  });
}

(async () => {
  await testPort('COM2');
  await testPort('COM3');
})();
