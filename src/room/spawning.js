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
		{type: "hauler", priority: 2},
		{type: "upgrader", priority: 3},
		{type: "builder", priority: 4}
	];
	let creepTypeNeeded = _.find(
		_.sortBy(creepTypes, "priority"),
		t => creepLogic[t.type].spawn(room)
	);
	// lists all the creep types to console
    _.forEach(creepTypes, t => console.log(t.type));

    // get the data for spawning a new creep of creepTypeNeeded
    if (!creepTypeNeeded) return;  // stop if nothing needs spawning
	let creepSpawnData = creepLogic[creepTypeNeeded.type].spawnData(room);
    console.log(room, JSON.stringify(creepSpawnData));

    if (creepSpawnData) {
        console.log("Final body:", JSON.stringify(getBody(creepSpawnData.body, room)));
        let spawn = room.find(FIND_MY_SPAWNS)[0];
        let result = spawn.spawnCreep(getBody(creepSpawnData.body, room), creepSpawnData.name, {memory: creepSpawnData.memory});
    
        console.log("Tried to Spawn:", creepTypeNeeded.type, result);
    }
}

module.exports = spawnCreeps;