let prototypes = require('./prototypes');
let creepLogic = require('./creeps');
let roomLogic = require('./room');
let roomManager = require('./managers/roomManager')

let lastMemoryTick
let lastMemory

function tryInitSameMemory() {
	const startCPU = Game.cpu.getUsed()
	let reused = false

	if (lastMemoryTick && lastMemory && Game.time === lastMemoryTick + 1) {
		delete global.Memory
		global.Memory = lastMemory
		RawMemory._parsed = lastMemory
		reused = true
	} else {
		Memory
		lastMemory = RawMemory._parsed
	}

	lastMemoryTick = Game.time
	const endCPU = Game.cpu.getUsed()
	console.log(`[MemHack] CPU: ${(endCPU - startCPU).toFixed(3)} | Reused: ${reused}`)
}

module.exports.loop = function () {
	tryInitSameMemory()
    // make a list of all of our rooms
    Game.myRooms = _.filter(Game.rooms, r => r.controller && r.controller.level > 0 && r.controller.my);

    // run spawn logic for each room in our empire
    _.forEach(Game.myRooms, r => roomLogic.spawning(r));
	// run defense logic for each room in our empire
	_.forEach(Game.myRooms, r => roomLogic.defense(r));
	
	_.forEach(Game.myRooms, r => roomManager.run(r))
    // run each creep role see /creeps/index.js
    for(var name in Game.creeps) {
        var creep = Game.creeps[name];

        let role = creep.memory.role;
        if (creepLogic[role]) {
            creepLogic[role].run(creep);
        }
    }

    // free up memory if creep no longer exists
    for(var name in Memory.creeps) {
        if(!Game.creeps[name]) {
            delete Memory.creeps[name];
            console.log('Clearing non-existing creep memory:', name);
        }
    }
}