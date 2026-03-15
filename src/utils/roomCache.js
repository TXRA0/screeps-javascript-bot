global.RoomCache = {

    getRoomMemory(room) {
        if (!room) return null;
        return Memory.rooms[room.name] || null;
    },

    getSources(room) {
        const mem = Memory.rooms[room.name];
        if (!mem || !mem.sources) return [];

        if (!room._sources) {
            room._sources = Utils.inflate(mem.sources)
                .map(id => Game.getObjectById(id))
                .filter(Boolean);
        }

        return room._sources;
    },

    getSourceContainers(room) {
        const mem = Memory.rooms[room.name];
        if (!mem || !mem.sourceContainers) return [];

        if (!room._sourceContainers) {
            room._sourceContainers = Utils.inflate(mem.sourceContainers)
                .map(id => Game.getObjectById(id))
                .filter(Boolean);
        }

        return room._sourceContainers;
    },

    getStructures(room) {
        const mem = Memory.rooms[room.name];
        if (!mem || !mem.structures) return [];

        if (!room._structures) {
            room._structures = Utils.inflate(mem.structures)
                .map(id => Game.getObjectById(id))
                .filter(Boolean);
        }

        return room._structures;
    },

    getSpawns(room) {
        const mem = Memory.rooms[room.name];
        if (!mem || !mem.spawns) return [];

        if (!room._spawns) {
            room._spawns = Utils.inflate(mem.spawns)
                .map(id => Game.getObjectById(id))
                .filter(Boolean);
        }

        return room._spawns;
    },

    getTowers(room) {
        const mem = Memory.rooms[room.name];
        if (!mem || !mem.towers) return [];

        if (!room._towers) {
            room._towers = Utils.inflate(mem.towers)
                .map(id => Game.getObjectById(id))
                .filter(Boolean);
        }

        return room._towers;
    },

    getExtensions(room) {
        const mem = Memory.rooms[room.name];
        if (!mem || !mem.extensions) return [];

        if (!room._extensions) {
            room._extensions = Utils.inflate(mem.extensions)
                .map(id => Game.getObjectById(id))
                .filter(Boolean);
        }

        return room._extensions;
    },

    getLinks(room) {
        const mem = Memory.rooms[room.name];
        if (!mem || !mem.links) return [];

        if (!room._links) {
            room._links = Utils.inflate(mem.links)
                .map(id => Game.getObjectById(id))
                .filter(Boolean);
        }

        return room._links;
    },

    getStorage(room) {
        const mem = Memory.rooms[room.name];
        if (!mem || !mem.storage) return null;

        if (!room._storage) {
            room._storage = Game.getObjectById(mem.storage);
        }

        return room._storage;
    },

    getTerminal(room) {
        const mem = Memory.rooms[room.name];
        if (!mem || !mem.terminal) return null;

        if (!room._terminal) {
            room._terminal = Game.getObjectById(mem.terminal);
        }

        return room._terminal;
    },

    getController(room) {
        return room.controller || null;
    },

    getSourcePositions(room) {
        const mem = Memory.rooms[room.name];
        if (!mem || !mem.sourcePositions) return [];
        return mem.sourcePositions;
    },

    isMine(room) {
        const mem = Memory.rooms[room.name];
        if (!mem) return false;
        return mem.mine || false;
    }

};