# 🌲 森林氧吧 · AI智慧康养系统

依据《需求分析.md》（V1.1）实现的完整 **前后端分离** 项目：覆盖 **系统管理员 / 护工 / 客户** 三类角色全部页面与核心业务规则，前端通过 REST API 对接真实后端服务；业务数据经后端 **MySQL** 存储，不再使用任何前端模拟用户或浏览器 localStorage 伪数据。

- 前端：**Vue 3 + Vite + Element Plus + Pinia + Vue Router + Axios**（端口 3000）
- 后端：**Node.js + Express**（ESM，端口 3001），JWT + bcryptjs 认证
- 数据存储：默认 **MySQL 库 `forest_oxygen`**（建表见 `server/sql/schema-mysql.sql`；灌入演示数据见 `server/sql/seed.sql`）
  - 可选 **JSON 文件** 存储（`server/.env` 设 `STORE=file`，兼容旧数据与自检引擎）

---

## 一、快速运行

> 一切运行时数据都在 `D:` 盘工程目录内；npm 缓存已指向工程内 `.npm-cache`，不写 C 盘。
> 前置：本机 MySQL 8 已启动，且已按 `server/sql/schema-mysql.sql` 建好 `forest_oxygen` 库。

```bash
# 1) 启动后端（`http://localhost:3001`）
cd server
npm install                 # 首次安装依赖
npm start                   # STORE=mysql 时连接 MySQL（见 server/.env）
#   · 启动时从 MySQL 全量载入；首次为空库会自动写入：1 名管理员 + 8 个《服务项目清单》项目
#   · 演示库 forest_oxygen 已含灌好的演示数据时，直接展示这些数据

# 2) 启动前端（`http://localhost:3000`，已配置 /api 代理到 3001）
cd forest-oxygen            # 即仓库根
npm install                 # 首次安装依赖
npm run dev
```

浏览器访问 **`http://localhost:3000`**。登录页为真实校验（bcrypt + JWT + 失败锁定）。

### 账号说明
| 角色 | 获取方式 |
|------|----------|
| 系统管理员 | 首次启动自动创建；账号密码见 `server/.env`（`ADMIN_PHONE` / `ADMIN_PASSWORD`，默认 `13800000001` / `12345678`） |
| 护工 / 客户 | 在「注册」页自助注册（注册后由管理员为其配置“可服务项目 / 薪资”等） |

> 若使用 `seed.sql` 灌入的演示库，则内置 9 名客户、6 名在职护工（口令统一 `12345678`，演示用）可直接登录体验，如客户 `13800000021`、护工 `13900000011`。
> 登录失败连续 5 次锁定 15 分钟。

---

## 二、常用脚本

| 位置 | 命令 | 说明 |
|------|------|------|
| `forest-oxygen/` | `npm run dev` | 启动前端开发服务器（3000） |
| `forest-oxygen/` | `npm run build` | 前端生产构建（产物在 `dist/`） |
| `server/` | `npm start` / `npm run dev` | 启动后端（3001） |
| `server/` | `npm run selfcheck` | **72 项业务逻辑断言**（注册/锁定/预约冲突/容量/护工匹配/过账/历史/隐私字段/持久化），基于文件引擎，不改动正式数据 |
| `server/` | `npm run db:seed` | 重新生成 `sql/seed.sql`（以“今天”为窗口期刷新演示数据） |

---

## 三、业务功能（对照需求文档 §3~§4）

### 公共 / 认证
- 登录 / 注册：11 位手机号唯一、8 位数字密码（bcrypt 存储）、年龄 0–150、性别 男/女/保密。
- **JWT 鉴权**：前端存储 token，路由按角色守卫；token 过期/失效自动清理并回登录页。
- 全局顶部标题栏 + 园区地图 + 角色导航 + 会话 30 分钟无操作自动退出。

### 管理员
- 数据看板：客户数 / 在职护工 / 进行中项目 / 近三天预约 + 近期待服务预约表（服务端汇总，自动过账）。
- 客户管理：列表 + 详情（健康档案 + 该客户 今/明/后天×4 时段待服务预约）。
- 护工管理：列表（薪资/可服务项目/在职状态开关，**离职不再自动派单**）+「编辑排班」查看 3 天×4 时段安排（**按隐私约定不含客户健康档案**）。
- 项目管理：列表（进行/停用开关）、新增、编辑（服务流程/适合人群/禁忌，停用即不可约）、详情（12 时段容量占用）。

### 护工
- 个人中心：资料只读 + 可服务项目（管理员配置）。
- 服务时间状态：3 天×4 时段，空闲/服务中；服务中展示客户姓名、项目及**客户健康档案（仅本人可见）**。
- 项目总览（同管理员范围，只读）+ 详情。

### 客户
- 个人中心：编号/手机只读，健康档案可编辑并同步服务端。
- 数据看板：个人服务概览统计（服务端统计）。
- 我的项目：3 天×4 时段安排，已约显示项目/地点/费用/护工并可**取消**；历史（已完成/已取消）可回溯。
- 项目总览 + **预约**：按时段选择，服务端实时校验（本人时段冲突 → 项目容量 → 项目状态 → 空闲护工 **随机自动匹配**），成功后提示匹配护工。
- AI 咨询：对话式界面（豆包 API 预留 + 本地规则问答）。

