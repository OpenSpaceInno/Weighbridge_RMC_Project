import { WeightReading, ScaleProtocol, ThirdPartyScaleConfig } from '@/types/weighbridge';

/**
 * Universal Industrial Scale Frame Parser
 * Supports: Avery Weigh-Tronix, Essae Teraoka, Mettler Toledo, Eagle, and Standard ASCII
 */
export function parseScaleWeightString(
  raw: string,
  protocol: ScaleProtocol = 'standard_ascii'
): { weight: number; unit: 'kg' | 'ton'; stable: boolean; zero: boolean } | null {
  if (!raw || typeof raw !== 'string') return null;

  const cleaned = raw.trim();
  if (!cleaned) return null;

  let weight = 0;
  let unit: 'kg' | 'ton' = 'kg';
  let stable = true;

  // Check for stability annunciators common in indicators
  if (cleaned.includes('US') || cleaned.includes('MOT') || cleaned.includes('~')) {
    stable = false; // Unstable / In motion
  } else if (cleaned.includes('ST') || cleaned.includes('S')) {
    stable = true; // Stable
  }

  // Unit detection
  if (/ton|t\b/i.test(cleaned)) {
    unit = 'ton';
  } else {
    unit = 'kg';
  }

  switch (protocol) {
    case 'avery_e1205': {
      // Avery format: <STX><POLARITY><WEIGHT 7 DIGITS><ETX> or +024580
      const match = cleaned.match(/([+-]?\d{3,7})/);
      if (match) {
        weight = Math.abs(parseFloat(match[1]));
      }
      break;
    }

    case 'essae': {
      // Essae format: <STX>W+024580kg<ETX> or W+024580
      const match = cleaned.match(/W?([+-]?\d{3,7})/i);
      if (match) {
        weight = Math.abs(parseFloat(match[1]));
      }
      break;
    }

    case 'toledo': {
      // Mettler Toledo continuous format
      const match = cleaned.match(/([+-]?\d{3,7})/);
      if (match) {
        weight = Math.abs(parseFloat(match[1]));
      }
      break;
    }

    case 'eagle':
    case 'standard_ascii':
    default: {
      // General robust numeric extraction
      // Matches strings like "WT: 24580 kg", "ST,GS,+024580kg", "24580", "00000"
      const match = cleaned.match(/([+-]?\d+(?:\.\d+)?)/);
      if (match) {
        weight = Math.max(0, Math.round(parseFloat(match[1])));
      }
      break;
    }
  }

  return {
    weight,
    unit,
    stable,
    zero: weight === 0,
  };
}

/**
 * Web Serial API Port Manager for physical RS-232 / COM Port / USB Serial Indicators
 */
class WebSerialScaleManager {
  private port: any = null;
  private reader: any = null;
  private keepReading = false;
  private isConnecting = false;

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public async connect(
    config: Partial<ThirdPartyScaleConfig>,
    onReading: (reading: WeightReading, rawText: string) => void,
    onError?: (err: Error) => void
  ): Promise<{ portName: string }> {
    if (!this.isSupported()) {
      throw new Error('Web Serial API is not supported in this browser. Please use Chrome or Edge.');
    }

    if (this.port) {
      await this.disconnect();
    }

    try {
      this.isConnecting = true;
      // Request serial port from user (opens native browser device selector)
      const nav = navigator as any;
      this.port = await nav.serial.requestPort();

      const baudRate = config.baudRate || 9600;
      const dataBits = (config.dataBits || 8) as 7 | 8;
      const stopBits = (config.stopBits || 1) as 1 | 2;
      const parity = (config.parity || 'none') as 'none' | 'even' | 'odd';

      await this.port.open({
        baudRate,
        dataBits,
        stopBits,
        parity,
        bufferSize: 2048,
      });

      this.keepReading = true;
      this.startReadingLoop(config.protocol || 'standard_ascii', onReading, onError);

      const info = this.port.getInfo ? this.port.getInfo() : {};
      const portName = info.usbVendorId ? `USB COM (${info.usbVendorId}:${info.usbProductId || ''})` : 'Connected Serial Port';

      return { portName };
    } catch (err: any) {
      this.port = null;
      throw err;
    } finally {
      this.isConnecting = false;
    }
  }

  private async startReadingLoop(
    protocol: ScaleProtocol,
    onReading: (reading: WeightReading, rawText: string) => void,
    onError?: (err: Error) => void
  ) {
    if (!this.port || !this.port.readable) return;

    try {
      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
      this.reader = textDecoder.readable.getReader();

      let buffer = '';

      while (this.keepReading) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          // Frames typically delimited by \r, \n, or \x03 (ETX)
          const lines = buffer.split(/[\r\n\x03]+/);
          if (lines.length > 1) {
            // Process complete lines
            for (let i = 0; i < lines.length - 1; i++) {
              const line = lines[i].trim();
              if (line) {
                const parsed = parseScaleWeightString(line, protocol);
                if (parsed) {
                  onReading(
                    {
                      timestamp: new Date().toISOString(),
                      weight: parsed.weight,
                      unit: parsed.unit,
                      stable: parsed.stable,
                      zero: parsed.zero,
                    },
                    line
                  );
                }
              }
            }
            buffer = lines[lines.length - 1]; // Keep remainder
          }
        }
      }
    } catch (err: any) {
      if (this.keepReading && onError) {
        onError(err);
      }
    }
  }

  public async disconnect(): Promise<void> {
    this.keepReading = false;
    try {
      if (this.reader) {
        await this.reader.cancel().catch(() => {});
        this.reader = null;
      }
      if (this.port) {
        await this.port.close().catch(() => {});
        this.port = null;
      }
    } catch (e) {
      console.warn('Error closing serial port:', e);
    }
  }

  public isConnected(): boolean {
    return this.port !== null && this.keepReading;
  }
}

export const webSerialScale = new WebSerialScaleManager();

