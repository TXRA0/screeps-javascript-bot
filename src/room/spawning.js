let creepLogic = require("../creeps/index");
let creepTypes = _.keys(creepLogic);

// change to work with defcon once added
function getBody(segment, room) {
    let body = [];

    let harvesters = _.filter(
        Game.creeps,
        c => c.memory.role === 'harvester' && c.room.name === room.name
    );

    let energyAvailable = harvesters.length
        ? room.energyCapacityAvailable
        : room.energyAvailable;

    let totalSegCost = _.sum(segment, part => BODYPART_COST[part]);

    if (energyAvailable < totalSegCost) {
        let minBody = [];

        for (let part of segment) {
            if (BODYPART_COST[part] <= energyAvailable) {
                minBody.push(part);
                energyAvailable -= BODYPART_COST[part];
            }
        }

        return minBody;
    }

    let maxSegments = Math.floor(energyAvailable / totalSegCost);

    for (let i = 0; i < maxSegments; i++) {
        body.push(...segment);
    }

    return body;
}

function requestSpawn(room, role) {

    Memory.rooms = Memory.rooms || {};
    Memory.rooms[room.name] = Memory.rooms[room.name] || {};
    Memory.rooms[room.name].spawnQueue = Memory.rooms[room.name].spawnQueue || [];

    const queue = Memory.rooms[room.name].spawnQueue;

    if (!queue.find(r => r.role === role)) {
        queue.push({
            role: role,
            priority: getSpawnPriority(role)
        });
    }
}

function getSpawnPriority(role) {
    const priorities = {
        harvester: 1,
        hauler: 2,
        defender: 3,
        builder: 4,
        upgrader: 5,
        attacker: 6
    };

    return priorities[role] || 10;
}

function spawnCreeps(room) {
    if (!Memory.rooms || !Memory.rooms[room.name] || !Memory.rooms[room.name].spawnQueue || !Memory.rooms[room.name].spawnQueue.length) {
        return;
    }

    let spawn = room.find(FIND_MY_SPAWNS)[0];
    if (!spawn || spawn.spawning) return;

    let queue = Memory.rooms[room.name].spawnQueue;

    queue = _.sortBy(queue, "priority");

    let request = queue[0];
    if (!request) return;

    let body = creepLogic[request.role].getBody(room);
    let creepSpawnData = creepLogic[request.role].getSpawnData(room);

    let result = spawn.spawnCreep(
        body,
        creepSpawnData.name,
        { memory: creepSpawnData.memory }
    );

    console.log(`Tried to spawn ${request.role}:`, result, JSON.stringify(body));

    if (result === OK) {
        Memory.rooms[room.name].spawnQueue.shift();
    }
}

function runSpawner(room) {

    Memory.rooms = Memory.rooms || {};
    Memory.rooms[room.name] = Memory.rooms[room.name] || {};
    Memory.rooms[room.name].spawnQueue = Memory.rooms[room.name].spawnQueue || [];

    for (let role of creepTypes) {

        if (creepLogic[role].spawn) {
            creepLogic[role].spawn(room);
        }

    }

    spawnCreeps(room);
}

module.exports = runSpawner;