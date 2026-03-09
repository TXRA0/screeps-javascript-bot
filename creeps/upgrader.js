var roleUpgrader = {
    run: function(creep) {
        if(creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
            creep.say('🔄');
        }
        if(!creep.memory.working && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.working = true;
            creep.say('🚧');
        }

        if(creep.memory.working) {
            if(creep.upgradeController(creep.room.controller) === ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, {visualizePathStyle: {stroke: '#ffffff'}});
            }
        } else {
			creep.getEnergyTarget();
        }
    },

    spawn: function(room) {
        var upgraders = _.filter(Game.creeps, (creep) => creep.memory.role === 'upgrader' && creep.room.name === room.name);
		console.log('Upgraders: ' + upgraders.length, room.name);
		if(upgraders.length < 2) {
            return true;
        }
        return false;
    },

    spawnData: function(room) {
        let name = 'Upgrader' + Game.time;
        let body = [WORK, WORK, CARRY, MOVE];
        let memory = {role: 'upgrader'};
        return {name, body, memory};
    }
};

module.exports = roleUpgrader;