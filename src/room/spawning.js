let creepLogic = require("../creeps/index");
let creepTypes = _.keys(creepLogic);
//change to work with defcon once added
function getBody(segment, room) {
    let body = [];
    let harvesters = _.filter(
        Game.creeps,
        c => c.memory.role === 'harvester' && c.room.name === room.name
    );
    let energyAvailable = harvesters.length ? room.energyCapacityAvailable : room.energyAvailable;
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
function spawnCreeps(room) {
    const creepTypes = [
		{type: "harvester", priority: 1},
		{type: "porter", priority: 2},  // <— give porter higher priority
		{type: "hauler", priority: 3},
		{type: "upgrader", priority: 4},
		{type: "builder", priority: 5},
	];

    // find the first creep type that wants to spawn (by priority)
    let creepTypeNeeded = _.find(
        _.sortBy(creepTypes, "priority"),
        t => {
            if (!creepLogic[t.type].spawn(room)) return false;

            // get the spawnData to check optional condition
            let spawnData = creepLogic[t.type].spawnData(room);
            if (spawnData.spawnCondition) {
                return spawnData.spawnCondition(); // only spawn if condition passes
            }

            return true;
        }
    );

    if (!creepTypeNeeded) return;

    let creepSpawnData = creepLogic[creepTypeNeeded.type].spawnData(room);

    let spawn = room.find(FIND_MY_SPAWNS)[0];
    if (!spawn) return;

    let body = getBody(creepSpawnData.body, room);
    let result = spawn.spawnCreep(body, creepSpawnData.name, { memory: creepSpawnData.memory });

    console.log(`Tried to spawn ${creepTypeNeeded.type}:`, result, JSON.stringify(body));
}
module.exports = spawnCreeps;