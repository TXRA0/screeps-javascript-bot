// spiderRoad.js
// Author: A56
// Version: 1.0.0
// Date: 2025-11-28
// Climb greedily outward like a spider, reaching for the sky

if (!Memory.roadPlanner) Memory.roadPlanner = {};

const tempPlannedRoads = new Map();

function hashPos(p) {
    return `${p.roomName}/${p.x},${p.y}`;
}

function getAutoFromPos(roomName, targets) {
    const room = Game.rooms[roomName];
    if (!room) throw new Error(`no vision of ${roomName}`);
    const base = room.storage || room.find(FIND_MY_SPAWNS)[0] || room.controller;
    if (!base) throw new Error(`no base structure in ${roomName}`);
    const roads = base.pos.findInRange(FIND_STRUCTURES, 3, { filter: s => s.structureType === STRUCTURE_ROAD });
    if (roads.length) {
        const t = targets[0];
        roads.sort((a, b) => a.pos.getRangeTo(t) - b.pos.getRangeTo(t));
        return roads[0].pos;
    }
    return base.pos;
}

function buildCostMatrix(roomName) {
    const room = Game.rooms[roomName];
    if (!room) return false;

    const costs = new PathFinder.CostMatrix();
    const passable = [STRUCTURE_CONTAINER, STRUCTURE_RAMPART];

    for (const s of room.find(FIND_STRUCTURES)) {
        if (s.structureType === STRUCTURE_ROAD) {
            costs.set(s.pos.x, s.pos.y, 1);
        } else if (!passable.includes(s.structureType)) {
            costs.set(s.pos.x, s.pos.y, 0xff);
        }
    }

    const planned = tempPlannedRoads.get(roomName);
    if (planned) {
        for (const packed of planned) {
            const x = packed >> 6;
            const y = packed & 0x3F;
            costs.set(x, y, 1);
        }
    }

    return costs;
}

function ensureVision(roomNames, fromRoom) {
    const observers = ((Memory.observer || []).map(id => Game.getObjectById(id)).filter(o => o && o.structureType === STRUCTURE_OBSERVER)) || [];

    let allRooms = [...roomNames];
    if (fromRoom) {
        const routeRooms = new Set();
        for (const targetRoom of roomNames) {
            if (targetRoom === fromRoom) continue;
            const route = Game.map.findRoute(fromRoom, targetRoom);
            if (route !== ERR_NO_PATH) {
                route.forEach(r => routeRooms.add(r.room));
            }
        }
        allRooms = [...new Set([fromRoom, ...routeRooms, ...roomNames])];
    }

    const invisible = allRooms.filter(r => !Game.rooms[r]);
    if (!invisible.length) return true;

    if (observers.length > 0) {
        const target = invisible[Game.time % invisible.length];
        const observer = observers[Game.time % observers.length];
        observer.observeRoom(target);
        return false;
    }
    return true;
}

function structureAt(pos) {
    return pos.lookFor(LOOK_STRUCTURES).some(s => s.structureType === STRUCTURE_ROAD);
}
function constructionSiteExists(pos) {
    return pos.lookFor(LOOK_CONSTRUCTION_SITES).some(cs => cs.structureType === STRUCTURE_ROAD);
}

function drawRoomVisual(path, color) {
    color = color || '#ffff00';
    const group = {};
    for (const pos of path) {
        if (!group[pos.roomName]) group[pos.roomName] = [];
        group[pos.roomName].push(pos);
    }
    for (const r in group) {
        const pts = group[r];
        const vis = new RoomVisual(r);
        for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1], b = pts[i];
            vis.line(a.x, a.y, b.x, b.y, { color, width: 0.15, opacity: 0.9 });
        }
    }
}

function drawMapVisual(targets, completedHashes, paths) {
    const completedSet = new Set(completedHashes);
    let drawnCount = 0;

    for (let i = 0; i < targets.length; i++) {
        try {
            const target = targets[i];
            const pos = target instanceof RoomPosition ? target : new RoomPosition(target.x, target.y, target.roomName);
            const hash = hashPos(pos);

            if (completedSet.has(hash)) {
                Game.map.visual.circle(pos, { radius: 1, fill: '#00ff00', opacity: 0.8 });
                drawnCount++;
            }
        } catch (e) {}
    }

    if (paths) {
        for (const path of paths) {
            try {
                const validPath = path.map(p => p instanceof RoomPosition ? p : new RoomPosition(p.x, p.y, p.roomName));
                Game.map.visual.poly(validPath, { stroke: '#ffff00', strokeWidth: 0.3, opacity: 0.8, lineStyle: 'solid' });
            } catch (e) {}
        }
    }
}

function drawCompletedMarkers(targets, completedHashes) {
    const completedSet = new Set(completedHashes);
    for (let i = 0; i < targets.length; i++) {
        try {
            const target = targets[i];
            const pos = target instanceof RoomPosition ? target : new RoomPosition(target.x, target.y, target.roomName);
            const hash = hashPos(pos);
            if (completedSet.has(hash)) {
                const vis = new RoomVisual(pos.roomName);
                vis.circle(pos.x, pos.y, { radius: 0.5, fill: 'transparent', stroke: '#00ff00', strokeWidth: 0.15 });
            }
        } catch (e) {}
    }
}

function buildRoad(path) {
    for (const step of path) {
        const room = Game.rooms[step.roomName];
        if (!room) continue;
        const pos = new RoomPosition(step.x, step.y, step.roomName);
        if (structureAt(pos) || constructionSiteExists(pos)) continue;
        room.createConstructionSite(step.x, step.y, STRUCTURE_ROAD);
    }
}

