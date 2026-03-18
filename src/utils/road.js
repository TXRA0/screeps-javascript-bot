export let PlannerResult

;(function(PlannerResult) {
  PlannerResult["OK"] = "OK"
  PlannerResult["NO_PATH"] = "NO_PATH"
  PlannerResult["NO_VISION"] = "NO_VISION"
  PlannerResult["CPU_LIMIT"] = "CPU_LIMIT"
  PlannerResult["PENDING"] = "PENDING"
})(PlannerResult || (PlannerResult = {}))

/* ===================== Memory Initialization ===================== */
if (!Memory.roadPlanner) Memory.roadPlanner = {}

/* ===================== Utility Functions ===================== */
function hashPos(p) {
  return `${p.roomName}/${p.x},${p.y}`
}

function getAutoFromPos(roomName, targets) {
  const room = Game.rooms[roomName]
  if (!room) throw new Error(`no vision of ${roomName}`)
  const base = room.storage || room.find(FIND_MY_SPAWNS)[0] || room.controller
  if (!base) throw new Error(`no base structure in ${roomName}`)
  const roads = base.pos.findInRange(FIND_STRUCTURES, 3, {
    filter: s => s.structureType === STRUCTURE_ROAD
  })
  if (roads.length) {
    const t = targets[0]
    roads.sort((a, b) => a.pos.getRangeTo(t) - b.pos.getRangeTo(t))
    return roads[0].pos
  }
  return base.pos
}

const tempPlannedRoads = new Map()

function buildCostMatrix(roomName) {
  const room = Game.rooms[roomName]
  if (!room) return false

  const costs = new PathFinder.CostMatrix()
  const passable = [STRUCTURE_CONTAINER, STRUCTURE_RAMPART]

  for (const s of room.find(FIND_STRUCTURES)) {
    if (s.structureType === STRUCTURE_ROAD) {
      costs.set(s.pos.x, s.pos.y, 1)
    } else if (!passable.includes(s.structureType)) {
      costs.set(s.pos.x, s.pos.y, 0xff)
    }
  }

  const planned = tempPlannedRoads.get(roomName)
  if (planned) {
    for (const packed of planned) {
      const x = packed >> 6
      const y = packed & 0x3f
      costs.set(x, y, 1)
    }
  }

  return costs
}

function ensureVision(roomNames, fromRoom) {
  // Simple vision acquisition logic, calls Observer if available
  // Note: This assumes Memory.observer stores observer IDs, modify if you don't have this mechanism
  const observers =
    (Memory["observer"] || [])
      .map(id => Game.getObjectById(id))
      .filter(o => o && o.structureType === STRUCTURE_OBSERVER) || []

  let allRooms = [...roomNames]
  if (fromRoom) {
    // Find route rooms for each target room
    const routeRooms = new Set()
    for (const targetRoom of roomNames) {
      if (targetRoom === fromRoom) continue
      const route = Game.map.findRoute(fromRoom, targetRoom)
      if (route !== ERR_NO_PATH) {
        route.forEach(r => routeRooms.add(r.room))
      }
    }
    allRooms = [...new Set([fromRoom, ...routeRooms, ...roomNames])]
  }

  const invisible = allRooms.filter(r => !Game.rooms[r])
  if (!invisible.length) return true

  if (observers.length > 0) {
    const target = invisible[Game.time % invisible.length]
    const observer = observers[Game.time % observers.length]
    observer.observeRoom(target)
    return false
  }
  return true
}

function structureAt(pos) {
  return pos
    .lookFor(LOOK_STRUCTURES)
    .some(s => s.structureType === STRUCTURE_ROAD)
}
function constructionSiteExists(pos) {
  return pos
    .lookFor(LOOK_CONSTRUCTION_SITES)
    .some(cs => cs.structureType === STRUCTURE_ROAD)
}

/* ===================== Visualization ===================== */
function drawRoomVisual(path, color = "#ffff00") {
  const group = {}
  for (const pos of path) {
    if (!group[pos.roomName]) group[pos.roomName] = []
    group[pos.roomName].push(pos)
  }
  for (const [r, pts] of Object.entries(group)) {
    const vis = new RoomVisual(r)
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1],
        b = pts[i]
      vis.line(a.x, a.y, b.x, b.y, { color, width: 0.15, opacity: 0.9 })
    }
  }
}

