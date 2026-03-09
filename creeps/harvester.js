var harvester = {

    /** @param {Creep} creep **/
    run: function(creep) {
        if(creep.memory.working && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.working = false;
            creep.say('🔄 harvest');
        }
        if(!creep.memory.working && creep.store.getFreeCapacity() == 0) {
            creep.memory.working = true;
            creep.say('🚧 filling');
        }
		var haulers = _.filter(Game.creeps, (c) => c.memory.role == 'hauler' && c.room.name == creep.room.name);
		if (!haulers.length) {
			if(creep.memory.working) {
				var targets = creep.room.find(FIND_MY_STRUCTURES);
				targets = _.filter(targets, function(struct){
					return (struct.structureType == STRUCTURE_TOWER || struct.structureType == STRUCTURE_EXTENSION || struct.structureType == STRUCTURE_SPAWN) && struct.store.getFreeCapacity(RESOURCE_ENERGY);
				})
				if(targets.length) {
					let target = creep.pos.findClosestByRange(targets);

					if(creep.pos.isNearTo(target)) {
						creep.transfer(target, RESOURCE_ENERGY);
					} else {
						creep.moveTo(target);
					}
				}
			}
			else {
				creep.harvestEnergy();
			}
		} else {
			creep.harvestEnergyMiner();
		}
    },
    // checks if the room needs to spawn a creep
    spawn: function(room) {
        var harvesters = _.filter(Game.creeps, (creep) => creep.memory.role == 'harvester' && creep.room.name == room.name);
        console.log('Harvesters: ' + harvesters.length, room.name);

        if (harvesters.length < 2) {
            return true;
        }
    },
    // returns an object with the data to spawn a new creep
    spawnData: function(room) {
            let name = 'Harvester' + Game.time;
            let body = [WORK, CARRY, MOVE];
            let memory = {role: 'harvester'};
        
            return {name, body, memory};
    }
};

module.exports = harvester;