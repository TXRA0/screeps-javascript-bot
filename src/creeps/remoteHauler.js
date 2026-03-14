var remoteHauler = {

    run: function(creep) {

        if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
        }

        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
            delete creep.memory.energyTarget;
            delete creep.memory.target;
        }

        if (creep.memory.working) {

            if (creep.room.name !== creep.memory.homeRoom) {
                creep.moveToRoom(creep.memory.homeRoom);
                return;
            }

            let target = Game.getObjectById(creep.memory.target);

            if (!target || target.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {

                target = creep.getEnergyHaulTargetRemote();

                if (target) {
                    creep.memory.target = target.id;
                } else {
                    creep.memory.target = null;
                }
            }

            if (target) {
                if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            }

        } else {

            if (creep.room.name !== creep.memory.remoteRoom) {
                creep.moveToRoom(creep.memory.remoteRoom);
                return;
            }

            creep.getEnergyTarget();
        }
    },

    getBody: function(room) {

        let segment = [CARRY, CARRY, MOVE, MOVE];

        let harvesters = _.filter(
            Game.creeps,
            c => c.memory.role === 'harvester' && c.room.name === room.name
        );

        let energyAvailable = harvesters.length ? room.energyCapacityAvailable : room.energyAvailable;

        let segmentCost = _.sum(segment, p => BODYPART_COST[p]);

        let maxSegments = Math.max(1, Math.floor(energyAvailable / segmentCost));
        maxSegments = Math.min(maxSegments, 12);

        let body = [];

        for (let i = 0; i < maxSegments; i++) {
            body.push(...segment);
        }

        return body;
    },

    getSpawnData: function(room) {
        return {
            name: "RemoteHauler" + Game.time,
            memory: {
                role: 'remoteHauler',
                homeRoom: room.name,
                working: false
            }
        };
    }

};

module.exports = remoteHauler;
