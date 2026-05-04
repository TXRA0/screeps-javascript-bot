const marketManager = {
    sellHighest: function(roomName, resourceType, cachedOrders) {
        const room = Game.rooms[roomName];
        if (!room || !room.terminal) return;

        const terminal = room.terminal;
        const amountToSell = terminal.store[resourceType];
        if (!amountToSell) return;

        const orders = cachedOrders[resourceType];
        if (!orders || !orders.length) return;

        let bestOrder = orders[0];
        for (let i = 1; i < orders.length; i++) {
            if (orders[i].price > bestOrder.price) {
                bestOrder = orders[i];
            }
        }

        const amount = Math.min(bestOrder.remainingAmount, amountToSell);
        Game.market.deal(bestOrder.id, amount, roomName);
    },

    buyLowest: function(roomName, resourceType, targetAmount, cachedOrders) {
        const room = Game.rooms[roomName];
        if (!room || !room.terminal) return;

        const terminal = room.terminal;
        const currentAmount = terminal.store[resourceType] || 0;
        if (currentAmount >= targetAmount) return;

        const orders = cachedOrders[resourceType];
        if (!orders || !orders.length) return;

        let bestOrder = orders[0];
        for (let i = 1; i < orders.length; i++) {
            if (orders[i].price < bestOrder.price) {
                bestOrder = orders[i];
            }
        }

        const amount = Math.min(bestOrder.remainingAmount, targetAmount - currentAmount);
        Game.market.deal(bestOrder.id, amount, roomName);
    },

    run: function() {
        const MINERAL_TYPES = ['H', 'O', 'U', 'L', 'K', 'Z', 'X', 'G', 'GH', 'GO'];
        const cachedBuyOrders = {};
        const cachedSellOrders = {};

        for (const mineral of MINERAL_TYPES) {
            cachedBuyOrders[mineral] = Game.market.getAllOrders(o =>
                o.type === ORDER_BUY && o.resourceType === mineral && o.remainingAmount > 0
            );
            cachedSellOrders[mineral] = Game.market.getAllOrders(o =>
                o.type === ORDER_SELL && o.resourceType === mineral && o.remainingAmount > 0
            );
        }

        for (const name in Game.rooms) {
            const room = Game.rooms[name];
            if (!room.terminal || room.terminal.store.getFreeCapacity() < 500) continue;

            const minerals = room.find(FIND_MINERALS);
            if (minerals.length === 0) continue;

            const nativeMineral = minerals[0].mineralType;
            const nativeAmount = room.terminal.store[nativeMineral] || 0;

            if (nativeAmount > 1000) {
                marketManager.sellHighest(room.name, nativeMineral, cachedBuyOrders);
            }

            for (const mineralType of MINERAL_TYPES) {
                if (mineralType === nativeMineral) continue;

                const amount = room.terminal.store[mineralType] || 0;
               
                if (amount < 1000 && Game.market.credits > 2000000) {
                    marketManager.buyLowest(room.name, mineralType, 1000, cachedSellOrders);
                }
            }

            break;
        }
    }
};

module.exports = marketManager;