-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: rmc_gate_system
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `rmc_gate_system`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `rmc_gate_system` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `rmc_gate_system`;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` varchar(50) NOT NULL,
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  `module` varchar(50) NOT NULL,
  `action` varchar(50) NOT NULL,
  `entity_id` varchar(100) DEFAULT NULL,
  `entity_type` varchar(100) DEFAULT NULL,
  `performed_by` json DEFAULT NULL,
  `details` text,
  `severity` varchar(20) DEFAULT 'info',
  `previous_state` json DEFAULT NULL,
  `new_state` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_module` (`module`),
  KEY `idx_audit_time` (`timestamp`),
  KEY `idx_audit_sev` (`severity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES ('aud-1','2026-11-05 05:15:28','gate','ANPR_READ','MH12AB1234','vehicle','{\"id\": \"SYS\", \"name\": \"ANPR Gate Cam 1\", \"role\": \"system\"}','ANPR detected MH12AB1234 with 96% confidence','info',NULL,NULL,'{\"cameraId\": \"cam_gate_1\"}','2026-11-05 11:45:28'),('AUD-1793865388700-163','2026-11-05 13:26:28','AUTH','USER_LOGIN','USR-001','USER','{\"role\": \"Plant Head / Admin\", \"userId\": \"USR-001\", \"username\": \"admin\"}','Operator \'Rajesh Sharma\' signed in as \'Plant Head / Admin\' [Shift: General Shift (08:00 - 18:00)]','info',NULL,NULL,NULL,'2026-11-05 13:26:28'),('AUD-1793868072492-295','2026-11-05 14:11:12','AUTH','USER_LOGIN','USR-001','USER','{\"role\": \"Plant Head / Admin\", \"userId\": \"USR-001\", \"username\": \"admin\"}','Operator \'Rajesh Sharma\' signed in as \'Plant Head / Admin\' [Shift: General Shift (08:00 - 18:00)]','info',NULL,NULL,NULL,'2026-11-05 14:11:12'),('AUD-1793868077060-812','2026-11-05 14:11:17','AUTH','USER_LOGIN','USR-003','USER','{\"role\": \"Weighbridge In-charge / Operator\", \"userId\": \"USR-003\", \"username\": \"weighbridge.op\"}','Operator \'Ramesh Kulkarni\' signed in as \'Weighbridge In-charge / Operator\' [Shift: Morning Shift (06:00 - 14:00)]','info',NULL,NULL,NULL,'2026-11-05 14:11:17'),('AUD-1793868429905-125','2026-11-05 14:17:09','AUTH','USER_LOGIN','USR-003','USER','{\"role\": \"Weighbridge In-charge / Operator\", \"userId\": \"USR-003\", \"username\": \"weighbridge.op\"}','Operator \'Ramesh Kulkarni\' signed in as \'Weighbridge In-charge / Operator\' [Shift: Morning Shift (06:00 - 14:00)]','info',NULL,NULL,NULL,'2026-11-05 14:17:09'),('AUD-1793868463172-840','2026-11-05 14:17:43','AUTH','USER_LOGIN','USR-003','USER','{\"role\": \"Weighbridge In-charge / Operator\", \"userId\": \"USR-003\", \"username\": \"weighbridge.op\"}','Operator \'Ramesh Kulkarni\' signed in as \'Weighbridge In-charge / Operator\' [Shift: Morning Shift (06:00 - 14:00)]','info',NULL,NULL,NULL,'2026-11-05 14:17:43'),('AUD-1793870214554-697','2026-11-05 14:46:54','AUTH','USER_LOGIN','USR-001','USER','{\"role\": \"Plant Head / Admin\", \"userId\": \"USR-001\", \"username\": \"admin\"}','Operator \'Rajesh Sharma\' signed in as \'Plant Head / Admin\' [Shift: General Shift (08:00 - 18:00)]','info',NULL,NULL,NULL,'2026-11-05 14:46:54'),('AUD-1793870223460-452','2026-11-05 14:47:03','AUTH','USER_LOGIN','USR-003','USER','{\"role\": \"Weighbridge In-charge / Operator\", \"userId\": \"USR-003\", \"username\": \"weighbridge.op\"}','Operator \'Ramesh Kulkarni\' signed in as \'Weighbridge In-charge / Operator\' [Shift: Morning Shift (06:00 - 14:00)]','info',NULL,NULL,NULL,'2026-11-05 14:47:03'),('AUD-1793871973985-934','2026-11-05 15:16:13','AUTH','USER_LOGIN','USR-003','USER','{\"role\": \"Weighbridge In-charge / Operator\", \"userId\": \"USR-003\", \"username\": \"weighbridge.op\"}','Operator \'Ramesh Kulkarni\' signed in as \'Weighbridge In-charge / Operator\' [Shift: Morning Shift (06:00 - 14:00)]','info',NULL,NULL,NULL,'2026-11-05 15:16:13'),('AUD-1793872079628-911','2026-11-05 15:17:59','AUTH','USER_LOGIN','USR-001','USER','{\"role\": \"Plant Head / Admin\", \"userId\": \"USR-001\", \"username\": \"admin\"}','Operator \'Rajesh Sharma\' signed in as \'Plant Head / Admin\' [Shift: General Shift (08:00 - 18:00)]','info',NULL,NULL,NULL,'2026-11-05 15:17:59'),('AUD-1793872622037-438','2026-11-05 15:27:02','AUTH','USER_LOGIN','USR-001','USER','{\"role\": \"Plant Head / Admin\", \"userId\": \"USR-001\", \"username\": \"admin\"}','Operator \'Rajesh Sharma\' signed in as \'Plant Head / Admin\' [Shift: General Shift (08:00 - 18:00)]','info',NULL,NULL,NULL,'2026-11-05 15:27:02'),('AUD-1793872637084-543','2026-11-05 15:27:17','AUTH','USER_LOGIN','USR-001','USER','{\"role\": \"Plant Head / Admin\", \"userId\": \"USR-001\", \"username\": \"admin\"}','Operator \'Rajesh Sharma\' signed in as \'Plant Head / Admin\' [Shift: General Shift (08:00 - 18:00)]','info',NULL,NULL,NULL,'2026-11-05 15:27:17'),('AUD-1793872649395-124','2026-11-05 15:27:29','AUTH','USER_LOGIN','USR-001','USER','{\"role\": \"Plant Head / Admin\", \"userId\": \"USR-001\", \"username\": \"admin\"}','Operator \'Rajesh Sharma\' signed in as \'Plant Head / Admin\' [Shift: General Shift (08:00 - 18:00)]','info',NULL,NULL,NULL,'2026-11-05 15:27:29'),('AUD-1793872704533-252','2026-11-05 15:28:24','AUTH','USER_LOGIN','USR-001','USER','{\"role\": \"Plant Head / Admin\", \"userId\": \"USR-001\", \"username\": \"admin\"}','Operator \'Rajesh Sharma\' signed in as \'Plant Head / Admin\' [Shift: General Shift (08:00 - 18:00)]','info',NULL,NULL,NULL,'2026-11-05 15:28:24'),('AUD-1794223034124-983','2026-11-09 16:47:14','AUTH','USER_LOGIN','USR-001','USER','{\"role\": \"Plant Head / Admin\", \"userId\": \"USR-001\", \"username\": \"admin\"}','Operator \'Rajesh Sharma\' signed in as \'Plant Head / Admin\' [Shift: General Shift (08:00 - 18:00)]','info',NULL,NULL,NULL,'2026-11-09 16:47:14'),('AUD-1794310277457-487','2026-11-10 17:01:17','AUTH','USER_LOGIN','USR-001','USER','{\"role\": \"Plant Head / Admin\", \"userId\": \"USR-001\", \"username\": \"admin\"}','Operator \'Rajesh Sharma\' signed in as \'Plant Head / Admin\' [Shift: General Shift (08:00 - 18:00)]','info',NULL,NULL,NULL,'2026-11-10 17:01:17'),('AUD-1794310308911-19','2026-11-10 17:01:48','AUTH','USER_LOGIN','USR-001','USER','{\"role\": \"Plant Head / Admin\", \"userId\": \"USR-001\", \"username\": \"admin\"}','Operator \'Rajesh Sharma\' signed in as \'Plant Head / Admin\' [Shift: General Shift (08:00 - 18:00)]','info',NULL,NULL,NULL,'2026-11-10 17:01:48'),('AUD-1794310407988-219','2026-11-10 17:03:27','USERS','USER_CREATED','USR-778','USER','{\"userId\": \"ADMIN\", \"username\": \"admin\"}','Operator account \'ganesh\' (Surada Ganesh) registered with role \'Weighbridge In-charge / Operator\' at plant \'Plant 1000\'','info',NULL,NULL,NULL,'2026-11-10 17:03:27'),('AUD-1794310436303-314','2026-11-10 17:03:56','AUTH','USER_LOGIN','USR-778','USER','{\"role\": \"Weighbridge In-charge / Operator\", \"userId\": \"USR-778\", \"username\": \"ganesh\"}','Operator \'Surada Ganesh\' signed in as \'Weighbridge In-charge / Operator\' [Shift: General (09:00 - 18:00)]','info',NULL,NULL,NULL,'2026-11-10 17:03:56'),('AUD-1794310790985-698','2026-11-10 17:09:50','AUTH','USER_LOGIN','USR-778','USER','{\"role\": \"Weighbridge In-charge / Operator\", \"userId\": \"USR-778\", \"username\": \"ganesh\"}','Operator \'Surada Ganesh\' signed in as \'Weighbridge In-charge / Operator\' [Shift: General (09:00 - 18:00)]','info',NULL,NULL,NULL,'2026-11-10 17:09:50'),('AUD-1794312360318-116','2026-11-10 17:36:00','AUTH','LOGIN_FAILED','USR-001','USER','{\"userId\": \"USR-001\", \"username\": \"admin\"}','Failed authentication attempt for username \'admin\'','warning',NULL,NULL,NULL,'2026-11-10 17:36:00'),('AUD-1794312360330-979','2026-11-10 17:36:00','AUTH','LOGIN_TERMINAL_MISMATCH','USR-001','USER','{\"userId\": \"USR-001\", \"username\": \"admin\", \"assignedPlant\": \"PL01\", \"selectedPlant\": \"PL02\"}','Operating Plant Terminal mismatch: Operator \'admin\' attempted to log into \'Plant 02 • Miyapur Metro\' but is designated to \'Plant 01 • Shamshabad Central\'','warning',NULL,NULL,NULL,'2026-11-10 17:36:00'),('AUD-1794312360339-315','2026-11-10 17:36:00','AUTH','USER_LOGIN','USR-001','USER','{\"role\": \"Plant Head / Admin\", \"userId\": \"USR-001\", \"plantId\": \"PL01\", \"username\": \"admin\"}','Operator \'Rajesh Sharma\' signed in as \'Plant Head / Admin\' at Terminal [Plant 01 • Shamshabad Central]','info',NULL,NULL,NULL,'2026-11-10 17:36:00'),('AUD-1794312360346-465','2026-11-10 17:36:00','AUTH','LOGIN_TERMINAL_MISMATCH','USR-PL02-01','USER','{\"userId\": \"USR-PL02-01\", \"username\": \"op_miyapur\", \"assignedPlant\": \"PL02\", \"selectedPlant\": \"PL01\"}','Operating Plant Terminal mismatch: Operator \'op_miyapur\' attempted to log into \'Plant 01 • Shamshabad Central\' but is designated to \'Plant 02 • Miyapur Metro\'','warning',NULL,NULL,NULL,'2026-11-10 17:36:00'),('AUD-1794312360356-896','2026-11-10 17:36:00','AUTH','USER_LOGIN','USR-PL02-01','USER','{\"role\": \"Weighbridge In-charge / Operator\", \"userId\": \"USR-PL02-01\", \"plantId\": \"PL02\", \"username\": \"op_miyapur\"}','Operator \'Suresh Kumar (Miyapur)\' signed in as \'Weighbridge In-charge / Operator\' at Terminal [Plant 02 • Miyapur Metro]','info',NULL,NULL,NULL,'2026-11-10 17:36:00'),('AUD-1794312523177-858','2026-11-10 17:38:43','AUTH','LOGIN_TERMINAL_MISMATCH','USR-778','USER','{\"userId\": \"USR-778\", \"username\": \"ganesh\", \"assignedPlant\": \"PL91\", \"selectedPlant\": \"PL02\"}','Operating Plant Terminal mismatch: Operator \'ganesh\' attempted to log into \'Plant 02 • Miyapur Metro\' but is designated to \'Plant 1000\'','warning',NULL,NULL,NULL,'2026-11-10 17:38:43'),('AUD-1794312553428-521','2026-11-10 17:39:13','AUTH','USER_LOGIN','USR-778','USER','{\"role\": \"Weighbridge In-charge / Operator\", \"userId\": \"USR-778\", \"plantId\": \"PL91\", \"username\": \"ganesh\"}','Operator \'Surada Ganesh\' signed in as \'Weighbridge In-charge / Operator\' at Terminal [Plant 1000]','info',NULL,NULL,NULL,'2026-11-10 17:39:13'),('AUD-1794314484285-370','2026-11-10 18:11:24','AUTH','USER_LOGIN','USR-778','USER','{\"role\": \"Weighbridge In-charge / Operator\", \"userId\": \"USR-778\", \"plantId\": \"PL91\", \"username\": \"ganesh\"}','Operator \'Surada Ganesh\' signed in as \'Weighbridge In-charge / Operator\' at Terminal [Plant 1000]','info',NULL,NULL,NULL,'2026-11-10 18:11:24'),('AUD-1794314511619-422','2026-11-10 18:11:51','AUTH','LOGIN_TERMINAL_MISMATCH','USR-778','USER','{\"userId\": \"USR-778\", \"username\": \"ganesh\", \"assignedPlant\": \"PL91\", \"selectedPlant\": \"PL02\"}','Operating Plant Terminal mismatch: Operator \'ganesh\' attempted to log into \'Plant 02 • Miyapur Metro\' but is designated to \'Plant 1000\'','warning',NULL,NULL,NULL,'2026-11-10 18:11:51'),('AUD-1794316421269-555','2026-11-10 18:43:41','AUTH','USER_LOGIN','USR-001','USER','{\"role\": \"Plant Head / Admin\", \"userId\": \"USR-001\", \"plantId\": \"PL01\", \"username\": \"admin\"}','Operator \'Rajesh Sharma\' signed in as \'Plant Head / Admin\' at Terminal [Plant 01 • Shamshabad Central]','info',NULL,NULL,NULL,'2026-11-10 18:43:41'),('AUD-1794316670862-835','2026-11-10 18:47:50','AUTH','LOGIN_FAILED','USR-778','USER','{\"userId\": \"USR-778\", \"username\": \"ganesh\"}','Failed authentication attempt for username \'ganesh\'','warning',NULL,NULL,NULL,'2026-11-10 18:47:50'),('AUD-1794316670990-68','2026-11-10 18:47:50','AUTH','LOGIN_FAILED','USR-778','USER','{\"userId\": \"USR-778\", \"username\": \"ganesh\"}','Failed authentication attempt for username \'ganesh\'','warning',NULL,NULL,NULL,'2026-11-10 18:47:50'),('AUD-1794316764494-896','2026-11-10 18:49:24','AUTH','LOGIN_TERMINAL_MISMATCH','USR-778','USER','{\"userId\": \"USR-778\", \"username\": \"ganesh\", \"assignedPlant\": \"PL91\", \"selectedPlant\": \"PL01\"}','Operating Plant Terminal mismatch: Operator \'ganesh\' attempted to log into \'Plant 01 • Shamshabad Central\' but is designated to \'Plant 1000\'','warning',NULL,NULL,NULL,'2026-11-10 18:49:24'),('AUD-1794316770339-181','2026-11-10 18:49:30','AUTH','USER_LOGIN','USR-778','USER','{\"role\": \"Weighbridge In-charge / Operator\", \"userId\": \"USR-778\", \"plantId\": \"PL91\", \"username\": \"ganesh\"}','Operator \'Surada Ganesh\' signed in as \'Weighbridge In-charge / Operator\' at Terminal [Plant 1000]','info',NULL,NULL,NULL,'2026-11-10 18:49:30'),('aud-2','2026-11-05 05:45:28','exit','ANOMALY_DETECTED','EV-2026-001','verification','{\"id\": \"OP001\", \"name\": \"John Operator\", \"role\": \"operator\"}','Gross weight 19,450kg exceeded tolerance (+1.65T)','critical',NULL,NULL,'{\"weightDiff\": 1650}','2026-11-05 11:45:28');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `camera_devices`
--

DROP TABLE IF EXISTS `camera_devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `camera_devices` (
  `id` varchar(36) NOT NULL DEFAULT (uuid()),
  `device_id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `model` varchar(100) NOT NULL,
  `location` varchar(50) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `mac_address` varchar(17) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'offline',
  `last_seen` datetime DEFAULT NULL,
  `firmware` varchar(50) DEFAULT NULL,
  `show_on_dashboard` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `device_id` (`device_id`),
  KEY `idx_device_id` (`device_id`),
  KEY `idx_location` (`location`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `camera_devices`
--

LOCK TABLES `camera_devices` WRITE;
/*!40000 ALTER TABLE `camera_devices` DISABLE KEYS */;
/*!40000 ALTER TABLE `camera_devices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `device_ftp_config`
--

DROP TABLE IF EXISTS `device_ftp_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `device_ftp_config` (
  `id` varchar(64) NOT NULL,
  `host` varchar(255) NOT NULL,
  `api_url` varchar(512) NOT NULL,
  `ftp_port` int DEFAULT '2121',
  `sftp_port` int DEFAULT '2222',
  `username` varchar(128) NOT NULL,
  `password` varchar(255) NOT NULL,
  `camera_user` varchar(128) DEFAULT 'sarath',
  `camera_password` varchar(255) DEFAULT 'Password@123',
  `admin_user` varchar(128) DEFAULT 'ftpsuperadmin',
  `admin_password` varchar(255) DEFAULT 'Demo#Test@2026',
  `remote_folder` varchar(255) DEFAULT '/weighbridge',
  `web_admin_url` varchar(512) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `device_ftp_config`
--

LOCK TABLES `device_ftp_config` WRITE;
/*!40000 ALTER TABLE `device_ftp_config` DISABLE KEYS */;
INSERT INTO `device_ftp_config` VALUES ('default','213.210.37.249','http://sftpgo-zkiu7thmtlpwpdojnucvhahr.213.210.37.249.sslip.io/api/v2',2121,2222,'aparna_rmc','Rmc@Aparna#2026','sarath','Password@123','ftpsuperadmin','Demo#Test@2026','/weighbridge','http://sftpgo-zkiu7thmtlpwpdojnucvhahr.213.210.37.249.sslip.io/web/admin/users','2026-11-10 13:09:30');
/*!40000 ALTER TABLE `device_ftp_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `device_network_config`
--

DROP TABLE IF EXISTS `device_network_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `device_network_config` (
  `id` varchar(36) NOT NULL DEFAULT (uuid()),
  `device_id` varchar(50) NOT NULL,
  `ip_address` varchar(45) NOT NULL,
  `subnet_mask` varchar(45) NOT NULL DEFAULT '255.255.255.0',
  `gateway` varchar(45) NOT NULL,
  `primary_dns` varchar(45) NOT NULL DEFAULT '8.8.8.8',
  `secondary_dns` varchar(45) DEFAULT '8.8.4.4',
  `dhcp_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `device_id` (`device_id`),
  CONSTRAINT `device_network_config_ibfk_1` FOREIGN KEY (`device_id`) REFERENCES `camera_devices` (`device_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `device_network_config`
--

LOCK TABLES `device_network_config` WRITE;
/*!40000 ALTER TABLE `device_network_config` DISABLE KEYS */;
/*!40000 ALTER TABLE `device_network_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `device_rtsp_config`
--

DROP TABLE IF EXISTS `device_rtsp_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `device_rtsp_config` (
  `id` varchar(36) NOT NULL DEFAULT (uuid()),
  `device_id` varchar(50) NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `url` text,
  `direct_url` text,
  `use_direct_url` tinyint(1) NOT NULL DEFAULT '1',
  `port` int NOT NULL DEFAULT '554',
  `username` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `stream_path` varchar(500) NOT NULL DEFAULT '/rtsp/streaming?channel=01&subtype=0',
  `transport` varchar(10) NOT NULL DEFAULT 'tcp',
  `reconnect_interval` int NOT NULL DEFAULT '5',
  `buffer_size` int NOT NULL DEFAULT '1024',
  `low_latency_mode` tinyint(1) NOT NULL DEFAULT '1',
  `hls_proxy_url` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `device_id` (`device_id`),
  CONSTRAINT `device_rtsp_config_ibfk_1` FOREIGN KEY (`device_id`) REFERENCES `camera_devices` (`device_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `device_rtsp_config`
--

LOCK TABLES `device_rtsp_config` WRITE;
/*!40000 ALTER TABLE `device_rtsp_config` DISABLE KEYS */;
/*!40000 ALTER TABLE `device_rtsp_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dispatches`
--

DROP TABLE IF EXISTS `dispatches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dispatches` (
  `id` varchar(50) NOT NULL,
  `vehicle_reg_no` varchar(50) NOT NULL,
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  `material` varchar(100) DEFAULT NULL,
  `quantity` decimal(10,2) DEFAULT NULL,
  `unit` varchar(20) DEFAULT 'm³',
  `customer` varchar(150) DEFAULT NULL,
  `documentation` json DEFAULT NULL,
  `route` json DEFAULT NULL,
  `plate_images` json DEFAULT NULL,
  `status` varchar(30) DEFAULT 'pending',
  `approved_by` varchar(100) DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `rejection_reason` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_disp_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dispatches`
--

LOCK TABLES `dispatches` WRITE;
/*!40000 ALTER TABLE `dispatches` DISABLE KEYS */;
/*!40000 ALTER TABLE `dispatches` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `driver_trip_assignments`
--

DROP TABLE IF EXISTS `driver_trip_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `driver_trip_assignments` (
  `id` varchar(50) NOT NULL,
  `trip_id` varchar(50) NOT NULL,
  `driver_id` varchar(50) NOT NULL,
  `vehicle_reg_no` varchar(50) DEFAULT NULL,
  `material` varchar(100) DEFAULT NULL,
  `quantity` decimal(10,2) DEFAULT NULL,
  `customer` varchar(150) DEFAULT NULL,
  `destination` text,
  `assigned_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `status` varchar(30) DEFAULT 'assigned',
  `distance` decimal(10,2) DEFAULT '0.00',
  `duration` int DEFAULT NULL,
  `rating` decimal(3,2) DEFAULT NULL,
  `feedback` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_d_trips` (`driver_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `driver_trip_assignments`
--

LOCK TABLES `driver_trip_assignments` WRITE;
/*!40000 ALTER TABLE `driver_trip_assignments` DISABLE KEYS */;
/*!40000 ALTER TABLE `driver_trip_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `drivers`
--

DROP TABLE IF EXISTS `drivers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `drivers` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `address` text,
  `employee_id` varchar(50) NOT NULL,
  `date_of_joining` date DEFAULT NULL,
  `status` varchar(30) DEFAULT 'available',
  `photo` text,
  `emergency_contact` json DEFAULT NULL,
  `license` json DEFAULT NULL,
  `assigned_vehicle` varchar(50) DEFAULT NULL,
  `rating` decimal(3,2) DEFAULT '5.00',
  `total_trips` int DEFAULT '0',
  `total_distance` decimal(12,2) DEFAULT '0.00',
  `current_trip_id` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_id` (`employee_id`),
  KEY `idx_driver_status` (`status`),
  KEY `idx_employee_id` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `drivers`
--

LOCK TABLES `drivers` WRITE;
/*!40000 ALTER TABLE `drivers` DISABLE KEYS */;
INSERT INTO `drivers` VALUES ('d1','Rajesh Kumar','+91 98765 43210','rajesh.k@example.com','1988-05-12','Plot 45, Hadapsar, Pune','EMP-DRV-001','2022-01-15','available',NULL,'{\"name\": \"Sunita Kumar\", \"phone\": \"+91 98765 00001\", \"relation\": \"Spouse\"}','{\"type\": \"HMV\", \"number\": \"MH12 20100012345\", \"status\": \"valid\", \"issueDate\": \"2010-06-15\", \"expiryDate\": \"2028-06-14\", \"issuingAuthority\": \"RTO Pune\"}','MH12AB1234',4.80,342,45200.00,NULL,'2026-11-05 11:45:28','2026-11-05 11:45:28'),('d2','Suresh Patil','+91 87654 32109','suresh.p@example.com','1985-08-24','Sector 12, Nigdi, Pimpri','EMP-DRV-002','2021-06-20','on_trip',NULL,'{\"name\": \"Rekha Patil\", \"phone\": \"+91 87654 00002\", \"relation\": \"Spouse\"}','{\"type\": \"Transport\", \"number\": \"MH14 20080056789\", \"status\": \"valid\", \"issueDate\": \"2008-09-10\", \"expiryDate\": \"2027-09-09\", \"issuingAuthority\": \"RTO Pimpri\"}','MH14CD5678',4.90,512,68900.00,NULL,'2026-11-05 11:45:28','2026-11-05 11:45:28'),('d3','Vikram Singh','+91 76543 21098','vikram.s@example.com','1992-11-03','Katraj, Pune','EMP-DRV-003','2023-03-10','on_leave',NULL,'{\"name\": \"Mahesh Singh\", \"phone\": \"+91 76543 00003\", \"relation\": \"Brother\"}','{\"type\": \"HMV\", \"number\": \"MH12 20150098765\", \"status\": \"valid\", \"issueDate\": \"2015-12-01\", \"expiryDate\": \"2026-12-01\", \"issuingAuthority\": \"RTO Pune\"}','MH43EF9012',4.60,189,24500.00,NULL,'2026-11-05 11:45:28','2026-11-05 11:45:28');
/*!40000 ALTER TABLE `drivers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exit_verifications`
--

DROP TABLE IF EXISTS `exit_verifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exit_verifications` (
  `id` varchar(50) NOT NULL,
  `verification_id` varchar(50) NOT NULL,
  `vehicle_reg_no` varchar(50) NOT NULL,
  `exit_timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  `exit_weight` decimal(10,2) NOT NULL,
  `entry_weight` decimal(10,2) DEFAULT NULL,
  `loading_weight` decimal(10,2) DEFAULT NULL,
  `weight_difference` decimal(10,2) NOT NULL,
  `plate_images` json DEFAULT NULL,
  `status` varchar(30) DEFAULT 'pending',
  `operator_id` varchar(50) DEFAULT NULL,
  `operator_name` varchar(100) DEFAULT NULL,
  `remarks` text,
  `anomaly_reason` text,
  `incident_id` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `verification_id` (`verification_id`),
  KEY `idx_ev_status` (`status`),
  KEY `idx_ev_reg` (`vehicle_reg_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exit_verifications`
--

LOCK TABLES `exit_verifications` WRITE;
/*!40000 ALTER TABLE `exit_verifications` DISABLE KEYS */;
INSERT INTO `exit_verifications` VALUES ('ev-001','EV-2026-001','MH12AB1234','2026-10-09 13:45:00',19450.00,8500.00,17800.00,1650.00,'[]','anomaly','OP001','John Operator','Gross weight exceeds batch target by 1.65 tons (>5% tolerance). Escalated to Incident Management.','Weight discrepancy exceeds tolerance threshold','inc-001','2026-11-05 11:45:28'),('ev-002','EV-2026-002','MH14CD5678','2026-10-09 14:10:00',18520.00,9200.00,18500.00,20.00,'[]','verified','OP001','John Operator','Discrepancy +20kg is within 0.1% tolerance. Cleared for customer delivery.',NULL,NULL,'2026-11-05 11:45:28');
/*!40000 ALTER TABLE `exit_verifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fuel_records`
--

DROP TABLE IF EXISTS `fuel_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fuel_records` (
  `id` varchar(50) NOT NULL,
  `vehicle_id` varchar(50) NOT NULL,
  `vehicle_reg_no` varchar(50) NOT NULL,
  `driver_id` varchar(50) DEFAULT NULL,
  `driver_name` varchar(100) DEFAULT NULL,
  `trip_id` varchar(50) DEFAULT NULL,
  `trip_number` varchar(50) DEFAULT NULL,
  `fuel_type` varchar(20) DEFAULT 'diesel',
  `quantity` decimal(10,2) NOT NULL,
  `price_per_unit` decimal(10,2) NOT NULL,
  `total_cost` decimal(12,2) NOT NULL,
  `odometer_reading` int NOT NULL,
  `fuel_station` varchar(150) DEFAULT NULL,
  `location` varchar(150) DEFAULT NULL,
  `receipt_number` varchar(100) DEFAULT NULL,
  `date` date NOT NULL,
  `notes` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_fuel_vehicle` (`vehicle_id`),
  KEY `idx_fuel_date` (`date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fuel_records`
--

LOCK TABLES `fuel_records` WRITE;
/*!40000 ALTER TABLE `fuel_records` DISABLE KEYS */;
INSERT INTO `fuel_records` VALUES ('fuel-1','v1','MH12AB1234','d1','Rajesh Kumar','trip-001','TRP-2026-0891','diesel',140.00,94.50,13230.00,125100,'HP Auto Care - Hinjawadi Phase 1','Pune Highway','RCPT-HP-9921','2026-10-08','Tank full prior to long distance pour','2026-11-05 11:45:28','2026-11-05 11:45:28'),('fuel-2','v2','MH14CD5678','d2','Suresh Patil',NULL,NULL,'diesel',160.00,94.50,15120.00,98000,'Indian Oil Highway Hub','Nigdi Pune','RCPT-IOC-4412','2026-10-07','Routine batch refueling','2026-11-05 11:45:28','2026-11-05 11:45:28');
/*!40000 ALTER TABLE `fuel_records` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `generated_reports`
--

DROP TABLE IF EXISTS `generated_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `generated_reports` (
  `id` varchar(50) NOT NULL,
  `name` varchar(200) NOT NULL,
  `type` varchar(50) NOT NULL,
  `format` varchar(20) NOT NULL,
  `parameters` json DEFAULT NULL,
  `generated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `generated_by` varchar(100) DEFAULT NULL,
  `file_url` text,
  `file_size` int DEFAULT NULL,
  `status` varchar(30) DEFAULT 'completed',
  `error_message` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `generated_reports`
--

LOCK TABLES `generated_reports` WRITE;
/*!40000 ALTER TABLE `generated_reports` DISABLE KEYS */;
/*!40000 ALTER TABLE `generated_reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `incidents`
--

DROP TABLE IF EXISTS `incidents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `incidents` (
  `id` varchar(50) NOT NULL,
  `incident_number` varchar(50) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text NOT NULL,
  `type` varchar(30) NOT NULL,
  `severity` varchar(30) NOT NULL,
  `status` varchar(30) DEFAULT 'reported',
  `location` varchar(100) DEFAULT NULL,
  `reported_by` varchar(100) DEFAULT NULL,
  `reported_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `assigned_to` varchar(100) DEFAULT NULL,
  `assigned_at` datetime DEFAULT NULL,
  `investigation_notes` text,
  `resolved_at` datetime DEFAULT NULL,
  `resolution` text,
  `vehicle_reg_no` varchar(50) DEFAULT NULL,
  `related_module` varchar(50) DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `evidence` json DEFAULT NULL,
  `comments` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `incident_number` (`incident_number`),
  KEY `idx_inc_status` (`status`),
  KEY `idx_inc_sev` (`severity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `incidents`
--

LOCK TABLES `incidents` WRITE;
/*!40000 ALTER TABLE `incidents` DISABLE KEYS */;
INSERT INTO `incidents` VALUES ('inc-001','INC-2026-0042','Weight discrepancy detected on Transit Mixer MH12AB1234','Exit weighbridge recorded 19,450 kg vs target batch load 17,800 kg. Variance of 1.65 tons exceeds safety threshold.','quality','high','investigating','Exit Gate Weighbridge 02','John Operator','2026-10-09 13:50:00','Production QC Lead','2026-10-09 14:05:00','Checking batch dispenser calibration logs for Silo 1',NULL,NULL,'MH12AB1234','exit','[\"weight_anomaly\", \"quality_check\"]','[]','[]','2026-11-05 11:45:28','2026-11-05 11:45:28');
/*!40000 ALTER TABLE `incidents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_items`
--

DROP TABLE IF EXISTS `inventory_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_items` (
  `id` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `sku` varchar(100) NOT NULL,
  `category` varchar(50) NOT NULL,
  `unit` varchar(30) NOT NULL,
  `current_stock` decimal(12,2) DEFAULT '0.00',
  `min_stock` decimal(12,2) DEFAULT '0.00',
  `max_stock` decimal(12,2) DEFAULT '1000.00',
  `reorder_level` decimal(12,2) DEFAULT '0.00',
  `reorder_quantity` decimal(12,2) DEFAULT '0.00',
  `unit_cost` decimal(12,2) DEFAULT '0.00',
  `total_value` decimal(14,2) DEFAULT '0.00',
  `location` varchar(100) DEFAULT NULL,
  `supplier` varchar(150) DEFAULT NULL,
  `supplier_contact` varchar(100) DEFAULT NULL,
  `last_received` date DEFAULT NULL,
  `last_consumed` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `is_low_stock` tinyint(1) DEFAULT '0',
  `is_overstock` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`),
  KEY `idx_inv_sku` (`sku`),
  KEY `idx_inv_cat` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_items`
--

LOCK TABLES `inventory_items` WRITE;
/*!40000 ALTER TABLE `inventory_items` DISABLE KEYS */;
INSERT INTO `inventory_items` VALUES ('inv-1','OPC 53 Grade Cement','CEM-53-ULTR','cement','tons',480.00,150.00,800.00,200.00,300.00,5800.00,2784000.00,'Silo A1 & A2','Ultratech Cement Ltd',NULL,NULL,NULL,NULL,0,0,'2026-11-05 11:45:28','2026-11-05 11:45:28'),('inv-2','Crushed M-Sand (Zone II)','SAND-MSAND-01','sand','tons',620.00,200.00,1200.00,250.00,400.00,1450.00,899000.00,'Bunker Bay 1','Sahyadri Aggregate Quarries',NULL,NULL,NULL,NULL,0,0,'2026-11-05 11:45:28','2026-11-05 11:45:28'),('inv-3','10mm Coarse Aggregate','AGG-10MM-BL','aggregate','tons',540.00,150.00,1000.00,200.00,350.00,1200.00,648000.00,'Bunker Bay 2','Sahyadri Aggregate Quarries',NULL,NULL,NULL,NULL,0,0,'2026-11-05 11:45:28','2026-11-05 11:45:28'),('inv-4','20mm Coarse Aggregate','AGG-20MM-BL','aggregate','tons',710.00,200.00,1200.00,250.00,400.00,1150.00,816500.00,'Bunker Bay 3','Sahyadri Aggregate Quarries',NULL,NULL,NULL,NULL,0,0,'2026-11-05 11:45:28','2026-11-05 11:45:28'),('inv-5','Polycarboxylate Ether (PCE) Superplasticizer','ADMIX-PCE-FLOW','admixture','liters',3500.00,1000.00,6000.00,1200.00,2000.00,120.00,420000.00,'Admixture Tank T-1','Fosroc Chemicals India',NULL,NULL,NULL,NULL,0,0,'2026-11-05 11:45:28','2026-11-05 11:45:28');
/*!40000 ALTER TABLE `inventory_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `id` varchar(50) NOT NULL,
  `invoice_number` varchar(50) NOT NULL,
  `customer_id` varchar(50) NOT NULL,
  `customer_name` varchar(150) NOT NULL,
  `customer_address` text,
  `customer_email` varchar(100) DEFAULT NULL,
  `customer_phone` varchar(50) DEFAULT NULL,
  `customer_gst` varchar(50) DEFAULT NULL,
  `trip_ids` json DEFAULT NULL,
  `items` json DEFAULT NULL,
  `subtotal` decimal(14,2) DEFAULT '0.00',
  `tax_amount` decimal(14,2) DEFAULT '0.00',
  `discount_amount` decimal(14,2) DEFAULT '0.00',
  `total_amount` decimal(14,2) DEFAULT '0.00',
  `paid_amount` decimal(14,2) DEFAULT '0.00',
  `balance_amount` decimal(14,2) DEFAULT '0.00',
  `status` varchar(30) DEFAULT 'draft',
  `issue_date` date NOT NULL,
  `due_date` date NOT NULL,
  `paid_date` date DEFAULT NULL,
  `notes` text,
  `terms` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `invoice_number` (`invoice_number`),
  KEY `idx_inv_status` (`status`),
  KEY `idx_inv_cust` (`customer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoices`
--

LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
INSERT INTO `invoices` VALUES ('inv-rec-1','INV-2026-1092','CUST-101','Aparna Cyber4 Commercial Ltd','Financial District, Nanakramguda, Hyderabad / Pune Branch','accounts@aparnacyber4.com','+91 99887 76655','27AAACA9928P1Z8','[\"trip-001\"]','[{\"id\": \"item-1\", \"unit\": \"m³\", \"amount\": 36375, \"taxRate\": 18, \"quantity\": 7.5, \"taxAmount\": 6547.5, \"unitPrice\": 4850, \"description\": \"M30 Grade Ready Mix Concrete with Superplasticizer\", \"totalAmount\": 42922.5}, {\"id\": \"item-2\", \"unit\": \"trip\", \"amount\": 3500, \"taxRate\": 18, \"quantity\": 1, \"taxAmount\": 630, \"unitPrice\": 3500, \"description\": \"Concrete Pump Transit Placement Charge\", \"totalAmount\": 4130}]',39875.00,7177.50,0.00,47052.50,0.00,47052.50,'sent','2026-10-09','2026-10-24',NULL,'Delivery against PO #AP-2026-4401','Payment due within 15 days of invoice date.','2026-11-05 11:45:28','2026-11-05 11:45:28');
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `loading_bays`
--

DROP TABLE IF EXISTS `loading_bays`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loading_bays` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `status` varchar(30) DEFAULT 'available',
  `current_session` json DEFAULT NULL,
  `capacity` int DEFAULT '50',
  `location` varchar(100) DEFAULT NULL,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `loading_bays`
--

LOCK TABLES `loading_bays` WRITE;
/*!40000 ALTER TABLE `loading_bays` DISABLE KEYS */;
INSERT INTO `loading_bays` VALUES ('bay-1','Bay 1 - High Volume M25/M30','available',NULL,60,'Plant North Bay','2026-11-05 11:45:28'),('bay-2','Bay 2 - Rapid Mix M35/M40','loading',NULL,60,'Plant Central Bay','2026-11-05 11:45:28'),('bay-3','Bay 3 - Special Concrete','available',NULL,45,'Plant South Bay','2026-11-05 11:45:28'),('bay-4','Bay 4 - Dry Lean Concrete (DLC)','maintenance',NULL,50,'Plant Auxiliary Bay','2026-11-05 11:45:28');
/*!40000 ALTER TABLE `loading_bays` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `loading_sessions`
--

DROP TABLE IF EXISTS `loading_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `loading_sessions` (
  `session_id` varchar(50) NOT NULL,
  `bay_id` varchar(50) NOT NULL,
  `vehicle_reg_no` varchar(50) NOT NULL,
  `mix_design_id` varchar(50) DEFAULT NULL,
  `start_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `end_time` datetime DEFAULT NULL,
  `materials` json DEFAULT NULL,
  `quality_checks` json DEFAULT NULL,
  `overall_progress` int DEFAULT '0',
  `status` varchar(30) DEFAULT 'in_progress',
  `operator_id` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`session_id`),
  KEY `idx_load_bay` (`bay_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `loading_sessions`
--

LOCK TABLES `loading_sessions` WRITE;
/*!40000 ALTER TABLE `loading_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `loading_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `maintenance_tasks`
--

DROP TABLE IF EXISTS `maintenance_tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `maintenance_tasks` (
  `id` varchar(50) NOT NULL,
  `vehicle_id` varchar(50) NOT NULL,
  `vehicle_reg_no` varchar(50) NOT NULL,
  `type` varchar(30) NOT NULL,
  `title` varchar(200) NOT NULL,
  `description` text,
  `status` varchar(30) DEFAULT 'scheduled',
  `priority` varchar(20) DEFAULT 'medium',
  `scheduled_date` datetime NOT NULL,
  `completed_date` datetime DEFAULT NULL,
  `estimated_cost` decimal(12,2) DEFAULT '0.00',
  `actual_cost` decimal(12,2) DEFAULT NULL,
  `technician` varchar(100) DEFAULT NULL,
  `parts` json DEFAULT NULL,
  `notes` text,
  `next_due_date` date DEFAULT NULL,
  `next_due_odometer` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_maint_status` (`status`),
  KEY `idx_maint_veh` (`vehicle_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `maintenance_tasks`
--

LOCK TABLES `maintenance_tasks` WRITE;
/*!40000 ALTER TABLE `maintenance_tasks` DISABLE KEYS */;
INSERT INTO `maintenance_tasks` VALUES ('mt-1','v3','MH43EF9012','corrective','Mixer Drum Hydraulic Motor Inspection','Hydraulic fluid pressure drop reported during rotation test','in_progress','high','2026-10-09 09:00:00',NULL,18500.00,NULL,'Ganesh Autotech Services','[{\"id\": \"p1\", \"name\": \"Hydraulic Seal Kit\", \"quantity\": 2, \"unitCost\": 3500, \"totalCost\": 7000, \"partNumber\": \"HYD-SEAL-42\"}]','Replacement seal kit ordered','2026-11-01',155000,'2026-11-05 11:45:28','2026-11-05 11:45:28');
/*!40000 ALTER TABLE `maintenance_tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parts_inventory`
--

DROP TABLE IF EXISTS `parts_inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parts_inventory` (
  `id` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `part_number` varchar(100) NOT NULL,
  `category` varchar(100) DEFAULT NULL,
  `quantity` int DEFAULT '0',
  `min_stock` int DEFAULT '0',
  `unit_cost` decimal(12,2) DEFAULT '0.00',
  `supplier` varchar(150) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `part_number` (`part_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parts_inventory`
--

LOCK TABLES `parts_inventory` WRITE;
/*!40000 ALTER TABLE `parts_inventory` DISABLE KEYS */;
/*!40000 ALTER TABLE `parts_inventory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` varchar(50) NOT NULL,
  `invoice_id` varchar(50) DEFAULT NULL,
  `invoice_number` varchar(50) DEFAULT NULL,
  `customer_id` varchar(50) NOT NULL,
  `customer_name` varchar(150) NOT NULL,
  `amount` decimal(14,2) NOT NULL,
  `method` varchar(30) NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `date` datetime DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(30) DEFAULT 'completed',
  `notes` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pay_inv` (`invoice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plants`
--

DROP TABLE IF EXISTS `plants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plants` (
  `id` varchar(64) NOT NULL,
  `code` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `location` varchar(255) NOT NULL,
  `city` varchar(64) DEFAULT 'Hyderabad',
  `capacity_per_hour` int DEFAULT '120',
  `contact_person` varchar(128) DEFAULT NULL,
  `contact_phone` varchar(32) DEFAULT NULL,
  `contact_email` varchar(128) DEFAULT NULL,
  `status` varchar(32) DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_plants_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plants`
--

LOCK TABLES `plants` WRITE;
/*!40000 ALTER TABLE `plants` DISABLE KEYS */;
INSERT INTO `plants` VALUES ('PL01','PLANT_001','Plant 01 • Shamshabad Central','Plot 42, Hardware Park, Shamshabad','Hyderabad',120,'K. V. Rao','+91 98490 12345','shamshabad.plant@aparna-rmc.com','active','2026-11-05 09:44:09','2026-11-05 09:44:09'),('PL02','PLANT_002','Plant 02 • Miyapur Metro','Sy. No. 108, IDA Bollaram Rd, Miyapur','Hyderabad',90,'S. N. Reddy','+91 98490 23456','miyapur.plant@aparna-rmc.com','active','2026-11-05 09:44:09','2026-11-05 09:44:09'),('PL03','PLANT_003','Plant 03 • Gachibowli Tech Zone','Nanakramguda Financial District','Hyderabad',150,'P. Srinivas','+91 98490 34567','gachibowli.plant@aparna-rmc.com','active','2026-11-05 09:44:09','2026-11-05 09:44:09'),('PL04','PLANT_004','Plant 04 • Medchal Industrial','Phase-II IDA, Medchal Highway','Hyderabad',60,'V. Raman','+91 98490 45678','medchal.plant@aparna-rmc.com','maintenance','2026-11-05 09:44:09','2026-11-05 09:44:09'),('PL91','PLANT_1000','Plant 1000','Ameerpet','Hyderabad',120,'surada Ganesh','9502506001','ganesh@gmail.com','active','2026-11-10 11:32:41','2026-11-10 11:32:41');
/*!40000 ALTER TABLE `plants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reorder_alerts`
--

DROP TABLE IF EXISTS `reorder_alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reorder_alerts` (
  `id` varchar(50) NOT NULL,
  `item_id` varchar(50) NOT NULL,
  `item_name` varchar(150) NOT NULL,
  `item_sku` varchar(100) NOT NULL,
  `current_stock` decimal(12,2) NOT NULL,
  `reorder_level` decimal(12,2) NOT NULL,
  `reorder_quantity` decimal(12,2) NOT NULL,
  `supplier` varchar(150) DEFAULT NULL,
  `priority` varchar(20) DEFAULT 'medium',
  `status` varchar(30) DEFAULT 'pending',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reorder_alerts`
--

LOCK TABLES `reorder_alerts` WRITE;
/*!40000 ALTER TABLE `reorder_alerts` DISABLE KEYS */;
/*!40000 ALTER TABLE `reorder_alerts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `description` text,
  `color` varchar(32) DEFAULT 'blue',
  `modules` json NOT NULL,
  `permissions` json NOT NULL,
  `is_system` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES ('accounts_manager','Commercial & Accounts Lead','Generates GST tax invoices, logs client bank payments, verifies customer statements, and tracks material inventory costs.','indigo','[\"/\", \"/billing\", \"/customer-portal\", \"/inventory\", \"/reports\"]','[\"billing:invoices\", \"billing:payments\", \"customers:view\", \"inventory:view\", \"reports:export\"]',1,'2026-11-05 06:15:28','2026-11-05 06:15:28'),('admin','Plant Head / Admin','Executive leadership with comprehensive plant-wide visibility, multi-camera CCTV wall, all operational modules, and configuration overrides.','purple','[\"/\", \"/gate-monitor\", \"/weighbridge\", \"/loading\", \"/dispatch\", \"/trips\", \"/trip-tracking\", \"/trip-analytics\", \"/exit-verification\", \"/incidents\", \"/audit-logs\", \"/vehicles\", \"/drivers\", \"/fuel\", \"/maintenance\", \"/billing\", \"/inventory\", \"/reports\", \"/customer-portal\", \"/device-config\", \"/database-setup\", \"/users\", \"/roles\"]','[\"all:manage\", \"users:manage\", \"roles:manage\", \"config:manage\", \"reports:export\", \"override:approve\"]',1,'2026-11-05 06:15:28','2026-11-05 06:15:28'),('batching_operator','Batching Plant Supervisor','Operates mixing bay consoles, controls raw material batch dispensing (cement, sand, aggregates, admixtures), and monitors silo levels.','amber','[\"/\", \"/loading\", \"/inventory\", \"/reports\"]','[\"loading:dispense\", \"loading:session\", \"inventory:view\", \"inventory:movements\", \"reports:read\"]',1,'2026-11-05 06:15:28','2026-11-05 06:15:28'),('dispatch_officer','Dispatch & Logistics Officer','Reviews transit mixer delivery dockets, manages driver assignments, tracks GPS telematics routes, and monitors delay slippage.','sky','[\"/\", \"/dispatch\", \"/trips\", \"/trip-tracking\", \"/trip-analytics\"]','[\"dispatch:approve\", \"trips:manage\", \"tracking:view\", \"analytics:view\"]',1,'2026-11-05 06:15:28','2026-11-05 06:15:28'),('fleet_manager','Fleet & Workshop Manager','Supervises transit mixer health, fitness certifications, driver licences, fuel consumption economy, and maintenance bay schedules.','rose','[\"/\", \"/vehicles\", \"/drivers\", \"/fuel\", \"/maintenance\", \"/incidents\", \"/reports\"]','[\"vehicles:manage\", \"drivers:manage\", \"fuel:manage\", \"maintenance:manage\", \"reports:read\"]',1,'2026-11-05 06:15:28','2026-11-05 06:15:28'),('gate_operator','Gate Monitor / Security Officer','Manages entry/exit ANPR barriers, physical delivery note scans, vehicle entry verification, and emergency barrier overrides.','emerald','[\"/\", \"/gate-monitor\", \"/exit-verification\", \"/incidents\", \"/vehicles\", \"/drivers\"]','[\"gate:read\", \"gate:override\", \"exit:verify\", \"incidents:create\", \"vehicles:view\", \"drivers:view\"]',1,'2026-11-05 06:15:28','2026-11-05 06:15:28'),('qc_inspector','Quality Control Lead','Performs slump retention tests, temperature readings, water-cement ratio verification, and approves dispatch dockets.','teal','[\"/\", \"/loading\", \"/dispatch\", \"/incidents\", \"/reports\"]','[\"qc:verify\", \"dispatch:approve\", \"dispatch:reject\", \"incidents:create\", \"incidents:resolve\", \"reports:read\"]',1,'2026-11-05 06:15:28','2026-11-05 06:15:28'),('weighbridge_operator','Weighbridge In-charge / Operator','Performs precision tare and gross weighment captures, calibration checks, scale zeroing, and tolerance breach flags.','blue','[\"/\", \"/weighbridge\", \"/gate-monitor\", \"/exit-verification\", \"/reports\"]','[\"weighbridge:capture\", \"weighbridge:tare\", \"weighbridge:gross\", \"exit:verify\", \"reports:read\"]',1,'2026-11-05 06:15:28','2026-11-05 06:15:28');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sap_billing_sync`
--

DROP TABLE IF EXISTS `sap_billing_sync`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sap_billing_sync` (
  `id` varchar(50) NOT NULL,
  `invoice_id` varchar(50) DEFAULT NULL,
  `invoice_number` varchar(50) DEFAULT NULL,
  `delivery_number` varchar(50) DEFAULT NULL,
  `sales_order` varchar(50) DEFAULT NULL,
  `customer_code` varchar(50) DEFAULT NULL,
  `customer_name` varchar(150) DEFAULT NULL,
  `concrete_grade` varchar(100) DEFAULT NULL,
  `batch_volume_m3` decimal(10,2) DEFAULT NULL,
  `net_weight_kg` decimal(12,2) DEFAULT NULL,
  `subtotal_amount` decimal(14,2) DEFAULT NULL,
  `tax_amount` decimal(14,2) DEFAULT NULL,
  `total_amount` decimal(14,2) DEFAULT NULL,
  `sap_billing_doc` varchar(50) DEFAULT NULL,
  `sap_accounting_doc` varchar(50) DEFAULT NULL,
  `billing_type` varchar(20) DEFAULT 'F2',
  `company_code` varchar(20) DEFAULT '1000',
  `sales_org` varchar(20) DEFAULT '1000',
  `dist_channel` varchar(20) DEFAULT '10',
  `division` varchar(20) DEFAULT '00',
  `payment_terms` varchar(50) DEFAULT 'NT30',
  `status` varchar(30) DEFAULT 'synced',
  `payload_json` json DEFAULT NULL,
  `response_json` json DEFAULT NULL,
  `synced_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_billing_inv` (`invoice_number`),
  KEY `idx_billing_del` (`delivery_number`),
  KEY `idx_billing_doc` (`sap_billing_doc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sap_billing_sync`
--

LOCK TABLES `sap_billing_sync` WRITE;
/*!40000 ALTER TABLE `sap_billing_sync` DISABLE KEYS */;
INSERT INTO `sap_billing_sync` VALUES ('SAP-BILL-901','inv_1001','INV-RMC-2026-8812','80012940','SO-3001882','CUST-APARNA-01','Aparna Constructions & Estates Ltd','M35 Design Mix (Pumpable)',7.00,16820.00,38500.00,6930.00,45430.00,'9000142890','1000849201','F2','1000','1000','10','00','NT30','synced','{\"bapi\": \"BAPI_BILLINGDOC_CREATEMULTIPLE\", \"delivery\": \"80012940\"}','{\"status\": \"SUCCESS\", \"sapBillingDoc\": \"9000142890\", \"sapAccountingDoc\": \"1000849201\"}','2026-11-05 11:45:29'),('SAP-BILL-902','inv_1002','INV-RMC-2026-8813','80012941','SO-3001885','CUST-LNT-02','Larsen & Toubro Construction','M40 High Strength (Self-Compacting)',6.00,14760.00,34800.00,6264.00,41064.00,'9000142891','1000849202','F2','1000','1000','10','00','NT45','synced','{\"bapi\": \"BAPI_BILLINGDOC_CREATEMULTIPLE\", \"delivery\": \"80012941\"}','{\"status\": \"SUCCESS\", \"sapBillingDoc\": \"9000142891\", \"sapAccountingDoc\": \"1000849202\"}','2026-11-05 11:45:29');
/*!40000 ALTER TABLE `sap_billing_sync` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sap_connection_config`
--

DROP TABLE IF EXISTS `sap_connection_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sap_connection_config` (
  `id` varchar(50) NOT NULL,
  `connection_type` varchar(50) NOT NULL DEFAULT 'odata_cloud_connector',
  `system_id` varchar(50) DEFAULT 'PRD_S4H',
  `system_name` varchar(100) DEFAULT 'SAP S/4HANA Enterprise 2023',
  `host` varchar(200) DEFAULT 'sap-s4h.aparna-rmc.internal',
  `port` int DEFAULT '44300',
  `client` varchar(10) DEFAULT '100',
  `sysnr` varchar(10) DEFAULT '00',
  `username` varchar(100) DEFAULT 'RMC_GATE_SVC',
  `password_masked` varchar(100) DEFAULT '••••••••••••',
  `btp_destination_url` varchar(300) DEFAULT 'https://connectivity.aparna-rmc.btp.eu10.hana.ondemand.com',
  `odata_base_url` varchar(300) DEFAULT 'https://sap-s4h.aparna-rmc.internal:44300/sap/opu/odata/sap',
  `use_cloud_connector` tinyint(1) DEFAULT '1',
  `cloud_connector_location_id` varchar(100) DEFAULT 'HYD_RMC_PLANT_01',
  `timeout_ms` int DEFAULT '12000',
  `is_active` tinyint(1) DEFAULT '1',
  `last_tested_at` datetime DEFAULT NULL,
  `last_test_status` varchar(50) DEFAULT 'connected',
  `last_test_latency_ms` int DEFAULT '18',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sap_connection_config`
--

LOCK TABLES `sap_connection_config` WRITE;
/*!40000 ALTER TABLE `sap_connection_config` DISABLE KEYS */;
INSERT INTO `sap_connection_config` VALUES ('SAP_CONFIG_DEFAULT','odata_cloud_connector','PRD_S4H','SAP S/4HANA Enterprise 2023','sap-s4h.aparna-rmc.internal',44300,'100','00','RMC_GATE_SVC','••••••••••••','https://connectivity.aparna-rmc.btp.eu10.hana.ondemand.com','https://sap-s4h.aparna-rmc.internal:44300/sap/opu/odata/sap',1,'HYD_RMC_PLANT_01',12000,1,'2026-11-05 11:45:29','connected',18,'2026-11-05 11:45:29','2026-11-05 11:45:29');
/*!40000 ALTER TABLE `sap_connection_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sap_exit_sync`
--

DROP TABLE IF EXISTS `sap_exit_sync`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sap_exit_sync` (
  `id` varchar(50) NOT NULL,
  `gate_pass_number` varchar(50) NOT NULL,
  `delivery_number` varchar(50) DEFAULT NULL,
  `sales_order` varchar(50) DEFAULT NULL,
  `sync_type` varchar(30) NOT NULL,
  `customer_name` varchar(150) DEFAULT NULL,
  `destination_site` varchar(255) DEFAULT NULL,
  `concrete_grade` varchar(100) DEFAULT NULL,
  `vehicle_no` varchar(50) NOT NULL,
  `driver_name` varchar(100) DEFAULT NULL,
  `seal_number` varchar(50) DEFAULT NULL,
  `tare_weight` decimal(12,2) NOT NULL,
  `gross_weight` decimal(12,2) NOT NULL,
  `net_weight` decimal(12,2) NOT NULL,
  `batch_volume_m3` decimal(10,2) DEFAULT NULL,
  `tolerance_variance_kg` decimal(12,2) DEFAULT NULL,
  `tolerance_variance_pct` decimal(5,2) DEFAULT NULL,
  `qc_slump_mm` varchar(50) DEFAULT NULL,
  `sap_pgi_doc_number` varchar(50) NOT NULL,
  `movement_type` varchar(20) DEFAULT '601',
  `plant_code` varchar(50) DEFAULT 'PL01',
  `barrier_status` varchar(30) DEFAULT 'OPEN',
  `status` varchar(30) DEFAULT 'synced',
  `notes` text,
  `payload_json` json DEFAULT NULL,
  `response_json` json DEFAULT NULL,
  `synced_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_exit_sync_obd` (`delivery_number`),
  KEY `idx_exit_sync_gp` (`gate_pass_number`),
  KEY `idx_exit_sync_veh` (`vehicle_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sap_exit_sync`
--

LOCK TABLES `sap_exit_sync` WRITE;
/*!40000 ALTER TABLE `sap_exit_sync` DISABLE KEYS */;
INSERT INTO `sap_exit_sync` VALUES ('EXSYNC-9001','OGP-2026-00388','80012938','SO-3001876','delivery_ref','Aparna Constructions & Estates Ltd','Aparna Cyber4, Gachibowli','M40 Self Compacting Concrete','TS07UA8822','G. Mohan Rao','SL-88480',13350.00,30180.00,16830.00,7.00,30.00,0.18,'140 mm','4900188921','601','PL01','OPEN','synced','SAP PGI posted successfully. Barrier Gate Out cleared.','{\"netKg\": 16830, \"bapiName\": \"BAPI_OUTB_DELIVERY_CONFIRM_DEC\", \"delivery\": \"80012938\", \"moveType\": \"601\", \"quantity\": 7}','{\"status\": \"SUCCESS\", \"message\": \"Post Goods Issue 4900188921 completed in S/4HANA\", \"sapDocNo\": \"4900188921\", \"pgiStatus\": \"POSTED\"}','2026-11-05 11:45:29');
/*!40000 ALTER TABLE `sap_exit_sync` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sap_outbound_deliveries`
--

DROP TABLE IF EXISTS `sap_outbound_deliveries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sap_outbound_deliveries` (
  `delivery_number` varchar(50) NOT NULL,
  `sales_order` varchar(50) NOT NULL,
  `customer_code` varchar(50) NOT NULL,
  `customer_name` varchar(150) NOT NULL,
  `destination_site` varchar(255) NOT NULL,
  `concrete_grade` varchar(100) NOT NULL,
  `ordered_volume_m3` decimal(10,2) NOT NULL,
  `batch_volume_m3` decimal(10,2) NOT NULL,
  `expected_net_weight_kg` decimal(12,2) NOT NULL,
  `tolerance_percentage` decimal(5,2) DEFAULT '1.50',
  `vehicle_no` varchar(50) NOT NULL,
  `driver_name` varchar(100) NOT NULL,
  `driver_phone` varchar(50) DEFAULT NULL,
  `mixer_tare_kg` decimal(12,2) NOT NULL,
  `slump_mm` varchar(50) DEFAULT '120 ± 25 mm',
  `water_cement_ratio` varchar(30) DEFAULT '0.42',
  `batch_plant_bay` varchar(100) DEFAULT 'BAY-01 (Liebherr 2.25m³)',
  `qc_status` varchar(30) DEFAULT 'approved',
  `seal_number` varchar(50) DEFAULT NULL,
  `eway_bill_no` varchar(50) DEFAULT NULL,
  `tax_invoice_no` varchar(50) DEFAULT NULL,
  `status` varchar(30) DEFAULT 'ready_for_exit',
  `pgi_status` varchar(30) DEFAULT 'pending',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`delivery_number`),
  KEY `idx_sap_obd_veh` (`vehicle_no`),
  KEY `idx_sap_obd_status` (`status`),
  KEY `idx_sap_obd_so` (`sales_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sap_outbound_deliveries`
--

LOCK TABLES `sap_outbound_deliveries` WRITE;
/*!40000 ALTER TABLE `sap_outbound_deliveries` DISABLE KEYS */;
INSERT INTO `sap_outbound_deliveries` VALUES ('80012940','SO-3001882','CUST-APARNA-01','Aparna Constructions & Estates Ltd','Aparna Sarovar Zenith - Tower 4 Slab Pour, Nallagandla','M35 Design Mix (Pumpable - Slump 120±25mm)',7.00,7.00,16800.00,1.50,'TS07UA9944','K. Narayana','+91 98490 12345',13420.00,'125 mm','0.42','BAY-01 (Liebherr 2.25m³)','approved','SL-88491','EB-241098124801','INV-RMC-2026-9042','ready_for_exit','pending','2026-11-05 11:45:29','2026-11-05 11:45:29'),('80012941','SO-3001885','CUST-MYHOME-02','My Home Constructions Pvt Ltd','My Home Sayuk - Wing B Raft Foundation, Tellapur','M40 High-Strength Self-Compacting (SCC)',8.00,8.00,19200.00,1.50,'TS08UB1122','S. Venkat Reddy','+91 98490 67890',13850.00,'150 mm','0.38','BAY-02 (Schwing Stetter 3.0m³)','approved','SL-88492','EB-241098124802','INV-RMC-2026-9043','ready_for_exit','pending','2026-11-05 11:45:29','2026-11-05 11:45:29'),('80012942','SO-3001890','CUST-LNT-03','Larsen & Toubro Ltd (Metro Division)','Hyderabad Metro Rail Pier Cap Section 12, Ameerpet','M45 Pre-stressed Concrete Design Mix',6.00,6.00,14400.00,1.50,'TS07UA5511','R. Anjaiah','+91 98490 54321',13100.00,'110 mm','0.36','BAY-01 (Liebherr 2.25m³)','approved','SL-88495','EB-241098124805','INV-RMC-2026-9047','ready_for_exit','pending','2026-11-05 11:45:29','2026-11-05 11:45:29'),('80012943','SO-3001899','CUST-PRESTIGE-04','Prestige Estates Projects Ltd','Prestige Beverly Hills - Podium Slab, Kokapet','M30 Design Mix (Standard)',7.50,7.50,18000.00,1.50,'TS09UC7788','B. Srinivas','+91 98490 98765',13600.00,'120 mm','0.44','BAY-02 (Schwing Stetter 3.0m³)','approved','SL-88499','EB-241098124809','INV-RMC-2026-9051','ready_for_exit','pending','2026-11-05 11:45:29','2026-11-05 11:45:29');
/*!40000 ALTER TABLE `sap_outbound_deliveries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sap_purchase_orders`
--

DROP TABLE IF EXISTS `sap_purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sap_purchase_orders` (
  `po_number` varchar(50) NOT NULL,
  `vendor_code` varchar(50) NOT NULL,
  `vendor_name` varchar(150) NOT NULL,
  `material_code` varchar(50) NOT NULL,
  `material_name` varchar(150) NOT NULL,
  `category` varchar(50) NOT NULL,
  `ordered_qty` decimal(12,2) NOT NULL,
  `received_qty` decimal(12,2) DEFAULT '0.00',
  `pending_qty` decimal(12,2) NOT NULL,
  `unit` varchar(20) DEFAULT 'ton',
  `plant_code` varchar(50) DEFAULT 'PL01',
  `storage_location` varchar(100) DEFAULT 'SILO-01',
  `default_vehicle` varchar(50) DEFAULT NULL,
  `default_driver` varchar(100) DEFAULT NULL,
  `status` varchar(30) DEFAULT 'open',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`po_number`),
  KEY `idx_sap_po_vendor` (`vendor_code`),
  KEY `idx_sap_po_mat` (`material_code`),
  KEY `idx_sap_po_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sap_purchase_orders`
--

LOCK TABLES `sap_purchase_orders` WRITE;
/*!40000 ALTER TABLE `sap_purchase_orders` DISABLE KEYS */;
INSERT INTO `sap_purchase_orders` VALUES ('4500128490','VEND-10023','UltraTech Cement Limited','MAT-CEM-OPC53','Ordinary Portland Cement (OPC 53 Grade)','Cement',120.00,42.50,77.50,'ton','PL01','SILO-01 (Cement Main)','TS07UA1289','Ramesh Naidu','open','2026-11-05 11:45:28','2026-11-05 11:45:28'),('4500128491','VEND-10045','Deccan Cements Ltd','MAT-CEM-PPC','Portland Pozzolana Cement (PPC)','Cement',100.00,25.00,75.00,'ton','PL01','SILO-02 (PPC Backup)','AP28TD4521','K. Venkatesh','open','2026-11-05 11:45:29','2026-11-05 11:45:29'),('4500128492','VEND-20012','GMR Mining & Infrastructure','MAT-AGG-20MM','20mm Blue Metal Granite Aggregate','Aggregates',250.00,95.00,155.00,'ton','PL01','BIN-AGG-A (20mm Yard)','TS08UB9920','Mohd. Imran','open','2026-11-05 11:45:29','2026-11-05 11:45:29'),('4500128493','VEND-20038','Sri Rama Stone Crushers','MAT-AGG-10MM','10mm Graded Granite Aggregate','Aggregates',200.00,60.00,140.00,'ton','PL01','BIN-AGG-B (10mm Yard)','TS07UC3341','P. Shiva Kumar','open','2026-11-05 11:45:29','2026-11-05 11:45:29'),('4500128494','VEND-30018','Megha Sand Quarries Pvt Ltd','MAT-SND-MSAND','Manufactured Sand (M-Sand / Robo Sand)','Sand',300.00,110.00,190.00,'ton','PL01','BIN-SND-01 (M-Sand Bunker)','AP29TC7784','B. Jagadish','open','2026-11-05 11:45:29','2026-11-05 11:45:29'),('4500128495','VEND-40005','NTPC Limited (Ramagundam STPS)','MAT-FLY-ASH-P60','Dry Electrostatic Fly Ash (Grade I - IS 3812)','Fly Ash',150.00,30.00,120.00,'ton','PL01','SILO-03 (Fly Ash Silo)','TS09UB6652','N. Ravinder','open','2026-11-05 11:45:29','2026-11-05 11:45:29'),('4500128496','VEND-50022','Sika India Private Limited','MAT-ADM-VISCO','Sika ViscoCrete-20 HE Superplasticizer','Chemical Admixture',15.00,5.00,10.00,'ton','PL01','TANK-CHEM-01 (Admixture Tank)','MH12TC9012','Santosh Shinde','open','2026-11-05 11:45:29','2026-11-05 11:45:29');
/*!40000 ALTER TABLE `sap_purchase_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sap_sync_queue`
--

DROP TABLE IF EXISTS `sap_sync_queue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sap_sync_queue` (
  `id` varchar(50) NOT NULL,
  `sync_category` varchar(50) NOT NULL,
  `reference_id` varchar(100) DEFAULT NULL,
  `target_endpoint` varchar(200) DEFAULT NULL,
  `status` varchar(30) DEFAULT 'queued',
  `retry_count` int DEFAULT '0',
  `max_retries` int DEFAULT '5',
  `last_attempt_at` datetime DEFAULT NULL,
  `next_retry_at` datetime DEFAULT NULL,
  `error_message` text,
  `payload_json` json DEFAULT NULL,
  `response_json` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_queue_status` (`status`),
  KEY `idx_queue_cat` (`sync_category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sap_sync_queue`
--

LOCK TABLES `sap_sync_queue` WRITE;
/*!40000 ALTER TABLE `sap_sync_queue` DISABLE KEYS */;
/*!40000 ALTER TABLE `sap_sync_queue` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sap_weighbridge_sync`
--

DROP TABLE IF EXISTS `sap_weighbridge_sync`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sap_weighbridge_sync` (
  `id` varchar(50) NOT NULL,
  `session_id` varchar(50) DEFAULT NULL,
  `slip_number` varchar(50) DEFAULT NULL,
  `sync_type` varchar(30) NOT NULL,
  `po_number` varchar(50) DEFAULT NULL,
  `vendor_name` varchar(150) DEFAULT NULL,
  `material_name` varchar(150) DEFAULT NULL,
  `vehicle_no` varchar(50) DEFAULT NULL,
  `driver_name` varchar(100) DEFAULT NULL,
  `tare_weight` decimal(12,2) DEFAULT NULL,
  `gross_weight` decimal(12,2) DEFAULT NULL,
  `net_weight` decimal(12,2) DEFAULT NULL,
  `sap_doc_number` varchar(50) DEFAULT NULL,
  `movement_type` varchar(20) DEFAULT '101',
  `plant_code` varchar(50) DEFAULT 'PL01',
  `storage_location` varchar(100) DEFAULT NULL,
  `direction` varchar(30) DEFAULT 'bidirectional',
  `status` varchar(30) DEFAULT 'synced',
  `notes` text,
  `payload_json` json DEFAULT NULL,
  `response_json` json DEFAULT NULL,
  `synced_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sync_po` (`po_number`),
  KEY `idx_sync_sess` (`session_id`),
  KEY `idx_sync_doc` (`sap_doc_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sap_weighbridge_sync`
--

LOCK TABLES `sap_weighbridge_sync` WRITE;
/*!40000 ALTER TABLE `sap_weighbridge_sync` DISABLE KEYS */;
INSERT INTO `sap_weighbridge_sync` VALUES ('SYNC-8001','WB-1728489100','WS-849100','po_ref','4500128490','UltraTech Cement Limited','Ordinary Portland Cement (OPC 53 Grade)','TS07UA1289','Ramesh Naidu',14.10,42.60,28.50,'MIGO-5000192841','101','PL01','SILO-01 (Cement Main)','bidirectional','synced','SAP Inbound GRN posted automatically upon Gross weighment approval.','{\"item\": {\"uom\": \"TO\", \"plant\": \"PL01\", \"poItem\": \"00010\", \"storLoc\": \"SILO-01\", \"moveType\": \"101\", \"poNumber\": \"4500128490\", \"quantity\": 28.5}, \"header\": {\"docDate\": \"2026-10-09\", \"refDocNo\": \"WS-849100\", \"pstngDate\": \"2026-10-09\"}, \"bapiName\": \"BAPI_GOODSMVT_CREATE\"}','{\"status\": \"SUCCESS\", \"message\": \"Document 5000192841 posted to SAP S/4HANA successfully\", \"matDocNo\": \"5000192841\", \"fiscalYear\": \"2026\"}','2026-11-05 11:45:29'),('SYNC-8002','WB-1728490200','WS-849200','without_po',NULL,'Sri Krishna Stone Works (Spot Quarry)','20mm Blue Metal Granite Aggregate','TS08UB4412','M. Prabhakar',12.80,38.30,25.50,'MIGO-5000192842','501','PL01','BIN-AGG-A','bidirectional','synced','Direct Non-PO GR posted to SAP Cost Center CC-RMC-PL01 (Movement 501)','{\"item\": {\"plant\": \"PL01\", \"storLoc\": \"BIN-AGG-A\", \"material\": \"MAT-AGG-20MM\", \"moveType\": \"501\", \"quantity\": 25.5, \"costCenter\": \"CC-RMC-PL01\"}, \"header\": {\"docDate\": \"2026-10-09\", \"refDocNo\": \"DC-8891\", \"pstngDate\": \"2026-10-09\"}, \"bapiName\": \"BAPI_GOODSMVT_CREATE\"}','{\"status\": \"SUCCESS\", \"message\": \"Direct receipt document 5000192842 created in SAP\", \"matDocNo\": \"5000192842\", \"fiscalYear\": \"2026\"}','2026-11-05 11:45:29');
/*!40000 ALTER TABLE `sap_weighbridge_sync` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock_movements`
--

DROP TABLE IF EXISTS `stock_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_movements` (
  `id` varchar(50) NOT NULL,
  `item_id` varchar(50) NOT NULL,
  `item_name` varchar(150) NOT NULL,
  `item_sku` varchar(100) NOT NULL,
  `type` varchar(30) NOT NULL,
  `quantity` decimal(12,2) NOT NULL,
  `previous_stock` decimal(12,2) NOT NULL,
  `new_stock` decimal(12,2) NOT NULL,
  `unit_cost` decimal(12,2) DEFAULT '0.00',
  `total_cost` decimal(14,2) DEFAULT '0.00',
  `reference_number` varchar(100) DEFAULT NULL,
  `trip_id` varchar(50) DEFAULT NULL,
  `supplier_id` varchar(50) DEFAULT NULL,
  `notes` text,
  `performed_by` varchar(100) DEFAULT NULL,
  `date` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mov_item` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock_movements`
--

LOCK TABLES `stock_movements` WRITE;
/*!40000 ALTER TABLE `stock_movements` DISABLE KEYS */;
/*!40000 ALTER TABLE `stock_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trip_events`
--

DROP TABLE IF EXISTS `trip_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trip_events` (
  `id` varchar(50) NOT NULL,
  `trip_id` varchar(50) NOT NULL,
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  `event_type` varchar(50) DEFAULT NULL,
  `description` text,
  `location` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_t_events` (`trip_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trip_events`
--

LOCK TABLES `trip_events` WRITE;
/*!40000 ALTER TABLE `trip_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `trip_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trips`
--

DROP TABLE IF EXISTS `trips`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trips` (
  `id` varchar(50) NOT NULL,
  `trip_number` varchar(50) NOT NULL,
  `vehicle_id` varchar(50) DEFAULT NULL,
  `vehicle_reg_no` varchar(50) NOT NULL,
  `driver_id` varchar(50) DEFAULT NULL,
  `driver_name` varchar(100) DEFAULT NULL,
  `driver_phone` varchar(50) DEFAULT NULL,
  `customer_id` varchar(50) DEFAULT NULL,
  `customer_name` varchar(150) DEFAULT NULL,
  `customer_contact` varchar(100) DEFAULT NULL,
  `material` varchar(100) DEFAULT NULL,
  `quantity` decimal(10,2) DEFAULT NULL,
  `unit` varchar(20) DEFAULT 'm³',
  `origin` json DEFAULT NULL,
  `destination` json DEFAULT NULL,
  `waypoints` json DEFAULT NULL,
  `scheduled_start_time` datetime DEFAULT NULL,
  `actual_start_time` datetime DEFAULT NULL,
  `estimated_arrival` datetime DEFAULT NULL,
  `actual_arrival` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `status` varchar(30) DEFAULT 'scheduled',
  `total_distance` decimal(10,2) DEFAULT '0.00',
  `distance_covered` decimal(10,2) DEFAULT '0.00',
  `distance_remaining` decimal(10,2) DEFAULT '0.00',
  `current_location` json DEFAULT NULL,
  `gps_config` json DEFAULT NULL,
  `notes` text,
  `priority` varchar(20) DEFAULT 'normal',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `trip_number` (`trip_number`),
  KEY `idx_trip_status` (`status`),
  KEY `idx_trip_reg` (`vehicle_reg_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trips`
--

LOCK TABLES `trips` WRITE;
/*!40000 ALTER TABLE `trips` DISABLE KEYS */;
INSERT INTO `trips` VALUES ('trip-001','TRP-2026-0891','v2','MH14CD5678','d2','Suresh Patil','+91 87654 32109','CUST-101','Aparna Cyber4 Commercial','+91 99887 76655','M30 Grade RMC',7.50,'m³','{\"name\": \"Aparna RMC Plant #1\", \"address\": \"Plot 18, MIDC Hinjawadi, Pune\", \"location\": {\"latitude\": 18.5912, \"longitude\": 73.7389}}','{\"name\": \"Aparna Cyber4 Tower B\", \"address\": \"Survey 42, Gachibowli / Financial Dist\", \"location\": {\"latitude\": 18.615, \"longitude\": 73.789}}','[]','2026-10-09 14:00:00','2026-10-09 14:15:00','2026-10-09 15:30:00',NULL,NULL,'in_transit',24.50,16.20,8.30,'{\"speed\": 38, \"latitude\": 18.6045, \"longitude\": 73.7621, \"timestamp\": \"2026-11-05T06:15:28.427Z\"}','{\"isEnabled\": true, \"signalStrength\": \"strong\", \"trackingInterval\": 15}','Pumping grade mix with retarder dosage','high','2026-11-05 11:45:28','2026-11-05 11:45:28'),('trip-002','TRP-2026-0892','v1','MH12AB1234','d1','Rajesh Kumar','+91 98765 43210','CUST-102','L&T Metro Project Pier 24','+91 98220 11223','M40 High Early Strength',8.00,'m³','{\"name\": \"Aparna RMC Plant #1\", \"address\": \"Plot 18, MIDC Hinjawadi, Pune\", \"location\": {\"latitude\": 18.5912, \"longitude\": 73.7389}}','{\"name\": \"Metro Corridor Pier 24\", \"address\": \"Shivaji Nagar Flyover Site\", \"location\": {\"latitude\": 18.5308, \"longitude\": 73.8474}}','[]','2026-10-09 16:30:00',NULL,'2026-10-09 17:45:00',NULL,NULL,'scheduled',18.00,0.00,18.00,'{\"speed\": 0, \"latitude\": 18.5912, \"longitude\": 73.7389, \"timestamp\": \"2026-11-05T06:15:28.429Z\"}','{\"isEnabled\": true, \"signalStrength\": \"strong\", \"trackingInterval\": 15}','Urgent pour for slab casting','urgent','2026-11-05 11:45:28','2026-11-05 11:45:28');
/*!40000 ALTER TABLE `trips` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` varchar(64) NOT NULL,
  `username` varchar(64) NOT NULL,
  `name` varchar(128) NOT NULL,
  `email` varchar(128) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role_id` varchar(64) NOT NULL,
  `role_name` varchar(128) NOT NULL,
  `phone` varchar(32) DEFAULT NULL,
  `department` varchar(64) DEFAULT NULL,
  `shift` varchar(64) DEFAULT NULL,
  `status` varchar(32) DEFAULT 'active',
  `avatar` varchar(255) DEFAULT NULL,
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `plant_id` varchar(64) DEFAULT 'PL01',
  `plant_name` varchar(128) DEFAULT 'Plant 01 • Shamshabad Central',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_users_role` (`role_id`),
  KEY `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('USR-001','admin','Rajesh Sharma','admin@aparnarmc.com','admin123','admin','Plant Manager / Admin','+91 98200 10001','Plant Operations Management','General Shift (08:00 - 18:00)','active','https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150','2026-11-10 13:13:41','2026-11-05 06:15:28','2026-11-10 13:13:41','PL01','Plant 01 • Shamshabad Central'),('USR-002','gate.security','Mahesh Patil','security@aparnarmc.com','gate123','gate_operator','Gate Security Supervisor','+91 98200 20002','Security & Gate Control','Morning Shift (06:00 - 14:00)','active','https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',NULL,'2026-11-05 06:15:28','2026-11-05 06:15:28','PL01','Plant 01 • Shamshabad Central'),('USR-003','weighbridge.op','Ramesh Kulkarni','weighbridge@aparnarmc.com','scale123','weighbridge_operator','Weighbridge Scale Operator','+91 98200 30003','Weighbridge Operations','Morning Shift (06:00 - 14:00)','active','https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150','2026-11-05 09:46:13','2026-11-05 06:15:28','2026-11-05 09:46:13','PL01','Plant 01 • Shamshabad Central'),('USR-003B','weigh_op','Ramesh Kulkarni','weigh_op@aparna-rmc.com','weigh123','weighbridge_operator','Weighbridge Scale Operator','+91 98490 23456','Weighbridge Terminal','General','active',NULL,NULL,'2026-11-10 11:57:58','2026-11-10 11:57:58','PL01','Plant 01 • Shamshabad Central'),('USR-004','batching.supv','Anil Desai','batching@aparnarmc.com','batch123','batching_operator','Batching Plant Supervisor','+91 98200 40004','Concrete Batching & Loading','Day Shift (08:00 - 17:00)','active','https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',NULL,'2026-11-05 06:15:28','2026-11-05 06:15:28','PL01','Plant 01 • Shamshabad Central'),('USR-005','qc.inspector','Vikram Joshi','qc@aparnarmc.com','qc123','qc_inspector','Quality Control Lead','+91 98200 50005','Quality Assurance & Lab','General Shift (08:00 - 17:00)','active','https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',NULL,'2026-11-05 06:15:28','2026-11-05 06:15:28','PL01','Plant 01 • Shamshabad Central'),('USR-006','dispatch.lead','Amitabh Verma','dispatch@aparnarmc.com','dispatch123','dispatch_officer','Dispatch & Logistics Officer','+91 98200 60006','Logistics & Dispatch Control','General Shift (08:00 - 18:00)','active','https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',NULL,'2026-11-05 06:15:28','2026-11-05 06:15:28','PL01','Plant 01 • Shamshabad Central'),('USR-007','fleet.mgr','Sunil Shinde','fleet@aparnarmc.com','fleet123','fleet_manager','Fleet & Workshop Manager','+91 98200 70007','Fleet & Mechanical Workshop','Day Shift (08:30 - 18:00)','active','https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',NULL,'2026-11-05 06:15:28','2026-11-05 06:15:28','PL01','Plant 01 • Shamshabad Central'),('USR-008','billing.acc','Pooja Hegde','billing@aparnarmc.com','billing123','accounts_manager','Commercial & Accounts Lead','+91 98200 80008','Finance & Commercial Billing','General Shift (09:00 - 18:00)','active','https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',NULL,'2026-11-05 06:15:28','2026-11-05 06:15:28','PL01','Plant 01 • Shamshabad Central'),('USR-778','ganesh','Surada Ganesh','ganesh@gmail.com','pbkdf2$100000$76d8328921dfe3d0d7103a9cc646bc74$7a11b7017c808a02ac22fc86edd01fa1b67d66ed1935385d3c5487f45676b74eda747257551ad84f65a192db0c6a780700286dedaace526754ba161a72430758','weighbridge_operator','Weighbridge In-charge / Operator','9000142951','Quality & Weighment','General (09:00 - 18:00)','active','https://images.unsplash.com/photo-1500000044416?w=150','2026-11-10 13:19:30','2026-11-10 11:33:27','2026-11-10 13:19:30','PL91','Plant 1000'),('USR-PL02-01','op_miyapur','Suresh Kumar (Miyapur)','miyapur.op@aparna-rmc.com','plant123','weighbridge_operator','Weighbridge Scale Operator','+91 98490 99881','Weighbridge Terminal','Morning','active',NULL,'2026-11-10 12:06:00','2026-11-10 11:58:50','2026-11-10 12:06:00','PL02','Plant 02 • Miyapur Metro');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vehicle_documents`
--

DROP TABLE IF EXISTS `vehicle_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle_documents` (
  `id` varchar(50) NOT NULL,
  `vehicle_id` varchar(50) NOT NULL,
  `type` varchar(50) DEFAULT NULL,
  `document_no` varchar(100) DEFAULT NULL,
  `issued_at` date DEFAULT NULL,
  `expires_at` date DEFAULT NULL,
  `document_url` text,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_v_docs` (`vehicle_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicle_documents`
--

LOCK TABLES `vehicle_documents` WRITE;
/*!40000 ALTER TABLE `vehicle_documents` DISABLE KEYS */;
/*!40000 ALTER TABLE `vehicle_documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vehicle_maintenance`
--

DROP TABLE IF EXISTS `vehicle_maintenance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicle_maintenance` (
  `id` varchar(50) NOT NULL,
  `vehicle_id` varchar(50) NOT NULL,
  `type` varchar(30) DEFAULT NULL,
  `description` text,
  `cost` decimal(12,2) DEFAULT NULL,
  `odometer_reading` int DEFAULT NULL,
  `performed_at` datetime DEFAULT NULL,
  `performed_by` varchar(100) DEFAULT NULL,
  `next_due_at` datetime DEFAULT NULL,
  `next_due_odometer` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_v_maint` (`vehicle_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicle_maintenance`
--

LOCK TABLES `vehicle_maintenance` WRITE;
/*!40000 ALTER TABLE `vehicle_maintenance` DISABLE KEYS */;
/*!40000 ALTER TABLE `vehicle_maintenance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vehicles`
--

DROP TABLE IF EXISTS `vehicles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehicles` (
  `id` varchar(50) NOT NULL,
  `registration_no` varchar(50) NOT NULL,
  `type` varchar(30) NOT NULL,
  `make` varchar(100) DEFAULT NULL,
  `model` varchar(100) DEFAULT NULL,
  `year` int DEFAULT NULL,
  `capacity` decimal(10,2) DEFAULT NULL,
  `capacity_unit` varchar(20) DEFAULT 'ton',
  `fuel_type` varchar(20) DEFAULT 'diesel',
  `status` varchar(30) DEFAULT 'available',
  `current_driver` varchar(100) DEFAULT NULL,
  `current_driver_phone` varchar(50) DEFAULT NULL,
  `last_maintenance` date DEFAULT NULL,
  `next_maintenance` date DEFAULT NULL,
  `insurance_expiry` date DEFAULT NULL,
  `fitness_expiry` date DEFAULT NULL,
  `permit_expiry` date DEFAULT NULL,
  `odometer` decimal(12,2) DEFAULT '0.00',
  `fuel_efficiency` decimal(6,2) DEFAULT '0.00',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `registration_no` (`registration_no`),
  KEY `idx_reg` (`registration_no`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehicles`
--

LOCK TABLES `vehicles` WRITE;
/*!40000 ALTER TABLE `vehicles` DISABLE KEYS */;
INSERT INTO `vehicles` VALUES ('v1','MH12AB1234','truck','Tata','Prima 4928.S',2023,28.00,'ton','diesel','available','Rajesh Kumar','+91 98765 43210','2026-03-20','2026-06-20','2026-10-15','2026-07-15','2026-12-15',125230.00,4.20,'2026-11-05 11:45:28','2026-11-05 11:45:28'),('v2','MH14CD5678','tanker','Ashok Leyland','Captain 2523',2022,20000.00,'liters','diesel','in_transit','Suresh Patil','+91 87654 32109','2026-03-25','2026-06-25','2026-08-10','2026-05-05','2026-09-15',98120.00,3.80,'2026-11-05 11:45:28','2026-11-05 11:45:28'),('v3','MH43EF9012','trailer','Mahindra','Blazo X 46',2023,40.00,'ton','diesel','maintenance','Vikram Singh','+91 76543 21098','2026-04-01','2026-04-20','2026-11-20','2026-08-20','2027-01-20',145600.00,3.50,'2026-11-05 11:45:28','2026-11-05 11:45:28'),('v4','KA01JK3456','truck','BharatBenz','2823R',2024,28.00,'ton','diesel','available','Amit Sharma','+91 65432 10987','2026-03-10','2026-06-10','2027-03-10','2027-03-10','2027-03-10',42300.00,4.50,'2026-11-05 11:45:28','2026-11-05 11:45:28');
/*!40000 ALTER TABLE `vehicles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `weigh_slips`
--

DROP TABLE IF EXISTS `weigh_slips`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `weigh_slips` (
  `slip_number` varchar(50) NOT NULL,
  `session_id` varchar(50) NOT NULL,
  `vehicle_reg_no` varchar(50) NOT NULL,
  `date_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `tare_weight` decimal(10,2) DEFAULT NULL,
  `gross_weight` decimal(10,2) DEFAULT NULL,
  `net_weight` decimal(10,2) DEFAULT NULL,
  `material` varchar(100) DEFAULT NULL,
  `driver_name` varchar(100) DEFAULT NULL,
  `destination` text,
  `operator_name` varchar(100) DEFAULT NULL,
  `evidence` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`slip_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `weigh_slips`
--

LOCK TABLES `weigh_slips` WRITE;
/*!40000 ALTER TABLE `weigh_slips` DISABLE KEYS */;
/*!40000 ALTER TABLE `weigh_slips` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `weighbridge_sessions`
--

DROP TABLE IF EXISTS `weighbridge_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `weighbridge_sessions` (
  `session_id` varchar(50) NOT NULL,
  `vehicle_reg_no` varchar(50) NOT NULL,
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  `tare_weight` decimal(10,2) DEFAULT NULL,
  `gross_weight` decimal(10,2) DEFAULT NULL,
  `net_weight` decimal(10,2) DEFAULT NULL,
  `driver_name` varchar(100) DEFAULT NULL,
  `material` varchar(100) DEFAULT NULL,
  `destination` text,
  `sap_po_number` varchar(50) DEFAULT NULL,
  `sap_doc_number` varchar(50) DEFAULT NULL,
  `sap_sync_status` varchar(30) DEFAULT 'none',
  `sync_type` varchar(30) DEFAULT 'none',
  `vendor_name` varchar(150) DEFAULT NULL,
  `evidence` json DEFAULT NULL,
  `status` varchar(30) DEFAULT 'tare',
  `operator_id` varchar(50) DEFAULT NULL,
  `operator_name` varchar(100) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`session_id`),
  KEY `idx_wb_vehicle` (`vehicle_reg_no`),
  KEY `idx_wb_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `weighbridge_sessions`
--

LOCK TABLES `weighbridge_sessions` WRITE;
/*!40000 ALTER TABLE `weighbridge_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `weighbridge_sessions` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-11 12:14:11