function drawMapVisual(targets, completedHashes, paths) {
  const completedSet = new Set(completedHashes)
  let drawnCount = 0

  // Draw green circles for completed targets
  for (let i = 0; i < targets.length; i++) {
    try {
      const target = targets[i]
      // Force rebuild as real RoomPosition
      const pos = new RoomPosition(target.x, target.y, target.roomName)
      const hash = `${pos.roomName}/${pos.x},${pos.y}`

      if (completedSet.has(hash)) {
        // Successfully planned targets show green circles
        Game.map.visual.circle(pos, {
          radius: 1,
          fill: "#00ff00",
          opacity: 0.8
        })
        drawnCount++
      }
    } catch (e) {
      // Silently handle errors
    }
  }

  // Draw paths
  if (paths) {
    for (const path of paths) {
      try {
        // Rebuild path points as RoomPosition
        const validPath = path.map(p => new RoomPosition(p.x, p.y, p.roomName))

        // Use poly to draw entire path, achieving continuous line effect (thin solid line)
        Game.map.visual.poly(validPath, {
          stroke: "#ffff00",
          strokeWidth: 0.3,
          opacity: 0.8,
          lineStyle: "solid"
        })
      } catch (e) {
        // Silently handle errors
      }
    }
  }
}

function drawCompletedMarkers(targets, completedHashes) {
  const completedSet = new Set(completedHashes)
  for (let i = 0; i < targets.length; i++) {
    try {
      const target = targets[i]
      // Force rebuild as real RoomPosition
      const pos = new RoomPosition(target.x, target.y, target.roomName)
      const hash = `${pos.roomName}/${pos.x},${pos.y}`

      if (completedSet.has(hash)) {
        const vis = new RoomVisual(pos.roomName)
        vis.circle(pos.x, pos.y, {
          radius: 0.5,
          fill: "transparent",
          stroke: "#00ff00",
          strokeWidth: 0.15
        })
      }
    } catch (e) {
      // Silently handle errors
    }
  }
}

/* ===================== Core Task Execution ===================== */
function executeTask(fromRoom, task) {
  const { range = 1, cpuBucketMin = 100, build = false } = task

  if (Game.cpu.bucket < cpuBucketMin) return PlannerResult.CPU_LIMIT

  // Initialize runtime state
  if (!task.completedTargets) task.completedTargets = []
  if (!task.cachedPaths) task.cachedPaths = []

  const fromPos =
    task.fromPos === "auto"
      ? getAutoFromPos(fromRoom, task.targets)
      : task.fromPos
  if (!task.targets.length) return PlannerResult.NO_PATH

  // Check vision
  const targetRooms = [...new Set(task.targets.map(t => t.roomName))]
  const visionReady = ensureVision(targetRooms, fromRoom)

  // Clear temporary cache
  tempPlannedRoads.clear()

  // Sort by distance
  const sortedTargets = [...task.targets].sort(
    (a, b) => a.getRangeTo(fromPos) - b.getRangeTo(fromPos)
  )

  let hasNewPath = false
  for (const target of sortedTargets) {
    const targetHash = hashPos(target)

    // Skip completed
    if (task.completedTargets.includes(targetHash)) continue

    // Skip rooms without vision
    if (!Game.rooms[target.roomName]) {
      continue
    }

    // Pathfinding
    const result = PathFinder.search(
      fromPos,
      { pos: target, range },
      {
        plainCost: 4,
        swampCost: 24,
        maxOps: 20000,
        roomCallback: buildCostMatrix
      }
    )

    if (result.incomplete) {
      continue
    }

    // Smart reuse check: skip if path cost is too high (exceeds 1.5x direct distance)
    const directDist = fromPos.getRangeTo(target)
    if (result.cost > directDist * 1.5 * 4) {
      continue
    }

    // Success, add to cache
    task.completedTargets.push(targetHash)
    task.cachedPaths.push(result.path)
    hasNewPath = true

    // Add to temporary cache for subsequent reuse
    for (const pos of result.path) {
      if (!tempPlannedRoads.has(pos.roomName))
        tempPlannedRoads.set(pos.roomName, new Set())
      tempPlannedRoads.get(pos.roomName).add((pos.x << 6) | pos.y)
    }

    // Build
    if (build && visionReady) buildRoad(result.path)
  }

  // Visualization
  // Filter and rebuild RoomPosition objects (prevent serialization issues)
  const validPaths = []
  for (const path of task.cachedPaths) {
    if (!path || path.length === 0) continue
    const rebuiltPath = path.map(p => {
      // If already RoomPosition, use directly; otherwise rebuild
      if (p instanceof RoomPosition) return p
      const pos = p
      return new RoomPosition(pos.x, pos.y, pos.roomName)
    })
    validPaths.push(rebuiltPath)
  }

  for (const path of validPaths) {
    drawRoomVisual(path, visionReady ? "#ffff00" : "#ff0000")
  }
  drawMapVisual(task.targets, task.completedTargets, validPaths)
  drawCompletedMarkers(task.targets, task.completedTargets)

  // Check if all completed
  if (task.completedTargets.length === task.targets.length) {
    return PlannerResult.OK
  }

  return visionReady ? PlannerResult.PENDING : PlannerResult.NO_VISION
}

