-- Migration: Reports Field Configurations & Enhanced Weighbridge Schema
-- Target Database: rmc_gate_system

USE rmc_gate_system;

-- 1. Table for Report Field Configurations (persistent user/report field preferences)
CREATE TABLE IF NOT EXISTS report_field_configs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(64) DEFAULT 'default',
  report_type VARCHAR(64) DEFAULT 'weighment_report',
  s_no INT NOT NULL,
  field_key VARCHAR(64) NOT NULL,
  field_name VARCHAR(128) NOT NULL,
  is_selected BOOLEAN DEFAULT TRUE,
  display_order INT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_report_field (user_id, report_type, field_key),
  INDEX idx_report_order (user_id, report_type, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Ensure all columns needed for the 47 fields exist in weighbridge_sessions
DROP PROCEDURE IF EXISTS AddColumnIfMissing;
DELIMITER $$
CREATE PROCEDURE AddColumnIfMissing(
    IN tableName VARCHAR(64),
    IN columnName VARCHAR(64),
    IN columnDefinition VARCHAR(255)
)
BEGIN
    IF NOT EXISTS (
        SELECT * FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = tableName
          AND COLUMN_NAME = columnName
    ) THEN
        SET @sql = CONCAT('ALTER TABLE `', tableName, '` ADD COLUMN `', columnName, '` ', columnDefinition);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$
DELIMITER ;

CALL AddColumnIfMissing('weighbridge_sessions', 'transaction_no', 'INT NULL AFTER session_id');
CALL AddColumnIfMissing('weighbridge_sessions', 'party_name', 'VARCHAR(150) NULL AFTER vehicle_reg_no');
CALL AddColumnIfMissing('weighbridge_sessions', 'firm_name', 'VARCHAR(150) NULL AFTER party_name');
CALL AddColumnIfMissing('weighbridge_sessions', 'first_weight', 'DECIMAL(10,2) NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'first_weight_time', 'DATETIME NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'second_weight', 'DECIMAL(10,2) NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'second_weight_time', 'DATETIME NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'fw_user', 'VARCHAR(100) NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'sw_user', 'VARCHAR(100) NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'rate', 'DECIMAL(10,2) DEFAULT 0.00');
CALL AddColumnIfMissing('weighbridge_sessions', 'moisture', 'DECIMAL(10,2) DEFAULT 0.00');
CALL AddColumnIfMissing('weighbridge_sessions', 'deduction', 'DECIMAL(10,2) DEFAULT 0.00');
CALL AddColumnIfMissing('weighbridge_sessions', 'charges', 'DECIMAL(10,2) DEFAULT 0.00');
CALL AddColumnIfMissing('weighbridge_sessions', 'less_weight', 'DECIMAL(10,2) DEFAULT 0.00');
CALL AddColumnIfMissing('weighbridge_sessions', 'final_weight', 'DECIMAL(10,2) DEFAULT 0.00');
CALL AddColumnIfMissing('weighbridge_sessions', 'mois_rate', 'DECIMAL(10,2) DEFAULT 0.00');
CALL AddColumnIfMissing('weighbridge_sessions', 'final_rate', 'DECIMAL(10,2) DEFAULT 0.00');
CALL AddColumnIfMissing('weighbridge_sessions', 'total_amount', 'DECIMAL(12,2) DEFAULT 0.00');
CALL AddColumnIfMissing('weighbridge_sessions', 'vehicle_type', 'VARCHAR(100) NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'bags_bales', 'VARCHAR(50) NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'agent', 'VARCHAR(100) NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'village', 'VARCHAR(100) NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'chess_no', 'VARCHAR(50) NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'chess_amount', 'DECIMAL(10,2) DEFAULT 0.00');
CALL AddColumnIfMissing('weighbridge_sessions', 'chess_name', 'VARCHAR(100) NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'location_name', 'VARCHAR(150) NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'cultivator_name', 'VARCHAR(150) NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'load_slip_no', 'VARCHAR(50) NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'father_name', 'VARCHAR(150) NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'mandal', 'VARCHAR(100) NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'bank_name', 'VARCHAR(150) NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'branch_name', 'VARCHAR(150) NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'ifsc_code', 'VARCHAR(50) NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'trader_name', 'VARCHAR(150) NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'alloted_mill', 'VARCHAR(150) NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'account_no', 'VARCHAR(50) NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'heap_no', 'VARCHAR(50) NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'mobile_no', 'VARCHAR(50) NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'image1', 'TEXT NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'image2', 'TEXT NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'image3', 'TEXT NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'image4', 'TEXT NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'udt', 'DATETIME NULL');
CALL AddColumnIfMissing('weighbridge_sessions', 'print_options', 'JSON NULL');

DROP PROCEDURE IF EXISTS AddColumnIfMissing;

-- 3. Populate default 47 fields into report_field_configs for 'default' user
INSERT INTO report_field_configs (user_id, report_type, s_no, field_key, field_name, is_selected, display_order)
VALUES
  ('default', 'weighment_report', 1,  'TransactionNo',  'TransactionNo',  TRUE,  1),
  ('default', 'weighment_report', 2,  'FDate',          'FDate',          TRUE,  2),
  ('default', 'weighment_report', 3,  'Charges',        'Charges',        FALSE, 3),
  ('default', 'weighment_report', 4,  'VehicleNo',      'VehicleNo',      TRUE,  4),
  ('default', 'weighment_report', 5,  'PartyName',      'PartyName',      TRUE,  5),
  ('default', 'weighment_report', 6,  'Product',        'Product',        TRUE,  6),
  ('default', 'weighment_report', 7,  'FTime',          'FTime',          TRUE,  7),
  ('default', 'weighment_report', 8,  'FWeight',        'FWeight',        TRUE,  8),
  ('default', 'weighment_report', 9,  'SDate',          'SDate',          FALSE, 9),
  ('default', 'weighment_report', 10, 'STime',          'STime',          FALSE, 10),
  ('default', 'weighment_report', 11, 'SWeight',        'SWeight',        TRUE,  11),
  ('default', 'weighment_report', 12, 'Status',         'Status',         TRUE,  12),
  ('default', 'weighment_report', 13, 'FWUser',         'FWUser',         FALSE, 13),
  ('default', 'weighment_report', 14, 'SWUser',         'SWUser',         FALSE, 14),
  ('default', 'weighment_report', 15, 'NettWeight',     'NettWeight',     TRUE,  15),
  ('default', 'weighment_report', 16, 'lesswt',         'lesswt',         FALSE, 16),
  ('default', 'weighment_report', 17, 'Finwt',          'Finwt',          FALSE, 17),
  ('default', 'weighment_report', 18, 'MoisRate',       'MoisRate',       FALSE, 18),
  ('default', 'weighment_report', 19, 'Amount',         'Amount',         TRUE,  19),
  ('default', 'weighment_report', 20, 'IMAGE1',         'IMAGE1',         FALSE, 20),
  ('default', 'weighment_report', 21, 'IMAGE2',         'IMAGE2',         FALSE, 21),
  ('default', 'weighment_report', 22, 'IMAGE3',         'IMAGE3',         FALSE, 22),
  ('default', 'weighment_report', 23, 'IMAGE4',         'IMAGE4',         FALSE, 23),
  ('default', 'weighment_report', 24, 'udt',            'udt',            FALSE, 24),
  ('default', 'weighment_report', 25, 'Deduction',      'Deduction',      FALSE, 25),
  ('default', 'weighment_report', 26, 'LocationName',   'LocationName',   FALSE, 26),
  ('default', 'weighment_report', 27, 'CultivatorName', 'CultivatorName', TRUE,  27),
  ('default', 'weighment_report', 28, 'LoadSlipNo',     'LoadSlipNo',     TRUE,  28),
  ('default', 'weighment_report', 29, 'BagsBales',      'BagsBales',      TRUE,  29),
  ('default', 'weighment_report', 30, 'Rate',           'Rate',           TRUE,  30),
  ('default', 'weighment_report', 31, 'Moisture',       'Moisture',       TRUE,  31),
  ('default', 'weighment_report', 32, 'ChessNo',        'ChessNo',        TRUE,  32),
  ('default', 'weighment_report', 33, 'ChessName',      'ChessName',      FALSE, 33),
  ('default', 'weighment_report', 34, 'ChessAmount',    'ChessAmount',    TRUE,  34),
  ('default', 'weighment_report', 35, 'FatherName',     'FatherName',     FALSE, 35),
  ('default', 'weighment_report', 36, 'Mandal',         'Mandal',         FALSE, 36),
  ('default', 'weighment_report', 37, 'Village',        'Village',        TRUE,  37),
  ('default', 'weighment_report', 38, 'BankName',       'BankName',       FALSE, 38),
  ('default', 'weighment_report', 39, 'BranchName',     'BranchName',     FALSE, 39),
  ('default', 'weighment_report', 40, 'IFSCODE',        'IFSCODE',        FALSE, 40),
  ('default', 'weighment_report', 41, 'TraderName',     'TraderName',     FALSE, 41),
  ('default', 'weighment_report', 42, 'AllotedMil',     'AllotedMil',     FALSE, 42),
  ('default', 'weighment_report', 43, 'AccountNo',      'AccountNo',      FALSE, 43),
  ('default', 'weighment_report', 44, 'Heap',           'Heap',           FALSE, 44),
  ('default', 'weighment_report', 45, 'FinalRate',      'FinalRate',      FALSE, 45),
  ('default', 'weighment_report', 46, 'MobileNo',       'MobileNo',       TRUE,  46),
  ('default', 'weighment_report', 47, 'FinalWeight',    'FinalWeight',    FALSE, 47)
ON DUPLICATE KEY UPDATE
  field_name = VALUES(field_name),
  s_no = VALUES(s_no);

-- 4. Seed sample transactions into weighbridge_sessions matching reference screenshots
INSERT INTO weighbridge_sessions (
  session_id, transaction_no, vehicle_reg_no, party_name, firm_name,
  first_weight, first_weight_time, second_weight, second_weight_time,
  tare_weight, gross_weight, net_weight, material, rate, moisture,
  deduction, charges, less_weight, final_weight, mois_rate, final_rate, total_amount,
  vehicle_type, bags_bales, agent, village, chess_no, chess_amount, chess_name,
  location_name, cultivator_name, load_slip_no, father_name, mandal,
  bank_name, branch_name, ifsc_code, trader_name, alloted_mill, account_no, heap_no,
  mobile_no, image1, image2, image3, image4, udt, status, operator_id, operator_name,
  fw_user, sw_user, created_at, updated_at
) VALUES
-- Transaction 178: Pending Vehicle matching Screenshot 1
(
  'WB-TX-178', 178, 'AP28TB5296', 'DHARANI COTTON', 'Dharani Cotton Mills / RMC',
  640.00, '2026-11-12 09:15:20', NULL, NULL,
  640.00, NULL, NULL, 'Raw Cotton / Fibre', 6800.00, 7.50,
  20.00, 150.00, 20.00, 620.00, 10.00, 6800.00, 4366.00,
  'Lorry 10-Tyre', '80 Bales', 'K. Venkat', 'Khammam Yard', 'CH-7711', 120.00, 'Market Cess',
  'Shamshabad Terminal', 'Ramesh Patel', 'LS-178-C', 'Govind Patel', 'Khammam Rural',
  'State Bank of India', 'Khammam Bazar', 'SBIN0002190', 'Shree Balaji Traders', 'Mill Unit-1', '62145899201', 'Heap-C3',
  '9848022341', '/snapshots/cam1_ap28tb5296.jpg', '/snapshots/cam2_ap28tb5296.jpg', NULL, NULL, NOW(), 'pending_2nd_weight', 'OP003', 'Ramesh Kulkarni',
  'Ramesh Kulkarni', NULL, '2026-11-12 09:15:20', NOW()
),
-- Transaction 200: Pending Vehicle matching Screenshot 1
(
  'WB-TX-200', 200, 'TS25T1234', 'DHARANI COTTON', 'Dharani Cotton Mills / RMC',
  14380.00, '2026-11-12 10:45:00', NULL, NULL,
  14380.00, NULL, NULL, 'Lint Cotton Cleaned', 7400.00, 6.00,
  50.00, 200.00, 50.00, 14330.00, 15.00, 7400.00, 106292.00,
  'Heavy Multi-Axle', '150 Bales', 'S. Narayana', 'Adilabad Yard', 'CH-7744', 250.00, 'Agricultural Cess',
  'Shamshabad Terminal', 'Suresh Reddy', 'LS-200-A', 'Ram Reddy', 'Adilabad Central',
  'HDFC Bank', 'Adilabad Main', 'HDFC0001844', 'Sri Sai Cotton Traders', 'Central Ginning Unit', '50100234123891', 'Heap-A1',
  '9440192837', '/snapshots/cam1_ts25t1234.jpg', '/snapshots/cam2_ts25t1234.jpg', NULL, NULL, NOW(), 'pending_2nd_weight', 'OP003', 'Ramesh Kulkarni',
  'Ramesh Kulkarni', NULL, '2026-11-12 10:45:00', NOW()
),
-- Transaction 201: Completed Transaction with full details
(
  'WB-TX-201', 201, 'MH12AB1234', 'Aparna Cyber4 Commercial', 'Aparna RMC Plant 1',
  12450.00, '2026-11-12 08:30:10', 28950.00, '2026-11-12 09:10:45',
  12450.00, 28950.00, 16500.00, 'M30 Grade Concrete Mix', 4200.00, 4.50,
  100.00, 250.00, 174.25, 16325.75, 16.50, 4200.00, 68818.15,
  'Transit Mixer 6m³', '6 m³ Batch', 'Rajesh Kumar', 'Wakad Site 4', 'CH-8821', 180.00, 'Municipal Cess',
  'Plant 1 - Main Batching Yard', 'Vikram Shinde', 'LS-201-RMC', 'Maruti Shinde', 'Haveli',
  'ICICI Bank', 'Hinjewadi Phase 1', 'ICIC0000491', 'Deccan Construction Logistics', 'Aparna Batching Plant 1', '049101509923', 'Silo-2',
  '9822019944', '/snapshots/cam1_mh12ab1234.jpg', '/snapshots/cam2_mh12ab1234.jpg', '/snapshots/cam3_driver.jpg', '/snapshots/cam4_docket.jpg', NOW(), 'completed', 'OP001', 'Rajesh Sharma',
  'Rajesh Sharma', 'Ramesh Kulkarni', '2026-11-12 08:30:10', NOW()
),
-- Transaction 202: Completed Transaction (UltraTech Cement)
(
  'WB-TX-202', 202, 'TS07UA1289', 'UltraTech Cement Limited', 'Aparna RMC Plant 1',
  14100.00, '2026-11-12 11:05:00', 42600.00, '2026-11-12 11:45:30',
  14100.00, 42600.00, 28500.00, 'Ordinary Portland Cement (OPC 53)', 5800.00, 2.00,
  0.00, 300.00, 57.00, 28443.00, 28.50, 5800.00, 165269.40,
  'Bulk Cement Bulker', '570 Bags Eq.', 'Ramesh Naidu', 'Shamshabad Plant', 'CH-8890', 350.00, 'Highway Infrastructure Cess',
  'Central Raw Material Yard', 'B. Satyanarayana', 'LS-4500128490', 'B. Venkaiah', 'Shamshabad',
  'State Bank of India', 'Industrial Estate', 'SBIN0004412', 'Deccan Mineral Suppliers', 'Cement Silo 01', '33214588910', 'Silo-01',
  '9849011223', '/snapshots/cam1_ts07ua1289.jpg', '/snapshots/cam2_ts07ua1289.jpg', NULL, NULL, NOW(), 'completed', 'OP003', 'Ramesh Kulkarni',
  'Ramesh Kulkarni', 'Rajesh Sharma', '2026-11-12 11:05:00', NOW()
),
-- Transaction 203: Completed Transaction (Sri Krishna Stone Works)
(
  'WB-TX-203', 203, 'TS08UB4412', 'Sri Krishna Stone Works', 'Aparna RMC Plant 1',
  12800.00, '2026-11-12 12:20:15', 38300.00, '2026-11-12 12:55:00',
  12800.00, 38300.00, 25500.00, '20mm Blue Metal Granite Aggregate', 1250.00, 3.00,
  150.00, 200.00, 226.50, 25273.50, 25.50, 1250.00, 31791.88,
  'Tipper 12-Wheeler', '25.5 MT', 'M. Prabhakar', 'Aggregate Bay A', 'CH-9012', 200.00, 'Mining Cess',
  'Aggregate Stockyard', 'K. Srinivas', 'LS-DC-8891', 'K. Mallaiah', 'Maheshwaram',
  'Canara Bank', 'Maheshwaram', 'CNRB0002811', 'Krishna Quarry Works', 'Crusher Unit 3', '2811101004523', 'Bin-AGG-A',
  '9701144882', '/snapshots/cam1_ts08ub4412.jpg', '/snapshots/cam2_ts08ub4412.jpg', NULL, NULL, NOW(), 'completed', 'OP003', 'Ramesh Kulkarni',
  'Ramesh Kulkarni', 'Ramesh Kulkarni', '2026-11-12 12:20:15', NOW()
),
-- Transaction 204: Completed Transaction (L&T Metro Project)
(
  'WB-TX-204', 204, 'MH14CD5678', 'L&T Metro Project Pier 24', 'Aparna RMC Plant 1',
  13200.00, '2026-11-12 13:10:00', 31400.00, '2026-11-12 13:42:15',
  13200.00, 31400.00, 18200.00, 'M40 High Early Strength', 4650.00, 5.00,
  80.00, 250.00, 171.00, 18029.00, 18.20, 4650.00, 84084.85,
  'Transit Mixer 7m³', '7 m³ Batch', 'Suresh Patil', 'Metro Pier 24 Site', 'CH-9140', 220.00, 'Urban Transport Cess',
  'Plant 1 - Main Batching Yard', 'Anil Verma', 'LS-204-METRO', 'Pratap Verma', 'Pune Metro Corridor',
  'Bank of Baroda', 'Shivajinagar', 'BARB0SHIVAJ', 'Metro Infrastructure JV', 'Aparna Plant 1', '01290200004512', 'Silo-1',
  '9823055112', '/snapshots/cam1_mh14cd5678.jpg', '/snapshots/cam2_mh14cd5678.jpg', NULL, NULL, NOW(), 'completed', 'OP001', 'Rajesh Sharma',
  'Rajesh Sharma', 'Ramesh Kulkarni', '2026-11-12 13:10:00', NOW()
)
ON DUPLICATE KEY UPDATE
  vehicle_reg_no = VALUES(vehicle_reg_no),
  party_name = VALUES(party_name),
  status = VALUES(status),
  total_amount = VALUES(total_amount);
