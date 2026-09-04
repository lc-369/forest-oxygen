-- =====================================================================
-- 森林氧吧 · AI智慧康养系统 —— MySQL 建表脚本（预留，V1.1）
-- 说明：本文件为数据库目标设计稿。当前阶段代码通过“存储层接口 + 文件
-- 替身实现”运行；接入本脚本所建库时，只需新增一个 MySQL 存储实现并替换
-- src/store 中的数据访问层即可，业务服务层无需改动。
-- 约定：utf8mb4；手机号/编号全局唯一；所有金额以“分”整数存储或 DECIMAL。
-- 日期字段一律使用 DATE 类型保存【绝对服务日期】(serviceDate)，
-- “今/明/后天”仅作为查询窗口视图（见《需求分析》§4.1）。
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `forest_oxygen`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `forest_oxygen`;

-- ---------------------------------------------------------------
-- 用户表（三类角色共用：管理员 / 护工 / 客户）
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user` (
  `id`           CHAR(6)      NOT NULL COMMENT '6位编号，首位0管理员/1护工/2客户',
  `role`         ENUM('admin','worker','customer') NOT NULL COMMENT '角色',
  `phone`        VARCHAR(11)  NOT NULL COMMENT '手机号（登录账号，唯一）',
  `password_hash` VARCHAR(100) NOT NULL COMMENT 'bcrypt 密码哈希',
  `name`         VARCHAR(30)  NOT NULL COMMENT '姓名/昵称',
  `age`          TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '年龄 0-150',
  `gender`       VARCHAR(4)   NOT NULL DEFAULT '保密' COMMENT '性别',
  -- 护工字段
  `salary`       DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '月薪(护工)',
  `status`       ENUM('active','resigned') NOT NULL DEFAULT 'active' COMMENT '在职/离职(护工)',
  -- 客户字段
  `allergy`      VARCHAR(100)  NOT NULL DEFAULT '' COMMENT '忌口(客户)',
  `disease`      VARCHAR(200)  NOT NULL DEFAULT '' COMMENT '疾病史(客户)',
  `preference`   VARCHAR(200)  NOT NULL DEFAULT '' COMMENT '偏好(客户)',
  `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_phone` (`phone`),
  KEY `idx_user_role` (`role`)
) ENGINE=InnoDB COMMENT='用户（管理员/护工/客户）';

-- 护工可服务项目（多对多）
CREATE TABLE IF NOT EXISTS `worker_skill` (
  `worker_id` CHAR(6) NOT NULL,
  `project_id` VARCHAR(8) NOT NULL,
  PRIMARY KEY (`worker_id`,`project_id`),
  CONSTRAINT `fk_skill_worker` FOREIGN KEY (`worker_id`) REFERENCES `user`(`id`)
) ENGINE=InnoDB COMMENT='护工可服务项目';

-- ---------------------------------------------------------------
-- 服务项目表
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `project` (
  `id`         VARCHAR(8)   NOT NULL COMMENT '编号，如 P001（自动生成）',
  `name`       VARCHAR(50)  NOT NULL COMMENT '项目名称',
  `location`   VARCHAR(60)  NOT NULL COMMENT '地点',
  `fee`        DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '费用(元/次)',
  `capacity`   SMALLINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '同一时段最大容量(人)',
  `status`     ENUM('active','disabled') NOT NULL DEFAULT 'active' COMMENT '进行/停用',
  `duration`   VARCHAR(20)  NOT NULL DEFAULT '' COMMENT '单次时长',
  `flow`       VARCHAR(500) NOT NULL DEFAULT '' COMMENT '服务流程(附录一)',
  `suitable`   VARCHAR(200) NOT NULL DEFAULT '' COMMENT '适合人群',
  `taboo`      VARCHAR(300) NOT NULL DEFAULT '' COMMENT '禁忌事项',
  `created_at` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_project_status` (`status`)
) ENGINE=InnoDB COMMENT='服务项目（数据源见附录一）';

-- ---------------------------------------------------------------
-- 预约记录表
-- 历史记录策略（§4.1）：采用单一表 + 状态流转，记录不物理删除。
-- 已预约 -> 已完成（到期过账 Rollover）；已预约 -> 已取消（客户操作）。
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `booking` (
  `id`           VARCHAR(24) NOT NULL COMMENT '预约编号',
  `customer_id`  CHAR(6)  NOT NULL COMMENT '客户编号',
  `worker_id`    CHAR(6)  NOT NULL COMMENT '护工编号',
  `project_id`   VARCHAR(8) NOT NULL COMMENT '项目编号',
  `service_date` DATE     NOT NULL COMMENT '绝对服务日期 YYYY-MM-DD（存储层字段）',
  `slot`         TINYINT  NOT NULL COMMENT '时段 0-3',
  `status`       ENUM('booked','done','cancelled') NOT NULL DEFAULT 'booked' COMMENT '状态',
  `created_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `cancelled_at` DATETIME NULL COMMENT '取消时间',
  PRIMARY KEY (`id`),
  KEY `idx_booking_date_slot` (`service_date`,`slot`),
  KEY `idx_booking_project` (`project_id`,`service_date`,`slot`),
  KEY `idx_booking_customer` (`customer_id`,`status`),
  KEY `idx_booking_worker` (`worker_id`,`service_date`,`slot`)
) ENGINE=InnoDB COMMENT='预约记录（含历史，状态流转不删除）';

-- ---------------------------------------------------------------
-- 登录失败锁定记录（登录失败>=5次锁定15分钟）
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `login_lock` (
  `phone`       VARCHAR(11) NOT NULL,
  `fail_count`  INT UNSIGNED NOT NULL DEFAULT 0,
  `locked_until` DATETIME NULL COMMENT '锁定截止时间',
  PRIMARY KEY (`phone`)
) ENGINE=InnoDB COMMENT='登录失败锁定';

-- 索引说明：为支撑“某项目/某护工/某客户在 service_date + slot 的
-- 冲突与容量查询”，已按查询模式建立复合索引。
