var porter = {

    /** @param {Creep} creep **/
    run: function(creep) {
			creep.say([
			"We rise",
			"as _TXR",
			"the empire",
			"the pure",
			"the strong",
			"the crown",
			"no mercy",
			"no doubt",
			"our will",
			"unchained",
			"shard 3",
			"is ours",
			"all else",
			"kneels"
		][Game.time % 14], true);
        if(creep.memory.working && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.working = false;
            creep.say('🔄 harvest');
        }
        if(!creep.memory.working && creep.store.getFreeCapacity() == 0) {
            creep.memory.working = true;
            creep.say('🚧 filling');
        }

        if(creep.memory.working) {
			const target = creep.getEnergyHaulTargetPorter();
			if (target) {
				if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
					creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
				}
			} else {
				creep.say('sleep', true);
			}
        }
        else {
			creep.getEnergyTargetPorter();
        }
    },
    // checks if the room needs to spawn a creep
    spawn: function(room) {
        var porters = _.filter(Game.creeps, (creep) => creep.memory.role == 'porter' && creep.room.name == room.name);
        console.log('Porter: ' + porters.length, room.name);

        if (porters.length < 1) {
            return true;
        }
    },
    // returns an object with the data to spawn a new creep
	spawnData: function(room) {
		let name = 'Porter' + Game.time;
		let body = [CARRY, CARRY, MOVE];
		let targetRoom = room;
		let memory = { role: 'porter', targetRoom: targetRoom };

		let spawnCondition = () => {
			return room.controller.level >= 4 && room.find(FIND_STRUCTURES).some(s => s.structureType === STRUCTURE_STORAGE);
		};

		return { name, body, memory, spawnCondition };
	}
};

module.exports = porter;