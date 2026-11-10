import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { CameraFeed } from '@/types/anpr';

export function useGateCameras() {
  const [cameras, setCameras] = useState<CameraFeed[]>([
    {
      id: "cam_gate_1",
      name: "ANPR Camera (192.168.0.101)",
      location: "Gate Entry - ANPR Lane",
      status: "online",
      ipAddress: "192.168.0.101",
    },
    {
      id: "cam_gate_2",
      name: "IP Camera (192.168.0.99)",
      location: "Gate Entry - Overview",
      status: "online",
      ipAddress: "192.168.0.99",
    },
  ]);
  const [initialized, setInitialized] = useState(false);

  const initializeGateCameras = useCallback(async () => {
    try {
      // Fetch devices from MySQL database
      const dbCameras = await api.getCameras();
      
      if (Array.isArray(dbCameras) && dbCameras.length > 0) {
        const gateList = dbCameras
          .filter((c: any) => c.device_id === 'cam_gate_1' || c.device_id === 'cam_gate_2' || c.location === 'entry')
          .map((c: any) => ({
            id: c.device_id || c.id,
            name: c.name || (c.device_id === 'cam_gate_1' ? 'ANPR Camera (192.168.0.101)' : 'IP Camera (192.168.0.99)'),
            location: c.location === 'entry' ? 'Gate Entry Lane' : (c.location || 'Main Gate'),
            status: (c.status || 'online') as 'online' | 'offline' | 'error',
            ipAddress: c.ip_address || (c.device_id === 'cam_gate_1' ? '192.168.0.101' : '192.168.0.99'),
          }));

        if (gateList.length > 0) {
          setCameras(gateList);
        }
      }

      // Ensure RTSP configs exist with correct URLs
      try {
        const c1 = await api.getRTSPConfig('cam_gate_1');
        if (!c1 || !c1.hls_proxy_url) {
          await api.saveRTSPConfig({
            device_id: 'cam_gate_1',
            enabled: true,
            direct_url: 'rtsp://admin:Password@123@192.168.0.101:554/ch1/main/av_stream',
            use_direct_url: true,
            port: 554,
            username: 'admin',
            password: 'Password@123',
            stream_path: '/ch1/main/av_stream',
            transport: 'tcp',
            reconnect_interval: 5,
            buffer_size: 1024,
            low_latency_mode: true,
            hls_proxy_url: 'http://localhost:8888/cam1/index.m3u8',
          });
        }
      } catch {
        // save default
        await api.saveRTSPConfig({
          device_id: 'cam_gate_1',
          enabled: true,
          direct_url: 'rtsp://admin:Password@123@192.168.0.101:554/ch1/main/av_stream',
          use_direct_url: true,
          port: 554,
          username: 'admin',
          password: 'Password@123',
          stream_path: '/ch1/main/av_stream',
          transport: 'tcp',
          reconnect_interval: 5,
          buffer_size: 1024,
          low_latency_mode: true,
          hls_proxy_url: 'http://localhost:8888/cam1/index.m3u8',
        });
      }

      try {
        const c2 = await api.getRTSPConfig('cam_gate_2');
        if (!c2 || !c2.hls_proxy_url) {
          await api.saveRTSPConfig({
            device_id: 'cam_gate_2',
            enabled: true,
            direct_url: 'rtsp://admin:Password@123@192.168.0.99:554/Streaming/Channels/101',
            use_direct_url: true,
            port: 554,
            username: 'admin',
            password: 'Password@123',
            stream_path: '/Streaming/Channels/101',
            transport: 'tcp',
            reconnect_interval: 5,
            buffer_size: 1024,
            low_latency_mode: true,
            hls_proxy_url: 'http://localhost:8888/cam2/index.m3u8',
          });
        }
      } catch {
        await api.saveRTSPConfig({
          device_id: 'cam_gate_2',
          enabled: true,
          direct_url: 'rtsp://admin:Password@123@192.168.0.99:554/Streaming/Channels/101',
          use_direct_url: true,
          port: 554,
          username: 'admin',
          password: 'Password@123',
          stream_path: '/Streaming/Channels/101',
          transport: 'tcp',
          reconnect_interval: 5,
          buffer_size: 1024,
          low_latency_mode: true,
          hls_proxy_url: 'http://localhost:8888/cam2/index.m3u8',
        });
      }

      setInitialized(true);
    } catch (error) {
      console.error('Error initializing gate cameras:', error);
      setInitialized(true);
    }
  }, []);

  useEffect(() => {
    initializeGateCameras();
  }, [initializeGateCameras]);

  return { cameras, initialized, refreshCameras: initializeGateCameras };
}