function buildRoad(path) {
  // Use native API to create construction sites
  for (const step of path) {
    const room = Game.rooms[step.roomName]
    if (!room) continue
    const pos = new RoomPosition(step.x, step.y, step.roomName)
    if (structureAt(pos) || constructionSiteExists(pos)) continue
    room.createConstructionSite(step.x, step.y, STRUCTURE_ROAD)
  }
}

/* ===================== Public API ===================== */

/** Add or update task */
export function planRoad(fromRoom, config) {
  Memory.roadPlanner[fromRoom] = {
    ...config,
    completedTargets: [],
    cachedPaths: []
  }
}

/** Run all tasks every tick */
export function runRoadTasks() {
  // Auto-detect Test mode: if startingPos flag exists but no task, auto-create
  const startFlag = Game.flags["startingPos"]

  if (startFlag) {
    const fromRoom = startFlag.pos.roomName
    if (!Memory.roadPlanner[fromRoom]) {
      // Auto-create test task
      Memory.roadPlanner[fromRoom] = {
        fromPos: "auto",
        targets: [],
        test: true,
        build: false,
        cpuBucketMin: 100, // Test mode lowers CPU requirement
        completedTargets: [],
        cachedPaths: []
      }
    }
  }

  for (const fromRoom in Memory.roadPlanner) {
    const task = Memory.roadPlanner[fromRoom]

    // Test mode: read from flags
    if (task.test) {
      const testStartFlag = Game.flags["startingPos"]
      if (!testStartFlag) {
        // Flag deleted, clean up task
        delete Memory.roadPlanner[fromRoom]
        continue
      }

      const yellowFlags = Object.values(Game.flags).filter(
        f => f.color === COLOR_YELLOW
      )

      if (yellowFlags.length === 0) continue

      const newTargets = yellowFlags.map(f => f.pos)
      const newTargetHashes = new Set(newTargets.map(t => hashPos(t)))
      const oldTargetHashes = new Set((task.targets || []).map(t => hashPos(t)))

      // Detect target changes
      const added = [...newTargetHashes].filter(h => !oldTargetHashes.has(h))
      const removed = [...oldTargetHashes].filter(h => !newTargetHashes.has(h))

      if (added.length > 0 || removed.length > 0) {
        // Completely reset task to ensure integrity
        task.completedTargets = []
        task.cachedPaths = []
      }

      task.fromPos = testStartFlag.pos
      task.targets = newTargets
    }

    const result = executeTask(fromRoom, task)

    // Delete task after completion (except Test mode, as flags may change)
    if (result === PlannerResult.OK && !task.test) {
      delete Memory.roadPlanner[fromRoom]
    }
  }
}

/** Cancel task */
export function cancelTask(fromRoom) {
  delete Memory.roadPlanner[fromRoom]
}

/** View task status */
export function showTasks() {
  const tasks = Object.entries(Memory.roadPlanner)
  if (tasks.length === 0) return "No tasks"

  const logs = ["=== Spider Road Tasks ==="]
  for (const [fromRoom, task] of tasks) {
    const progress = `${task.completedTargets?.length || 0}/${
      task.targets.length
    }`
    const mode = task.test ? "TEST" : "FIXED"
    logs.push(`${fromRoom}: ${progress} [${mode}]`)
  }
  return logs.join("\n")
}

/* ===================== Console Commands ===================== */
export const mountSpiderRoad = () => {
  // @ts-ignore
  global.spiderRoad = {
    plan: (fromRoom, config) => {
      planRoad(fromRoom, config)
    },
    cancel: fromRoom => {
      cancelTask(fromRoom)
    },
    status: () => {
      console.log(showTasks())
    },
    testMode: () => {
      const startFlag = Game.flags["startingPos"]
      if (!startFlag) return console.log("❌ startingPos flag not found")

      planRoad(startFlag.pos.roomName, {
        fromPos: "auto",
        targets: [],
        test: true,
        build: false
      })
      console.log("✅ Test mode enabled")
    }
  }
}
