// ===== 服务入口 =====
// 存储引擎由 server/.env 的 STORE 决定：
//   mysql —— 使用 MySQL 库（推荐，见 sql/schema-mysql.sql）
//   file  —— 旧 JSON 文件存储（server/data/store.json）
import cfg from './config.js'
import { createApp } from './app.js'

async function boot() {
  let repo

  if (cfg.store === 'mysql') {
    const { createMysqlStore } = await import('./store/mysqlStore.js')
    repo = await createMysqlStore(cfg)
    await repo.init()
  } else {
    const { createStore } = await import('./store/store.js')
    repo = createStore({
      dataFile: cfg.dataFile,
      admin: { phone: cfg.adminPhone, password: cfg.adminPassword, name: cfg.adminName },
      bcryptRounds: cfg.bcryptRounds
    }).init()
  }

  const app = createApp(cfg, repo)
  const server = app.listen(cfg.port, () => {
    const storeLine = repo.dataSource === 'mysql'
      ? `数据存储   MySQL · ${cfg.db.database}（${cfg.db.host}:${cfg.db.port}）`
      : `数据文件   ${cfg.dataFile}`
    console.log('============================================================')
    console.log('  森林氧吧 · AI智慧康养系统 —— 后端服务已启动')
    console.log(`  监听地址   http://localhost:${cfg.port}`)
    console.log(`  健康检查   http://localhost:${cfg.port}/api/health`)
    console.log(`  预约窗口   ${cfg.windowDays} 天（今/明/后天）`)
    console.log(`  ${storeLine}`)
    console.log(`  初始管理员 ${cfg.adminPhone}（登录后请及时修改密码）`)
    console.log('============================================================')
  })

  // 优雅退出：先等待未落库的写完成（MySQL 串行队列排空）
  const shutdown = () => {
    server.close()
    const done = repo.flush ? repo.flush() : Promise.resolve()
    Promise.resolve(done)
      .catch(() => {})
      .finally(() => process.exit(0))
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

boot().catch(err => {
  console.error('[启动失败]', err && err.message ? err.message : err)
  console.error('请检查 server/.env 的 STORE / DB_* 配置与 MySQL 服务是否可用。')
  process.exit(1)
})
