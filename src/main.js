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