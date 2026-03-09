var roleBuilder = {

    /** @param {Creep} creep **/
    run: function(creep) {
        if(creep.memory.working && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.working = false;
            creep.say('🔄 harvest');
        }
        if(!creep.memory.working && creep.store.getFreeCapacity() == 0) {
            creep.memory.working = true;
            creep.say('🚧 build');
        }

        if(creep.memory.working) {
            var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
            if(targets.length) {
                if(creep.build(targets[0]) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
                }
            }
        }
        else {
			creep.getEnergyTargetOther();
        }
    },
    // checks if the room needs to spawn a creep
    spawn: function(room) {
		let builderTarget = _.get(room.memory, ['census', 'builder'], 2);
		let builders = _.filter(Game.creeps, c => c.memory.role === 'builder' && c.room.name === room.name);
		console.log('Builders: ' + builders.length, room.name);
		let sites = room.find(FIND_CONSTRUCTION_SITES);

		if (sites.length > 0 && builders.length < builderTarget) {
			return true;
		}

    },
    // returns an object with the data to spawn a new creep
    spawnData: function(room) {
            let name = 'Builder' + Game.time;
            let body = [WORK, CARRY, MOVE];
            let memory = {role: 'builder', homeRoom: room.name};
        
            return {name, body, memory};
    }
};

module.exports = roleBuilder;