function executeTask(fromRoom, task) {
    const range = task.range || 1;
    const cpuBucketMin = task.cpuBucketMin || 100;
    const build = task.build || false;

    if (Game.cpu.bucket < cpuBucketMin) return 'CPU_LIMIT';

    if (!task.completedTargets) task.completedTargets = [];
    if (!task.cachedPaths) task.cachedPaths = [];

    const fromPos = task.fromPos === 'auto' ? getAutoFromPos(fromRoom, task.targets) : task.fromPos;
    if (!task.targets.length) return 'NO_PATH';

    const targetRooms = [...new Set(task.targets.map(t => t.roomName))];
    const visionReady = ensureVision(targetRooms, fromRoom);

    tempPlannedRoads.clear();

    // Ensure all targets are RoomPosition objects
    const sortedTargets = task.targets.map(t => t instanceof RoomPosition ? t : new RoomPosition(t.x, t.y, t.roomName))
        .sort((a, b) => a.getRangeTo(fromPos) - b.getRangeTo(fromPos));

    let hasNewPath = false;
    for (const target of sortedTargets) {
        const targetHash = hashPos(target);

        if (task.completedTargets.includes(targetHash)) continue;
        if (!Game.rooms[target.roomName]) continue;

        const result = PathFinder.search(fromPos, { pos: target, range }, { plainCost: 4, swampCost: 24, maxOps: 20000, roomCallback: buildCostMatrix });

        if (result.incomplete) continue;

        const directDist = fromPos.getRangeTo(target);
        if (result.cost > directDist * 1.5 * 4) continue;

        task.completedTargets.push(targetHash);
        task.cachedPaths.push(result.path);
        hasNewPath = true;

        for (const pos of result.path) {
            if (!tempPlannedRoads.has(pos.roomName)) tempPlannedRoads.set(pos.roomName, new Set());
            tempPlannedRoads.get(pos.roomName).add((pos.x << 6) | pos.y);
        }

        if (build && visionReady) buildRoad(result.path);
    }

    const validPaths = [];
    for (const path of task.cachedPaths) {
        if (!path || path.length === 0) continue;
        const rebuiltPath = path.map(p => p instanceof RoomPosition ? p : new RoomPosition(p.x, p.y, p.roomName));
        validPaths.push(rebuiltPath);
    }

    for (const path of validPaths) drawRoomVisual(path, visionReady ? '#ffff00' : '#ff0000');
    drawMapVisual(task.targets, task.completedTargets, validPaths);
    drawCompletedMarkers(task.targets, task.completedTargets);

    if (task.completedTargets.length === task.targets.length) return 'OK';

    return visionReady ? 'PENDING' : 'NO_VISION';
}

function planRoad(fromRoom, config) {
    Memory.roadPlanner[fromRoom] = {
        ...config,
        completedTargets: [],
        cachedPaths: []
    };
}

function runRoadTasks() {
    const startFlag = Game.flags['startingPos'];

    if (startFlag) {
        const fromRoom = startFlag.pos.roomName;
        if (!Memory.roadPlanner[fromRoom]) {
            Memory.roadPlanner[fromRoom] = {
                fromPos: 'auto',
                targets: [],
                test: true,
                build: false,
                cpuBucketMin: 100,
                completedTargets: [],
                cachedPaths: []
            };
        }
    }

    for (const fromRoom in Memory.roadPlanner) {
        const task = Memory.roadPlanner[fromRoom];

        if (task.test) {
            const testStartFlag = Game.flags['startingPos'];
            if (!testStartFlag) {
                delete Memory.roadPlanner[fromRoom];
                continue;
            }

            const yellowFlags = Object.values(Game.flags).filter(f => f.color === COLOR_YELLOW);
            if (yellowFlags.length === 0) continue;

            const newTargets = yellowFlags.map(f => f.pos);
            const newTargetHashes = new Set(newTargets.map(t => hashPos(t)));
            const oldTargetHashes = new Set((task.targets || []).map(t => hashPos(t)));

            if ([...newTargetHashes].some(h => !oldTargetHashes.has(h)) || [...oldTargetHashes].some(h => !newTargetHashes.has(h))) {
                task.completedTargets = [];
                task.cachedPaths = [];
            }

            task.fromPos = testStartFlag.pos;
            task.targets = newTargets;
        }

        const result = executeTask(fromRoom, task);
        if (result === 'OK' && !task.test) delete Memory.roadPlanner[fromRoom];
    }
}

function cancelTask(fromRoom) {
    delete Memory.roadPlanner[fromRoom];
}

function showTasks() {
    const tasks = Object.entries(Memory.roadPlanner);
    if (tasks.length === 0) return 'No tasks';
    const logs = ['=== Spider Road Tasks ==='];
    for (const [fromRoom, task] of tasks) {
        const progress = `${task.completedTargets.length || 0}/${task.targets.length}`;
        const mode = task.test ? 'TEST' : 'FIXED';
        logs.push(`${fromRoom}: ${progress} [${mode}]`);
    }
    return logs.join('\n');
}

function mountSpiderRoad() {
    global.spiderRoad = {
        plan: (fromRoom, config) => planRoad(fromRoom, config),
        cancel: (fromRoom) => cancelTask(fromRoom),
        status: () => console.log(showTasks()),
        testMode: () => {
            const startFlag = Game.flags['startingPos'];
            if (!startFlag) return console.log('❌ startingPos flag not found');
            planRoad(startFlag.pos.roomName, { fromPos: 'auto', targets: [], test: true, build: false });
            console.log('✅ Test mode enabled');
        }
    };
}

module.exports = { mountSpiderRoad, runRoadTasks };