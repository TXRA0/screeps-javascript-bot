var hauler = {

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

        if(creep.memory.working) {
			const target = creep.getEnergyHaulTarget();
			if (target) {
				if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
					creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
				}
			} else {
				creep.say('sleep', true);
			}
        }
        else {
			creep.getEnergyTarget();
        }
    },
    // checks if the room needs to spawn a creep
    spawn: function(room) {
        var haulers = _.filter(Game.creeps, (creep) => creep.memory.role == 'hauler' && creep.room.name == room.name);
        console.log('Haulers: ' + haulers.length, room.name);

        if (haulers.length < 2) {
            return true;
        }
    },
    // returns an object with the data to spawn a new creep
    spawnData: function(room) {
            let name = 'Hauler' + Game.time;
            let body = [CARRY, MOVE];
			let targetRoom = room
            let memory = {role: 'hauler', targetRoom: targetRoom};
        
            return {name, body, memory};
    }
};

module.exports = hauler;