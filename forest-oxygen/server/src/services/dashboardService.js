// ===== 数据看板统计 =====
import { todayStr, addDays } from '../utils/datetime.js'

function count(arr, pred) {
  return arr.filter(pred).length
}

export const dashboardService = {
  /** 依据角色返回看板统计 */
  overview(repo, cfg, user, now = new Date()) {
    repo.rollover(now)
    const base = todayStr(now)

    if (user.role === 'admin') {
      const customers = count(repo.users, u => u.role === 'customer')
      const workers = count(repo.users, u => u.role === 'worker')
      const workersActive = count(repo.users, u => u.role === 'worker' && u.status === 'active')
      const projects = repo.projects.length
      const projectsActive = count(repo.projects, p => p.status === 'active')
      const bookings = repo.bookings.length

      const today = addDays(base, 0)
      const upcoming = []
      for (let off = 0; off < cfg.windowDays; off++) {
        const d = addDays(base, off)
        const inDay = repo.bookings
          .filter(b => b.status === 'booked' && b.serviceDate === d)
          .sort((a, b) => a.slot - b.slot)
        upcoming.push(...inDay.map(b => {
          const p = repo.projects.find(x => x.id === b.projectId)
          const w = repo.users.find(x => x.id === b.workerId)
          const c = repo.users.find(x => x.id === b.customerId)
          return {
            id: b.id, serviceDate: b.serviceDate, slot: b.slot,
            projectName: p ? p.name : '—',
            customerName: c ? c.name : '—',
            workerName: w ? w.name : '—'
          }
        }))
      }
      return {
        counts: {
          customers, workers, workersActive, projects, projectsActive,
          bookings,
          todayBooked: count(repo.bookings, b => b.status === 'booked' && b.serviceDate === today),
          windowBooked: count(repo.bookings, b => b.status === 'booked' &&
            b.serviceDate >= base && b.serviceDate < addDays(base, cfg.windowDays))
        },
        upcoming: upcoming.slice(0, 100)
      }
    }

    if (user.role === 'customer') {
      const projectsActive = count(repo.projects, p => p.status === 'active')
      const windowBooked = count(repo.bookings, b => b.status === 'booked' && b.customerId === user.id &&
        b.serviceDate >= base && b.serviceDate < addDays(base, cfg.windowDays))
      const myDone = count(repo.bookings, b => b.customerId === user.id && b.status === 'done')
      const myTotal = count(repo.bookings, b => b.customerId === user.id)
      return {
        counts: { projectsActive, myUpcoming: windowBooked, myDone, myTotal }
      }
    }

    // 护工/其余：返回自身概览（一般不用看板，提供以免误用）
    const windowBooked = count(repo.bookings, b => b.status === 'booked' && b.workerId === user.id &&
      b.serviceDate >= base && b.serviceDate < addDays(base, cfg.windowDays))
    const myDone = count(repo.bookings, b => b.workerId === user.id && b.status === 'done')
    return { counts: { projectsActive: count(repo.projects, p => p.status === 'active'), myUpcoming: windowBooked, myDone } }
  }
}
