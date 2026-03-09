Creep.prototype.sayHello = function sayHello() {
    this.say("Hello", true);
}
Creep.prototype.findEnergySource = function() {
	const sources = this.room.find(FIND_SOURCES);
	if (sources.length) {
		this.memory.source = sources[0].id;
		return sources[0];
	}
};

Creep.prototype.moveToRoom = function moveToRoom(roomName) {
	this.moveTo(new RoomPosition(25, 25, roomName));
}
Creep.prototype.harvestEnergy = function harvestEnergy() {
	let storedSource = Game.getObjectById(this.memory.source);
	
	if (!storedSource || (!storedSource.pos.getOpenPositions().length && !this.pos.isNearTo(storedSource))) {
		delete this.memory.source;
		storedSource = this.findEnergySource();
	} 
	if (storedSource) {
		if (this.pos.isNearTo(storedSource)) {
			this.harvest(storedSource);
		} else {
			this.moveTo(storedSource);
		}
	}
}

Creep.prototype.getEnergyHaulTarget = function(roomState = "normal") {
    let priorityTables = {
        normal: {
            STRUCTURE_SPAWN: 1,
            STRUCTURE_EXTENSION: 1,
            STRUCTURE_TOWER: 2,
            STRUCTURE_CONTAINER: 3,
            STRUCTURE_STORAGE: 4,
            STRUCTURE_LAB: 5,
        },
        underAttack: {
            STRUCTURE_SPAWN: 1,
            STRUCTURE_EXTENSION: 2,
            STRUCTURE_TOWER: 1,
            STRUCTURE_CONTAINER: 3,
            STRUCTURE_STORAGE: 4,
            STRUCTURE_LAB: 5,
        },
        porter: {
            STRUCTURE_SPAWN: 2,
            STRUCTURE_EXTENSION: 2,
            STRUCTURE_TOWER: 3,
            STRUCTURE_CONTAINER: 2,
            STRUCTURE_STORAGE: 1,
            STRUCTURE_LAB: 3,
        }
    };

    const table = priorityTables[roomState] || priorityTables.normal;

    let targets = this.room.find(FIND_MY_STRUCTURES).filter(s => {
        return s.store && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
    });

    if (targets.length === 0) return null;

    targets.sort((a, b) => {
        let priorityDiff = (table[a.structureType] || 99) - (table[b.structureType] || 99);
        if (priorityDiff !== 0) return priorityDiff;

        return this.pos.getRangeTo(a) - this.pos.getRangeTo(b);
    });
    let target = targets[0];

    if (target) {
        if(this.transfer(RESOURCE_ENERGY, target) == ERR_NOT_IN_RANGE) {
            this.moveTo(target);
        }
    }
};
Creep.prototype.getEnergyTarget = function (sourceContainers = null) {
    if (sourceContainers && sourceContainers.length > 0) {
        const richest = _.max(sourceContainers, c => c.store.getUsedCapacity(RESOURCE_ENERGY));

        if (richest && richest.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            if (this.withdraw(richest, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                this.moveTo(richest, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
            return richest;
        }
    }

    const dropped = this.room.find(FIND_DROPPED_RESOURCES, {
        filter: r => r.resourceType === RESOURCE_ENERGY
    });

    if (dropped.length > 0) {
        const richestDrop = _.max(dropped, r => r.amount);
        if (this.pickup(richestDrop) === ERR_NOT_IN_RANGE) {
            this.moveTo(richestDrop, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
        return richestDrop;
    }

    return null;
};