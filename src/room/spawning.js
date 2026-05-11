let remoteManager = require("../managers/remoteManager");
let creepLogic = require("../creeps/index");
let creepTypes = _.keys(creepLogic);

function runSpawner(room) {

    Memory.rooms = Memory.rooms || {};
    Memory.rooms[room.name] = Memory.rooms[room.name] || {};
    Memory.rooms[room.name].spawnQueue = Memory.rooms[room.name].spawnQueue || [];

    for (let role of creepTypes) {
        if (role.startsWith("remote")) continue;
        if (creepLogic[role].spawn) {
            creepLogic[role].spawn(room);
        }
    }

    remoteManager.run(room);

    spawnCreeps(room);
}

function spawnCreeps(room) {
    if (!Memory.rooms || !Memory.rooms[room.name] || !Memory.rooms[room.name].spawnQueue || !Memory.rooms[room.name].spawnQueue.length) return;

    let spawns = room.find(FIND_MY_SPAWNS);

    _.forEach(spawns, spawn => {
        if (!spawn || spawn.spawning) return;

        Memory.rooms[room.name].spawnQueue = _.sortBy(Memory.rooms[room.name].spawnQueue, "priority");
        let queue = Memory.rooms[room.name].spawnQueue;

        let request = queue[0];
        if (!request) return;

        let body = creepLogic[request.role].getBody(room, request.remoteRoom);
        let creepSpawnData = creepLogic[request.role].getSpawnData(room);

        let memory = creepSpawnData.memory || {};
        if (request.remoteRoom) memory.remoteRoom = request.remoteRoom;
		let creepName = creepSpawnData.name + randomWord()

        let result = spawn.spawnCreep(body, creepName, { memory: memory });

        console.log(`${spawn.name} tried to spawn ${request.role}, ${creepName}:`, result, JSON.stringify(body));

        if (result === OK) {
            Memory.rooms[room.name].spawnQueue.shift();
        }
    });
}
function randomWord() {
    const letters = "abcdefghijklmnopqrstuvwxyz";
    let word = "";
    for (let i = 0; i < 3; i++) {
        word += letters[Math.floor(Math.random() * letters.length)];
    }
    return word;
}


module.exports = runSpawner;
