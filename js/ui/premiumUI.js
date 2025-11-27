// js/ui/premiumUI.js
import { escapeHTML } from './coreUI.js';

let selectedPackage = null;
let discountInfo = null;
let appliedCoupon = { code: null, percent: 0 };

function updateOrderSummary() {
    const summaryEl = document.getElementById('order-summary');
    if (!summaryEl || !selectedPackage) {
        summaryEl.innerHTML = '<p>Please select a package first.</p>';
        return;
    }

    let finalPrice = selectedPackage.price;
    let discountHTML = '';

    if (discountInfo.site_wide_enabled && discountInfo.site_wide_percent > 0) {
        const discountAmount = finalPrice * (discountInfo.site_wide_percent / 100);
        finalPrice -= discountAmount;
        discountHTML = `<p class="text-red-600">Site Discount (${discountInfo.site_wide_percent}%): -৳${discountAmount.toFixed(2)}</p>`;
    } else if (appliedCoupon.code && appliedCoupon.percent > 0) {
        const discountAmount = finalPrice * (appliedCoupon.percent / 100);
        finalPrice -= discountAmount;
        discountHTML = `<p class="text-green-600">Coupon "${escapeHTML(appliedCoupon.code)}" (${appliedCoupon.percent}%): -৳${discountAmount.toFixed(2)}</p>`;
    }

    summaryEl.innerHTML = `
        <p><strong>Package:</strong> ${escapeHTML(selectedPackage.name)}</p>
        <p><strong>Price:</strong> ৳${selectedPackage.price.toFixed(2)}</p>
        ${discountHTML}
        <p class="font-bold text-xl border-t pt-2 mt-2"><strong>Total:</strong> ৳${finalPrice.toFixed(2)}</p>
    `;
}

export function renderPremiumPackages(data) {
    const packagesContainer = document.getElementById('premium-packages-container');
    const discountAlert = document.getElementById('site-wide-discount-alert');
    const couponArea = document.getElementById('coupon-code-area');
    if (!packagesContainer) return;

    const { packages, discount_info } = data;
    discountInfo = discount_info;
    packagesContainer.innerHTML = '';

    if (discount_info.site_wide_enabled && discount_info.site_wide_percent > 0) {
        discountAlert.classList.remove('hidden');
        discountAlert.innerHTML = `🎉 Special Offer! Get a <strong>${discount_info.site_wide_percent}%</strong> discount on all packages!`;
        couponArea.classList.add('hidden');
    } else {
        discountAlert.classList.add('hidden');
        if(discount_info.coupon_system_enabled) {
            couponArea.classList.remove('hidden');
        } else {
             couponArea.classList.add('hidden');
        }
    }

    packages.forEach(pkg => {
        const card = document.createElement('div');
        card.className = 'p-6 bg-white/60 rounded-lg border-2 border-transparent cursor-pointer premium-package-card';
        card.dataset.packageId = pkg.id;

        card.innerHTML = `
            <h3 class="text-2xl font-bold text-violet-700">${escapeHTML(pkg.name)}</h3>
            <p class="text-4xl font-extrabold my-4">৳${pkg.price.toFixed(0)}</p>
            <p class="text-sm text-gray-500">${pkg.duration_days} days of premium access</p>
        `;
        
        card.addEventListener('click', () => {
            document.querySelectorAll('.premium-package-card').forEach(c => c.classList.remove('border-violet-500', 'ring-2', 'ring-violet-300'));
            card.classList.add('border-violet-500', 'ring-2', 'ring-violet-300');
            document.getElementById('selected-package-id').value = pkg.id;
            selectedPackage = pkg;
            appliedCoupon = { code: null, percent: 0 }; // Reset coupon on new selection
            document.getElementById('coupon-code-input').value = '';
            updateOrderSummary();
        });

        packagesContainer.appendChild(card);
    });
    
    updateOrderSummary(); // Initial render of summary
}