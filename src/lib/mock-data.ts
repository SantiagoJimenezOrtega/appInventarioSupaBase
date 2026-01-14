import { Product, Branch, StockMovement } from './types';

interface CostLayer {
    movementId: string;
    quantity: number;
    purchasePrice: number;
    purchaseDate: string;
}

interface InventoryItem {
    productId: string;
    productName: string;
    sellingPrice: number;
    totalQuantityAcrossAllBranches: number;
    totalValueAcrossAllBranches: number;
    branches: {
        branchId: string;
        branchName: string;
        quantityInBranch: number;
        valueInBranch: number;
        costLayers: CostLayer[];
    }[];
}

export function generateFIFOInventory(
    products: Product[],
    branches: Branch[],
    stockMovements: StockMovement[]
): InventoryItem[] {
    // 1. Sort movements by date ASC (oldest first)
    const sorted = [...stockMovements].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // 2. Structure: Map<productId, Map<branchId, { quantity, costLayers }>>
    const inventory = new Map<string, Map<string, { quantity: number; costLayers: CostLayer[] }>>();

    // 3. Process each movement
    for (const mov of sorted) {
        const { product_id, branch_id, type, quantity, price_at_transaction, date, id } = mov;

        // Initialize if not exists
        if (!inventory.has(product_id)) inventory.set(product_id, new Map());
        const prodInv = inventory.get(product_id)!;

        if (!prodInv.has(branch_id)) prodInv.set(branch_id, { quantity: 0, costLayers: [] });
        const branchInv = prodInv.get(branch_id)!;

        if (type === 'inflow' || type === 'conversion' || (type === 'transfer' && mov.comment?.includes('desde'))) {
            // NOTE: Transfer logic needs careful handling. 
            // In the prompt, transfer creates 2 movements: 
            // 1. outflow from origin
            // 2. inflow to destination
            // So 'inflow' covers regular inflows. 
            // 'transfer' type in DB might be just 'transfer' but logic needs to know if it's in or out?
            // The PROMPT says: 
            // Transfer -> Outflow Ref (type='outflow'), Inflow Ref (type='inflow').
            // Wait, the prompt API code for 'transfer' creates:
            // Outflow doc: type='outflow'
            // Inflow doc: type='inflow'
            // So actually 'transfer' logic uses 'inflow' and 'outflow' types in the DB records?
            // Let's check the API code provided in prompt.
            // "type: 'outflow'" and "type: 'inflow'".
            // Ah, so strictly speaking the DB `type` will be `inflow` or `outflow`.
            // BUT the prompt ALSO says `type: 'transfer'` in the switch cases?
            // Re-reading API: 
            // `else if (type === 'transfer') { ... batch.set(..., { type: 'outflow' ... }); batch.set(..., { type: 'inflow' ... }); }`
            // So the movements saved to DB are ALWAYS 'inflow' or 'outflow'?
            // NO. The checking `if (type === 'transfer')` is in the API handler for the REQUEST body.
            // The DB docs created have `type: 'outflow'` and `type: 'inflow'`.
            // SO, `stockMovements` loaded from DB will only have `inflow` or `outflow`.
            // WAIT. conversion also creates outflow and inflow.
            // SO the loop only needs to handle `inflow` and `outflow`.

            // However, if the user manually saves 'transfer' type in DB, we should handle it.
            // But assuming the API logic is followed, they are decomposed.
            // Let's stick to inflow/outflow as primarily logic.

            if (type === 'inflow') {
                branchInv.quantity += Number(quantity);
                branchInv.costLayers.push({
                    movementId: id,
                    quantity: Number(quantity),
                    purchasePrice: Number(price_at_transaction || 0),
                    purchaseDate: date
                });
            }
        }

        // Check for Outflow
        if (type === 'outflow') {
            let remaining = Number(quantity);
            branchInv.quantity -= remaining;

            // Consume FIFO layers -> oldest first
            while (remaining > 0 && branchInv.costLayers.length > 0) {
                const oldest = branchInv.costLayers[0];
                if (oldest.quantity <= remaining) {
                    remaining -= oldest.quantity;
                    branchInv.costLayers.shift(); // Remove used up layer
                } else {
                    oldest.quantity -= remaining;
                    remaining = 0;
                }
            }
        }
    }

    // 4. Generate array
    const items: InventoryItem[] = [];

    for (const [productId, prodInv] of inventory) {
        const product = products.find(p => p.id === productId);
        if (!product) continue;

        const branchDetails = [];
        let totalQty = 0;
        let totalValue = 0;

        for (const [branchId, branchInv] of prodInv) {
            const branch = branches.find(b => b.id === branchId);
            const branchName = branch ? branch.name : 'Unknown Branch';

            // Value is sum of remaining layers
            const value = branchInv.costLayers.reduce((sum, layer) =>
                sum + (layer.quantity * layer.purchasePrice), 0
            );

            if (branchInv.quantity !== 0) { // Show even if negative? Or only positive? Prompt says > 0.
                // Assuming > 0 for display, but logic might allow negative temporarily if data err.
                // Prompt: if (branchInv.quantity > 0)
                if (branchInv.quantity > 0) {
                    branchDetails.push({
                        branchId,
                        branchName,
                        quantityInBranch: branchInv.quantity,
                        valueInBranch: value,
                        costLayers: branchInv.costLayers
                    });
                    totalQty += branchInv.quantity;
                    totalValue += value;
                }
            }
        }

        if (totalQty > 0) {
            items.push({
                productId,
                productName: product.name,
                sellingPrice: product.price,
                totalQuantityAcrossAllBranches: totalQty,
                totalValueAcrossAllBranches: totalValue,
                branches: branchDetails
            });
        }
    }

    return items;
}