### 日期与状态（需求 §4.1）
- 预约以 **绝对 `serviceDate`(YYYY-MM-DD)** 落库；今/明/后天仅是查询窗口（`BOOKING_WINDOW_DAYS=3`，可在 `.env` 调整）。
- **过账 Rollover**：服务日已过的 `booked` 自动转 `done`（不物理删除，历史可查）。
- 状态机：`booked → cancelled`（客户取消）/ `booked → done`（过账）。

---

## 四、目录结构

```
forest-oxygen/
├─ index.html / package.json / vite.config.js   # vite.config 含 /api → 3001 代理
├─ src/
│  ├─ main.js / App.vue
│  ├─ api/                  # http.js(axios 封装/JWT注入/统一解包) + index.js(各接口)
│  ├─ styles/global.css     # 适老化：16px 基准、高对比森林绿主题
│  ├─ utils/                # config.js(时段/角色/阈值) + dates.js(serviceDate 映射)
│  ├─ stores/auth.js        # 登录态：token+profile，与后端 /api/me 联动
│  ├─ router/               # index.js(角色守卫) + menus.js
│  ├─ layout/RoleLayout.vue
│  ├─ components/           # 预约对话框 BookingDialog、看板卡片…
│  └─ views/
│     ├─ Login.vue / Register.vue
│     ├─ admin/  Dashboard/Clients/Workers/WorkerSchedule/Projects/ProjectForm
│     ├─ common/ ProjectDetail
│     ├─ worker/ Profile/ServiceTime/Projects
│     └─ customer/ Profile/Dashboard/MyProjects/Projects/AiConsult
└─ server/
   ├─ package.json / .env.example / .env        # STORE / DB_* 决定存储后端
   ├─ sql/schema-mysql.sql                       # 建库建表 DDL（forest_oxygen）
   ├─ sql/seed.sql                               # 演示数据（可由 db:seed 重新生成）
   ├─ scripts/selfcheck.js                       # 72 项逻辑断言
   ├─ scripts/gen-mysql-seed.mjs                 # 灌数生成器
   └─ src/
      ├─ index.js / app.js / config.js
      ├─ utils/              # errors/validate/datetime/token
      ├─ store/              # store.js(文件存储) + mysqlStore.js(MySQL 驱动) + catalog.js
      ├─ services/           # user/project/booking/dashboard
      ├─ middleware/         # JWT 校验 / 角色守卫 / 统一错误
      └─ routes/             # auth/me/users/projects/bookings(service)
```

---

## 五、存储与切换说明

- **MySQL（默认）**：`.env` 设 `STORE=mysql`，通过 `DB_*` 连接应用专用账号（仅授 DML，见下表）。启动时将 `forest_oxygen` 全量载入内存作为工作区，业务校验逻辑保持同步与旧版一致；每次写操作在接口响应前等待一次串行整库落库（`await repo.flush()`）。落库失败会记日志并在下次写操作自愈；连接断开自动重连。
- **JSON 文件（可选）**：`.env` 设 `STORE=file` 即回到 `server/data/store.json`，用于旧数据兼容与 `npm run selfcheck` 引擎。
- 两者对外接口完全一致（`users/projects/bookings/loginLocks` + 编号生成 + rollover + save/flush），业务服务层与前端无需改动。
- 库内结构：`user`（含客户健康档案与护工薪资/技能）、`worker_skill`、`project`、`booking`（含历史，状态流转不删除）、`login_lock`。
- **演示数据**：`seed.sql` 提供 17 用户 + 8 项目 + 47 预约（窗口期以“生成当天”为基准）。重新灌入：
  1. `cd server && npm run db:seed`（按今天重新生成 seed.sql）
  2. `mysql -u root -p < sql/schema-mysql.sql`（建库/表，可重复执行）
  3. `mysql -u root -p forest_oxygen < sql/seed.sql`（灌数据；如需清空，先执行 `TRUNCATE` 或重建库）
- 库账号（开发默认）：`forest_app`（`localhost` / `127.0.0.1`），口令见 `.env` 的 `DB_PASSWORD`；仅授权 `forest_oxygen.*` 的增删改查，建表/迁移仍用 root 手工执行。

---

## 六、环境配置（server/.env）

参考 `server/.env.example`。读取优先级 `进程环境变量 > .env > 默认值`。关键项：

| 变量 | 含义 | 默认 |
|------|------|------|
| `STORE` | 存储引擎：`mysql` 或 `file` | `file`（.env 中设为 `mysql`） |
| `DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME` | MySQL 连接与应用库 | `127.0.0.1 / 3306 / forest_app / … / forest_oxygen` |
| `PORT` | 后端端口 | `3001` |
| `JWT_SECRET / JWT_EXPIRES_MS` | token 密钥与有效期 | 开发默认 |
| `BOOKING_WINDOW_DAYS` | 可约窗口天数 | `3` |
| `LOGIN_MAX_FAILS / LOGIN_LOCK_MINUTES` | 失败锁定阈值与时长 | `5 / 15` |
| `ADMIN_PHONE / ADMIN_PASSWORD / ADMIN_NAME` | 引导管理员（空库首次创建） | `13800000001 / 12345678 / 系统管理员` |
| `DATA_FILE` | `STORE=file` 时的 JSON 路径 | `./data/store.json` |

---

## 七、代码质量

- 后端核心逻辑有 **72 项断言自检**（`cd server && npm run selfcheck`，基于文件引擎验证业务规则），HTTP 层另以 MySQL 全链路冒烟通过（登录 → 看板 → 注册 → 预约/取消 → 直连 MySQL 核对落库）。
- 前端已通过生产构建，全部视图均改为按后端接口取数，无任何 mock/localStorage 种子依赖。
