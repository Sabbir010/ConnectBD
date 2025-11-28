// js/ui/usernameShopUI.js

export function renderUsernameShop(data) {
    const { costs, username } = data;

    const permanentCostEl = document.getElementById('permanent-cost-display');
    if (permanentCostEl) {
        permanentCostEl.textContent = `${costs.permanent} TK`;
    }

    const colorBalanceEl = document.getElementById('color-cost-balance');
    if (colorBalanceEl) {
        colorBalanceEl.textContent = `${costs.color_balance} TK`;
    }
    
    const colorGoldEl = document.getElementById('color-cost-gold');
    if (colorGoldEl) {
        colorGoldEl.textContent = `${costs.color_gold} Gold`;
    }

    if (costs.color_balance === 0) {
        const buyColorBalanceBtn = document.getElementById('buy-color-balance');
        if (buyColorBalanceBtn) {
            buyColorBalanceBtn.textContent = 'Change for Free (Verified)';
        }
        const buyColorGoldBtn = document.getElementById('buy-color-gold');
        if (buyColorGoldBtn) {
            buyColorGoldBtn.classList.add('hidden');
        }
    }

    const monthlyInput = document.getElementById('monthly-username-input');
    if (monthlyInput) {
        monthlyInput.value = username;
    }

    const yearlyInput = document.getElementById('yearly-username-input');
    if (yearlyInput) {
        yearlyInput.value = username;
    }

    updateCosts('monthly-username-input', username, data);
    updateCosts('yearly-username-input', username, data);
}

export function updateCosts(inputId, value, shopInfo) {
    const { costs } = shopInfo;
    
    let displayId = '';
    let costPerLetter = 0;
    
    if (inputId.startsWith('monthly')) {
        displayId = 'monthly-cost-display';
        costPerLetter = costs.monthly;
    } else if (inputId.startsWith('yearly')) {
        displayId = 'yearly-cost-display';
        costPerLetter = costs.yearly;
    } else {
        return;
    }

    const costDisplay = document.getElementById(displayId);
    if (!costDisplay) return;
    
    costDisplay.classList.remove('text-red-500');
    const capitalLetters = (value.match(/[A-Z]/g) || []).length;
    const totalCost = capitalLetters * costPerLetter;
    costDisplay.textContent = `${totalCost} TK`;
}