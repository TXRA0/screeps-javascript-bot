const prototypes = require('./prototypes');
const creepLogic = require('./creeps');
const roomLogic = require('./room');
const roomManager = require('./managers/roomManager');
const profiler = require('./screeps-profiler');
var RoomCache = require('./utils/roomCache')

let lastMemoryTick;
let lastMemory;

profiler.enable();

profiler.registerFN(roomLogic.spawning, 'RoomLogic.spawning');
profiler.registerFN(roomLogic.defense, 'RoomLogic.defense');
profiler.registerFN(roomManager.run, 'RoomManager.run');

Object.values(creepLogic).forEach(roleModule => {
    if (roleModule.run) profiler.registerFN(roleModule.run, `CreepLogic.${roleModule.name}`);
});

function tryInitSameMemory() {
    const startCPU = Game.cpu.getUsed();
    let reused = false;

    if (lastMemoryTick && lastMemory && Game.time === lastMemoryTick + 1) {
        delete global.Memory;
        global.Memory = lastMemory;
        RawMemory._parsed = lastMemory;
        reused = true;
    } else {
        lastMemory = RawMemory._parsed;
    }

    lastMemoryTick = Game.time;
    const endCPU = Game.cpu.getUsed();
    console.log(`[MemHack] CPU: ${(endCPU - startCPU).toFixed(3)} | Reused: ${reused}`);
}

module.exports.loop = function () {
    profiler.wrap(() => {
        tryInitSameMemory();

        Game.myRooms = _.filter(Game.rooms, r => r.controller && r.controller.my && r.controller.level > 0);

        Game.myRooms.forEach(r => {
            roomLogic.spawning(r);
            roomLogic.defense(r);
            roomManager.run(r);
        });

        Object.values(Game.creeps).forEach(creep => {
            const role = creep.memory.role;
            if (creepLogic[role]) {
                creepLogic[role].run(creep);
            }
        });

        Object.keys(Memory.creeps).forEach(name => {
            if (!Game.creeps[name]) {
                delete Memory.creeps[name];
                console.log('Clearing non-existing creep memory:', name);
            }
        });
    });
};
// 1. Reduce Creep.moveTo CPU (435.5 total)
// - Cache paths in creep.memory and reuse them.
// - Use moveByPath with serialized paths instead of recalculating.
// - Avoid calling moveTo every tick if the creep already has fatigue or is still following a path.
// - Use reusePath option in moveTo (e.g. {reusePath: 20-50}).

// 2. Reduce Room.findPath CPU (285.0 total)
// - Avoid manual Room.findPath unless necessary.
// - Prefer PathFinder.search with cached cost matrices.
// - Cache results for common routes (spawn -> source, storage -> controller).

// 3. Reduce RoomPosition.findPathTo CPU (196.9 total)
// - Replace repeated calls with precomputed paths.
// - Store serialized paths in memory and reuse.
// - Only recompute if destination changes or path becomes blocked.

// 4. Reduce Creep.move calls (177.3 total)
// - Ensure creeps aren't trying to move every tick unnecessarily.
// - Skip movement if already adjacent to target.
// - Combine movement logic so move() isn't called multiple times per tick.

// 5. Optimize building logic (Creep.building – 165.4 total)
// - Cache target construction sites instead of finding every tick.
// - Store site id in creep.memory and refresh only if invalid.
// - Avoid scanning entire room each tick.

// 6. Optimize harvesting logic (Creep.harvest – 162.2 total)
// - Cache source IDs per creep instead of searching each tick.
// - Assign sources at spawn time or via room manager.

// 7. Optimize controller upgrading (161.2 total)
// - Cache controller container/link positions.
// - Avoid find calls every tick.
// - Use static upgrader positions if possible.

// 8. Optimize harvestEnergyMiner helper (130.9 total)
// - Likely repeated source lookup/pathing.
// - Cache mining position and source id in creep.memory.

// 9. Optimize reserve logic (102.7 total)
// - Remote reservers should cache controller id and path.
// - Avoid repeated moveToRoom calculations.

// 10. Reduce getEnergyTargetOther scans (86.2 total)
// - Cache structure targets (containers/storage/links).
// - Only refresh when empty or invalid.

// 11. Optimize moveToRoom (68.7 total)
// - Cache exit routes between rooms.
// - Store target room exit positions.

// 12. Reduce reserveController wrapper overhead (53.5 total)
// - Ensure you aren't double-checking controller every tick unnecessarily.

// 13. Optimize porter energy target logic (46.6 total)
// - Avoid scanning all containers/spawns/extensions each tick.
// - Cache fill targets and invalidate only when full.

// 14. Optimize remote miner harvest logic (43.9 total)
// - Cache mining position and container id.
// - Avoid path recalculation every tick.

// 15. Reduce upgradeController wrapper (43.0 total)
// - Ensure creeps stay in optimal range instead of stepping in/out repeatedly.

// 16. Reduce findClosestByPath usage (39.4 total)
// - Replace with findClosestByRange when pathing isn't required.
// - Cache closest structure/source per creep.

// 17. Reduce moveByPath CPU (37.9 total)
// - Ensure paths aren't being regenerated every tick.
// - Reuse serialized paths.

// 18. Optimize getEnergyTarget (32.6 total)  
// - Cache results instead of calling Room.find repeatedly.

// 19. Reduce Room.find spam (6916 calls)
// - Even though cheap individually, reduce repeated scans.
// - Cache lists like:
//   room.sources
//   room.containers
//   room.constructionSites

// 20. Avoid excessive RoomPosition.toJSON (14931 calls)
// - This usually comes from storing RoomPosition in memory.
// - Store {x, y, roomName} manually instead of raw RoomPosition objects.