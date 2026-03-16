var remoteDefender = {

    run: function(creep) {

        if (creep.room.name !== creep.memory.remoteRoom) {
            creep.moveToRoom(creep.memory.remoteRoom);
            return;
        }

        let hostile = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if (hostile) {
            if (creep.attack(hostile) === ERR_NOT_IN_RANGE) {
                creep.moveTo(hostile, { visualizePathStyle: { stroke: '#ff0000' } });
            }
            return;
        }
    },
    getBody: function(room) {
        let segment = [ATTACK, MOVE];
        let segmentCost = BODYPART_COST[ATTACK] + BODYPART_COST[MOVE];

        let energyAvailable = room.energyCapacityAvailable;

        let maxSegments = Math.floor(energyAvailable / segmentCost);
        if (maxSegments < 1) maxSegments = 1;
        if (maxSegments > 25) maxSegments = 25;

        let body = [];
        for (let i = 0; i < maxSegments; i++) {
            body.push(ATTACK, MOVE);
        }

        return body;
    },

    getSpawnData: function(room) {
        return {
            name: "Remote_Defender" + Game.time,
            memory: {
                role: "remoteDefender",
                homeRoom: room.name,
                working: false
            }
        };
    }
};

module.exports = remoteDefender;