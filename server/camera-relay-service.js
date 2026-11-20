import { spawn } from 'child_process';
import net from 'net';
import dotenv from 'dotenv';
dotenv.config();

/**
 * CameraRelayService: Automated 24/7 Edge-to-Cloud Video Stream Relay
 * Continuously pushes local RTSP camera streams to the central cloud server MediaMTX
 * so that both local operators and remote cloud users view identical, live, uninterrupted video.
 */
class CameraRelayService {
  constructor() {
    this.remoteHost = process.env.REMOTE_RTSP_HOST || process.env.REMOTE_DB_HOST || '213.210.37.249';
    this.remotePort = parseInt(process.env.REMOTE_RTSP_PORT || '8554', 10);
    this.localHost = '127.0.0.1';
    this.localPort = parseInt(process.env.LOCAL_RTSP_PORT || '8554', 10);

    // Only run edge relay if we have a valid remote public host and we are not running inside the cloud container itself
    this.isEdgeEnvironment = Boolean(
      this.remoteHost &&
      this.remoteHost !== 'localhost' &&
      this.remoteHost !== '127.0.0.1' &&
      this.remoteHost !== 'database' &&
      process.env.NODE_ENV !== 'production'
    );

    this.streams = {
      cam1: {
        id: 'cam1',
        name: 'ANPR Camera (192.168.0.101)',
        localPath: 'cam1',
        remotePath: 'live_cam1',
        process: null,
        status: 'idle',
        startedAt: null,
        reconnectAttempts: 0,
        timer: null,
      },
      cam2: {
        id: 'cam2',
        name: 'IP Camera (192.168.0.99)',
        localPath: 'cam2',
        remotePath: 'live_cam2',
        process: null,
        status: 'idle',
        startedAt: null,
        reconnectAttempts: 0,
        timer: null,
      },
    };

    this.isRunning = false;
  }

  /**
   * Test if a TCP socket is reachable
   */
  async checkPort(host, port, timeout = 2500) {
    return new Promise((resolve) => {
      const s = new net.Socket();
      s.setTimeout(timeout);
      s.on('connect', () => { s.destroy(); resolve(true); });
      s.on('timeout', () => { s.destroy(); resolve(false); });
      s.on('error', () => { s.destroy(); resolve(false); });
      s.connect(port, host);
    });
  }

  /**
   * Start the 24/7 stream relay service
   */
  async start() {
    if (!this.isEdgeEnvironment) {
      console.log(`ℹ️ [CameraRelay] Running in cloud/server mode or no remote host specified (${this.remoteHost}). Edge relay idle.`);
      return;
    }

    if (this.isRunning) return;
    this.isRunning = true;

    console.log(`🌐 [CameraRelay] Initializing Edge-to-Cloud 24/7 RTSP forwarder -> ${this.remoteHost}:${this.remotePort}`);

    // Wait for local MediaMTX to be ready
    const localReady = await this.waitForLocalMediaMTX();
    if (!localReady) {
      console.warn('⚠️ [CameraRelay] Local MediaMTX not responding on port ' + this.localPort + '. Will retry in 10s.');
      setTimeout(() => {
        this.isRunning = false;
        this.start();
      }, 10000);
      return;
    }

    // Start streaming both cameras
    this.startForwarder('cam1');
    this.startForwarder('cam2');
  }

  async waitForLocalMediaMTX(maxRetries = 10, delay = 1500) {
    for (let i = 0; i < maxRetries; i++) {
      const ok = await this.checkPort(this.localHost, this.localPort, 1500);
      if (ok) return true;
      await new Promise(r => setTimeout(r, delay));
    }
    return false;
  }

  /**
   * Spawn FFmpeg forwarder process for a camera stream
   */
  startForwarder(camKey) {
    const stream = this.streams[camKey];
    if (!stream) return;

    if (stream.process) {
      try {
        stream.process.kill('SIGKILL');
      } catch (e) {}
      stream.process = null;
    }

    const localUrl = `rtsp://${this.localHost}:${this.localPort}/${stream.localPath}`;
    const remoteUrl = `rtsp://${this.remoteHost}:${this.remotePort}/${stream.remotePath}`;

    stream.status = 'connecting';
    console.log(`🔄 [CameraRelay] Forwarding ${stream.name}: ${localUrl} -> ${remoteUrl}`);

    // FFmpeg packet-level pass-through (zero re-encoding overhead)
    const args = [
      '-y',
      '-hide_banner',
      '-loglevel', 'error',
      '-rtsp_transport', 'tcp',
      '-i', localUrl,
      '-c:v', 'copy',
      '-an',
      '-rtsp_transport', 'tcp',
      '-f', 'rtsp',
      remoteUrl
    ];

    try {
      const child = spawn('ffmpeg', args, { 
        stdio: ['ignore', 'ignore', 'pipe'],
        windowsHide: true,
      });
      stream.process = child;
      stream.startedAt = new Date();
      stream.status = 'streaming';
      stream.reconnectAttempts = 0;

      child.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg && !msg.includes('deprecated') && !msg.includes('frame=')) {
          if (msg.includes('Connection refused') || msg.includes('timed out') || msg.includes('Server returned')) {
            console.warn(`⚠️ [CameraRelay:${camKey}] ${msg}`);
          }
        }
      });

      child.on('close', (code) => {
        stream.status = 'offline';
        stream.process = null;
        if (this.isRunning) {
          const backoff = Math.min(3000 + stream.reconnectAttempts * 1000, 15000);
          stream.reconnectAttempts++;
          console.warn(`🔄 [CameraRelay:${camKey}] Exited (code ${code}). Reconnecting in ${backoff / 1000}s...`);
          clearTimeout(stream.timer);
          stream.timer = setTimeout(() => {
            if (this.isRunning) this.startForwarder(camKey);
          }, backoff);
        }
      });

      child.on('error', (err) => {
        stream.status = 'error';
        console.error(`❌ [CameraRelay:${camKey}] Process error:`, err.message);
      });
    } catch (err) {
      stream.status = 'error';
      console.error(`❌ [CameraRelay:${camKey}] Failed to spawn ffmpeg:`, err.message);
      clearTimeout(stream.timer);
      stream.timer = setTimeout(() => {
        if (this.isRunning) this.startForwarder(camKey);
      }, 5000);
    }
  }

  /**
   * Stop all forwarders cleanly
   */
  stop() {
    this.isRunning = false;
    for (const key of Object.keys(this.streams)) {
      const s = this.streams[key];
      clearTimeout(s.timer);
      if (s.process) {
        try {
          s.process.kill('SIGTERM');
        } catch (e) {}
        s.process = null;
      }
      s.status = 'stopped';
    }
    console.log('⏹️ [CameraRelay] Edge forwarders stopped.');
  }

  /**
   * Get health status of relays
   */
  getStatus() {
    return {
      enabled: this.isEdgeEnvironment,
      remoteHost: this.remoteHost,
      remotePort: this.remotePort,
      cameras: Object.keys(this.streams).map(k => {
        const s = this.streams[k];
        return {
          id: s.id,
          name: s.name,
          localPath: s.localPath,
          remotePath: s.remotePath,
          status: s.status,
          startedAt: s.startedAt,
          uptimeSeconds: s.startedAt ? Math.floor((Date.now() - new Date(s.startedAt).getTime()) / 1000) : 0,
        };
      })
    };
  }
}

export const cameraRelayService = new CameraRelayService();
