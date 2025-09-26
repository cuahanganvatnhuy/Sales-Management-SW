// Profit Management JavaScript
let profitData = {
    total: 0,
    tmdt: 0,
    wholesale: 0,
    retail: 0
};

let salesOrdersData = {};
let currentDateRange = {
    startDate: null,
    endDate: null
};

// Global variables for profit management
let currentView = 'overview';
let profitChart = null;
let trendChart = null;

// Chart instances
const profitCharts = {
    pieChart: null,
    trendChart: null,
    platformChart: null
};

// Fee display toggle functions
function toggleFeeDisplay(feeType) {
    // Map fee types to their corresponding card classes
    const feeTypeMapping = {
        'shipping-cost': 'fee-shipping-cost',
        'packaging-cost': 'fee-packaging-cost', 
        'storage-cost': 'fee-storage-cost',
        'marketing-cost': 'fee-marketing-cost',
        'staff-cost': 'fee-staff-cost',
        'rent-cost': 'fee-rent-cost',
        'utility-cost': 'fee-utility-cost',
        'insurance-cost': 'fee-insurance-cost',
        'equipment-cost': 'fee-equipment-cost',
        'admin-cost': 'fee-admin-cost'
    };
    
    // Use mapping if available, otherwise use default pattern
    const cardClass = feeTypeMapping[feeType] || `fee-${feeType}`;
    const feeCard = document.querySelector(`.${cardClass}`);
    
    // For external costs, checkbox ID pattern is different
    const checkboxId = feeTypeMapping[feeType] ? `show-${feeType}` : `show-${feeType}-fee`;
    const checkbox = document.getElementById(checkboxId);
    
    if (!checkbox) {
        console.warn(`Checkbox not found for fee type: ${feeType}, tried ID: ${checkboxId}`);
        return;
    }
    
    if (feeCard) {
        if (checkbox.checked) {
            feeCard.style.display = 'block';
            setTimeout(() => {
                feeCard.style.opacity = '1';
                feeCard.style.transform = 'scale(1)';
            }, 10);
        } else {
            feeCard.style.opacity = '0';
            feeCard.style.transform = 'scale(0.95)';
            setTimeout(() => {
                feeCard.style.display = 'none';
            }, 300);
        }
    } else {
        console.warn(`Fee card not found for class: ${cardClass}`);
    }
}

function selectAllFees() {
    const checkboxes = document.querySelectorAll('.fee-filter-item input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        if (checkbox && checkbox.id) {
            checkbox.checked = true;
            const feeType = checkbox.id.replace('show-', '').replace('-fee', '');
            toggleFeeDisplay(feeType);
        }
    });
}

function deselectAllFees() {
    const checkboxes = document.querySelectorAll('.fee-filter-item input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        if (checkbox && checkbox.id) {
            checkbox.checked = false;
            const feeType = checkbox.id.replace('show-', '').replace('-fee', '');
            toggleFeeDisplay(feeType);
        }
    });
}

// Initialize fee display on page load
document.addEventListener('DOMContentLoaded', function() {
    // Cập nhật hiển thị các card phí ban đầu (tất cả đều ẩn)
    function initializeFeeDisplay() {
        const feeCards = document.querySelectorAll('.fee-breakdown-grid .stat-card');
        feeCards.forEach(card => {
            card.style.display = 'none';
        });
    }
    initializeFeeDisplay();
});

// Profit view switching functionality
function switchProfitView(viewType) {
    // Remove active class from all buttons
    document.querySelectorAll('.view-nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    document.getElementById(viewType + 'Btn').classList.add('active');
    
    // Hide all profit views
    document.querySelectorAll('.profit-view').forEach(view => {
        view.classList.remove('active');
    });
    
    // Show selected view
    const targetView = document.getElementById(viewType + '-view');
    if (targetView) {
        targetView.classList.add('active');
    }
    
    // Load data for specific view
    switch(viewType) {
        case 'tmdt':
            loadTmdtProfitData();
            showTmdtOnlyContent();
            break;
        case 'retail':
            loadRetailProfitData();
            showRetailOnlyContent();
            break;
        case 'packaging':
            loadPackagingConfigData();
            // Hide overview content when in packaging view
            hideOverviewContent();
            break;
    }
}

// Placeholder functions for different profit views
function loadOverviewData() {
    console.log('Loading overview profit data...');
    // Your overview logic here
}

function loadTmdtProfitData() {
    console.log('🔥 Loading TMĐT profit data...');
    
    // Initialize platform selector to "all"
    const platformSelect = document.getElementById('platform-select');
    if (platformSelect) {
        platformSelect.value = 'all';
        updatePlatformStats();
    }
    
    // Load TMĐT orders detail table immediately with delay to ensure DOM is ready
    setTimeout(() => {
        console.log('🔥 Calling updateTmdtOrdersDetailTable from loadTmdtProfitData');
        updateTmdtOrdersDetailTable('all');
        
        // Update platform performance chart after data is loaded
        setTimeout(() => {
            updateTmdtPlatformChart();
        }, 500);
    }, 100);
}

// Function to update platform statistics based on selection
function updatePlatformStats() {
    const platformSelect = document.getElementById('platform-select');
    if (!platformSelect) {
        console.log('🔥 platform-select element not found');
        return;
    }
    
    const selectedPlatform = platformSelect.value;
    const platformTitle = document.getElementById('platform-title');
    const platformIcon = document.getElementById('platform-icon');
    const platformProfitValue = document.getElementById('platform-profit-value');
    const platformChange = document.getElementById('platform-change');
    
    console.log('🔥 Elements found:', {
        platformTitle: !!platformTitle,
        platformIcon: !!platformIcon,
        platformProfitValue: !!platformProfitValue,
        platformChange: !!platformChange
    });
    
    // Update title and icon based on selected platform
    if (platformTitle && platformIcon) {
        switch(selectedPlatform) {
            case 'all':
                platformTitle.textContent = 'Lợi Nhuận Tất Cả Sàn';
                platformIcon.className = 'fas fa-chart-line';
                break;
        case 'shopee':
            platformTitle.textContent = 'Lợi Nhuận Shopee';
            platformIcon.className = 'fab fa-shopify';
            break;
        case 'lazada':
            platformTitle.textContent = 'Lợi Nhuận Lazada';
            platformIcon.className = 'fas fa-shopping-bag';
            break;
        case 'tiktok':
            platformTitle.textContent = 'Lợi Nhuận TikTok Shop';
            platformIcon.className = 'fab fa-tiktok';
            break;
        case 'sendo':
            platformTitle.textContent = 'Lợi Nhuận Sendo';
            platformIcon.className = 'fas fa-store';
            break;
        case 'tiki':
            platformTitle.textContent = 'Lợi Nhuận Tiki';
            platformIcon.className = 'fas fa-gift';
            break;
        case 'facebook':
            platformTitle.textContent = 'Lợi Nhuận Facebook Shop';
            platformIcon.className = 'fab fa-facebook';
            break;
        case 'zalo':
            platformTitle.textContent = 'Lợi Nhuận Zalo Shop';
            platformIcon.className = 'fas fa-comments';
            break;
        case 'other':
            platformTitle.textContent = 'Lợi Nhuận Sàn Khác';
            platformIcon.className = 'fas fa-globe';
            break;
        }
    }
    
    // Here you will add logic to calculate and display actual data
    // For now, showing placeholder values
    console.log('Updating stats for platform:', selectedPlatform);
    
    // Placeholder: Update values based on selected platform
    // You will replace this with actual Firebase data calculation
    updateTmdtStatistics(selectedPlatform);
}

// Function to calculate and update TMĐT statistics with real Firebase data
async function updateTmdtStatistics(platform = 'all', store = 'all', dateFrom = null, dateTo = null) {
    console.log('Calculating TMĐT statistics for:', { platform, store, dateFrom, dateTo });
    
    try {
        // Load TMĐT sales orders from Firebase
        const salesOrdersData = await loadTmdtSalesOrders();
        
        if (!salesOrdersData || Object.keys(salesOrdersData).length === 0) {
            console.log('No TMĐT orders found');
            if (platform === 'all') {
                updateTmdtDisplay(0, 0, 0, 0, 0);
            } else {
                updateTmdtUI(0, 0, 0, platform);
            }
            return;
        }
        
        // Filter orders by platform, store, and date
        let filteredOrders = Object.values(salesOrdersData);
        
        // Filter by platform
        if (platform !== 'all') {
            filteredOrders = filteredOrders.filter(order => {
                return order.platform === platform || 
                       (platform === 'other' && order.platform === 'other');
            });
        }
        
        // Filter by store
        if (store !== 'all') {
            filteredOrders = filteredOrders.filter(order => {
                return order.storeId === store || order.storeName === store;
            });
        }
        
        // Filter by date range
        if (dateFrom || dateTo) {
            filteredOrders = filteredOrders.filter(order => {
                const orderDate = order.orderDate || order.createdAt || order.timestamp;
                if (!orderDate) return false;
                
                // Convert order date to YYYY-MM-DD format for comparison
                let orderDateStr;
                if (typeof orderDate === 'string') {
                    // Handle various date formats
                    const date = new Date(orderDate);
                    if (isNaN(date.getTime())) return false;
                    orderDateStr = date.toISOString().split('T')[0];
                } else if (orderDate.seconds) {
                    // Firebase timestamp
                    const date = new Date(orderDate.seconds * 1000);
                    orderDateStr = date.toISOString().split('T')[0];
                } else {
                    const date = new Date(orderDate);
                    if (isNaN(date.getTime())) return false;
                    orderDateStr = date.toISOString().split('T')[0];
                }
                
                // Check date range
                if (dateFrom && orderDateStr < dateFrom) return false;
                if (dateTo && orderDateStr > dateTo) return false;
                
                return true;
            });
        }
        
        console.log(`Filtered orders: ${filteredOrders.length} (from ${Object.keys(salesOrdersData).length} total)`);
        if (dateFrom || dateTo) {
            console.log(`Date filter applied: ${dateFrom} to ${dateTo}`);
        }
        
        // Calculate profit using fee settings
        let totalProfit = 0;
        let totalRevenue = 0;
        let totalCost = 0;
        let totalFees = 0;
        let totalGrossProfit = 0;
        let feeBreakdown = {
            transactionFee: 0,           // Phí Giao Dịch
            commissionFee: 0,            // Phí Hoa Hồng
            actualShippingFee: 0,        // Phí Vận Chuyển Thực Tế
            shippingDiscount: 0,         // Chiết Khấu Phí Vận Chuyển
            sellerShippingDiscount: 0,   // Giảm Phí VC Người Bán
            tiktokShippingDiscount: 0,   // Giảm Phí VC TikTok Shop
            returnShippingFee: 0,        // Phí VC Trả Hàng
            shippingSubsidy: 0,          // Trợ Giá Vận Chuyển
            affiliateCommission: 0,      // Hoa Hồng Liên Kết
            voucherXtraFee: 0,           // Phí Voucher Xtra
            vatTax: 0,                   // Thuế GTGT
            personalIncomeTax: 0,        // Thuế TNCN
            sellerDiscount: 0,           // Giảm Giá Người Bán
            otherFees: 0                 // Phí Khác
        };
        let orderCount = filteredOrders.length;
        
        for (const order of filteredOrders) {
            console.log('🔥 Processing order for profit calculation:', order.orderId || 'unknown');
            console.log('🔥 Order data:', {
                productName: order.productName,
                productType: order.productType,
                weight: order.weight,
                sellingPrice: order.sellingPrice,
                importPrice: order.importPrice,
                quantity: order.quantity
            });
            
            const orderProfitData = await calculateOrderProfitWithPlatformFees(order);
            const orderProfit = orderProfitData.finalProfit || orderProfitData; // Support both old and new format
            const orderRevenue = (order.sellingPrice || 0) * (order.quantity || 1);
            const orderCost = (order.importPrice || 0) * (order.quantity || 1);
            const baseProfitOrder = orderRevenue - orderCost;
            const orderFees = baseProfitOrder - orderProfit;
            
            console.log('🔥 Order profit calculation result:', {
                orderId: order.orderId,
                baseProfit: baseProfitOrder,
                finalProfit: orderProfit,
                difference: baseProfitOrder - orderProfit
            });
            
            // Gross profit is revenue - cost (before fees)
            totalGrossProfit += baseProfitOrder;
            
            // Calculate detailed fee breakdown for this order
            const platformFees = await getPlatformFeesFromStorage(order.platform);
            if (platformFees && Object.keys(platformFees).length > 0) {
                Object.keys(platformFees).forEach(feeKey => {
                    const fee = platformFees[feeKey];
                    if (fee && fee.value && parseFloat(fee.value) > 0) {
                        const feeValue = parseFloat(fee.value);
                        let feeAmount = 0;
                        
                        if (fee.type === 'percent') {
                            feeAmount = orderRevenue * (feeValue / 100);
                        } else if (fee.type === 'fixed') {
                            feeAmount = feeValue;
                        }
                        
                        // Map to breakdown categories based on fee key names
                        if (feeKey === 'transactionFee' || feeKey === 'phiGiaoDich') {
                            feeBreakdown.transactionFee += feeAmount;
                        } else if (feeKey === 'commissionFee' || feeKey === 'phiHoaHong') {
                            feeBreakdown.commissionFee += feeAmount;
                        } else if (feeKey === 'actualShippingFee' || feeKey === 'phiVanChuyenThucTe') {
                            feeBreakdown.actualShippingFee += feeAmount;
                        } else if (feeKey === 'shippingDiscount' || feeKey === 'chietKhauPhiVanChuyen') {
                            feeBreakdown.shippingDiscount += feeAmount;
                        } else if (feeKey === 'sellerShippingDiscount' || feeKey === 'giamPhiVCNguoiBan') {
                            feeBreakdown.sellerShippingDiscount += feeAmount;
                        } else if (feeKey === 'tiktokShippingDiscount' || feeKey === 'giamPhiVCTikTokShop') {
                            feeBreakdown.tiktokShippingDiscount += feeAmount;
                        } else if (feeKey === 'returnShippingFee' || feeKey === 'phiVCTraHang') {
                            feeBreakdown.returnShippingFee += feeAmount;
                        } else if (feeKey === 'shippingSubsidy' || feeKey === 'troGiaVanChuyen') {
                            feeBreakdown.shippingSubsidy += feeAmount;
                        } else if (feeKey === 'affiliateCommission' || feeKey === 'hoaHongLienKet') {
                            feeBreakdown.affiliateCommission += feeAmount;
                        } else if (feeKey === 'voucherXtraFee' || feeKey === 'phiVoucherXtra') {
                            feeBreakdown.voucherXtraFee += feeAmount;
                        } else if (feeKey === 'vatTax' || feeKey === 'thueGTGT') {
                            feeBreakdown.vatTax += feeAmount;
                        } else if (feeKey === 'personalIncomeTax' || feeKey === 'thueTNCN' || feeKey === 'incomeTax') {
                            feeBreakdown.personalIncomeTax += feeAmount;
                        } else if (feeKey === 'sellerDiscount' || feeKey === 'giamGiaNguoiBan') {
                            feeBreakdown.sellerDiscount += feeAmount;
                        } else if (feeKey.includes('shipping') || feeKey.includes('Shipping') || feeKey.includes('vanChuyen')) {
                            // Fallback for any shipping-related fees
                            feeBreakdown.actualShippingFee += feeAmount;
                        } else if (feeKey.includes('voucher') || feeKey.includes('Voucher')) {
                            // Fallback for any voucher-related fees
                            feeBreakdown.voucherXtraFee += feeAmount;
                        } else {
                            feeBreakdown.otherFees += feeAmount;
                        }
                    }
                });
            }
            
            totalProfit += orderProfit;
            totalRevenue += orderRevenue;
            totalCost += orderCost;
            totalFees += orderFees;
        }
        
        console.log(`Platform ${platform} - Orders: ${orderCount}, Revenue: ${totalRevenue}, Cost: ${totalCost}, Fees: ${totalFees}, Profit: ${totalProfit}, Gross Profit: ${totalGrossProfit}`);
        console.log('Fee Breakdown:', feeBreakdown);
        
        // Update UI with calculated values
        if (platform === 'all') {
            // Update tổng hợp cards for all platforms
            updateTmdtDisplay(totalProfit, totalProfit, totalCost, totalRevenue, totalFees, totalGrossProfit, feeBreakdown);
        } else {
            // Update specific platform card AND all summary cards with platform-specific data
            updateTmdtDisplay(totalProfit, totalProfit, totalCost, totalRevenue, totalFees, totalGrossProfit, feeBreakdown);
            updateTmdtUI(totalProfit, totalRevenue, orderCount, platform);
        }
        
        // Update top products table with filtered orders
        updateTmdtTopProductsTable(filteredOrders);
        
    } catch (error) {
        console.error('Error calculating TMĐT statistics:', error);
        showErrorState();
    }
}

// Enrich orders with missing productType and weight from sellingProducts
async function enrichOrdersWithProductData(orders) {
    try {
        console.log('🔥 Enriching orders with product data...');
        
        // Load selling products data
        const storeId = getCurrentStore();
        if (!storeId || !window.database) {
            console.log('🔥 Cannot enrich orders - missing store or database');
            return;
        }
        
        const sellingProductsSnapshot = await window.database.ref(`stores/${storeId}/sellingProducts`).once('value');
        const sellingProducts = sellingProductsSnapshot.val() || {};
        
        console.log('🔥 Loaded selling products for enrichment:', Object.keys(sellingProducts).length);
        
        // Enrich each order
        for (const [orderId, order] of Object.entries(orders)) {
            if (!order.productType || !order.weight) {
                console.log('🔥 Enriching order missing product data:', orderId);
                
                // Find product by productId or productName
                let matchingProduct = null;
                if (order.productId && sellingProducts[order.productId]) {
                    matchingProduct = sellingProducts[order.productId];
                } else if (order.productName) {
                    // Find by product name
                    matchingProduct = Object.values(sellingProducts).find(p => 
                        p.productName === order.productName || p.name === order.productName
                    );
                }
                
                if (matchingProduct) {
                    console.log('🔥 Found matching product for enrichment:', {
                        orderId,
                        productName: matchingProduct.productName || matchingProduct.name,
                        productType: matchingProduct.productType,
                        weight: matchingProduct.weight
                    });
                    
                    // Add missing fields
                    if (!order.productType) {
                        order.productType = matchingProduct.productType || 'dry';
                    }
                    if (!order.weight) {
                        const unitWeight = parseFloat(matchingProduct.weight || 0);
                        const quantity = parseInt(order.quantity || 1);
                        order.weight = unitWeight * quantity;
                    }
                } else {
                    console.log('🔥 No matching product found, using defaults:', orderId);
                    // Use defaults
                    if (!order.productType) order.productType = 'dry';
                    if (!order.weight) order.weight = 0;
                }
            }
        }
        
        console.log('🔥 Order enrichment completed');
    } catch (error) {
        console.error('🔥 Error enriching orders with product data:', error);
    }
}

// Load TMĐT sales orders from Firebase (using same logic as sales-order-management.js)
async function loadTmdtSalesOrders(targetStoreId = null) {
    try {
        console.log('🔥 Loading TMĐT sales orders from Firebase...');
        
        // Use provided storeId or fallback to current store
        const storeId = targetStoreId || getCurrentStore();
        console.log('🔥 Target store ID:', storeId);
        
        if (!storeId) {
            console.error('🔥 No store ID found');
            return {};
        }
        
        if (!window.database) {
            console.error('🔥 Firebase database not available');
            // Try to access firebase from global scope
            if (window.firebase && window.firebase.database) {
                window.database = window.firebase.database();
                console.log('🔥 Using firebase.database() from global scope');
            } else {
                console.error('🔥 Firebase not found in global scope either');
                return {};
            }
        }
        
        // Test Firebase connectivity
        try {
            const testRef = await window.database.ref('.info/connected').once('value');
            console.log('🔥 Firebase connected:', testRef.val());
        } catch (error) {
            console.error('🔥 Firebase connectivity test failed:', error);
        }
        
        // Try multiple Firebase paths to find TMĐT sales orders (from sales-orders-tmdt.js)
        const promises = [
            window.database.ref(`stores/${storeId}/tmdtSalesOrders`).once('value'),
            window.database.ref(`stores/${storeId}/salesOrders`).once('value'),
            window.database.ref('salesOrders').once('value'),
            // Additional paths that might contain TMĐT sales orders
            window.database.ref(`tmdtSalesOrders`).once('value'),
            window.database.ref(`ecommerceOrders`).once('value')
        ];
        
        console.log('🔥 Firebase references created, fetching data...');
        const [tmdtSnapshot, salesOrdersSnapshot, globalSalesOrdersSnapshot, globalTmdtSnapshot, ecommerceSnapshot] = await Promise.all(promises);
        
        const tmdtOrders = tmdtSnapshot.val() || {};
        const salesOrders = salesOrdersSnapshot.val() || {};
        const globalSalesOrders = globalSalesOrdersSnapshot.val() || {};
        const globalTmdtOrders = globalTmdtSnapshot.val() || {};
        const ecommerceOrders = ecommerceSnapshot.val() || {};
        
        console.log('🔥 TMDT orders loaded:', Object.keys(tmdtOrders).length);
        console.log('🔥 Sales orders loaded:', Object.keys(salesOrders).length);
        console.log('🔥 Global sales orders loaded:', Object.keys(globalSalesOrders).length);
        console.log('🔥 Global TMDT orders loaded:', Object.keys(globalTmdtOrders).length);
        console.log('🔥 Ecommerce orders loaded:', Object.keys(ecommerceOrders).length);
        
        // Debug: Show sample data from each source
        if (Object.keys(globalTmdtOrders).length > 0) {
            const sampleGlobalTmdt = Object.values(globalTmdtOrders)[0];
            console.log('🔥 Sample global TMDT order:', sampleGlobalTmdt);
        }
        
        // Combine all TMĐT orders with proper source identification
        const allTmdtOrders = {};
        
        // If loading for specific store, filter by storeId; if 'all', include all stores
        const shouldIncludeOrder = (order) => {
            if (!order) return false;
            if (storeId === 'all') return isTmdtOrderType(order);
            return (order.storeId === storeId || !order.storeId) && isTmdtOrderType(order);
        };
        
        // Add TMDT orders from store-specific path
        Object.entries(tmdtOrders).forEach(([orderId, order]) => {
            if (shouldIncludeOrder(order)) {
                console.log('🔥 Loading TMDT order from store path:', {
                    orderId,
                    source: order.source,
                    platform: order.platform,
                    orderType: order.orderType,
                    productName: order.productName
                });
                allTmdtOrders[orderId] = {
                    ...order,
                    source: order.source || 'tmdt_sales',
                    orderType: order.orderType || 'ecommerce'
                };
            }
        });
        
        // Add TMDT orders from sales orders
        Object.entries(salesOrders).forEach(([orderId, order]) => {
            if (shouldIncludeOrder(order)) {
                console.log('🔥 Loading TMDT order from sales orders:', {
                    orderId,
                    source: order.source,
                    platform: order.platform,
                    orderType: order.orderType,
                    productName: order.productName
                });
                allTmdtOrders[orderId] = {
                    ...order,
                    source: order.source || 'tmdt_sales',
                    orderType: order.orderType || 'ecommerce'
                };
            }
        });
        
        // Add TMDT orders from global sales orders
        Object.entries(globalSalesOrders).forEach(([orderId, order]) => {
            if (shouldIncludeOrder(order)) {
                console.log('🔥 Loading TMDT order from global sales orders:', {
                    orderId,
                    source: order.source,
                    platform: order.platform,
                    orderType: order.orderType,
                    productName: order.productName
                });
                allTmdtOrders[orderId] = {
                    ...order,
                    source: order.source || 'tmdt_sales',
                    orderType: order.orderType || 'ecommerce'
                };
            }
        });
        
        // Add TMDT orders from global TMDT collection
        Object.entries(globalTmdtOrders).forEach(([orderId, order]) => {
            if (shouldIncludeOrder(order)) {
                console.log('🔥 Loading TMDT order from global TMDT collection:', {
                    orderId,
                    source: order.source,
                    platform: order.platform,
                    orderType: order.orderType,
                    productName: order.productName
                });
                allTmdtOrders[orderId] = {
                    ...order,
                    source: order.source || 'tmdt_sales',
                    orderType: order.orderType || 'ecommerce'
                };
            }
        });
        
        // Add TMDT orders from ecommerce collection
        Object.entries(ecommerceOrders).forEach(([orderId, order]) => {
            if (shouldIncludeOrder(order)) {
                console.log('🔥 Loading TMDT order from ecommerce collection:', {
                    orderId,
                    source: order.source,
                    platform: order.platform,
                    orderType: order.orderType,
                    productName: order.productName
                });
                allTmdtOrders[orderId] = {
                    ...order,
                    source: order.source || 'tmdt_sales',
                    orderType: order.orderType || 'ecommerce'
                };
            }
        });
        
        // Enrich orders with missing productType and weight from sellingProducts
        await enrichOrdersWithProductData(allTmdtOrders);
        
        console.log('🔥 Final TMĐT orders:', allTmdtOrders);
        console.log('🔥 TMĐT orders count:', Object.keys(allTmdtOrders).length);
        
        // No sample data - show empty table if no orders found
        if (Object.keys(allTmdtOrders).length === 0) {
            console.log('🔥 No TMĐT orders found');
        }
        
        // Store data globally for other functions to use
        console.log('📊 Storing TMĐT orders data globally for access by other functions');
        window.tmdtOrdersData = allTmdtOrders;
        window.allTmdtOrders = allTmdtOrders; // Also store as global variable
        
        return allTmdtOrders;
        
    } catch (error) {
        console.error('🔥 Error loading TMĐT sales orders:', error);
        return {};
    }
}

// Calculate order profit with platform fees
function calculateOrderProfitWithFees(order) {
    const sellingPrice = parseFloat(order.sellingPrice || 0);
    const importPrice = parseFloat(order.importPrice || 0);
    const quantity = parseInt(order.quantity || 1);
    
    // Base profit before fees
    const baseProfit = (sellingPrice - importPrice) * quantity;
    
    // Get platform fees from settings
    const platformFees = getPlatformFees(order.platform);
    
    // Calculate total fees
    let totalFees = 0;
    
    // Transaction fee
    if (platformFees.transactionFee) {
        if (platformFees.transactionFee.type === 'percent') {
            totalFees += sellingPrice * quantity * (platformFees.transactionFee.value / 100);
        } else {
            totalFees += platformFees.transactionFee.value;
        }
    }
    
    // Commission fee
    if (platformFees.commissionFee) {
        if (platformFees.commissionFee.type === 'percent') {
            totalFees += sellingPrice * quantity * (platformFees.commissionFee.value / 100);
        } else {
            totalFees += platformFees.commissionFee.value;
        }
    }
    
    // Add other fees (shipping, voucher, VAT, Income Tax, etc.)
    ['shippingFee', 'voucherFee', 'affiliateCommission', 'vatTax', 'incomeTax', 'sellerDiscount'].forEach(feeType => {
        if (platformFees[feeType]) {
            if (platformFees[feeType].type === 'percent') {
                totalFees += sellingPrice * quantity * (platformFees[feeType].value / 100);
            } else {
                totalFees += platformFees[feeType].value;
            }
        }
    });
    
    // Add custom fees if configured
    if (platformFees.customFeesList && Array.isArray(platformFees.customFeesList)) {
        platformFees.customFeesList.forEach(customFee => {
            const customFeeKey = `custom_${customFee.id}`;
            const customFeeConfig = platformFees[customFeeKey];
            
            if (customFeeConfig && customFeeConfig.value && customFeeConfig.value > 0) {
                if (customFeeConfig.type === 'percent') {
                    totalFees += sellingPrice * quantity * (customFeeConfig.value / 100);
                } else {
                    totalFees += customFeeConfig.value;
                }
            }
        });
    }
    
    return baseProfit - totalFees;
}

// Calculate detailed fee breakdown for display
function calculateDetailedFees(order) {
    const sellingPrice = parseFloat(order.sellingPrice || 0);
    const importPrice = parseFloat(order.importPrice || 0);
    const quantity = parseInt(order.quantity || 1);
    const totalRevenue = sellingPrice * quantity;
    
    // Base profit before fees
    const baseProfit = (sellingPrice - importPrice) * quantity;
    
    // Get platform fees from settings
    const platformFees = getPlatformFees(order.platform);
    
    const feeBreakdown = {
        baseProfit: baseProfit,
        totalRevenue: totalRevenue,
        fees: [],
        totalFees: 0,
        finalProfit: 0
    };
    
    // Transaction fee
    if (platformFees.transactionFee && platformFees.transactionFee.value > 0) {
        let feeAmount = 0;
        if (platformFees.transactionFee.type === 'percent') {
            feeAmount = totalRevenue * (platformFees.transactionFee.value / 100);
        } else {
            feeAmount = platformFees.transactionFee.value;
        }
        
        feeBreakdown.fees.push({
            name: 'Phí Giao Dịch',
            amount: feeAmount,
            rate: platformFees.transactionFee.type === 'percent' ? `${platformFees.transactionFee.value}%` : 'Cố định'
        });
        feeBreakdown.totalFees += feeAmount;
    }
    
    // Commission fee
    if (platformFees.commissionFee && platformFees.commissionFee.value > 0) {
        let feeAmount = 0;
        if (platformFees.commissionFee.type === 'percent') {
            feeAmount = totalRevenue * (platformFees.commissionFee.value / 100);
        } else {
            feeAmount = platformFees.commissionFee.value;
        }
        
        feeBreakdown.fees.push({
            name: 'Phí Hoa Hồng',
            amount: feeAmount,
            rate: platformFees.commissionFee.type === 'percent' ? `${platformFees.commissionFee.value}%` : 'Cố định'
        });
        feeBreakdown.totalFees += feeAmount;
    }
    
    // Shipping fee
    if (platformFees.shippingFee && platformFees.shippingFee.value > 0) {
        let feeAmount = 0;
        if (platformFees.shippingFee.type === 'percent') {
            feeAmount = totalRevenue * (platformFees.shippingFee.value / 100);
        } else {
            feeAmount = platformFees.shippingFee.value;
        }
        
        feeBreakdown.fees.push({
            name: 'Phí Vận Chuyển',
            amount: feeAmount,
            rate: platformFees.shippingFee.type === 'percent' ? `${platformFees.shippingFee.value}%` : 'Cố định'
        });
        feeBreakdown.totalFees += feeAmount;
    }
    
    // Marketing fee
    if (platformFees.marketingFee && platformFees.marketingFee.value > 0) {
        let feeAmount = 0;
        if (platformFees.marketingFee.type === 'percent') {
            feeAmount = totalRevenue * (platformFees.marketingFee.value / 100);
        } else {
            feeAmount = platformFees.marketingFee.value;
        }
        
        feeBreakdown.fees.push({
            name: 'Phí Marketing',
            amount: feeAmount,
            rate: platformFees.marketingFee.type === 'percent' ? `${platformFees.marketingFee.value}%` : 'Cố định'
        });
        feeBreakdown.totalFees += feeAmount;
    }
    
    // VAT Tax
    if (platformFees.vatTax && platformFees.vatTax.value > 0) {
        let feeAmount = 0;
        if (platformFees.vatTax.type === 'percent') {
            feeAmount = totalRevenue * (platformFees.vatTax.value / 100);
        } else {
            feeAmount = platformFees.vatTax.value;
        }
        
        feeBreakdown.fees.push({
            name: 'Thuế GTGT',
            amount: feeAmount,
            rate: platformFees.vatTax.type === 'percent' ? `${platformFees.vatTax.value}%` : 'Cố định'
        });
        feeBreakdown.totalFees += feeAmount;
    }
    
    // Income Tax
    if (platformFees.incomeTax && platformFees.incomeTax.value > 0) {
        let feeAmount = 0;
        if (platformFees.incomeTax.type === 'percent') {
            feeAmount = totalRevenue * (platformFees.incomeTax.value / 100);
        } else {
            feeAmount = platformFees.incomeTax.value;
        }
        
        feeBreakdown.fees.push({
            name: 'Thuế TNCN',
            amount: feeAmount,
            rate: platformFees.incomeTax.type === 'percent' ? `${platformFees.incomeTax.value}%` : 'Cố định'
        });
        feeBreakdown.totalFees += feeAmount;
    }
    
    feeBreakdown.finalProfit = baseProfit - feeBreakdown.totalFees;
    
    return feeBreakdown;
}

// Function to save fees configuration for a specific platform
function saveFeeConfiguration(platform) {
    console.log('💾 Saving fee configuration for platform:', platform);
    
    const fees = readFeesFromUI();
    if (fees && Object.keys(fees).length > 0) {
        // Save to Firebase
        savePlatformFeesToFirebase(platform, fees).then(() => {
            console.log(' Fee configuration loaded successfully');
            // Refresh profit calculations for all orders
            refreshProfitCalculations();
        }).catch(error => {
            console.error(' Error saving fee configuration:', error);
        });
    } else {
        showNotification('Không tìm thấy cấu hình phí để lưu', 'warning');
    }
}

// Get platform fee settings
function getPlatformFees(platform) {
    // Try to get fees from the fee configuration system first
    const configuredFees = getPlatformFeesFromConfig(platform);
    if (configuredFees) {
        return configuredFees;
    }
    
    // Fallback to default fees
    const defaultFees = {
        shopee: {
            transactionFee: { type: 'percent', value: 2.5 },
            commissionFee: { type: 'percent', value: 8.0 }
        },
        tiktok: {
            transactionFee: { type: 'percent', value: 5.0 },
            commissionFee: { type: 'percent', value: 11.0 }
        },
        lazada: {
            transactionFee: null,
            commissionFee: null
        }
    };
    
    return defaultFees[platform] || { transactionFee: null, commissionFee: null };
}

// Save platform fees configuration to Firebase
function savePlatformFeesToFirebase(platform, fees) {
    try {
        console.log('💾 Saving fees to Firebase for platform:', platform, fees);
        
        if (!firebase || !firebase.database) {
            console.error('Firebase not available');
            return Promise.reject('Firebase not available');
        }
        
        // Global platform fees - same for all stores
        const feesPath = `platformFees/${platform}`;
        
        return firebase.database().ref(feesPath).set({
            ...fees,
            lastUpdated: new Date().toISOString(),
            updatedBy: 'system'
        }).then(() => {
            console.log('✅ Platform fees saved successfully to global path');
            showNotification(`Đã lưu cấu hình phí toàn cục cho ${platform}`, 'success');
        });
    } catch (error) {
        console.error('Error saving platform fees:', error);
        showNotification('Lỗi khi lưu cấu hình phí', 'error');
        return Promise.reject(error);
    }
}

// Load platform fees from Firebase
async function loadPlatformFeesFromFirebase(platform) {
    console.log('📖 Modal: Loading fees from Firebase for platform:', platform);
    
    if (!platform) {
        console.log('❌ Modal: No platform specified');
        return null;
    }
    
    try {
        const selectedStoreId = localStorage.getItem('selectedStoreId');
        if (!selectedStoreId) {
            console.log('❌ Modal: No store selected');
            return null;
        }
        
        // Try store-specific path first (more specific)
        const storePath = `platformFees/${selectedStoreId}/${platform}`;
        console.log('🔍 Modal: Firebase store path used:', storePath);
        const storeSnapshot = await firebase.database().ref(storePath).once('value');
        const storeFees = storeSnapshot.val();
        console.log('📋 Modal: Loaded store fees from Firebase:', storeFees);
        
        if (storeFees && Object.keys(storeFees).length > 0) {
            return storeFees;
        }
        
        // Try global path as fallback
        const globalPath = `platformFees/${platform}`;
        console.log('🔍 Modal: Firebase global path used:', globalPath);
        const globalSnapshot = await firebase.database().ref(globalPath).once('value');
        const globalFees = globalSnapshot.val();
        console.log('📋 Modal: Loaded global fees from Firebase:', globalFees);
        
        return globalFees;
    } catch (error) {
        console.error('❌ Modal: Error loading platform fees from Firebase:', error);
        return null;
    }
}

// Get platform fees - now reads from Firebase first, then fallback to UI config
function getPlatformFeesFromConfig(platform) {
    console.log('🔍 Getting fees for platform:', platform);
    
    // First try to load from Firebase
    return loadPlatformFeesFromFirebase(platform).then(firebaseFees => {
        if (firebaseFees) {
            console.log('✅ Using fees from Firebase:', firebaseFees);
            return firebaseFees;
        }
        
        // Fallback to reading from UI
        console.log('🔄 No Firebase fees, reading from UI...');
        return readFeesFromUI();
    }).catch(error => {
        console.error('Error getting platform fees:', error);
        return readFeesFromUI();
    });
}

// Read fees from UI configuration
function readFeesFromUI() {
    try {
        const fees = {};
        
        // Look for checked checkboxes and their associated inputs
        const checkedBoxes = document.querySelectorAll('input[type="checkbox"]:checked');
        console.log('✅ Found checked checkboxes:', checkedBoxes.length);
        
        for (const checkbox of checkedBoxes) {
            const container = checkbox.closest('div');
            if (!container) continue;
            
            const labelText = container.textContent || '';
            
            // Look for "Phí Giao Dịch" (Transaction Fee)
            if (labelText.includes('Phí Giao Dịch')) {
                let numberInput = container.querySelector('input[type="number"]');
                if (!numberInput && container.parentElement) {
                    numberInput = container.parentElement.querySelector('input[type="number"]');
                }
                
                if (numberInput && numberInput.value && parseFloat(numberInput.value) > 0) {
                    const percentRadio = container.querySelector('input[type="radio"][value*="percent"]:checked') ||
                                       container.parentElement?.querySelector('input[type="radio"][value*="percent"]:checked');
                    
                    fees.transactionFee = {
                        type: percentRadio ? 'percent' : 'fixed',
                        value: parseFloat(numberInput.value)
                    };
                    console.log('💳 Found Transaction fee:', fees.transactionFee);
                }
            }
            
            // Look for "Phí Hoa Hồng" (Commission Fee)
            if (labelText.includes('Phí Hoa Hồng')) {
                let numberInput = container.querySelector('input[type="number"]');
                if (!numberInput && container.parentElement) {
                    numberInput = container.parentElement.querySelector('input[type="number"]');
                }
                
                if (numberInput && numberInput.value && parseFloat(numberInput.value) > 0) {
                    const percentRadio = container.querySelector('input[type="radio"][value*="percent"]:checked') ||
                                       container.parentElement?.querySelector('input[type="radio"][value*="percent"]:checked');
                    
                    fees.commissionFee = {
                        type: percentRadio ? 'percent' : 'fixed',
                        value: parseFloat(numberInput.value)
                    };
                    console.log('💰 Found Commission fee:', fees.commissionFee);
                }
            }
            
            // Look for "Thuế TNCN" (Personal Income Tax)
            if (labelText.includes('Thuế TNCN')) {
                let numberInput = container.querySelector('input[type="number"]');
                if (!numberInput && container.parentElement) {
                    numberInput = container.parentElement.querySelector('input[type="number"]');
                }
                
                if (numberInput && numberInput.value && parseFloat(numberInput.value) > 0) {
                    const percentRadio = container.querySelector('input[type="radio"][value*="percent"]:checked') ||
                                       container.parentElement?.querySelector('input[type="radio"][value*="percent"]:checked');
                    
                    fees.incomeTax = {
                        type: percentRadio ? 'percent' : 'fixed',
                        value: parseFloat(numberInput.value)
                    };
                    console.log('💸 Found Income Tax fee:', fees.incomeTax);
                }
            }
            
            // Look for "Thuế GTGT" (VAT Tax)
            if (labelText.includes('Thuế GTGT')) {
                let numberInput = container.querySelector('input[type="number"]');
                if (!numberInput && container.parentElement) {
                    numberInput = container.parentElement.querySelector('input[type="number"]');
                }
                
                if (numberInput && numberInput.value && parseFloat(numberInput.value) > 0) {
                    const percentRadio = container.querySelector('input[type="radio"][value*="percent"]:checked') ||
                                       container.parentElement?.querySelector('input[type="radio"][value*="percent"]:checked');
                    
                    fees.vatTax = {
                        type: percentRadio ? 'percent' : 'fixed',
                        value: parseFloat(numberInput.value)
                    };
                    console.log('🏛️ Found VAT Tax fee:', fees.vatTax);
                }
            }
            
            // Look for "Chi Phí Nhân Viên" (Staff Cost)
            if (labelText.includes('Chi Phí Nhân Viên')) {
                let numberInput = container.querySelector('input[type="number"]');
                if (!numberInput && container.parentElement) {
                    numberInput = container.parentElement.querySelector('input[type="number"]');
                }
                
                if (numberInput && numberInput.value && parseFloat(numberInput.value) > 0) {
                    const percentRadio = container.querySelector('input[type="radio"][value*="percent"]:checked') ||
                                       container.parentElement?.querySelector('input[type="radio"][value*="percent"]:checked');
                    
                    fees.staffFees = {
                        type: percentRadio ? 'percent' : 'fixed',
                        value: parseFloat(numberInput.value)
                    };
                    console.log('👥 Found Staff fee:', fees.staffFees);
                }
            }
            
            // Look for "Chi Phí Thuê Mặt Bằng" (Rent Cost)
            if (labelText.includes('Chi Phí Thuê Mặt Bằng')) {
                let numberInput = container.querySelector('input[type="number"]');
                if (!numberInput && container.parentElement) {
                    numberInput = container.parentElement.querySelector('input[type="number"]');
                }
                
                if (numberInput && numberInput.value && parseFloat(numberInput.value) > 0) {
                    const percentRadio = container.querySelector('input[type="radio"][value*="percent"]:checked') ||
                                       container.parentElement?.querySelector('input[type="radio"][value*="percent"]:checked');
                    
                    fees.rentFees = {
                        type: percentRadio ? 'percent' : 'fixed',
                        value: parseFloat(numberInput.value)
                    };
                    console.log('🏠 Found Rent fee:', fees.rentFees);
                }
            }
            
            // Look for "Chi Phí Điện Nước" (Electricity Cost)
            if (labelText.includes('Chi Phí Điện Nước')) {
                let numberInput = container.querySelector('input[type="number"]');
                if (!numberInput && container.parentElement) {
                    numberInput = container.parentElement.querySelector('input[type="number"]');
                }
                
                if (numberInput && numberInput.value && parseFloat(numberInput.value) > 0) {
                    const percentRadio = container.querySelector('input[type="radio"][value*="percent"]:checked') ||
                                       container.parentElement?.querySelector('input[type="radio"][value*="percent"]:checked');
                    
                    fees.electricityFees = {
                        type: percentRadio ? 'percent' : 'fixed',
                        value: parseFloat(numberInput.value)
                    };
                    console.log('⚡ Found Electricity fee:', fees.electricityFees);
                }
            }
            
            // Look for "Chi Phí Bảo Hiểm" (Insurance Cost)
            if (labelText.includes('Chi Phí Bảo Hiểm')) {
                let numberInput = container.querySelector('input[type="number"]');
                if (!numberInput && container.parentElement) {
                    numberInput = container.parentElement.querySelector('input[type="number"]');
                }
                
                if (numberInput && numberInput.value && parseFloat(numberInput.value) > 0) {
                    const percentRadio = container.querySelector('input[type="radio"][value*="percent"]:checked') ||
                                       container.parentElement?.querySelector('input[type="radio"][value*="percent"]:checked');
                    
                    fees.insuranceFees = {
                        type: percentRadio ? 'percent' : 'fixed',
                        value: parseFloat(numberInput.value)
                    };
                    console.log('🛡️ Found Insurance fee:', fees.insuranceFees);
                }
            }
            
            // Look for "Chi Phí Thiết Bị" (Device Cost)
            if (labelText.includes('Chi Phí Thiết Bị')) {
                let numberInput = container.querySelector('input[type="number"]');
                if (!numberInput && container.parentElement) {
                    numberInput = container.parentElement.querySelector('input[type="number"]');
                }
                
                if (numberInput && numberInput.value && parseFloat(numberInput.value) > 0) {
                    const percentRadio = container.querySelector('input[type="radio"][value*="percent"]:checked') ||
                                       container.parentElement?.querySelector('input[type="radio"][value*="percent"]:checked');
                    
                    fees.deviceFees = {
                        type: percentRadio ? 'percent' : 'fixed',
                        value: parseFloat(numberInput.value)
                    };
                    console.log('💻 Found Device fee:', fees.deviceFees);
                }
            }
            
            // Look for "Chi Phí Marketing" (Marketing Cost)
            if (labelText.includes('Chi Phí Marketing')) {
                let numberInput = container.querySelector('input[type="number"]');
                if (!numberInput && container.parentElement) {
                    numberInput = container.parentElement.querySelector('input[type="number"]');
                }
                
                if (numberInput && numberInput.value && parseFloat(numberInput.value) > 0) {
                    const percentRadio = container.querySelector('input[type="radio"][value*="percent"]:checked') ||
                                       container.parentElement?.querySelector('input[type="radio"][value*="percent"]:checked');
                    
                    fees.marketingFees = {
                        type: percentRadio ? 'percent' : 'fixed',
                        value: parseFloat(numberInput.value)
                    };
                    console.log('📢 Found Marketing fee:', fees.marketingFees);
                }
            }
        }
        
        console.log('🎯 UI fees object:', fees);
        return Object.keys(fees).length > 0 ? fees : null;
    } catch (error) {
        console.error('Error reading fees from UI:', error);
        return null;
    }
}

// Function to refresh profit calculations when fees change
function refreshProfitCalculations() {
    console.log('🔄 Refreshing profit calculations...');
    
    // Reload TMĐT orders and recalculate profits
    loadTMDTOrdersData().then(() => {
        console.log('✅ Profit calculations refreshed');
    }).catch(error => {
        console.error('❌ Error refreshing calculations:', error);
    });
}

// Update TMĐT UI with calculated values
function updateTmdtUI(totalProfit, totalRevenue, orderCount, platform) {
    const platformProfitValue = document.getElementById('platform-profit-value');
    const platformChange = document.getElementById('platform-change');
    
    if (platformProfitValue) {
        platformProfitValue.textContent = formatCurrency(totalProfit);
    }
    
    if (platformChange) {
        const changePercent = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;
        platformChange.textContent = `+${changePercent}%`;
        platformChange.className = totalProfit > 0 ? 'positive' : 'negative';
    }
    
    // Update TMĐT orders detail table
    updateTmdtOrdersDetailTable(platform);
    
    console.log(`Updated UI for ${platform}: Profit=${totalProfit}, Revenue=${totalRevenue}, Orders=${orderCount}`);
}

// Update TMĐT orders detail table
async function updateTmdtOrdersDetailTable(platform = 'all') {
    try {
        console.log('🔥 updateTmdtOrdersDetailTable called with platform:', platform);
        
        const tmdtOrders = await loadTmdtSalesOrders();
        console.log('🔥 Received TMĐT orders:', tmdtOrders);
        console.log('🔥 TMĐT orders keys:', Object.keys(tmdtOrders || {}));
        console.log('🔥 TMĐT orders count:', Object.keys(tmdtOrders || {}).length);
        
        const tableBody = document.getElementById('tmdt-orders-detail-table');
        console.log('🔥 Table body element:', tableBody);
        
        if (!tableBody) {
            console.error('🔥 TMĐT orders detail table not found');
            return;
        }
        
        // Filter orders by platform if specified
        let filteredOrders = Object.entries(tmdtOrders);
        console.log('🔥 All orders before filtering:', filteredOrders.length);
        
        if (platform !== 'all') {
            filteredOrders = filteredOrders.filter(([orderId, order]) => {
                return order.platform === platform || 
                       (platform === 'other' && order.platform === 'other');
            });
        }
        
        console.log('🔥 Filtered orders count:', filteredOrders.length);
        
        // Clear existing rows
        tableBody.innerHTML = '';
        
        if (filteredOrders.length === 0) {
            console.log('🔥 No orders found, showing empty message');
            tableBody.innerHTML = `
                <tr>
                    <td colspan="12" style="text-align: center; color: #666; padding: 20px;">
                        <i class="fas fa-inbox"></i><br>
                        Không có đơn hàng TMĐT nào
                    </td>
                </tr>
            `;
            return;
        }
        
        // Populate table with orders (show all orders for now)
        let tableRows = '';
        for (let i = 0; i < filteredOrders.length; i++) {
            const [orderId, order] = filteredOrders[i];
            const sellingPrice = parseFloat(order.sellingPrice || 0);
            const importPrice = parseFloat(order.importPrice || 0);
            const quantity = parseInt(order.quantity || 1);
            const totalAmount = sellingPrice * quantity;
            
            // Calculate base profit
            const baseProfit = (sellingPrice - importPrice) * quantity;
            
            // Use the same calculation as sales-orders-tmdt.js
            let orderProfitData = await calculateOrderProfitWithPlatformFees({
                sellingPrice: sellingPrice,
                importPrice: importPrice,
                quantity: quantity,
                platform: order.platform,
                storeId: order.storeId,
                productType: order.productType,
                weight: order.weight,
                orderId: order.orderId
            });
            
            let orderProfit = orderProfitData.finalProfit || orderProfitData; // Support both old and new format
            const profitClass = orderProfit > 0 ? 'profit-positive' : 'profit-negative';
            console.log(`DEBUG Order ${orderId}: profit=${orderProfit}, class=${profitClass}`);
            
            // Format platform name
            const platformNames = {
                'shopee': 'Shopee',
                'lazada': 'Lazada', 
                'tiktok': 'TikTok Shop',
                'sendo': 'Sendo',
                'tiki': 'Tiki',
                'facebook': 'Facebook Shop',
                'zalo': 'Zalo Shop',
                'other': 'Khác'
            };
            
            const platformDisplay = platformNames[order.platform] || order.platform || 'N/A';
            
            const row = `
                <tr>
                    <td>
                        <input type="checkbox" class="order-checkbox" value="${orderId}" onchange="updateSelectedCount()">
                    </td>
                    <td>${i + 1}</td>
                    <td>${orderId}</td>
                    <td>${order.productName || 'N/A'}</td>
                    <td>${order.sku || 'N/A'}</td>
                    <td>${quantity}</td>
                    <td>${formatCurrency(importPrice)}</td>
                    <td>${formatCurrency(sellingPrice)}</td>
                    <td class="${profitClass}">${formatCurrency(orderProfit)}</td>
                    <td>${formatCurrency(totalAmount)}</td>
                    <td>${platformDisplay}</td>
                    <td>${resolveStoreName(order)}</td>
                    <td>${getOrderDate(order)}</td>
                    <td>
                        <button type="button" class="btn-action btn-view-detail" onclick="viewOrderDetail('${orderId}')">
                            <i class="fas fa-eye"></i> Xem
                        </button>
                    </td>
                </tr>
            `;
            tableRows += row;
        }
        
        tableBody.innerHTML = tableRows;
        
        console.log(`Updated TMĐT orders detail table with ${filteredOrders.length} orders for platform: ${platform}`);
        
    } catch (error) {
        console.error('Error updating TMĐT orders detail table:', error);
        const tableBody = document.getElementById('tmdt-orders-detail-table');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="12" style="text-align: center; color: #dc3545; padding: 20px;">
                        <i class="fas fa-exclamation-triangle"></i><br>
                        Lỗi tải dữ liệu đơn hàng
                    </td>
                </tr>
            `;
        }
    }
}

// Function to calculate profit from real orders data with platform fees
async function calculateTmdtProfitFromOrders(orders, selectedPlatform) {
    let totalProfit = 0;
    let totalCost = 0;
    let totalRevenue = 0;
    let platformProfit = 0;
    let platformCost = 0;
    let platformRevenue = 0;
    
    // Process each order with async fee calculation
    for (const order of Object.values(orders)) {
        // Check if this is a TMĐT order
        const isTmdtOrder = isTmdtOrderType(order);
        if (!isTmdtOrder) continue;
        
        // Get order financial data
        const orderRevenue = parseFloat(order.sellingPrice || order.totalAmount || 0);
        const orderCost = parseFloat(order.importPrice || order.cost || 0);
        
        // Calculate profit with platform fees using the new function
        console.log('🔥 Order before profit calculation:', {
            orderId: order.orderId,
            productType: order.productType,
            weight: order.weight,
            sellingPrice: order.sellingPrice,
            importPrice: order.importPrice
        });
        const orderProfitData = await calculateOrderProfitWithPlatformFees(order);
        const orderProfit = orderProfitData.finalProfit || orderProfitData; // Support both old and new format
        
        // Add to total TMĐT statistics
        totalRevenue += orderRevenue;
        totalCost += orderCost;
        totalProfit += orderProfit;
        
        // Check if this order matches selected platform
        const orderPlatform = getOrderPlatform(order);
        if (selectedPlatform === 'all' || orderPlatform === selectedPlatform) {
            platformRevenue += orderRevenue;
            platformCost += orderCost;
            platformProfit += orderProfit;
        }
    }
    
    // Update display
    updateTmdtDisplay(totalProfit, platformProfit, totalCost, totalRevenue);
}

// Helper function to check if order is TMĐT type
function isTmdtOrderType(order) {
    // Only include orders from TMĐT Sales Management System (sales-orders-tmdt.js)
    // Exclude orders from warehouse order management (orders.html)
    const result = (
        order.source === 'tmdt_sales' ||
        (order.orderType === 'ecommerce' && order.source !== 'order_management') ||
        (order.platform && order.source !== 'order_management') ||
        (order.ecommercePlatform && order.source !== 'order_management') ||
        (order.type && order.type.includes('tmdt') && order.source !== 'order_management')
    );
    
    // Debug log for filtering
    if (order.orderId) {
        console.log('🔥 isTmdtOrderType check:', {
            orderId: order.orderId,
            source: order.source,
            platform: order.platform,
            orderType: order.orderType,
            result: result,
            reason: result ? 'INCLUDED' : 'EXCLUDED (warehouse order or invalid)'
        });
    }
    
    return result;
}

// Helper function to get platform from order
function getOrderPlatform(order) {
    return order.platform || 
           order.ecommercePlatform || 
           order.source?.replace('_sales', '') || 
           'other';
}

// Helper function to update display values
function updateTmdtDisplay(totalProfit, platformProfit, totalCost, totalRevenue, totalFees = 0, totalGrossProfit = 0, feeBreakdown = {}) {
    // Ensure all values are valid numbers
    totalProfit = isNaN(totalProfit) ? 0 : totalProfit;
    platformProfit = isNaN(platformProfit) ? 0 : platformProfit;
    totalCost = isNaN(totalCost) ? 0 : totalCost;
    totalRevenue = isNaN(totalRevenue) ? 0 : totalRevenue;
    totalFees = isNaN(totalFees) ? 0 : totalFees;
    totalGrossProfit = isNaN(totalGrossProfit) ? 0 : totalGrossProfit;
    
    const elements = {
        'tmdt-total-profit': totalProfit,
        'platform-profit-value': platformProfit,
        'tmdt-total-cost': totalCost,
        'tmdt-total-revenue': totalRevenue,
        'tmdt-total-fees': totalFees,
        'tmdt-gross-profit': totalGrossProfit,
        'tmdt-transaction-fees': feeBreakdown.transactionFee || 0,
        'tmdt-commission-fees': feeBreakdown.commissionFee || 0,
        'tmdt-actual-shipping-fees': feeBreakdown.actualShippingFee || 0,
        'tmdt-shipping-discount': feeBreakdown.shippingDiscount || 0,
        'tmdt-seller-shipping-discount': feeBreakdown.sellerShippingDiscount || 0,
        'tmdt-tiktok-shipping-discount': feeBreakdown.tiktokShippingDiscount || 0,
        'tmdt-return-shipping-fees': feeBreakdown.returnShippingFee || 0,
        'tmdt-shipping-subsidy': feeBreakdown.shippingSubsidy || 0,
        'tmdt-affiliate-fees': feeBreakdown.affiliateCommission || 0,
        'tmdt-voucher-xtra-fees': feeBreakdown.voucherXtraFee || 0,
        'tmdt-vat-tax': feeBreakdown.vatTax || 0,
        'tmdt-personal-income-tax': feeBreakdown.personalIncomeTax || 0,
        'tmdt-seller-discount': feeBreakdown.sellerDiscount || 0,
        'tmdt-other-fees': feeBreakdown.otherFees || 0,
        // Chi phí bên ngoài
        'tmdt-staff-fees': feeBreakdown.staffFees || 0,
        'tmdt-rent-fees': feeBreakdown.rentFees || 0,
        'tmdt-electricity-fees': feeBreakdown.electricityFees || 0,
        'tmdt-insurance-fees': feeBreakdown.insuranceFees || 0,
        'tmdt-device-fees': feeBreakdown.deviceFees || 0,
        'tmdt-marketing-fees': feeBreakdown.marketingFees || 0,
        'tmdt-shipping-cost-fees': feeBreakdown.shippingCostFees || 0,
        'tmdt-packaging-cost-fees': feeBreakdown.packagingCostFees || 0,
        'tmdt-storage-cost-fees': feeBreakdown.storageCostFees || 0,
        'tmdt-admin-cost-fees': feeBreakdown.adminCostFees || 0
    };
    
    for (const [elementId, value] of Object.entries(elements)) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = formatCurrency(value);
        } else {
            console.log(`🔥 Element ${elementId} not found in DOM`);
        }
    }
    
    // Update percentage changes (you can enhance this with historical data comparison)
    updateProfitChanges(totalProfit, platformProfit);
}

// Helper function to show loading state
function showLoadingState() {
    const loadingElements = ['tmdt-total-profit', 'platform-profit-value', 'tmdt-total-cost', 'tmdt-total-revenue'];
    loadingElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = 'Đang tải...';
        }
    });
}

// Helper function to show error state
function showErrorState() {
    const errorElements = ['tmdt-total-profit', 'platform-profit-value', 'tmdt-total-cost', 'tmdt-total-revenue'];
    errorElements.forEach(elementId => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = 'Lỗi tải dữ liệu';
        }
    });
}

// Helper function to update profit change percentages
function updateProfitChanges(totalProfit, platformProfit) {
    // This is a placeholder - you can implement historical comparison logic here
    const totalChange = document.querySelector('#tmdt-total-profit').parentElement.querySelector('.stat-change');
    const platformChange = document.querySelector('#platform-profit-value').parentElement.querySelector('.stat-change');
    
    if (totalChange) {
        totalChange.textContent = totalProfit > 0 ? '+' + ((totalProfit / 1000000).toFixed(1)) + 'M' : '0%';
        totalChange.className = totalProfit > 0 ? 'stat-change positive' : 'stat-change neutral';
    }
    
    if (platformChange) {
        platformChange.textContent = platformProfit > 0 ? '+' + ((platformProfit / 1000000).toFixed(1)) + 'M' : '0%';
        platformChange.className = platformProfit > 0 ? 'stat-change positive' : 'stat-change neutral';
    }
}

// Helper function to get current store (you may need to adjust this based on your store context implementation)
function getCurrentStore() {
    try {
        // Try to get store ID from localStorage first
        const selectedStoreId = localStorage.getItem('selectedStoreId');
        if (selectedStoreId && selectedStoreId !== 'null' && selectedStoreId !== 'undefined') {
            return String(selectedStoreId).replace(/[.#$[\]]/g, '_');
        }
        
        // Try to get from selectedStoreData
        const selectedStoreData = localStorage.getItem('selectedStoreData');
        if (selectedStoreData && selectedStoreData !== 'null') {
            const storeData = JSON.parse(selectedStoreData);
            const storeId = storeData.id || storeData.storeId || storeData.key;
            if (storeId) {
                return String(storeId).replace(/[.#$[\]]/g, '_');
            }
        }
        
        // Try window.currentStore as fallback
        let store = window.currentStore || 'default';
        
        // Ensure we return a string, not an object
        if (typeof store === 'object' && store !== null) {
            // If it's an object, try to get the ID or name property
            store = store.id || store.storeId || store.key || store.name || 'default';
        }
        
        // Ensure it's a valid string for Firebase path
        return String(store).replace(/[.#$[\]]/g, '_');
    } catch (error) {
        console.error('Error getting current store:', error);
        return 'default';
    }
}

// Platform Fees Modal Functions
function openPlatformFeesModal() {
    const modal = document.getElementById('platform-fees-modal');
    if (modal) {
        modal.classList.add('active');
        loadPlatformFees('tiktok'); // Load TikTok fees by default
        setupFeeCheckboxListeners(); // Setup checkbox listeners
    }
}

function closePlatformFeesModal() {
    const modal = document.getElementById('platform-fees-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function switchPlatformFeesForm(platform) {
    // Hide all forms
    document.querySelectorAll('.platform-fees-form').forEach(form => {
        form.style.display = 'none';
    });
    
    // Show selected platform form
    const targetForm = document.getElementById(platform + '-fees');
    if (targetForm) {
        targetForm.style.display = 'block';
    }
    
    // Load fees for selected platform
    loadPlatformFees(platform);
    setupFeeCheckboxListeners(); // Setup checkbox listeners for new form
}

// Load platform fees into the modal form
async function loadPlatformFees(platform) {
    try {
        console.log('📖 Loading platform fees for modal:', platform);
        
        // Load fees from Firebase
        const fees = await loadPlatformFeesFromFirebase(platform);
        
        if (fees && Object.keys(fees).length > 0) {
            console.log('✅ Found fees for platform:', platform, fees);
            
            // Populate form fields with loaded fees
            Object.keys(fees).forEach(feeKey => {
                const fee = fees[feeKey];
                if (fee && fee.value) {
                    // Find the input field for this fee
                    const valueInput = document.querySelector(`input[name="${feeKey}-value"]`);
                    const typeRadio = document.querySelector(`input[name="${feeKey}-type"][value="${fee.type}"]`);
                    
                    if (valueInput) {
                        valueInput.value = fee.value;
                    }
                    if (typeRadio) {
                        typeRadio.checked = true;
                    }
                    
                    // Check the checkbox to show this fee
                    const checkbox = document.querySelector(`input[type="checkbox"][id*="${feeKey}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                        // Trigger the display toggle
                        const feeType = checkbox.id.replace('fee-', '');
                        toggleFeeInput(feeType);
                    }
                }
            });
        } else {
            console.log('📝 No existing fees found for platform:', platform);
            // Clear all form fields
            clearPlatformFeesForm();
        }
    } catch (error) {
        console.error('❌ Error loading platform fees:', error);
        clearPlatformFeesForm();
    }
}

// Clear platform fees form
function clearPlatformFeesForm() {
    // Uncheck all checkboxes and hide their input wrappers
    document.querySelectorAll('.fee-checkbox').forEach(checkbox => {
        checkbox.checked = false;
        const feeType = checkbox.id.replace('fee-', '');
        toggleFeeInput(feeType);
    });
    
    // Clear all input values
    document.querySelectorAll('.fee-input-wrapper input[type="number"]').forEach(input => {
        input.value = '';
    });
    
    // Reset all radio buttons to percentage
    document.querySelectorAll('.fee-type-selector input[type="radio"][value="percent"]').forEach(radio => {
        radio.checked = true;
    });
    
    // Clear platform selection
    const platformSelect = document.getElementById('modal-platform-select');
    if (platformSelect) {
        platformSelect.value = '';
    }
}

// Setup checkbox listeners to enable/disable inputs
function setupFeeCheckboxListeners() {
    const checkboxes = document.querySelectorAll('.fee-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const inputId = this.id.replace('-enabled', '');
            const input = document.getElementById(inputId);
            if (input) {
                input.disabled = !this.checked;
                if (this.checked) {
                    input.focus();
                } else {
                    input.value = '';
                }
            }
        });
    });
}

// Toggle fee input visibility when checkbox is clicked
function toggleFeeInput(feeType) {
    const inputWrapper = document.getElementById(`input-${feeType}`);
    const checkbox = document.getElementById(`fee-${feeType}`);
    
    if (checkbox && inputWrapper) {
        if (checkbox.checked) {
            inputWrapper.classList.remove('hidden');
            inputWrapper.style.display = 'flex';
        } else {
            inputWrapper.classList.add('hidden');
            inputWrapper.style.display = 'none';
            // Clear input value when unchecked
            const input = document.getElementById(`value-${feeType}`);
            if (input) input.value = '';
        }
    }
}

// Change fee type between percentage and fixed amount
function changeFeeType(feeType, type) {
    const input = document.getElementById(`value-${feeType}`);
    const helpText = document.getElementById(`help-${feeType}`);
    
    if (type === 'percent') {
        input.placeholder = input.placeholder.replace(/\d+/, '5.00');
        input.min = '0';
        input.max = '100';
        input.step = '0.01';
        
        if (feeType === 'transaction') {
            helpText.textContent = '% tính trên thanh toán của khách hàng (VD: 5.00% = 5.00)';
        } else {
            helpText.textContent = '% tính trên tổng giá trị đơn hàng (VD: 11.00% = 11.00)';
        }
    } else {
        input.placeholder = input.placeholder.replace(/[\d.]+/, '50000');
        input.removeAttribute('max');
        input.min = '0';
        input.step = '1';
        
        helpText.textContent = 'Số tiền cố định tính theo VNĐ (VD: 50000 = 50,000₫)';
    }
}

// Change custom fee type
function changeCustomFeeType(type) {
    const input = document.getElementById('custom-fee-value');
    const helpText = document.getElementById('help-custom-fee');
    
    if (type === 'percent') {
        input.placeholder = '5.00';
        input.min = '0';
        input.max = '100';
        input.step = '0.01';
        helpText.textContent = '% tính trên tổng giá trị đơn hàng (VD: 5.00% = 5.00)';
    } else {
        input.placeholder = '50000';
        input.removeAttribute('max');
        input.min = '0';
        input.step = '1';
        helpText.textContent = 'Số tiền cố định tính theo VNĐ (VD: 50000 = 50,000₫)';
    }
}

// Handle platform selection change
function onPlatformChange() {
    const selectedPlatform = document.getElementById('modal-platform-select').value;
    
    if (!selectedPlatform) {
        // Reset all checkboxes and inputs if no platform selected
        resetAllFees();
        return;
    }
    
    // Load saved fees for selected platform
    loadSavedFeesForPlatform(selectedPlatform);
}

// Load saved fees for a specific platform
function loadSavedFeesForPlatform(platform) {
    const currentStore = getCurrentStore();
    const savedFees = JSON.parse(localStorage.getItem(`platformFees_${currentStore}_${platform}`)) || {};
    
    // Fee mapping from new structure to saved structure
    const feeMapping = {
        'transaction': 'transactionFee',
        'commission': 'commissionFee', 
        'shipping': 'shippingFee',
        'shipping-discount': 'shippingDiscount',
        'seller-shipping-discount': 'sellerShippingDiscount',
        'platform-shipping-discount': 'platformShippingDiscount',
        'return-shipping': 'returnShippingFee',
        'shipping-subsidy': 'shippingSubsidy',
        'affiliate': 'affiliateCommission',
        'voucher': 'voucherFee',
        'vat': 'vatTax',
        'income-tax': 'incomeTax',
        'seller-discount': 'sellerDiscount'
    };
    
    // Reset all fees first
    resetAllFees();
    
    // Load saved values
    Object.entries(feeMapping).forEach(([feeType, savedKey]) => {
        const checkbox = document.getElementById(`fee-${feeType}`);
        const input = document.getElementById(`value-${feeType}`);
        
        if (checkbox && input && savedFees[savedKey] !== undefined) {
            checkbox.checked = true;
            input.value = savedFees[savedKey];
            // Show input wrapper
            const inputWrapper = document.getElementById(`input-${feeType}`);
            if (inputWrapper) {
                inputWrapper.style.display = 'block';
            }
        }
    });
}

// Reset all fees to unchecked state
function resetAllFees() {
    const feeTypes = [
        'transaction', 'commission', 'shipping', 'shipping-discount',
        'seller-shipping-discount', 'platform-shipping-discount', 'return-shipping',
        'shipping-subsidy', 'affiliate', 'voucher', 'vat', 'income-tax', 'seller-discount'
    ];
    
    feeTypes.forEach(feeType => {
        const checkbox = document.getElementById(`fee-${feeType}`);
        const input = document.getElementById(`value-${feeType}`);
        const inputWrapper = document.getElementById(`input-${feeType}`);
        
        if (checkbox) checkbox.checked = false;
        if (input) input.value = '';
        if (inputWrapper) inputWrapper.style.display = 'none';
    });
}

// Old function removed - using savePlatformFeesWithCustom instead

function savePlatformFeesToFirebase(store, platform, fees) {
    try {
        const feesRef = database.ref(`platformFees/${store}/${platform}`);
        feesRef.set(fees);
        console.log('Platform fees saved to Firebase:', platform, fees);
    } catch (error) {
        console.error('Error saving platform fees to Firebase:', error);
    }
}

function getPlatformDisplayName(platform) {
    const names = {
        'tiktok': 'TikTok Shop',
        'shopee': 'Shopee',
        'lazada': 'Lazada',
        'sendo': 'Sendo',
        'tiki': 'Tiki',
        'facebook': 'Facebook Shop',
        'zalo': 'Zalo Shop',
        'other': 'Sàn Khác'
    };
    return names[platform] || platform;
}

// Function to calculate platform fees for an order
function calculatePlatformFees(order, platform) {
    const currentStore = getCurrentStore();
    const savedFees = JSON.parse(localStorage.getItem(`platformFees_${currentStore}_${platform}`)) || {};
    
    let totalFees = 0;
    let feeBreakdown = {};
    
    const orderTotal = order.totalAmount || 0;
    const customerPayment = order.customerPayment || orderTotal;
    
    // Calculate fees (both percentage and fixed)
    if (savedFees.transactionFee) {
        let fee, calculation;
        const feeData = typeof savedFees.transactionFee === 'object' ? savedFees.transactionFee : { value: savedFees.transactionFee, type: 'percent' };
        
        if (feeData.type === 'percent') {
            fee = (customerPayment * feeData.value / 100);
            calculation = `${customerPayment.toLocaleString('vi-VN')}₫ × ${feeData.value}%`;
        } else {
            fee = feeData.value;
            calculation = `${feeData.value.toLocaleString('vi-VN')}₫ (cố định)`;
        }
        
        totalFees += fee;
        feeBreakdown.transactionFee = {
            name: 'Phí Giao Dịch',
            value: feeData.value,
            type: feeData.type,
            amount: fee,
            calculation: calculation
        };
    }
    
    if (savedFees.commissionFee) {
        let fee, calculation;
        const feeData = typeof savedFees.commissionFee === 'object' ? savedFees.commissionFee : { value: savedFees.commissionFee, type: 'percent' };
        
        if (feeData.type === 'percent') {
            fee = (orderTotal * feeData.value / 100);
            calculation = `${orderTotal.toLocaleString('vi-VN')}₫ × ${feeData.value}%`;
        } else {
            fee = feeData.value;
            calculation = `${feeData.value.toLocaleString('vi-VN')}₫ (cố định)`;
        }
        
        totalFees += fee;
        feeBreakdown.commissionFee = {
            name: 'Phí Hoa Hồng',
            value: feeData.value,
            type: feeData.type,
            amount: fee,
            calculation: calculation
        };
    }
    
    if (savedFees.voucherFee) {
        let fee, calculation;
        const feeData = typeof savedFees.voucherFee === 'object' ? savedFees.voucherFee : { value: savedFees.voucherFee, type: 'percent' };
        
        if (feeData.type === 'percent') {
            fee = (orderTotal * feeData.value / 100);
            calculation = `${orderTotal.toLocaleString('vi-VN')}₫ × ${feeData.value}%`;
        } else {
            fee = feeData.value;
            calculation = `${feeData.value.toLocaleString('vi-VN')}₫ (cố định)`;
        }
        
        totalFees += fee;
        feeBreakdown.voucherFee = {
            name: 'Phí Voucher Xtra',
            value: feeData.value,
            type: feeData.type,
            amount: fee,
            calculation: calculation
        };
    }
    
    if (savedFees.vatTax) {
        let fee, calculation;
        const feeData = typeof savedFees.vatTax === 'object' ? savedFees.vatTax : { value: savedFees.vatTax, type: 'percent' };
        
        if (feeData.type === 'percent') {
            fee = (orderTotal * feeData.value / 100);
            calculation = `${orderTotal.toLocaleString('vi-VN')}₫ × ${feeData.value}%`;
        } else {
            fee = feeData.value;
            calculation = `${feeData.value.toLocaleString('vi-VN')}₫ (cố định)`;
        }
        
        totalFees += fee;
        feeBreakdown.vatTax = {
            name: 'Thuế GTGT',
            value: feeData.value,
            type: feeData.type,
            amount: fee,
            calculation: calculation
        };
    }
    
    if (savedFees.incomeTax) {
        let fee, calculation;
        const feeData = typeof savedFees.incomeTax === 'object' ? savedFees.incomeTax : { value: savedFees.incomeTax, type: 'percent' };
        
        if (feeData.type === 'percent') {
            fee = (orderTotal * feeData.value / 100);
            calculation = `${orderTotal.toLocaleString('vi-VN')}₫ × ${feeData.value}%`;
        } else {
            fee = feeData.value;
            calculation = `${feeData.value.toLocaleString('vi-VN')}₫ (cố định)`;
        }
        
        totalFees += fee;
        feeBreakdown.incomeTax = {
            name: 'Thuế TNCN',
            value: feeData.value,
            type: feeData.type,
            amount: fee,
            calculation: calculation
        };
    }
    
    // Fixed amount fees (shipping, discounts, etc.)
    if (savedFees.shippingFee) {
        totalFees += savedFees.shippingFee;
        feeBreakdown.shippingFee = {
            name: 'Phí Vận Chuyển Thực Tế',
            amount: savedFees.shippingFee,
            calculation: `${savedFees.shippingFee.toLocaleString('vi-VN')}₫`
        };
    }
    
    // Discounts (negative fees)
    if (savedFees.shippingDiscount) {
        totalFees -= savedFees.shippingDiscount;
        feeBreakdown.shippingDiscount = {
            name: 'Chiết Khấu Phí Vận Chuyển',
            amount: -savedFees.shippingDiscount,
            calculation: `-${savedFees.shippingDiscount.toLocaleString('vi-VN')}₫`
        };
    }
    
    if (savedFees.platformShippingDiscount) {
        totalFees -= savedFees.platformShippingDiscount;
        feeBreakdown.platformShippingDiscount = {
            name: 'Giảm Phí VC TikTok Shop',
            amount: -savedFees.platformShippingDiscount,
            calculation: `-${savedFees.platformShippingDiscount.toLocaleString('vi-VN')}₫`
        };
    }
    
    // Handle custom fees
    if (savedFees.customFeesList) {
        savedFees.customFeesList.forEach(customFee => {
            const customFeeData = savedFees[`custom_${customFee.id}`];
            if (customFeeData) {
                totalFees += customFeeData.value;
                feeBreakdown[`custom_${customFee.id}`] = {
                    name: customFeeData.name,
                    amount: customFeeData.value,
                    calculation: `${customFeeData.value.toLocaleString('vi-VN')}₫`
                };
            }
        });
    }
    
    return {
        totalFees,
        feeBreakdown,
        netRevenue: orderTotal - totalFees
    };
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('platformFeesModal');
    if (event.target == modal) {
        closePlatformFeesModal();
    }
}

function loadWholesaleProfitData() {
    console.log('Loading wholesale profit data...');
    // Your wholesale logic here
}

function loadRetailProfitData() {
    console.log('Loading retail profit data...');
    // Your retail logic here
}

// Set default date range to current month
function setDefaultDateRange() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    currentDateRange.startDate = startOfMonth;
    currentDateRange.endDate = endOfMonth;
    
    console.log('Default date range set:', {
        start: startOfMonth.toLocaleDateString('vi-VN'),
        end: endOfMonth.toLocaleDateString('vi-VN')
    });
}

// Handle date range change events
function handleDateRangeChange() {
    const startDateEl = document.getElementById('startDate');
    const endDateEl = document.getElementById('endDate');
    
    if (startDateEl && endDateEl && startDateEl.value && endDateEl.value) {
        const startDate = new Date(startDateEl.value);
        const endDate = new Date(endDateEl.value);
        
        if (startDate <= endDate) {
            currentDateRange.startDate = startDate;
            currentDateRange.endDate = endDate;
            console.log('Date range updated:', {
                start: startDate.toLocaleDateString('vi-VN'),
                end: endDate.toLocaleDateString('vi-VN')
            });
            loadProfitData();
        } else {
            showNotification('Ngày bắt đầu không thể lớn hơn ngày kết thúc', 'error');
        }
    }
}

// Initialize profit management page
function initializeProfitManagement() {
    console.log('Initializing profit management...');
    
    // Set default date range (current month)
    setDefaultDateRange();
    
    // Test Firebase connection first
    testFirebaseConnection();
    
    // Load current store from localStorage and update header
    loadCurrentStoreContext();
    
    // Ensure stores are loaded as fallback
    setTimeout(() => {
        const storeList = document.getElementById('storeList');
        if (storeList && (!storeList.innerHTML || storeList.innerHTML.trim() === '')) {
            console.log('Store list is empty, attempting manual load...');
            manuallyLoadStores();
        }
    }, 2000);
    
    // Load real profit data
    loadProfitData();
    
    // Set up event listeners with null checks
    const startDateEl = document.getElementById('startDate');
    const endDateEl = document.getElementById('endDate');
    
    if (startDateEl) {
        startDateEl.addEventListener('change', handleDateRangeChange);
    }
    if (endDateEl) {
        endDateEl.addEventListener('change', handleDateRangeChange);
    }
    
    // Listen for store changes
    document.addEventListener('storeContextChanged', function(event) {
        console.log('Store context changed in profit management:', event.detail);
        
        // Hide loading overlay if it exists
        const overlay = document.getElementById('storeChangeOverlay');
        if (overlay) {
            overlay.remove();
        }
        
        // Reload profit data for new store
        setTimeout(() => {
            loadProfitData();
        }, 500);
    });
}

// Test Firebase connection
async function testFirebaseConnection() {
    try {
        console.log('Testing Firebase connection...');
        console.log('Firebase app:', firebase.app());
        console.log('Database instance:', database);
        
        if (database) {
            // Test with a simple read
            const testRef = database.ref('.info/connected');
            testRef.on('value', function(snapshot) {
                if (snapshot.val() === true) {
                    console.log('✅ Firebase connected successfully');
                } else {
                    console.log('❌ Firebase not connected');
                }
            });
        } else {
            console.error('❌ Database instance not available');
        }
    } catch (error) {
        console.error('❌ Firebase connection test failed:', error);
    }
}

// Load current store context and update header display
function loadCurrentStoreContext() {
    try {
        const selectedStoreId = localStorage.getItem('selectedStoreId');
        const selectedStoreData = localStorage.getItem('selectedStoreData');
        
        if (selectedStoreId && selectedStoreData) {
            const storeData = JSON.parse(selectedStoreData);
            console.log('Loading stored context:', { storeId: selectedStoreId, storeName: storeData.name });
            
            // Update header display with retry mechanism
            const updateHeaderName = () => {
                const currentStoreName = document.getElementById('currentStoreName');
                if (currentStoreName) {
                    currentStoreName.textContent = storeData.name;
                    console.log('Updated header with store name:', storeData.name);
                    return true;
                } else {
                    console.warn('currentStoreName element not found in header');
                    return false;
                }
            };
            
            // Try immediately
            if (!updateHeaderName()) {
                // Retry after a delay
                setTimeout(() => {
                    if (!updateHeaderName()) {
                        console.error('Failed to update header name after retry');
                    }
                }, 500);
            }
        } else {
            console.log('No stored store context found');
        }
    } catch (error) {
        console.error('Error loading store context:', error);
    }
}

// Helper function to manually load stores if header initialization fails
async function manuallyLoadStores() {
    try {
        console.log('Manually loading stores...');
        
        if (!window.database) {
            console.error('Firebase database not available for manual store loading');
            showFallbackStoreList();
            return;
        }
        
        const snapshot = await database.ref('stores').once('value');
        const stores = snapshot.val() || {};
        
        console.log('Manually loaded stores:', stores);
        console.log('Number of stores:', Object.keys(stores).length);
        
        // Update store list manually
        const storeList = document.getElementById('storeList');
        if (storeList) {
            if (Object.keys(stores).length > 0) {
                let storesHTML = '';
                
                // Sort stores by name
                const sortedStores = Object.entries(stores).sort((a, b) => 
                    a[1].name.localeCompare(b[1].name)
                );
                
                for (const [storeId, store] of sortedStores) {
                    const statusIcon = store.status === 'active' ? 'fas fa-circle' : 'fas fa-pause-circle';
                    
                    storesHTML += `
                        <div class="store-item" onclick="selectStore('${storeId}')">
                            <div class="store-item-icon">
                                <i class="${statusIcon}"></i>
                            </div>
                            <div class="store-item-info">
                                <div class="store-item-name">${store.name}</div>
                                <div class="store-item-address">${store.address || 'Không có địa chỉ'}</div>
                            </div>
                        </div>
                    `;
                }
                
                storeList.innerHTML = storesHTML;
                console.log('Store list updated manually');
            } else {
                showFallbackStoreList();
            }
        } else {
            console.warn('Store list element not found');
        }
        
    } catch (error) {
        console.error('Error manually loading stores:', error);
        showFallbackStoreList();
    }
}

// Show fallback store list when Firebase fails
function showFallbackStoreList() {
    const storeList = document.getElementById('storeList');
    if (storeList) {
        storeList.innerHTML = `
            <div class="store-item" style="text-align: center; color: var(--text-light); padding: 20px;">
                <i class="fas fa-exclamation-triangle" style="color: #ff9800; margin-bottom: 8px; font-size: 24px;"></i>
                <div style="font-weight: 500; margin-bottom: 4px;">Không thể tải danh sách cửa hàng</div>
                <div style="font-size: 12px;">Vui lòng kiểm tra kết nối Firebase</div>
                <button onclick="manuallyLoadStores()" style="margin-top: 12px; padding: 6px 12px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-refresh"></i> Thử lại
                </button>
            </div>
        `;
        console.log('Fallback store list displayed');
    }
}

// Load profit data from Firebase
async function loadProfitData() {
    try {
        console.log('Loading real profit data from Firebase...');
        
        // Check if Firebase is available
        if (!window.database && !window.firebase) {
            console.error('Firebase database not available');
            showNotification('Không thể kết nối Firebase', 'error');
            loadSampleData(); // Load sample data as fallback
            return;
        }
        
        // Initialize database reference if not available
        if (!window.database && window.firebase) {
            window.database = window.firebase.database();
        }
        
        // Get current store context
        const currentStoreId = getCurrentStore();
        console.log('Current store ID:', currentStoreId);
        
        // Load orders from Firebase - fix the path issue
        const ordersRef = window.database.ref('orders');
        const snapshot = await ordersRef.once('value');
        const allOrders = snapshot.val() || {};
        
        console.log('Total orders loaded from Firebase:', Object.keys(allOrders).length);
        
        // Filter orders by store and date range
        const filteredOrders = filterOrdersByStoreAndDate(allOrders, currentStoreId);
        
        console.log('Filtered orders for current store and date range:', Object.keys(filteredOrders).length);
        console.log('Sample filtered orders:', Object.keys(filteredOrders).slice(0, 5));
        
        // Calculate profit data
        calculateProfitData(filteredOrders);
        
        console.log('Calculated profit data:', profitData);
        
        // Update UI
        updateStatisticsCards();
        updateCharts();
        updateAnalysisTables();
        updateMonthlyComparison();
        
        console.log('Real profit data loaded and UI updated successfully');
        
    } catch (error) {
        console.error('Error loading profit data:', error);
        showNotification('Lỗi khi tải dữ liệu lợi nhuận: ' + error.message, 'error');
        // Load sample data as fallback
        loadSampleData();
    }
}
// Load sample data for testing
function loadSampleData() {
    console.log('Loading sample data...');
    
    // Generate sample profit data
    profitData = {
        total: 15000000,
        tmdt: 8000000,
        wholesale: 5000000,
        retail: 2000000
    };
    
    // Generate sample orders data
    salesOrdersData = {
        'sample1': {
            source: 'tmdt_sales',
            platform: 'Shopee',
            productName: 'Sản phẩm A',
            sku: 'SKU001',
            quantity: 10,
            sellingPrice: 100000,
            importPrice: 70000,
            total: 1000000,
            createdAt: new Date().toISOString()
        },
        'sample2': {
            source: 'wholesale_sales',
            customerName: 'Khách hàng B',
            items: [
                {
                    productName: 'Sản phẩm B',
                    sku: 'SKU002',
                    quantity: 20,
                    sellingPrice: 150000,
                    importPrice: 100000
                }
            ],
            total: 3000000,
            createdAt: new Date().toISOString()
        },
        'sample3': {
            source: 'retail_sales',
            productName: 'Sản phẩm C',
            sku: 'SKU003',
            quantity: 5,
            sellingPrice: 200000,
            importPrice: 150000,
            total: 1000000,
            createdAt: new Date().toISOString()
        }
    };
    
    // Update UI with sample data immediately without loading
    setTimeout(() => {
        updateStatisticsCards();
        updateCharts();
        updateAnalysisTables();
        updateMonthlyComparison();
    }, 100);
    
    console.log('Sample data loaded successfully');
}

// Filter orders by store and date range
function filterOrdersByStoreAndDate(allOrders, storeId) {
    const filtered = {};
    
    Object.entries(allOrders).forEach(([orderId, order]) => {
        // Skip if no order data
        if (!order) return;
        
        // Check if order belongs to current store (if storeId provided)
        if (storeId && order.storeId && order.storeId !== storeId) {
            return;
        }
        
        // Check if order is a sold order - look for various indicators
        const isTmdtSales = order.source === 'tmdt_sales' || 
                           order.orderType === 'ecommerce' || 
                           order.platform || 
                           (order.status === 'sold' && order.platform);
        
        const isWholesaleSales = order.source === 'wholesale_sales' || 
                                order.orderType === 'wholesale' || 
                                (order.customerName && order.items && Array.isArray(order.items)) ||
                                (order.status === 'sold' && order.customerName);
        
        const isRetailSales = order.source === 'retail_sales' || 
                             order.orderType === 'retail' ||
                             (order.status === 'sold' && !order.platform && !order.customerName);
        
        // Only include sold orders
        if (!isTmdtSales && !isWholesaleSales && !isRetailSales) {
            return;
        }
        
        // Check date range
        const orderDate = new Date(order.createdAt || order.orderDate || order.date);
        if (isNaN(orderDate.getTime())) {
            console.warn('Invalid date for order:', orderId, order);
            return;
        }
        
        if (orderDate >= currentDateRange.startDate && orderDate <= currentDateRange.endDate) {
            filtered[orderId] = order;
        }
    });
    
    console.log('Filtering results:');
    console.log('- Total orders checked:', Object.keys(allOrders).length);
    console.log('- Orders matching criteria:', Object.keys(filtered).length);
    
    // Log sample of filtered orders for debugging
    const sampleOrders = Object.entries(filtered).slice(0, 3);
    sampleOrders.forEach(([id, order]) => {
        console.log(`- Sample order ${id}:`, {
            source: order.source,
            orderType: order.orderType,
            platform: order.platform,
            customerName: order.customerName,
            status: order.status,
            hasItems: !!order.items,
            createdAt: order.createdAt || order.orderDate || order.date
        });
    });
    
    salesOrdersData = filtered;
    return filtered;
}

// Calculate profit data from orders with platform fees
async function calculateProfitData(orders) {
    profitData = {
        total: 0,
        tmdt: 0,
        wholesale: 0,
        retail: 0
    };
    
    let tmdtCount = 0, wholesaleCount = 0, retailCount = 0;
    
    // Process orders sequentially to handle async fee loading
    for (const order of Object.values(orders)) {
        let orderProfit = 0;
        
        // Calculate base profit based on order structure
        if (order.items && Array.isArray(order.items)) {
            // Multi-item order (usually wholesale)
            orderProfit = order.items.reduce((sum, item) => {
                const sellingPrice = parseFloat(item.sellingPrice || item.price || 0);
                const importPrice = parseFloat(item.importPrice || item.cost || 0);
                const quantity = parseInt(item.quantity || 0);
                const profit = (sellingPrice - importPrice) * quantity;
                return sum + profit;
            }, 0);
        } else {
            // Single item order
            const sellingPrice = parseFloat(order.sellingPrice || order.price || order.total || 0);
            const importPrice = parseFloat(order.importPrice || order.cost || 0);
            const quantity = parseInt(order.quantity || 1);
            orderProfit = (sellingPrice - importPrice) * quantity;
        }
        
        // Skip if profit calculation failed
        if (isNaN(orderProfit)) {
            console.warn('Invalid profit calculation for order:', order);
            continue;
        }
        
        // Classify order type
        const isTmdtSales = order.source === 'tmdt_sales' || 
                           order.orderType === 'ecommerce' || 
                           order.platform;
        
        // For TMĐT orders, subtract platform fees
        if (isTmdtSales && order.platform) {
            try {
                const platformFees = await loadPlatformFeesFromFirebase(order.platform);
                if (platformFees) {
                    const totalAmount = parseFloat(order.sellingPrice || order.price || order.total || 0) * 
                                      parseInt(order.quantity || 1);
                    
                    let totalFees = 0;
                    
                    // Calculate transaction fee
                    if (platformFees.transactionFee) {
                        if (platformFees.transactionFee.type === 'percent') {
                            totalFees += (totalAmount * platformFees.transactionFee.value) / 100;
                        } else {
                            totalFees += platformFees.transactionFee.value;
                        }
                    }
                    
                    // Calculate commission fee
                    if (platformFees.commissionFee) {
                        if (platformFees.commissionFee.type === 'percent') {
                            totalFees += (totalAmount * platformFees.commissionFee.value) / 100;
                        } else {
                            totalFees += platformFees.commissionFee.value;
                        }
                    }
                    
                    // Subtract fees from profit
                    orderProfit -= totalFees;
                    
                    console.log(`📊 Order ${order.orderId}: Base profit: ${orderProfit + totalFees}, Fees: ${totalFees}, Final profit: ${orderProfit}`);
                }
            } catch (error) {
                console.error('Error loading platform fees for order:', order.orderId, error);
            }
        }
        
        // Add to total
        profitData.total += orderProfit;
        
        const isWholesaleSales = order.source === 'wholesale_sales' || 
                                order.orderType === 'wholesale' || 
                                (order.customerName && order.items);
        
        const isRetailSales = order.source === 'retail_sales' || 
                             order.orderType === 'retail' ||
                             (!order.platform && !order.customerName);
        
        if (isTmdtSales) {
            profitData.tmdt += orderProfit;
            tmdtCount++;
        } else if (isWholesaleSales) {
            profitData.wholesale += orderProfit;
            wholesaleCount++;
        } else if (isRetailSales) {
            profitData.retail += orderProfit;
            retailCount++;
        }
    }
    
    console.log('Profit calculation results with platform fees:');
    console.log('- Total orders processed:', Object.values(orders).length);
    console.log('- TMĐT orders:', tmdtCount, 'Profit:', profitData.tmdt);
    console.log('- Wholesale orders:', wholesaleCount, 'Profit:', profitData.wholesale);
    console.log('- Retail orders:', retailCount, 'Profit:', profitData.retail);
    console.log('- Total profit:', profitData.total);
}

// Update statistics cards
function updateStatisticsCards() {
    // Update values
    document.getElementById('total-profit').textContent = formatCurrency(profitData.total);
    document.getElementById('tmdt-profit').textContent = formatCurrency(profitData.tmdt);
    document.getElementById('wholesale-profit').textContent = formatCurrency(profitData.wholesale);
    document.getElementById('retail-profit').textContent = formatCurrency(profitData.retail);
    
    // Update percentages
    const total = profitData.total || 1; // Avoid division by zero
    document.getElementById('tmdt-percentage').textContent = 
        `${((profitData.tmdt / total) * 100).toFixed(1)}%`;
    document.getElementById('wholesale-percentage').textContent = 
        `${((profitData.wholesale / total) * 100).toFixed(1)}%`;
    document.getElementById('retail-percentage').textContent = 
        `${((profitData.retail / total) * 100).toFixed(1)}%`;
    
    // Update trend (placeholder for now)
    document.getElementById('total-profit-change').textContent = '+0%';
}

// Update charts
function updateCharts() {
    updatePieChart();
    updateTrendChart();
}

// Update pie chart
function updatePieChart() {
    const ctx = document.getElementById('profit-pie-chart').getContext('2d');
    
    if (profitCharts.pieChart) {
        profitCharts.pieChart.destroy();
    }
    
    profitCharts.pieChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['TMĐT', 'Bán Sỉ', 'Bán Lẻ'],
            datasets: [{
                data: [profitData.tmdt, profitData.wholesale, profitData.retail],
                backgroundColor: [
                    '#007bff',
                    '#28a745',
                    '#dc3545'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Update TMĐT platform performance chart
function updateTmdtPlatformChart() {
    console.log('🎯 updateTmdtPlatformChart called');
    
    const ctx = document.getElementById('tmdt-platform-chart');
    console.log('🎯 Canvas element:', ctx);
    
    if (!ctx) {
        console.error('❌ TMĐT platform chart canvas not found');
        return;
    }
    
    const chartCtx = ctx.getContext('2d');
    console.log('🎯 Chart context:', chartCtx);
    
    if (profitCharts.platformChart) {
        profitCharts.platformChart.destroy();
    }
    
    // Calculate profit by platform from loaded TMĐT orders
    const platformProfits = calculatePlatformProfits();
    
    const platforms = Object.keys(platformProfits);
    const profits = Object.values(platformProfits);
    
    if (platforms.length === 0) {
        // Show empty state
        chartCtx.clearRect(0, 0, ctx.width, ctx.height);
        chartCtx.font = '16px Arial';
        chartCtx.fillStyle = '#666';
        chartCtx.textAlign = 'center';
        chartCtx.fillText('Chưa có dữ liệu', ctx.width / 2, ctx.height / 2);
        return;
    }
    
    console.log('📊 Creating platform chart with platforms:', platforms);
    console.log('📊 Platform profits:', profits);
    
    // Handle case where total profit might be negative or zero
    const totalProfit = profits.reduce((sum, profit) => sum + profit, 0);
    console.log('📊 Total profit for chart:', totalProfit);
    
    // If total profit is negative or zero, show absolute values for visualization
    const displayProfits = totalProfit <= 0 ? profits.map(p => Math.abs(p)) : profits;
    const displayTotal = displayProfits.reduce((sum, profit) => sum + profit, 0);
    
    profitCharts.platformChart = new Chart(chartCtx, {
        type: 'doughnut',
        data: {
            labels: platforms,
            datasets: [{
                data: displayProfits,
                backgroundColor: [
                    '#FF6B35', // Shopee - Orange
                    '#1877F2', // Facebook - Blue  
                    '#FF0050', // TikTok - Pink
                    '#0F4C75', // Lazada - Dark Blue
                    '#E74C3C', // Sendo - Red
                    '#00D4AA', // Tiki - Teal
                    '#7B68EE', // Zalo - Purple
                    '#95A5A6'  // Other - Gray
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const originalValue = profits[context.dataIndex];
                            const displayValue = displayProfits[context.dataIndex];
                            const percentage = displayTotal > 0 ? ((displayValue / displayTotal) * 100).toFixed(1) : 0;
                            const prefix = totalProfit <= 0 ? 'Lỗ: ' : '';
                            return `${context.label}: ${prefix}${formatCurrency(Math.abs(originalValue))} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    console.log('✅ Platform chart created successfully');
}

// Calculate profit by platform from TMĐT orders
function calculatePlatformProfits() {
    const platformProfits = {};
    
    console.log('🔍 Debug calculatePlatformProfits:');
    console.log('window.tmdtOrdersData:', window.tmdtOrdersData);
    console.log('window.tmdtOrdersData length:', window.tmdtOrdersData ? window.tmdtOrdersData.length : 'undefined');
    
    const tmdtOrders = window.tmdtOrdersData || [];
    
    if (!tmdtOrders || tmdtOrders.length === 0) {
        console.log('❌ No TMĐT orders data available for platform chart');
        return platformProfits;
    }
    
    tmdtOrders.forEach((order, index) => {
        const platform = order.platform || 'Khác';
        const platformName = getPlatformDisplayName(platform);
        
        console.log(`📊 Order ${index + 1}: platform=${platform}, platformName=${platformName}`);
        
        // Calculate profit for this order
        const profit = calculateOrderProfitSync(order);
        console.log(`💰 Calculated profit: ${profit}`);
        
        // Include all orders (positive and negative profit) for comprehensive view
        if (!platformProfits[platformName]) {
            platformProfits[platformName] = 0;
        }
        platformProfits[platformName] += profit;
    });
    
    console.log('📈 Final platform profits:', platformProfits);
    return platformProfits;
}

// Get display name for platform
function getPlatformDisplayName(platform) {
    const platformNames = {
        'shopee': 'Shopee',
        'lazada': 'Lazada',
        'tiktok': 'TikTok Shop',
        'sendo': 'Sendo',
        'tiki': 'Tiki',
        'facebook': 'Facebook Shop',
        'zalo': 'Zalo Shop'
    };
    
    return platformNames[platform?.toLowerCase()] || 'Khác';
}

// Synchronous profit calculation for chart
function calculateOrderProfitSync(order) {
    try {
        const sellingPrice = parseFloat(order.sellingPrice) || 0;
        const importPrice = parseFloat(order.importPrice) || 0;
        const quantity = parseInt(order.quantity) || 1;
        
        // Basic profit calculation
        const basicProfit = (sellingPrice - importPrice) * quantity;
        
        // Try to get platform fees if available
        const platform = order.platform?.toLowerCase();
        const platformFees = getPlatformFeesFromStorageSync(platform);
        const feeAmount = calculatePlatformFeeAmount(sellingPrice * quantity, platformFees);
        
        return Math.max(0, basicProfit - feeAmount);
    } catch (error) {
        console.error('Error calculating order profit:', error);
        return 0;
    }
}

// Update trend chart
function updateTrendChart() {
    const ctx = document.getElementById('profit-trend-chart').getContext('2d');
    
    if (profitCharts.trendChart) {
        profitCharts.trendChart.destroy();
    }
    
    // Generate sample trend data (replace with real data later)
    const labels = generateDateLabels();
    const tmdtData = generateTrendData(profitData.tmdt, labels.length);
    const wholesaleData = generateTrendData(profitData.wholesale, labels.length);
    const retailData = generateTrendData(profitData.retail, labels.length);
    
    profitCharts.trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'TMĐT',
                    data: tmdtData,
                    borderColor: '#007bff',
                    backgroundColor: 'rgba(0, 123, 255, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Bán Sỉ',
                    data: wholesaleData,
                    borderColor: '#28a745',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Bán Lẻ',
                    data: retailData,
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

// Update analysis tables
function updateAnalysisTables() {
    updateChannelTable();
    updateTopProductsTable();
}

// Update profit by channel table
function updateChannelTable() {
    const tbody = document.getElementById('profit-by-channel-table');
    
    const channels = [
        {
            name: 'TMĐT',
            orders: getOrderCountByChannel('tmdt'),
            revenue: getRevenueByChannel('tmdt'),
            cost: getCostByChannel('tmdt'),
            profit: profitData.tmdt,
            trend: '+5%'
        },
        {
            name: 'Bán Sỉ',
            orders: getOrderCountByChannel('wholesale'),
            revenue: getRevenueByChannel('wholesale'),
            cost: getCostByChannel('wholesale'),
            profit: profitData.wholesale,
            trend: '+12%'
        },
        {
            name: 'Bán Lẻ',
            orders: getOrderCountByChannel('retail'),
            revenue: getRevenueByChannel('retail'),
            cost: getCostByChannel('retail'),
            profit: profitData.retail,
            trend: '+3%'
        }
    ];
    
    tbody.innerHTML = channels.map(channel => {
        const profitMargin = channel.revenue > 0 ? ((channel.profit / channel.revenue) * 100).toFixed(1) : 0;
        return `
            <tr>
                <td><strong>${channel.name}</strong></td>
                <td class="text-center">${channel.orders}</td>
                <td class="text-right">${formatCurrency(channel.revenue)}</td>
                <td class="text-right">${formatCurrency(channel.cost)}</td>
                <td class="text-right"><strong>${formatCurrency(channel.profit)}</strong></td>
                <td class="text-center">${profitMargin}%</td>
                <td class="text-center text-success">${channel.trend}</td>
            </tr>
        `;
    }).join('');
}

// Update TMĐT top products table
function updateTmdtTopProductsTable(orders = []) {
    const tbody = document.querySelector('#tmdt-top-products tbody');
    
    if (!tbody) {
        console.warn('TMĐT top products table body not found');
        return;
    }
    
    if (!orders || orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">Không có dữ liệu đơn hàng</td>
            </tr>
        `;
        return;
    }
    
    console.log('Updating TMĐT top products with orders:', orders.length);
    
    // Debug: Log first few orders to see platform data
    if (orders.length > 0) {
        console.log('Sample order platform data:', {
            platform: orders[0].platform,
            platformName: orders[0].platformName,
            allPlatforms: orders.slice(0, 3).map(o => ({ platform: o.platform, platformName: o.platformName }))
        });
    }
    
    // Calculate product profits
    const productProfits = {};
    
    orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
            // Multi-item order
            order.items.forEach(item => {
                const key = item.sku || item.productName || 'Unknown';
                if (!productProfits[key]) {
                    productProfits[key] = {
                        name: item.productName || 'N/A',
                        platform: order.platformName || order.platform || 'Khác',
                        quantity: 0,
                        profit: 0,
                        revenue: 0
                    };
                }
                
                const itemProfit = (item.sellingPrice || 0) - (item.importPrice || 0);
                productProfits[key].quantity += item.quantity || 0;
                productProfits[key].profit += itemProfit * (item.quantity || 0);
                productProfits[key].revenue += (item.sellingPrice || 0) * (item.quantity || 0);
            });
        } else {
            // Single item order
            const key = order.sku || order.productName || 'Unknown';
            if (!productProfits[key]) {
                productProfits[key] = {
                    name: order.productName || 'N/A',
                    platform: order.platformName || order.platform || 'Khác',
                    quantity: 0,
                    profit: 0,
                    revenue: 0
                };
            }
            
            const orderProfit = (order.sellingPrice || 0) - (order.importPrice || 0);
            productProfits[key].quantity += order.quantity || 1;
            productProfits[key].profit += orderProfit * (order.quantity || 1);
            productProfits[key].revenue += (order.sellingPrice || 0) * (order.quantity || 1);
        }
    });
    
    // Sort by quantity (lượt bán) - get all products for pagination
    const allProducts = Object.values(productProfits)
        .sort((a, b) => b.quantity - a.quantity);
    
    // Initialize pagination if not exists
    if (!window.topProductsPagination) {
        window.topProductsPagination = {
            currentPage: 1,
            itemsPerPage: 5,
            totalItems: 0
        };
    }
    
    window.topProductsPagination.totalItems = allProducts.length;
    const totalPages = Math.ceil(allProducts.length / window.topProductsPagination.itemsPerPage);
    
    // Get products for current page
    const startIndex = (window.topProductsPagination.currentPage - 1) * window.topProductsPagination.itemsPerPage;
    const endIndex = startIndex + window.topProductsPagination.itemsPerPage;
    const topProducts = allProducts.slice(startIndex, endIndex);
    
    if (allProducts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">Không có sản phẩm nào</td>
            </tr>
        `;
        document.getElementById('top-products-pagination').style.display = 'none';
        return;
    }
    
    tbody.innerHTML = topProducts.map((product, index) => {
        const profitMargin = product.revenue > 0 ? ((product.profit / product.revenue) * 100).toFixed(1) : 0;
        // Truncate long product names
        const displayName = product.name.length > 50 ? product.name.substring(0, 47) + '...' : product.name;
        // Get platform display name - debug the actual platform value
        console.log(`Product ${index + 1} platform data:`, { 
            originalPlatform: product.platform, 
            displayName: getPlatformDisplayName(product.platform) 
        });
        const platformDisplay = getPlatformDisplayName(product.platform);
        
        return `
            <tr>
                <td class="text-center">${index + 1}</td>
                <td title="${product.name}">${displayName}</td>
                <td class="text-center">${platformDisplay}</td>
                <td class="text-center">${product.quantity}</td>
                <td class="text-right">${formatCurrency(product.revenue)}</td>
                <td class="text-right" style="color: ${product.profit >= 0 ? '#28a745' : '#dc3545'}">${formatCurrency(product.profit)}</td>
                <td class="text-center">${profitMargin}%</td>
            </tr>
        `;
    }).join('');
    
    // Update pagination info and controls
    // updateTopProductsPagination(allProducts.length, totalPages); // Function not implemented yet
    
    console.log('Updated TMĐT top products table with', topProducts.length, 'products on page', window.topProductsPagination.currentPage, 'of', totalPages);
}

// Update monthly comparison
function updateMonthlyComparison() {
    const container = document.getElementById('monthly-comparison');
    
    // Generate last 6 months data
    const months = [];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        months.push({
            name: monthDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }),
            profit: Math.random() * profitData.total * 0.3, // Sample data
            change: (Math.random() - 0.5) * 20 // Sample change percentage
        });
    }
    
    container.innerHTML = months.map(month => `
        <div class="month-card">
            <h5>${month.name}</h5>
            <div class="profit-amount">${formatCurrency(month.profit)}</div>
            <div class="profit-change ${month.change >= 0 ? 'positive' : 'negative'}">
                ${month.change >= 0 ? '+' : ''}${month.change.toFixed(1)}%
            </div>
        </div>
    `).join('');
}

// Helper functions
function getOrderCountByChannel(channel) {
    return Object.values(salesOrdersData).filter(order => {
        if (channel === 'tmdt') return order.source === 'tmdt_sales' || order.platform;
        if (channel === 'wholesale') return order.source === 'wholesale_sales' || order.customerName;
        if (channel === 'retail') return order.source === 'retail_sales';
        return false;
    }).length;
}

function getRevenueByChannel(channel) {
    return Object.values(salesOrdersData)
        .filter(order => {
            if (channel === 'tmdt') return order.source === 'tmdt_sales' || order.platform;
            if (channel === 'wholesale') return order.source === 'wholesale_sales' || order.customerName;
            if (channel === 'retail') return order.source === 'retail_sales';
            return false;
        })
        .reduce((sum, order) => sum + (order.total || order.totalAmount || order.subtotal || 0), 0);
}

function getCostByChannel(channel) {
    return Object.values(salesOrdersData)
        .filter(order => {
            if (channel === 'tmdt') return order.source === 'tmdt_sales' || order.platform;
            if (channel === 'wholesale') return order.source === 'wholesale_sales' || order.customerName;
            if (channel === 'retail') return order.source === 'retail_sales';
            return false;
        })
        .reduce((sum, order) => {
            if (order.items && Array.isArray(order.items)) {
                return sum + order.items.reduce((itemSum, item) => 
                    itemSum + ((item.importPrice || 0) * (item.quantity || 0)), 0);
            } else {
                return sum + ((order.importPrice || 0) * (order.quantity || 1));
            }
        }, 0);
}

function generateDateLabels() {
    const labels = [];
    const days = Math.floor((currentDateRange.endDate - currentDateRange.startDate) / (1000 * 60 * 60 * 24));
    const interval = Math.max(1, Math.floor(days / 10)); // Show max 10 labels
    
    for (let i = 0; i <= days; i += interval) {
        const date = new Date(currentDateRange.startDate);
        date.setDate(date.getDate() + i);
        labels.push(date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }));
    }
    
    return labels;
}

function generateTrendData(totalValue, length) {
    const data = [];
    const baseValue = totalValue / length;
    
    for (let i = 0; i < length; i++) {
        // Add some randomness to make it look realistic
        const variation = (Math.random() - 0.5) * baseValue * 0.4;
        data.push(Math.max(0, baseValue + variation));
    }
    
    return data;
}

// Event handlers
function applyDateFilter() {
    const startDate = new Date(document.getElementById('start-date').value);
    const endDate = new Date(document.getElementById('end-date').value);
    
    if (startDate > endDate) {
        showNotification('Ngày bắt đầu không thể lớn hơn ngày kết thúc', 'error');
        return;
    }
    
    currentDateRange.startDate = startDate;
    currentDateRange.endDate = endDate;
    
    loadProfitData();
}

function updateCharts() {
    const period = document.getElementById('chart-period').value;
    
    // Update date range based on period
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(period));
    
    currentDateRange.startDate = startDate;
    currentDateRange.endDate = endDate;
    
    // Update date inputs
    document.getElementById('start-date').value = formatDateForInput(startDate);
    document.getElementById('end-date').value = formatDateForInput(endDate);
    
    loadProfitData();
}

function exportProfitReport() {
    showNotification('Chức năng xuất báo cáo đang được phát triển', 'info');
}

// Utility functions - removed duplicate getCurrentStore function

function formatCurrency(amount) {
    const numAmount = typeof amount === 'string' ? Number(amount) : amount;
    if (isNaN(numAmount)) return '0';
    return new Intl.NumberFormat('vi-VN').format(numAmount) + ' đ';
}

function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

function showLoading(show) {
    // Loading overlay removed - no longer needed
    return;
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Initialize profit management when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Profit Management: DOM loaded, initializing...');
    
    // Check if we're on the profit management page
    if (window.location.pathname.includes('profit-management.html')) {
        console.log('On profit management page, starting initialization...');
        
        // Wait for Firebase and other scripts to load
        setTimeout(() => {
            console.log('Starting profit management initialization...');
            initializeProfitManagement();
            
            // Force load TMĐT data after initialization
            setTimeout(() => {
                console.log('🔥 Force loading TMĐT data...');
                loadTmdtProfitData();
            }, 1000);
            
            // Initialize retail profit management if retail-profit-management.js is loaded
            setTimeout(() => {
                if (typeof initializeRetailProfitManagement === 'function') {
                    console.log('🛍️ Initializing retail profit management...');
                    // Don't auto-load retail data, only initialize the module
                } else {
                    console.log('⚠️ Retail profit management script not loaded');
                }
            }, 1500);
        }, 1000);
    }
});

// Get order date function
function getOrderDate(order) {
    // Try different possible date fields
    const dateFields = ['createdAt', 'orderDate', 'date', 'timestamp', 'created'];
    
    for (const field of dateFields) {
        if (order[field]) {
            try {
                const date = new Date(order[field]);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('vi-VN');
                }
            } catch (e) {
                // Continue to next field
            }
        }
    }
    
    // If no valid date found, return N/A
    return 'N/A';
}

// Store name resolution function
function resolveStoreName(order) {
    let storeDisplay = order.storeName || 'N/A';
    
    // Always try to resolve store name if we have storeId
    if (order.storeId) {
        // If we already have storeName, use it
        if (order.storeName && order.storeName !== order.storeId) {
            storeDisplay = order.storeName;
        } else {
            // Simple hardcoded mapping for known stores
            const storeNameMap = {
                'QZmkMFuAV9q3zuSiCEQ': 'Cửa Hàng Chính',
                '-OZmkMFuAV9q3zuSICEQ': 'cường dung',
                '-OZmkOYjLV5QP-_a5_LM': 'Tạp Hóa Bánh Beo'
            };
            
            // Try to resolve from various sources
            let resolvedName = storeNameMap[order.storeId];
            
            if (!resolvedName && typeof getStoreName === 'function') {
                resolvedName = getStoreName(order.storeId);
            }
            
            if (!resolvedName && window.storesData && window.storesData[order.storeId]) {
                resolvedName = window.storesData[order.storeId].name;
            }
            
            if (!resolvedName) {
                try {
                    const currentStore = JSON.parse(localStorage.getItem('currentStore') || '{}');
                    if (currentStore.id === order.storeId && currentStore.name) {
                        resolvedName = currentStore.name;
                    }
                } catch (e) {
                    // Ignore localStorage errors
                }
            }
            
            // Use resolved name or fallback to ID
            storeDisplay = resolvedName || order.storeId;
        }
    }
    
    return storeDisplay;
}

// Get current store function
function getCurrentStore() {
    // Try multiple methods to get store ID
    let storeId = null;
    
    // Method 1: Check if getSelectedStoreId function exists
    if (typeof getSelectedStoreId === 'function') {
        storeId = getSelectedStoreId();
        console.log('🔥 Store ID from getSelectedStoreId():', storeId);
    }
    
    // Method 2: Check localStorage
    if (!storeId) {
        storeId = localStorage.getItem('selectedStoreId');
        console.log('🔥 Store ID from localStorage:', storeId);
    }
    
    // Method 3: Check window.selectedStoreId
    if (!storeId && window.selectedStoreId) {
        storeId = window.selectedStoreId;
        console.log('🔥 Store ID from window.selectedStoreId:', storeId);
    }
    
    // Method 4: Try to get from URL parameters
    if (!storeId) {
        const urlParams = new URLSearchParams(window.location.search);
        storeId = urlParams.get('storeId');
        console.log('🔥 Store ID from URL params:', storeId);
    }
    
    console.log('🔥 Final store ID:', storeId);
    return storeId;
}

// Removed duplicate formatCurrency function

// Format date function
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
}

// Global exports
window.initializeProfitManagement = initializeProfitManagement;
window.applyDateFilter = applyDateFilter;
window.updateCharts = updateCharts;
window.exportProfitReport = exportProfitReport;
window.handleDateRangeChange = handleDateRangeChange;
window.setDefaultDateRange = setDefaultDateRange;
window.switchProfitView = switchProfitView;
window.updatePlatformStats = updatePlatformStats;
window.openPlatformFeesModal = openPlatformFeesModal;
window.closePlatformFeesModal = closePlatformFeesModal;
window.switchPlatformFeesForm = switchPlatformFeesForm;
window.loadTmdtSalesOrders = loadTmdtSalesOrders;
window.updateTmdtOrdersDetailTable = updateTmdtOrdersDetailTable;
window.calculateOrderProfitWithFees = calculateOrderProfitWithFees;


// Checkbox and selection management functions
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const orderCheckboxes = document.querySelectorAll('.order-checkbox');
    
    orderCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    
    updateSelectedCount();
}

function selectAllOrders() {
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const orderCheckboxes = document.querySelectorAll('.order-checkbox');
    
    const allChecked = Array.from(orderCheckboxes).every(cb => cb.checked);
    
    orderCheckboxes.forEach(checkbox => {
        checkbox.checked = !allChecked;
    });
    
    selectAllCheckbox.checked = !allChecked;
    updateSelectedCount();
}

function updateSelectedCount() {
    const selectedCheckboxes = document.querySelectorAll('.order-checkbox:checked');
    const count = selectedCheckboxes.length;
    const selectedCountElement = document.getElementById('selected-count');
    const deleteSelectedBtn = document.querySelector('.btn-delete-selected');
    
    if (selectedCountElement) {
        selectedCountElement.textContent = count;
    }
    
    if (deleteSelectedBtn) {
        deleteSelectedBtn.disabled = count === 0;
    }
    
    // Update select all checkbox state
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    const orderCheckboxes = document.querySelectorAll('.order-checkbox');
    if (selectAllCheckbox && orderCheckboxes.length > 0) {
        const allChecked = Array.from(orderCheckboxes).every(cb => cb.checked);
        const someChecked = Array.from(orderCheckboxes).some(cb => cb.checked);
        
        selectAllCheckbox.checked = allChecked;
        selectAllCheckbox.indeterminate = someChecked && !allChecked;
    }
}

// Order detail modal functions
async function viewOrderDetail(orderId) {
    // Use the global tmdtOrdersData that's already loaded
    if (window.tmdtOrdersData && window.tmdtOrdersData[orderId]) {
        const order = window.tmdtOrdersData[orderId];
        await showOrderDetailModal(orderId, order);
    } else {
        // Fallback: reload data if not available
        try {
            const orders = await loadTmdtSalesOrders();
            const order = orders[orderId];
            if (!order) {
                alert('Không tìm thấy thông tin đơn hàng!');
                return;
            }
            
            await showOrderDetailModal(orderId, order);
        } catch (error) {
            console.error('Error loading order detail:', error);
            alert('Lỗi khi tải thông tin đơn hàng!');
        }
    }
}

async function showOrderDetailModal(orderId, order) {
    const modal = document.getElementById('order-detail-modal');
    const infoContainer = document.getElementById('order-detail-info');
    
    if (!modal || !infoContainer) {
        console.error('Order detail modal elements not found');
        return;
    }
    
    // Calculate profit with platform fees and external costs
    const sellingPrice = parseFloat(order.sellingPrice || 0);
    const importPrice = parseFloat(order.importPrice || 0);
    const quantity = parseInt(order.quantity || 1);
    const baseProfit = (sellingPrice - importPrice) * quantity;
    const finalProfitData = await calculateOrderProfitWithPlatformFees(order);
    const finalProfit = finalProfitData.finalProfit || finalProfitData; // Support both old and new format
    const totalAllCosts = baseProfit - finalProfit;
    
    const profitClass = finalProfit > 0 ? 'profit-positive' : 'profit-negative';
    
    const platformNames = {
        'shopee': 'Shopee',
        'lazada': 'Lazada', 
        'tiktok': 'TikTok Shop',
        'sendo': 'Sendo',
        'tiki': 'Tiki',
        'facebook': 'Facebook Shop',
        'zalo': 'Zalo Shop',
        'other': 'Khác'
    };
    
    // Generate detailed cost breakdown HTML (platform fees + external costs)
    let costsHtml = '';
    let calculatedTotalFees = 0; // Track platform fees
    let calculatedTotalExternalCosts = 0; // Track external costs
    
    // Get platform fees and external costs
    let platformFees = null;
    let externalCosts = null;
    
    try {
        platformFees = await loadPlatformFeesFromFirebase(order.platform);
        externalCosts = await getExternalCostsFromStorage(order.storeId);
    } catch (error) {
        console.error('Error loading costs for modal:', error);
    }
    
    // Fallback to UI fees if Firebase returns null
    if (!platformFees) {
        platformFees = readFeesFromUI();
    }
    
    // Calculate packaging cost separately for display
    let packagingCostAmount = 0;
    if (order.productType && order.weight && typeof calculatePackagingCost === 'function') {
        packagingCostAmount = calculatePackagingCost(order.productType, order.weight) || 0;
        console.log('📦 MODAL: Packaging cost for display:', packagingCostAmount);
    }
    
    if (totalAllCosts > 0 || packagingCostAmount > 0) {
        let platformFeeDetails = '';
        let externalCostDetails = '';
        let packagingCostDetails = '';
        
        // Add packaging cost section
        if (packagingCostAmount > 0) {
            packagingCostDetails = `
                <div class="info-group fees-section">
                    <label>Chi Phí Đóng Gói</label>
                    <div class="fees-breakdown">
                        <div class="fee-item">
                            <span class="fee-name">Chi Phí Thùng ${order.productType === 'cold' ? 'Lạnh' : order.productType === 'dry' ? 'Khô' : order.productType === 'liquid' ? 'Lỏng' : order.productType || 'Không xác định'} (${order.weight || 0}kg)</span>
                            <span class="fee-amount">-${formatCurrency(packagingCostAmount)}</span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Process platform fees
        if (platformFees && Object.keys(platformFees).length > 0) {
            const totalRevenue = sellingPrice * quantity;
            
            // Define fee names mapping
            const feeNames = {
                transactionFee: 'Phí Giao Dịch',
                commissionFee: 'Phí Hoa Hồng',
                actualShippingFee: 'Phí Vận Chuyển Thực Tế',
                shippingDiscount: 'Chiết Khấu Phí Vận Chuyển',
                sellerShippingDiscount: 'Giảm Phí VC Người Bán',
                tiktokShippingDiscount: 'Giảm Phí VC TikTok Shop',
                returnShippingFee: 'Phí VC Trả Hàng',
                shippingSubsidy: 'Trợ Giá Vận Chuyển',
                affiliateCommission: 'Hoa Hồng Liên Kết',
                voucherXtraFee: 'Phí Voucher Xtra',
                vatTax: 'Thuế GTGT',
                personalIncomeTax: 'Thuế TNCN',
                incomeTax: 'Thuế TNCN',
                sellerDiscount: 'Giảm Giá Người Bán',
                shippingFee: 'Phí Vận Chuyển',
                voucherFee: 'Phí Voucher',
                platformShippingDiscount: 'Chiết Khấu Vận Chuyển Sàn'
            };
            
            // Process platform fees
            Object.keys(platformFees).forEach(feeKey => {
                if (feeKey === 'customFeesList' || feeKey.startsWith('custom_')) return;
                
                const fee = platformFees[feeKey];
                if (fee && fee.value && parseFloat(fee.value) > 0) {
                    const feeValue = parseFloat(fee.value);
                    let feeAmount = 0;
                    let feeRate = '';
                    let feeName = feeNames[feeKey] || feeKey;
                    
                    if (fee.type === 'percent') {
                        feeAmount = totalRevenue * (feeValue / 100);
                        feeRate = `${feeValue}%`;
                    } else if (fee.type === 'fixed') {
                        feeAmount = feeValue;
                        feeRate = 'Cố định';
                    }
                    
                    if (feeAmount > 0) {
                        calculatedTotalFees += feeAmount;
                        platformFeeDetails += `
                            <div class="fee-item">
                                <span class="fee-name">${feeName} (${feeRate})</span>
                                <span class="fee-amount">-${formatCurrency(feeAmount)}</span>
                            </div>
                        `;
                    }
                }
            });
            
            // Process custom platform fees
            if (platformFees.customFeesList && Array.isArray(platformFees.customFeesList)) {
                platformFees.customFeesList.forEach(customFee => {
                    const customFeeKey = `custom_${customFee.id}`;
                    const customFeeConfig = platformFees[customFeeKey];
                    
                    if (customFeeConfig && customFeeConfig.value && customFeeConfig.value > 0) {
                        let feeAmount = 0;
                        let feeRate = '';
                        
                        if (customFeeConfig.type === 'percent') {
                            feeAmount = totalRevenue * (customFeeConfig.value / 100);
                            feeRate = `${customFeeConfig.value}%`;
                        } else {
                            feeAmount = customFeeConfig.value;
                            feeRate = 'Cố định';
                        }
                        
                        calculatedTotalFees += feeAmount;
                        platformFeeDetails += `
                            <div class="fee-item">
                                <span class="fee-name">${customFeeConfig.name} (${feeRate})</span>
                                <span class="fee-amount">-${formatCurrency(feeAmount)}</span>
                            </div>
                        `;
                    }
                });
            }
        }
        
        // Process external costs
        if (externalCosts && Object.keys(externalCosts).length > 0) {
            const totalRevenue = sellingPrice * quantity;
            
            // Define external cost names
            const externalCostNames = {
                'shipping-cost': 'Chi Phí Vận Chuyển',
                'packaging-cost': 'Chi Phí Đóng Gói',
                'storage-cost': 'Chi Phí Lưu Kho',
                'marketing-cost': 'Chi Phí Marketing',
                'staff-cost': 'Chi Phí Nhân Viên',
                'rent-cost': 'Chi Phí Thuê Mặt Bằng',
                'utility-cost': 'Chi Phí Điện Nước',
                'insurance-cost': 'Chi Phí Bảo Hiểm',
                'equipment-cost': 'Chi Phí Thiết Bị',
                'admin-cost': 'Chi Phí Hành Chính'
            };
            
            // Process standard external costs
            const standardCosts = ['shipping-cost', 'packaging-cost', 'storage-cost', 'marketing-cost', 'staff-cost', 'rent-cost', 'utility-cost', 'insurance-cost', 'equipment-cost', 'admin-cost'];
            standardCosts.forEach(costType => {
                const cost = externalCosts[costType];
                if (cost && cost.value && cost.value > 0) {
                    let costAmount = 0;
                    let costRate = '';
                    
                    if (cost.type === 'percent') {
                        costAmount = totalRevenue * (cost.value / 100);
                        costRate = `${cost.value}%`;
                    } else {
                        costAmount = cost.value;
                        costRate = 'Cố định';
                    }
                    
                    calculatedTotalExternalCosts += costAmount;
                    externalCostDetails += `
                        <div class="fee-item">
                            <span class="fee-name">${externalCostNames[costType]} (${costRate})</span>
                            <span class="fee-amount">-${formatCurrency(costAmount)}₫</span>
                        </div>
                    `;
                }
            });
            
            // Process custom external costs
            if (externalCosts.customCostsList && Array.isArray(externalCosts.customCostsList)) {
                externalCosts.customCostsList.forEach(customCost => {
                    const costKey = `custom_${customCost.id}`;
                    const costConfig = externalCosts[costKey];
                    
                    if (costConfig && costConfig.value && costConfig.value > 0) {
                        let costAmount = 0;
                        let costRate = '';
                        
                        if (costConfig.type === 'percent') {
                            costAmount = totalRevenue * (costConfig.value / 100);
                            costRate = `${costConfig.value}%`;
                        } else {
                            costAmount = costConfig.value;
                            costRate = 'Cố định';
                        }
                        
                        calculatedTotalExternalCosts += costAmount;
                        externalCostDetails += `
                            <div class="fee-item">
                                <span class="fee-name">${costConfig.name} (${costRate})</span>
                                <span class="fee-amount">-${formatCurrency(costAmount)}₫</span>
                            </div>
                        `;
                    }
                });
            }
        }
        
        // Build the costs HTML sections
        let platformFeesSection = '';
        let externalCostsSection = '';
        
        if (platformFeeDetails) {
            platformFeesSection = `
                <div class="info-group fees-section">
                    <label>Chi Tiết Phí Sàn TMĐT</label>
                    <div class="fees-breakdown">
                        ${platformFeeDetails}
                        <div class="fee-total">
                            <span class="fee-name"><strong>Tổng Phí Sàn</strong></span>
                            <span class="fee-amount"><strong>-${formatCurrency(calculatedTotalFees)}</strong></span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        if (externalCostDetails) {
            externalCostsSection = `
                <div class="info-group fees-section">
                    <label>Chi Tiết Chi Phí Bên Ngoài</label>
                    <div class="fees-breakdown">
                        ${externalCostDetails}
                        <div class="fee-total">
                            <span class="fee-name"><strong>Tổng Chi Phí Bên Ngoài</strong></span>
                            <span class="fee-amount"><strong>-${formatCurrency(calculatedTotalExternalCosts)}</strong></span>
                        </div>
                    </div>
                </div>
            `;
        }
        
        costsHtml = packagingCostDetails + platformFeesSection + externalCostsSection;
    }
    
    // Use the final profit from calculateOrderProfitWithPlatformFees (already includes all costs)
    const accurateFinalProfit = finalProfit;
    const accurateProfitClass = accurateFinalProfit > 0 ? 'profit-positive' : 'profit-negative';
    
    console.log('🔍 MODAL DEBUG - Final profit calculation:', {
        orderId: orderId,
        baseProfit: baseProfit,
        finalProfit: finalProfit,
        accurateFinalProfit: accurateFinalProfit,
        totalAllCosts: totalAllCosts,
        packagingCostAmount: packagingCostAmount
    });
    
    infoContainer.innerHTML = `
        <div class="info-group">
            <label>Mã Đơn Hàng</label>
            <div class="value">${orderId}</div>
        </div>
        <div class="info-group">
            <label>Sản Phẩm</label>
            <div class="value">${order.productName || 'N/A'}</div>
        </div>
        <div class="info-group">
            <label>SKU</label>
            <div class="value">${order.sku || 'N/A'}</div>
        </div>
        <div class="info-group">
            <label>Số Lượng</label>
            <div class="value">${order.quantity || 1}</div>
        </div>
        <div class="info-group">
            <label>Giá Nhập</label>
            <div class="value">${formatCurrency(order.importPrice || 0)}</div>
        </div>
        <div class="info-group">
            <label>Giá Bán</label>
            <div class="value">${formatCurrency(order.sellingPrice || 0)}</div>
        </div>
        <div class="info-group">
            <label>Tổng Tiền</label>
            <div class="value">${formatCurrency(sellingPrice * quantity)}</div>
        </div>
        <div class="info-group">
            <label>Sàn TMĐT</label>
            <div class="value">${platformNames[order.platform] || order.platform || 'N/A'}</div>
        </div>
        <div class="info-group">
            <label>Cửa Hàng</label>
            <div class="value">${resolveStoreName(order)}</div>
        </div>
        <div class="info-group">
            <label>Ngày Tạo</label>
            <div class="value">${getOrderDate(order)}</div>
        </div>
        <div class="info-group">
            <label>Lợi Nhuận Gộp (Trước Phí)</label>
            <div class="value">${formatCurrency(baseProfit)}</div>
        </div>
        ${costsHtml}
        <div class="info-group profit-info">
            <label>Lợi Nhuận Ròng (Sau Phí)</label>
            <div class="value ${accurateProfitClass}">${formatCurrency(accurateFinalProfit)}</div>
        </div>
    `;
    
    modal.style.display = 'block';
}

function closeOrderDetailModal() {
    const modal = document.getElementById('order-detail-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close modal when clicking outside
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('order-detail-modal');
    if (modal) {
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                closeOrderDetailModal();
            }
        });
    }
});

// Delete functions
function deleteSelectedOrders() {
    const selectedCheckboxes = document.querySelectorAll('.order-checkbox:checked');
    const orderIds = Array.from(selectedCheckboxes).map(cb => cb.value);
    
    if (orderIds.length === 0) {
        alert('Vui lòng chọn ít nhất một đơn hàng để xóa!');
        return;
    }
    
    const confirmMessage = `Bạn có chắc chắn muốn xóa ${orderIds.length} đơn hàng đã chọn?`;
    if (confirm(confirmMessage)) {
        deleteOrdersFromFirebase(orderIds);
    }
}

function deleteAllOrders() {
    const confirmMessage = 'Bạn có chắc chắn muốn xóa TẤT CẢ đơn hàng TMĐT? Hành động này không thể hoàn tác!';
    if (confirm(confirmMessage)) {
        // Get all order IDs from current table
        const orderCheckboxes = document.querySelectorAll('.order-checkbox');
        const orderIds = Array.from(orderCheckboxes).map(cb => cb.value);
        deleteOrdersFromFirebase(orderIds);
    }
}

async function deleteOrdersFromFirebase(orderIds) {
    try {
        const storeId = getCurrentStore();
        if (!storeId) {
            alert('Không tìm thấy thông tin cửa hàng!');
            return;
        }
        
        console.log('🔥 Deleting orders:', orderIds);
        
        // Delete from multiple Firebase paths
        const deletePromises = [];
        
        for (const orderId of orderIds) {
            // Delete from store-specific paths
            deletePromises.push(
                window.database.ref(`stores/${storeId}/tmdtSalesOrders/${orderId}`).remove(),
                window.database.ref(`stores/${storeId}/orders/${orderId}`).remove(),
                window.database.ref(`stores/${storeId}/salesOrders/${orderId}`).remove(),
                // Delete from global paths
                window.database.ref(`orders/${orderId}`).remove(),
                window.database.ref(`salesOrders/${orderId}`).remove()
            );
        }
        
        await Promise.all(deletePromises);
        
        alert(`Đã xóa thành công ${orderIds.length} đơn hàng!`);
        
        // Refresh the table
        updateTmdtOrdersDetailTable('all');
        updateTmdtStatistics('all');
        
    } catch (error) {
        console.error('Error deleting orders:', error);
        alert('Lỗi khi xóa đơn hàng: ' + error.message);
    }
}

// Setup fee configuration listeners for real-time updates
function setupFeeConfigListeners() {
    console.log('🔧 Setting up fee configuration listeners...');
    
    // Listen for changes in fee inputs to update calculations in real-time
    const feeInputs = document.querySelectorAll('.fee-checkbox, input[type="number"][id^="value-"], input[type="radio"][name$="-type"]');
    
    feeInputs.forEach(input => {
        input.addEventListener('change', () => {
            console.log('💰 Fee configuration changed, updating calculations...');
            // Debounce to avoid too many updates
            clearTimeout(window.feeUpdateTimeout);
            window.feeUpdateTimeout = setTimeout(() => {
                updateTmdtOrdersDetailTable('all');
            }, 500);
        });
    });
    
    console.log('✅ Fee configuration listeners setup complete');
}

// Initialize profit management system
async function initializeProfitManagement() {
    console.log('🚀 Initializing Profit Management System...');
    
    // Initialize custom fees variables
    initializeCustomFees();
    
    // Setup fee configuration listeners for real-time updates
    await setupFeeConfigListeners();
    
    // Load stores for filter dropdown
    loadStoresForFilter();
    
    // Load initial data
    loadTmdtProfitData();
    
    // Load data with current store as default filter
    const currentStore = getCurrentStore();
    const dateFrom = document.getElementById('date-from')?.value;
    const dateTo = document.getElementById('date-to')?.value;
    updateTmdtOrdersDetailTableWithFilters('all', currentStore, dateFrom, dateTo);
    
    // Ensure packaging config is loaded before calculating profits
    await loadPackagingConfig();
    console.log('✅ Packaging config loaded for profit calculations');
    
    console.log('✅ Profit Management System initialized');
}

// Update store filter function
function updateStoreFilter() {
    const selectedStore = document.getElementById('store-select').value;
    const selectedPlatform = document.getElementById('platform-select').value;
    console.log('🏪 Store filter changed to:', selectedStore);
    
    // Update TMĐT orders table with both store and platform filters
    // Get current date filters
    const dateFrom = document.getElementById('date-from')?.value;
    const dateTo = document.getElementById('date-to')?.value;
    
    updateTmdtOrdersDetailTableWithFilters(selectedPlatform, selectedStore, dateFrom, dateTo);
    
    // Update statistics for the selected store and platform
    updateTmdtStatistics(selectedPlatform, selectedStore, dateFrom, dateTo);
}

function updatePlatformStats() {
    const selectedPlatform = document.getElementById('platform-select').value;
    const selectedStore = document.getElementById('store-select').value;
    console.log('📊 Platform changed to:', selectedPlatform);
    
    // Update card titles based on selected platform
    updateCardTitlesForPlatform(selectedPlatform);
    
    // Get current date filters
    const dateFrom = document.getElementById('date-from')?.value;
    const dateTo = document.getElementById('date-to')?.value;
    
    // Update TMĐT orders detail table with both filters
    updateTmdtOrdersDetailTableWithFilters(selectedPlatform, selectedStore, dateFrom, dateTo);
    
    // Update statistics
    updateTmdtStatistics(selectedPlatform, selectedStore, dateFrom, dateTo);
}

// Update card titles to show selected platform
function updateCardTitlesForPlatform(selectedPlatform) {
    // Platform name mapping
    const platformNames = {
        'all': 'Tất Cả Sàn',
        'shopee': 'Shopee',
        'lazada': 'Lazada',
        'tiktok': 'TikTok Shop',
        'sendo': 'Sendo',
        'tiki': 'Tiki',
        'facebook': 'Facebook Shop',
        'zalo': 'Zalo Shop',
        'other': 'Khác'
    };
    
    const platformName = platformNames[selectedPlatform] || selectedPlatform;
    const suffix = selectedPlatform === 'all' ? '' : ` - ${platformName}`;
    
    // Update card titles
    const cardTitles = [
        { selector: '.tmdt-total-profit h3', baseTitle: 'Tổng Lợi Nhuận TMĐT' },
        { selector: '.tmdt-fees h3', baseTitle: 'Tổng Phí Sàn TMĐT' },
        { selector: '.tmdt-cost h3', baseTitle: 'Tổng Giá Nhập TMĐT' },
        { selector: '.tmdt-revenue h3', baseTitle: 'Tổng Doanh Thu TMĐT - (giá bán trên sàn)' },
        { selector: '.tmdt-gross-profit h3', baseTitle: 'Lợi Nhuận Gộp (Chưa tính Phí)' },
        { selector: '.platform-profit h3', baseTitle: 'Lợi Nhuận Tất Cả Sàn' }
    ];
    
    cardTitles.forEach(({ selector, baseTitle }) => {
        const titleElement = document.querySelector(selector);
        if (titleElement) {
            titleElement.textContent = baseTitle + suffix;
        }
    });
    
    console.log('📝 Updated card titles for platform:', platformName);
}

// Load stores for filter dropdown
async function loadStoresForFilter() {
    try {
        if (!window.database) {
            console.error('Firebase database not available');
            return;
        }
        
        const storesSnapshot = await window.database.ref('stores').once('value');
        const stores = storesSnapshot.val() || {};
        
        const storeSelect = document.getElementById('store-select');
        if (!storeSelect) return;
        
        // Get current selected store from header
        const currentStore = getCurrentStore();
        
        // Clear existing options
        storeSelect.innerHTML = '<option value="all">Tất Cả Cửa Hàng</option>';
        
        // Add store options
        Object.entries(stores).forEach(([storeId, store]) => {
            const option = document.createElement('option');
            option.value = storeId;
            option.textContent = store.name || store.storeName || storeId;
            
            // Set as selected if this is the current store
            if (storeId === currentStore) {
                option.selected = true;
            }
            
            storeSelect.appendChild(option);
        });
        
        console.log('🏪 Loaded stores for filter:', Object.keys(stores).length);
        console.log('🏪 Current store set as default:', currentStore);
    } catch (error) {
        console.error('Error loading stores for filter:', error);
    }
}

// Pagination variables
let currentPage = 1;
let pageSize = 10;
let totalOrders = 0;
let allFilteredOrders = [];

// Update TMĐT orders table with both platform and store filters
async function updateTmdtOrdersDetailTableWithFilters(platform = 'all', storeFilter = 'all', dateFrom = null, dateTo = null) {
    try {
        console.log('🔥 updateTmdtOrdersDetailTableWithFilters called with:', { platform, storeFilter, dateFrom, dateTo });
        
        // Load orders for specific store or all stores
        const tmdtOrders = storeFilter === 'all' ? await loadTmdtSalesOrders() : await loadTmdtSalesOrders(storeFilter);
        console.log('🔥 Received TMĐT orders:', tmdtOrders);
        
        const tableBody = document.getElementById('tmdt-orders-detail-table');
        if (!tableBody) {
            console.error('🔥 TMĐT orders detail table not found');
            return;
        }
        
        // Filter orders by platform and store
        let filteredOrders = Object.entries(tmdtOrders);
        console.log('🔥 All orders before filtering:', filteredOrders.length);
        
        // Filter by platform
        if (platform !== 'all') {
            filteredOrders = filteredOrders.filter(([orderId, order]) => {
                return order.platform === platform || 
                       (platform === 'other' && order.platform === 'other');
            });
        }
        
        // Filter by store (only if we loaded all stores data)
        if (storeFilter !== 'all' && storeFilter) {
            filteredOrders = filteredOrders.filter(([orderId, order]) => {
                return order.storeId === storeFilter;
            });
        }
        
        // Filter by date range
        if (dateFrom || dateTo) {
            filteredOrders = filteredOrders.filter(([orderId, order]) => {
                const orderDate = order.orderDate || order.createdAt || order.timestamp;
                if (!orderDate) return false;
                
                // Convert order date to YYYY-MM-DD format for comparison
                let orderDateStr;
                if (typeof orderDate === 'string') {
                    // Handle various date formats
                    const date = new Date(orderDate);
                    if (isNaN(date.getTime())) return false;
                    orderDateStr = date.toISOString().split('T')[0];
                } else if (orderDate.seconds) {
                    // Firebase timestamp
                    const date = new Date(orderDate.seconds * 1000);
                    orderDateStr = date.toISOString().split('T')[0];
                } else {
                    const date = new Date(orderDate);
                    if (isNaN(date.getTime())) return false;
                    orderDateStr = date.toISOString().split('T')[0];
                }
                
                // Check date range
                if (dateFrom && orderDateStr < dateFrom) return false;
                if (dateTo && orderDateStr > dateTo) return false;
                
                return true;
            });
        }
        
        console.log('🔥 Filtered orders count (platform + store + date):', filteredOrders.length);
        if (dateFrom || dateTo) {
            console.log('🔥 Date filter applied:', { dateFrom, dateTo });
        }
        
        // Store filtered orders for pagination
        allFilteredOrders = filteredOrders;
        totalOrders = filteredOrders.length;
        
        // Reset to first page when filters change
        currentPage = 1;
        
        // Update pagination and display current page
        updatePaginationInfo();
        renderCurrentPage();
        
    } catch (error) {
        console.error('🔥 Error updating TMĐT orders detail table:', error);
        const tableBody = document.getElementById('tmdt-orders-detail-table');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="13" style="text-align: center; color: #dc3545; padding: 20px;">
                        <i class="fas fa-exclamation-triangle"></i><br>
                        Lỗi khi tải dữ liệu đơn hàng
                    </td>
                </tr>
            `;
        }
    }
}

// Render current page of orders
async function renderCurrentPage() {
    const tableBody = document.getElementById('tmdt-orders-detail-table');
    if (!tableBody) return;
    
    // Clear existing rows
    tableBody.innerHTML = '';
    
    // Get filtered orders (includes search and date filters)
    const allFilteredOrders = getFilteredOrders();
    const totalFilteredOrders = allFilteredOrders.length;
    
    if (totalFilteredOrders === 0) {
        const message = searchTerm ? 
            `<i class="fas fa-search"></i><br>Không tìm thấy đơn hàng nào phù hợp với "${searchTerm}"` :
            `<i class="fas fa-inbox"></i><br>Không có đơn hàng TMĐT nào`;
            
        tableBody.innerHTML = `
            <tr>
                <td colspan="14" style="text-align: center; color: #666; padding: 20px;">
                    ${message}
                </td>
            </tr>
        `;
        updatePaginationInfo(0, 0, 0);
        return;
    }
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalFilteredOrders);
    const pageOrders = allFilteredOrders.slice(startIndex, endIndex);
    
    // Populate table with filtered orders
    let tableRows = '';
    for (let i = 0; i < pageOrders.length; i++) {
        const [orderId, order] = pageOrders[i];
        const sellingPrice = parseFloat(order.sellingPrice || 0);
        const importPrice = parseFloat(order.importPrice || 0);
        const quantity = parseInt(order.quantity || 1);
        const totalAmount = sellingPrice * quantity;
        
        // Base profit before fees
        const baseProfit = (sellingPrice - importPrice) * quantity;
        
        // Use the same calculation as sales-orders-tmdt.js
        let orderProfitData = await calculateOrderProfitWithPlatformFees({
            sellingPrice: sellingPrice,
            importPrice: importPrice,
            quantity: quantity,
            platform: order.platform,
            storeId: order.storeId,
            productType: order.productType,
            weight: order.weight,
            orderId: order.orderId
        });
        
        let orderProfit = orderProfitData.finalProfit || orderProfitData; // Support both old and new format
        const profitClass = orderProfit > 0 ? 'profit-positive' : 'profit-negative';
        
        // Platform display names
        const platformNames = {
            'shopee': 'Shopee',
            'lazada': 'Lazada',
            'tiktok': 'TikTok Shop',
            'sendo': 'Sendo',
            'tiki': 'Tiki',
            'facebook': 'Facebook Shop',
            'zalo': 'Zalo Shop',
            'other': 'Khác'
        };
        
        const platformDisplay = platformNames[order.platform] || order.platform || 'N/A';
        
        // Calculate actual row number based on current page
        const actualRowNumber = startIndex + i + 1;
        
        const row = `
            <tr>
                <td>
                    <input type="checkbox" class="order-checkbox" value="${orderId}" onchange="updateSelectedCount()">
                </td>
                <td>${actualRowNumber}</td>
                <td title="${orderId}">${orderId}</td>
                <td title="${order.productName || 'N/A'}">${order.productName || 'N/A'}</td>
                <td title="${order.sku || 'N/A'}">${order.sku || 'N/A'}</td>
                <td>${quantity}</td>
                <td>${formatCurrency(importPrice)}</td>
                <td>${formatCurrency(sellingPrice)}</td>
                <td class="${profitClass}">${formatCurrency(orderProfit)}</td>
                <td>${formatCurrency(totalAmount)}</td>
                <td>${platformDisplay}</td>
                <td>${resolveStoreName(order)}</td>
                <td>${getOrderDate(order)}</td>
                <td>
                    <button type="button" class="btn-action btn-view-detail" onclick="viewOrderDetail('${orderId}')">
                        <i class="fas fa-eye"></i> Xem
                    </button>
                </td>
            </tr>
        `;
        tableRows += row;
    }
    
    tableBody.innerHTML = tableRows;
    
    // Update pagination info with filtered results
    updatePaginationInfo(startIndex + 1, endIndex, totalFilteredOrders);
    
    console.log(`Rendered page ${currentPage} with ${pageOrders.length} orders (${totalFilteredOrders} total filtered)`);
}

// Update pagination info and controls
function updatePaginationInfo(startItem = null, endItem = null, totalFilteredOrders = null) {
    // If parameters not provided, calculate from filtered orders
    if (startItem === null || endItem === null || totalFilteredOrders === null) {
        const filteredOrders = getFilteredOrders();
        totalFilteredOrders = filteredOrders.length;
        startItem = totalFilteredOrders === 0 ? 0 : (currentPage - 1) * pageSize + 1;
        endItem = Math.min(currentPage * pageSize, totalFilteredOrders);
    }
    
    const totalPages = Math.ceil(totalFilteredOrders / pageSize);
    
    // Update pagination info text
    const paginationInfo = document.getElementById('pagination-info');
    if (paginationInfo) {
        const searchText = searchTerm ? ` (tìm kiếm: "${searchTerm}")` : '';
        paginationInfo.textContent = `Hiển thị ${startItem}-${endItem} của ${totalFilteredOrders} đơn hàng${searchText}`;
    }
    
    // Update pagination controls
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages;
    }
    
    // Update page numbers
    updatePageNumbers(totalPages);
}

// Update page numbers display
function updatePageNumbers(totalPages) {
    const paginationNumbers = document.getElementById('pagination-numbers');
    if (!paginationNumbers) return;
    
    paginationNumbers.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // Add first page and ellipsis if needed
    if (startPage > 1) {
        addPageNumber(1);
        if (startPage > 2) {
            addEllipsis();
        }
    }
    
    // Add visible page numbers
    for (let i = startPage; i <= endPage; i++) {
        addPageNumber(i);
    }
    
    // Add ellipsis and last page if needed
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            addEllipsis();
        }
        addPageNumber(totalPages);
    }
}

// Add page number button
function addPageNumber(pageNum) {
    const paginationNumbers = document.getElementById('pagination-numbers');
    const pageBtn = document.createElement('button');
    pageBtn.type = 'button';
    pageBtn.className = `page-number ${pageNum === currentPage ? 'active' : ''}`;
    pageBtn.textContent = pageNum;
    pageBtn.onclick = () => goToPage(pageNum);
    paginationNumbers.appendChild(pageBtn);
}

// Add ellipsis
function addEllipsis() {
    const paginationNumbers = document.getElementById('pagination-numbers');
    const ellipsis = document.createElement('span');
    ellipsis.className = 'page-ellipsis';
    ellipsis.textContent = '...';
    paginationNumbers.appendChild(ellipsis);
}

// Change page
function changePage(direction) {
    const totalPages = Math.ceil(totalOrders / pageSize);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        goToPage(newPage);
    }
}

// Go to specific page
function goToPage(pageNum) {
    const totalPages = Math.ceil(totalOrders / pageSize);
    
    if (pageNum >= 1 && pageNum <= totalPages) {
        currentPage = pageNum;
        updatePaginationInfo();
        renderCurrentPage();
    }
}

// Change page size
function changePageSize() {
    const pageSizeSelect = document.getElementById('page-size');
    if (pageSizeSelect) {
        pageSize = parseInt(pageSizeSelect.value);
        currentPage = 1; // Reset to first page
        updatePaginationInfo();
        renderCurrentPage();
    }
}

// Export functions to global scope for HTML access
window.switchProfitView = switchProfitView;
window.updatePlatformStats = updatePlatformStats;
window.updateStoreFilter = updateStoreFilter;
window.loadStoresForFilter = loadStoresForFilter;
window.loadTmdtProfitData = loadTmdtProfitData;
window.updateTmdtOrdersDetailTable = updateTmdtOrdersDetailTable;
window.testTmdtDataLoading = testTmdtDataLoading;
window.toggleSelectAll = toggleSelectAll;
window.selectAllOrders = selectAllOrders;
window.updateSelectedCount = updateSelectedCount;
window.viewOrderDetail = viewOrderDetail;
window.closeOrderDetailModal = closeOrderDetailModal;
window.deleteSelectedOrders = deleteSelectedOrders;
window.deleteAllOrders = deleteAllOrders;
window.refreshProfitCalculations = refreshProfitCalculations;
window.initializeProfitManagement = initializeProfitManagement;
window.switchPlatformFeesForm = switchPlatformFeesForm;
window.loadTmdtSalesOrders = loadTmdtSalesOrders;
window.updateTmdtOrdersDetailTable = updateTmdtOrdersDetailTable;
window.calculateOrderProfitWithFees = calculateOrderProfitWithFees;

// Custom fee management variables
var customFeeCounter = 0;
var customFees = [];

// Initialize custom fees variables safely
function initializeCustomFees() {
    // Ensure customFees is an array
    if (!Array.isArray(customFees)) {
        customFees = [];
    }
    // Ensure customFeeCounter is a number
    if (typeof customFeeCounter !== 'number') {
        customFeeCounter = 0;
    }
}

// Show add custom fee form
function showAddFeeForm() {
    const form = document.getElementById('add-fee-form');
    const nameInput = document.getElementById('custom-fee-name');
    const valueInput = document.getElementById('custom-fee-value');
    
    if (form) {
        form.style.display = 'block';
        console.log('✅ Add fee form displayed');
        
        if (nameInput) {
            nameInput.value = '';
            nameInput.focus();
        }
        if (valueInput) {
            valueInput.value = '';
        }
    } else {
        console.error('❌ Add fee form element not found');
    }
}

// Hide add custom fee form
function hideAddFeeForm() {
    const form = document.getElementById('add-fee-form');
    form.style.display = 'none';
}

// Add custom fee
function addCustomFee() {
    const nameInput = document.getElementById('custom-fee-name');
    const valueInput = document.getElementById('custom-fee-value');
    
    const feeName = nameInput.value.trim();
    const feeValue = parseFloat(valueInput.value);
    
    // Get fee type from radio buttons
    const percentRadio = document.querySelector('input[name="custom-fee-type"][value="percent"]');
    const feeType = percentRadio && percentRadio.checked ? 'percent' : 'fixed';
    
    // Validation
    if (!feeName) {
        showNotification('Vui lòng nhập tên phí!', 'error');
        nameInput.focus();
        return;
    }
    
    if (isNaN(feeValue) || feeValue < 0) {
        showNotification('Vui lòng nhập giá trị phí hợp lệ!', 'error');
        valueInput.focus();
        return;
    }
    
    // Create unique ID for custom fee
    customFeeCounter++;
    const customFeeId = `custom-fee-${customFeeCounter}`;
    
    // Add to custom fees array
    const customFee = {
        id: customFeeId,
        name: feeName,
        value: feeValue,
        type: feeType, // Store the fee type
        enabled: true
    };
    customFees.push(customFee);
    
    console.log(`✅ Created custom fee: ${feeName} = ${feeValue} (${feeType})`);
    
    // Create and insert custom fee element
    createCustomFeeElement(customFee);
    
    // Hide form and show success message
    hideAddFeeForm();
    showNotification(`Đã thêm phí "${feeName}" thành công!`, 'success');
}

// Create custom fee element
function createCustomFeeElement(customFee) {
    const feesList = document.querySelector('.fees-list');
    const addFeeSection = document.querySelector('.add-fee-section');
    
    const feeElement = document.createElement('div');
    feeElement.className = 'fee-item custom-fee-item';
    feeElement.id = `fee-item-${customFee.id}`;
    
    feeElement.innerHTML = `
        <button type="button" class="remove-fee-btn" onclick="removeCustomFee('${customFee.id}')" title="Xóa phí này">
            <i class="fas fa-times"></i>
        </button>
        <div class="fee-checkbox-wrapper">
            <input type="checkbox" id="fee-${customFee.id}" class="fee-checkbox" 
                   onchange="toggleFeeInput('${customFee.id}')" checked>
            <label for="fee-${customFee.id}" class="fee-label">${customFee.name}</label>
        </div>
        <div class="fee-input-wrapper" id="input-${customFee.id}" style="display: block;">
            <input type="number" id="value-${customFee.id}" step="0.01" 
                   placeholder="${customFee.value}" value="${customFee.value}">
            <small>Phí tùy chỉnh</small>
        </div>
    `;
    
    // Insert before add fee section
    feesList.insertBefore(feeElement, addFeeSection);
}

// Remove custom fee
function removeCustomFee(customFeeId) {
    // Initialize custom fees safely
    initializeCustomFees();
    
    // Remove from array
    customFees = customFees.filter(fee => fee.id !== customFeeId);
    
    // Remove from DOM
    const feeElement = document.getElementById(`fee-item-${customFeeId}`);
    if (feeElement) {
        feeElement.remove();
    }
    
    showNotification('Đã xóa phí tùy chỉnh!', 'success');
}

// Save platform fees including custom fees
function savePlatformFees() {
    // Initialize custom fees safely
    initializeCustomFees();
    
    const selectedPlatform = document.getElementById('modal-platform-select').value;
    const currentStore = getCurrentStore();
    
    if (!selectedPlatform) {
        showNotification('Vui lòng chọn sàn TMĐT trước khi lưu!', 'error');
        return;
    }
    
    let fees = {};
    
    // Fee mapping from new structure to saved structure
    const feeMapping = {
        'transaction': 'transactionFee',
        'commission': 'commissionFee',
        'shipping': 'shippingFee',
        'shipping-discount': 'shippingDiscount',
        'seller-shipping-discount': 'sellerShippingDiscount',
        'platform-shipping-discount': 'platformShippingDiscount',
        'return-shipping': 'returnShippingFee',
        'shipping-subsidy': 'shippingSubsidy',
        'affiliate': 'affiliateCommission',
        'voucher': 'voucherFee',
        'vat': 'vatTax',
        'income-tax': 'incomeTax',
        'seller-discount': 'sellerDiscount'
    };
    
    // Collect all standard fees
    Object.entries(feeMapping).forEach(([feeType, propName]) => {
        const checkbox = document.getElementById(`fee-${feeType}`);
        const input = document.getElementById(`value-${feeType}`);
        
        if (checkbox && checkbox.checked && input && input.value) {
            const value = parseFloat(input.value);
            if (!isNaN(value)) {
                // Check fee type (percentage or fixed)
                const percentRadio = document.querySelector(`input[name="${feeType}-type"][value="percent"]`);
                const isPercentage = percentRadio && percentRadio.checked;
                
                fees[propName] = {
                    value: value,
                    type: isPercentage ? 'percent' : 'fixed'
                };
            }
        }
    });
    
    // Collect custom fees (with safety check)
    if (Array.isArray(customFees) && customFees.length > 0) {
        customFees.forEach(customFee => {
            const checkbox = document.getElementById(`fee-${customFee.id}`);
            const input = document.getElementById(`value-${customFee.id}`);
            
            if (checkbox && checkbox.checked && input && input.value) {
                const value = parseFloat(input.value);
                if (!isNaN(value)) {
                    // Custom fees use the type from when they were created
                    fees[`custom_${customFee.id}`] = {
                        name: customFee.name,
                        value: value,
                        type: customFee.type || 'fixed' // Use stored type or default to fixed
                    };
                    console.log(`✅ Saved custom fee: ${customFee.name} = ${value} (${customFee.type || 'fixed'})`);
                }
            }
        });
    }
    
    // Save custom fees list (always save, even if empty)
    fees.customFeesList = Array.isArray(customFees) ? customFees : [];
    
    // Save to localStorage
    localStorage.setItem(`platformFees_${currentStore}_${selectedPlatform}`, JSON.stringify(fees));
    
    // Save to Firebase
    if (window.database) {
        const feesRef = window.database.ref(`platformFees/${currentStore}/${selectedPlatform}`);
        feesRef.set(fees).then(() => {
            console.log('✅ Platform fees saved to Firebase:', selectedPlatform, fees);
            console.log('🔗 Firebase path:', `platformFees/${currentStore}/${selectedPlatform}`);
            showNotification(`Đã lưu phí ${selectedPlatform} vào Firebase thành công!`, 'success');
        }).catch(error => {
            console.error('❌ Error saving platform fees to Firebase:', error);
            showNotification(`Lỗi lưu phí ${selectedPlatform} vào Firebase!`, 'error');
        });
    } else {
        console.error('❌ Firebase database not available!');
        showNotification('Firebase không khả dụng!', 'error');
    }
    
    // Close modal and update statistics
    closePlatformFeesModal();
    updateTmdtStatistics();
    
    const platformName = getPlatformDisplayName(selectedPlatform);
    showNotification(`Cài đặt phí ${platformName} đã được lưu thành công!`, 'success');
}

// Update loadSavedFeesForPlatform to include custom fees
function loadSavedFeesForPlatformWithCustom(platform) {
    const currentStore = getCurrentStore();
    const savedFees = JSON.parse(localStorage.getItem(`platformFees_${currentStore}_${platform}`)) || {};
    
    // Fee mapping from new structure to saved structure
    const feeMapping = {
        'transaction': 'transactionFee',
        'commission': 'commissionFee', 
        'shipping': 'shippingFee',
        'shipping-discount': 'shippingDiscount',
        'seller-shipping-discount': 'sellerShippingDiscount',
        'platform-shipping-discount': 'platformShippingDiscount',
        'return-shipping': 'returnShippingFee',
        'shipping-subsidy': 'shippingSubsidy',
        'affiliate': 'affiliateCommission',
        'voucher': 'voucherFee',
        'vat': 'vatTax',
        'income-tax': 'incomeTax',
        'seller-discount': 'sellerDiscount'
    };
    
    // Reset all fees first
    resetAllFees();
    
    // Clear existing custom fees
    clearCustomFees();
    
    // Load standard fees
    Object.entries(feeMapping).forEach(([feeType, savedKey]) => {
        const checkbox = document.getElementById(`fee-${feeType}`);
        const input = document.getElementById(`value-${feeType}`);
        
        if (checkbox && input && savedFees[savedKey] !== undefined) {
            checkbox.checked = true;
            
            // Handle both old format (number) and new format (object with value and type)
            const feeData = typeof savedFees[savedKey] === 'object' ? savedFees[savedKey] : { value: savedFees[savedKey], type: 'percent' };
            
            input.value = feeData.value;
            
            // Set radio button for fee type (if exists)
            const percentRadio = document.querySelector(`input[name="${feeType}-type"][value="percent"]`);
            const fixedRadio = document.querySelector(`input[name="${feeType}-type"][value="fixed"]`);
            
            if (percentRadio && fixedRadio) {
                if (feeData.type === 'fixed') {
                    fixedRadio.checked = true;
                    changeFeeType(feeType, 'fixed');
                } else {
                    percentRadio.checked = true;
                    changeFeeType(feeType, 'percent');
                }
            }
            
            // Show input wrapper
            const inputWrapper = document.getElementById(`input-${feeType}`);
            if (inputWrapper) {
                inputWrapper.style.display = 'block';
            }
        }
    });
    
    // Load custom fees
    if (savedFees.customFeesList && Array.isArray(savedFees.customFeesList)) {
        customFees = savedFees.customFeesList;
        customFeeCounter = Math.max(...customFees.map(f => parseInt(f.id.replace('custom-fee-', ''))), 0);
        
        customFees.forEach(customFee => {
            createCustomFeeElement(customFee);
            
            // Set saved values
            const savedCustomValue = savedFees[`custom_${customFee.id}`];
            if (savedCustomValue) {
                const checkbox = document.getElementById(`fee-${customFee.id}`);
                const input = document.getElementById(`value-${customFee.id}`);
                
                if (checkbox && input) {
                    checkbox.checked = true;
                    input.value = savedCustomValue.value;
                    const inputWrapper = document.getElementById(`input-${customFee.id}`);
                    if (inputWrapper) {
                        inputWrapper.style.display = 'block';
                    }
                }
            }
        });
    }
}

// Clear all custom fees
function clearCustomFees() {
    // Initialize custom fees safely
    initializeCustomFees();
    
    customFees.forEach(fee => {
        const feeElement = document.getElementById(`fee-item-${fee.id}`);
        if (feeElement) {
            feeElement.remove();
        }
    });
    customFees = [];
    customFeeCounter = 0;
}

// Get fee display name in Vietnamese
function getFeeDisplayName(feeType, customFeeConfig = null) {
    // If it's a custom fee, use the name from config
    if (feeType.startsWith('custom_') && customFeeConfig && customFeeConfig.name) {
        return customFeeConfig.name;
    }
    
    // Standard fee names mapping
    const feeNames = {
        'transactionFee': 'Phí Giao Dịch',
        'commissionFee': 'Phí Hoa Hồng',
        'shippingFee': 'Phí Vận Chuyển Thực Tế',
        'shippingDiscount': 'Chiết Khấu Phí Vận Chuyển',
        'sellerShippingDiscount': 'Giảm Phí VC Người Bán',
        'platformShippingDiscount': 'Giảm Phí VC TikTok Shop',
        'returnShippingFee': 'Phí VC Trả Hàng',
        'shippingSubsidy': 'Trợ Giá Vận Chuyển',
        'affiliateCommission': 'Hoa Hồng Liên Kết',
        'voucherFee': 'Phí Voucher Xtra',
        'vatTax': 'Thuế GTGT',
        'incomeTax': 'Thuế TNCN',
        'personalIncomeTax': 'Thuế TNCN',
        'sellerDiscount': 'Giảm Giá Người Bán'
    };
    
    return feeNames[feeType] || feeType;
}

// Calculate packaging cost for multi-item orders with different product types
function calculateMultiItemPackagingCost(order) {
    if (!order.items || !Array.isArray(order.items)) {
        // Single item order - use existing logic
        if (order.productType && order.weight && typeof calculatePackagingCost === 'function') {
            return calculatePackagingCost(order.productType, order.weight) || 0;
        }
        return 0;
    }
    
    // Multi-item order - group by productType and calculate separately
    const productTypeGroups = {};
    
    order.items.forEach(item => {
        const productType = item.productType || 'dry'; // default to dry if not specified
        const weight = parseFloat(item.weight || 0) * parseInt(item.quantity || 1);
        
        if (!productTypeGroups[productType]) {
            productTypeGroups[productType] = 0;
        }
        productTypeGroups[productType] += weight;
    });
    
    let totalPackagingCost = 0;
    
    Object.entries(productTypeGroups).forEach(([productType, totalWeight]) => {
        if (totalWeight > 0 && typeof calculatePackagingCost === 'function') {
            const cost = calculatePackagingCost(productType, totalWeight) || 0;
            totalPackagingCost += cost;
            console.log(`Packaging cost for ${productType} (${totalWeight}kg): ${cost}₫`);
        }
    });
    
    console.log(`Total packaging cost for multi-item order: ${totalPackagingCost}₫`);
    return totalPackagingCost;
}

// Calculate order profit with platform fees integration (using same logic as sales-orders-tmdt.js)
async function calculateOrderProfitWithPlatformFees(order) {
    const sellingPrice = parseFloat(order.sellingPrice || 0);
    const importPrice = parseFloat(order.importPrice || 0);
    const quantity = parseInt(order.quantity || 1);
    
    // Base profit before fees
    const baseProfit = (sellingPrice - importPrice) * quantity;
    
    // Get platform fees from Firebase (using async function like updated version)
    const platformFees = await getPlatformFeesFromStorage(order.platform);
    
    if (!platformFees || Object.keys(platformFees).length === 0) {
        // Calculate packaging costs even if no platform fees
        let packagingCosts = 0;
        if (order.productType && order.weight && typeof calculatePackagingCost === 'function') {
            console.log('=== CALCULATING PACKAGING COST IN PROFIT MANAGEMENT ===');
            console.log('Product Type:', order.productType);
            console.log('Weight:', order.weight);
            
            const cost = calculatePackagingCost(order.productType, order.weight);
            packagingCosts = cost || 0;
            console.log('Packaging cost calculated:', packagingCosts);
        }
        
        const finalProfit = baseProfit - packagingCosts;
        console.log(`PROFIT MANAGEMENT Profit calculation: Base: ${baseProfit}, Fees: 0, Packaging: ${packagingCosts}, Final: ${finalProfit}`);
        return finalProfit;
    }
    
    // Calculate total fees (simplified like sales-orders-tmdt.js)
    let totalFees = 0;
    const totalRevenue = sellingPrice * quantity;
    
    // Transaction fee
    if (platformFees.transactionFee) {
        if (platformFees.transactionFee.type === 'percent') {
            totalFees += totalRevenue * (platformFees.transactionFee.value / 100);
        } else {
            totalFees += platformFees.transactionFee.value;
        }
    }
    
    // Commission fee
    if (platformFees.commissionFee) {
        if (platformFees.commissionFee.type === 'percent') {
            totalFees += totalRevenue * (platformFees.commissionFee.value / 100);
        } else {
            totalFees += platformFees.commissionFee.value;
        }
    }
    
    // Add other fees if configured (including VAT and Income Tax)
    ['shippingFee', 'voucherFee', 'affiliateCommission', 'vatTax', 'incomeTax', 'sellerDiscount'].forEach(feeType => {
        if (platformFees[feeType]) {
            if (platformFees[feeType].type === 'percent') {
                totalFees += totalRevenue * (platformFees[feeType].value / 100);
            } else {
                totalFees += platformFees[feeType].value;
            }
            console.log(`💰 CALCULATION: Added ${feeType}: ${platformFees[feeType].value} (${platformFees[feeType].type})`);
        }
    });
    
    // Add custom fees if configured
    if (platformFees.customFeesList && Array.isArray(platformFees.customFeesList)) {
        platformFees.customFeesList.forEach(customFee => {
            const customFeeKey = `custom_${customFee.id}`;
            const customFeeConfig = platformFees[customFeeKey];
            
            if (customFeeConfig && customFeeConfig.value && customFeeConfig.value > 0) {
                let feeAmount = 0;
                if (customFeeConfig.type === 'percent') {
                    feeAmount = totalRevenue * (customFeeConfig.value / 100);
                } else {
                    feeAmount = customFeeConfig.value;
                }
                totalFees += feeAmount;
                console.log(`💰 CALCULATION: Added custom fee "${customFee.name}": ${customFeeConfig.value} (${customFeeConfig.type}) = ${feeAmount}`);
            }
        });
    }
    
    // Calculate packaging costs using new multi-item logic
    let packagingCosts = 0;
    console.log('=== CALCULATING PACKAGING COST IN PROFIT MANAGEMENT ===');
    console.log('Order structure:', {
        hasItems: !!(order.items && Array.isArray(order.items)),
        itemsCount: order.items ? order.items.length : 0,
        singleProductType: order.productType,
        singleWeight: order.weight
    });
    
    // Force reload packaging config if empty
    if (!packagingConfig || !packagingConfig.cold || packagingConfig.cold.length === 0) {
        console.log('🔧 Packaging config empty, force reloading...');
        await loadPackagingConfig();
        console.log('🔧 After reload, packagingConfig:', packagingConfig);
    }
    
    packagingCosts = calculateMultiItemPackagingCost(order);
    console.log('📦 CALCULATION: Final packaging cost calculated:', packagingCosts);
    console.log('📦 CALCULATION: Order data for packaging:', {
        productType: order.productType,
        weight: order.weight,
        hasItems: !!(order.items && Array.isArray(order.items)),
        itemsCount: order.items ? order.items.length : 0,
        items: order.items || 'No items array'
    });
    
    // Get external costs from Firebase (for all orders including Excel imports)
    let externalCosts = 0;
    try {
        // Use order's storeId if available, otherwise current store
        const storeId = order.storeId || getCurrentStore();
        console.log('💰 CALCULATION: Loading external costs for store:', storeId);
        
        const externalCostsData = await getExternalCostsFromStorage(storeId);
        if (externalCostsData && typeof externalCostsData === 'object') {
            Object.values(externalCostsData).forEach(cost => {
                if (cost && cost.value) {
                    const costValue = parseFloat(cost.value) || 0;
                    externalCosts += costValue;
                    console.log('💰 CALCULATION: Adding external cost:', cost.name || 'Unknown', costValue);
                }
            });
        }
        console.log('💰 CALCULATION: Total external costs loaded:', externalCosts);
    } catch (error) {
        console.error('Error loading external costs for calculation:', error);
    }
    
    const finalProfit = baseProfit - totalFees - packagingCosts - externalCosts;
    console.log(`🔥 PROFIT MANAGEMENT Profit calculation: Base: ${baseProfit}, Fees: ${totalFees}, Packaging: ${packagingCosts}, External: ${externalCosts}, Final: ${finalProfit}`);
    console.log(`🔥 Order details:`, {
        orderId: order.orderId || 'N/A',
        sellingPrice: sellingPrice,
        importPrice: importPrice,
        quantity: quantity,
        platform: order.platform,
        productType: order.productType,
        weight: order.weight
    });
    
    // Return detailed breakdown for Excel export
    const result = {
        finalProfit: finalProfit,
        baseProfit: baseProfit,
        totalFees: totalFees,
        packagingCosts: packagingCosts,
        externalCosts: externalCosts,
        // Individual fee breakdown
        transactionFee: 0,
        commissionFee: 0,
        actualShippingFee: 0,
        shippingDiscount: 0,
        sellerShippingDiscount: 0,
        tiktokShippingDiscount: 0,
        returnShippingFee: 0,
        shippingSubsidy: 0,
        affiliateCommission: 0,
        voucherXtraFee: 0,
        vatTax: 0,
        personalIncomeTax: 0,
        sellerDiscount: 0,
        otherFees: 0
    };
    
    // Calculate individual fees if platformFees exist
    if (platformFees && Object.keys(platformFees).length > 0) {
        const totalRevenue = sellingPrice * quantity;
        
        // Transaction fee
        if (platformFees.transactionFee) {
            if (platformFees.transactionFee.type === 'percent') {
                result.transactionFee = totalRevenue * (platformFees.transactionFee.value / 100);
            } else {
                result.transactionFee = platformFees.transactionFee.value || 0;
            }
        }
        
        // Commission fee
        if (platformFees.commissionFee) {
            if (platformFees.commissionFee.type === 'percent') {
                result.commissionFee = totalRevenue * (platformFees.commissionFee.value / 100);
            } else {
                result.commissionFee = platformFees.commissionFee.value || 0;
            }
        }
        
        // Add other fees with proper mapping
        const feeMapping = {
            actualShippingFee: 'actualShippingFee',
            shippingDiscount: 'shippingDiscount', 
            sellerShippingDiscount: 'sellerShippingDiscount',
            tiktokShippingDiscount: 'tiktokShippingDiscount',
            returnShippingFee: 'returnShippingFee',
            shippingSubsidy: 'shippingSubsidy',
            affiliateCommission: 'affiliateCommission',
            voucherXtraFee: 'voucherXtraFee',
            vatTax: 'vatTax',
            personalIncomeTax: 'personalIncomeTax',
            sellerDiscount: 'sellerDiscount',
            otherFees: 'otherFees'
        };
        
        Object.entries(feeMapping).forEach(([resultKey, configKey]) => {
            if (platformFees[configKey]) {
                if (platformFees[configKey].type === 'percent') {
                    result[resultKey] = totalRevenue * (platformFees[configKey].value / 100);
                } else {
                    result[resultKey] = platformFees[configKey].value || 0;
                }
            }
        });
    }
    
    return result;
}

// Get platform fees from localStorage (same as sales-orders-tmdt.js)
function getPlatformFeesFromStorageSync(platform) {
    try {
        const currentStore = getCurrentStore();
        const savedFees = localStorage.getItem(`platformFees_${currentStore}_${platform}`);
        return savedFees ? JSON.parse(savedFees) : {};
    } catch (error) {
        console.error('Error loading platform fees:', error);
        return {};
    }
}

// External Costs Management Functions
async function openExternalCostsModal() {
    const modal = document.getElementById('external-costs-modal');
    const storeSelect = document.getElementById('external-costs-store-select');
    
    // Load stores for selection
    await loadStoresForExternalCosts();
    
    modal.style.display = 'block';
}

function closeExternalCostsModal() {
    const modal = document.getElementById('external-costs-modal');
    modal.style.display = 'none';
    
    // Reset form
    const form = document.getElementById('external-costs-form');
    form.style.display = 'none';
}

async function loadStoresForExternalCosts() {
    try {
        const storesSnapshot = await window.database.ref('stores').once('value');
        const stores = storesSnapshot.val() || {};
        const storeSelect = document.getElementById('external-costs-store-select');
        
        // Clear existing options
        storeSelect.innerHTML = '<option value="">Chọn cửa hàng...</option>';
        
        // Add store options
        Object.keys(stores).forEach(storeId => {
            const store = stores[storeId];
            const option = document.createElement('option');
            option.value = storeId;
            option.textContent = store.name || storeId;
            storeSelect.appendChild(option);
        });
        
        // Set current store as selected if available
        const currentStore = getCurrentStore();
        if (currentStore) {
            storeSelect.value = currentStore;
            await loadExternalCostsForStore();
        }
    } catch (error) {
        console.error('Error loading stores for external costs:', error);
    }
}

async function loadExternalCostsForStore() {
    const storeId = document.getElementById('external-costs-store-select').value;
    const form = document.getElementById('external-costs-form');
    
    if (!storeId) {
        form.style.display = 'none';
        return;
    }
    
    form.style.display = 'block';
    
    try {
        // Load external costs from Firebase
        const costsSnapshot = await window.database.ref(`externalCosts/${storeId}`).once('value');
        const costs = costsSnapshot.val() || {};
        
        // Populate form with existing costs
        populateExternalCostsForm(costs);
    } catch (error) {
        console.error('Error loading external costs:', error);
    }
}

function populateExternalCostsForm(costs) {
    // Standard cost types
    const standardCosts = ['shipping-cost', 'packaging-cost', 'storage-cost', 'marketing-cost', 'staff-cost', 'rent-cost', 'utility-cost', 'insurance-cost', 'equipment-cost', 'admin-cost'];
    
    standardCosts.forEach(costType => {
        const cost = costs[costType];
        const enabledCheckbox = document.getElementById(`${costType}-enabled`);
        const valueInput = document.getElementById(`${costType}-value`);
        const inputs = document.getElementById(`${costType}-inputs`);
        const percentRadio = document.getElementById(`${costType}-percent`);
        const fixedRadio = document.getElementById(`${costType}-fixed`);
        
        if (cost && cost.value > 0) {
            enabledCheckbox.checked = true;
            inputs.style.display = 'block';
            valueInput.value = cost.value;
            
            if (cost.type === 'percent') {
                percentRadio.checked = true;
            } else {
                fixedRadio.checked = true;
            }
        } else {
            enabledCheckbox.checked = false;
            inputs.style.display = 'none';
            valueInput.value = '';
        }
    });
    
    // Load custom costs
    loadCustomExternalCosts(costs);
}

function loadCustomExternalCosts(costs) {
    const container = document.getElementById('custom-external-costs-container');
    container.innerHTML = '';
    
    // Get custom costs list
    const customCostsList = costs.customCostsList || [];
    
    customCostsList.forEach(customCost => {
        const costKey = `custom_${customCost.id}`;
        const costData = costs[costKey];
        
        if (costData) {
            const customCostDiv = document.createElement('div');
            customCostDiv.className = 'fee-group';
            customCostDiv.innerHTML = `
                <div class="fee-header">
                    <input type="checkbox" id="${costKey}-enabled" checked onchange="toggleCustomExternalCost('${costKey}')">
                    <label for="${costKey}-enabled">${costData.name}</label>
                    <button type="button" onclick="deleteCustomExternalCost('${customCost.id}')" class="delete-btn">×</button>
                </div>
                <div id="${costKey}-inputs" class="fee-inputs">
                    <div class="fee-type-selector">
                        <input type="radio" id="${costKey}-percent" name="${costKey}-type" value="percent" ${costData.type === 'percent' ? 'checked' : ''} onchange="updateCustomExternalCostType('${costKey}', 'percent')">
                        <label for="${costKey}-percent">Phần trăm (%)</label>
                        <input type="radio" id="${costKey}-fixed" name="${costKey}-type" value="fixed" ${costData.type === 'fixed' ? 'checked' : ''} onchange="updateCustomExternalCostType('${costKey}', 'fixed')">
                        <label for="${costKey}-fixed">Cố định (VND)</label>
                    </div>
                    <input type="number" id="${costKey}-value" value="${costData.value}" placeholder="Nhập giá trị" min="0" step="0.01">
                </div>
            `;
            container.appendChild(customCostDiv);
        }
    });
}

function toggleExternalCost(costType) {
    const checkbox = document.getElementById(`${costType}-enabled`);
    const inputs = document.getElementById(`${costType}-inputs`);
    
    if (checkbox.checked) {
        inputs.style.display = 'block';
    } else {
        inputs.style.display = 'none';
    }
}

function updateExternalCostType(costType, type) {
    // This function can be used for additional logic when cost type changes
    console.log(`External cost ${costType} type changed to ${type}`);
}

function showAddCustomExternalCostForm() {
    const form = document.getElementById('add-custom-external-cost-form');
    const button = document.getElementById('add-custom-external-cost-btn');
    
    form.style.display = 'block';
    button.style.display = 'none';
    
    // Clear form
    document.getElementById('custom-external-cost-name').value = '';
    document.getElementById('custom-external-cost-value').value = '';
    document.getElementById('custom-external-cost-fixed').checked = true;
}

function cancelAddCustomExternalCost() {
    const form = document.getElementById('add-custom-external-cost-form');
    const button = document.getElementById('add-custom-external-cost-btn');
    
    form.style.display = 'none';
    button.style.display = 'block';
}

async function saveCustomExternalCost() {
    const name = document.getElementById('custom-external-cost-name').value.trim();
    const value = parseFloat(document.getElementById('custom-external-cost-value').value);
    const type = document.querySelector('input[name="custom-external-cost-type"]:checked').value;
    
    if (!name || !value || value <= 0) {
        alert('Vui lòng nhập đầy đủ thông tin chi phí!');
        return;
    }
    
    const storeId = document.getElementById('external-costs-store-select').value;
    if (!storeId) {
        showNotification('Vui lòng chọn cửa hàng!', 'warning');
        return;
    }
    
    try {
        // Generate unique ID for custom cost
        const customId = Date.now().toString();
        const costKey = `custom_${customId}`;
        
        // Get current costs
        const costsSnapshot = await window.database.ref(`externalCosts/${storeId}`).once('value');
        const costs = costsSnapshot.val() || {};
        
        // Add to custom costs list
        const customCostsList = costs.customCostsList || [];
        customCostsList.push({ id: customId, name: name });
        
        // Save custom cost data
        costs.customCostsList = customCostsList;
        costs[costKey] = {
            name: name,
            type: type,
            value: value
        };
        
        // Save to Firebase
        await window.database.ref(`externalCosts/${storeId}`).set(costs);
        
        // Reload the form
        await loadExternalCostsForStore();
        
        // Hide add form
        cancelAddCustomExternalCost();
        
        alert('Chi phí tùy chỉnh đã được thêm thành công!');
    } catch (error) {
        console.error('Error saving custom external cost:', error);
        alert('Lỗi khi lưu chi phí tùy chỉnh!');
    }
}

async function deleteCustomExternalCost(customId) {
    if (!confirm('Bạn có chắc chắn muốn xóa chi phí này?')) {
        return;
    }
    
    const storeId = document.getElementById('external-costs-store-select').value;
    
    try {
        const costsSnapshot = await window.database.ref(`externalCosts/${storeId}`).once('value');
        const costs = costsSnapshot.val() || {};
        
        // Remove from custom costs list
        const customCostsList = costs.customCostsList || [];
        const updatedList = customCostsList.filter(cost => cost.id !== customId);
        costs.customCostsList = updatedList;
        
        // Remove cost data
        const costKey = `custom_${customId}`;
        delete costs[costKey];
        
        // Save to Firebase
        await window.database.ref(`externalCosts/${storeId}`).set(costs);
        
        // Reload the form
        await loadExternalCostsForStore();
        
        alert('Chi phí đã được xóa thành công!');
    } catch (error) {
        console.error('Error deleting custom external cost:', error);
        alert('Lỗi khi xóa chi phí!');
    }
}

async function saveExternalCosts() {
    const storeId = document.getElementById('external-costs-store-select').value;
    
    if (!storeId) {
        showNotification('Vui lòng chọn cửa hàng!', 'warning');
        return;
    }
    
    try {
        // Get current costs to preserve custom costs list
        const costsSnapshot = await window.database.ref(`externalCosts/${storeId}`).once('value');
        const existingCosts = costsSnapshot.val() || {};
        
        const costs = {
            customCostsList: existingCosts.customCostsList || []
        };
        
        // Save standard costs
        const standardCosts = ['shipping-cost', 'packaging-cost', 'storage-cost', 'marketing-cost', 'staff-cost', 'rent-cost', 'utility-cost', 'insurance-cost', 'equipment-cost', 'admin-cost'];
        
        standardCosts.forEach(costType => {
            const enabledCheckbox = document.getElementById(`${costType}-enabled`);
            
            if (enabledCheckbox.checked) {
                const valueInput = document.getElementById(`${costType}-value`);
                const percentRadio = document.getElementById(`${costType}-percent`);
                const value = parseFloat(valueInput.value);
                
                if (value > 0) {
                    costs[costType] = {
                        type: percentRadio.checked ? 'percent' : 'fixed',
                        value: value
                    };
                }
            }
        });
        
        // Save custom costs (preserve existing custom cost data)
        const customCostsList = existingCosts.customCostsList || [];
        customCostsList.forEach(customCost => {
            const costKey = `custom_${customCost.id}`;
            if (existingCosts[costKey]) {
                const valueInput = document.getElementById(`${costKey}-value`);
                const percentRadio = document.getElementById(`${costKey}-percent`);
                
                if (valueInput && valueInput.value) {
                    costs[costKey] = {
                        name: existingCosts[costKey].name,
                        type: percentRadio && percentRadio.checked ? 'percent' : 'fixed',
                        value: parseFloat(valueInput.value)
                    };
                }
            }
        });
        
        // Save to Firebase
        await window.database.ref(`externalCosts/${storeId}`).set(costs);
        
        showNotification('Cài đặt chi phí bên ngoài đã được lưu thành công!', 'success');
        closeExternalCostsModal();
        
        // Refresh the profit data to reflect new costs
        if (typeof updateTmdtOrdersDetailTableWithFilters === 'function') {
            const platform = document.getElementById('platform-select').value || 'all';
            const store = document.getElementById('store-select').value || 'all';
            const dateFrom = document.getElementById('date-from')?.value;
            const dateTo = document.getElementById('date-to')?.value;
            await updateTmdtOrdersDetailTableWithFilters(platform, store, dateFrom, dateTo);
        }
    } catch (error) {
        console.error('Error saving external costs:', error);
        showNotification('Lỗi khi lưu cài đặt chi phí bên ngoài!', 'error');
    }
}

// Get external costs from Firebase
async function getExternalCostsFromStorage(storeId) {
    try {
        if (!storeId) {
            console.log('No store ID specified for external costs calculation');
            return {};
        }

        console.log(`Loading external costs for store ${storeId} from Firebase`);
        
        const costsSnapshot = await window.database.ref(`externalCosts/${storeId}`).once('value');
        const costs = costsSnapshot.val();
        
        if (costs) {
            console.log('External costs loaded from Firebase:', costs);
            return costs;
        } else {
            console.log('No external costs found in Firebase for store:', storeId);
            return {};
        }
    } catch (error) {
        console.error('Error loading external costs from Firebase:', error);
        return {};
    }
}

// Get platform fees from Firebase (updated to use Firebase instead of localStorage)
async function getPlatformFeesFromStorage(platform) {
    try {
        if (!platform) {
            console.log('No platform specified for fee calculation');
            return {};
        }

        const currentStore = getCurrentStore();
        console.log(`Loading platform fees for ${platform} from Firebase for store ${currentStore}`);
        
        if (!window.database) {
            console.error('Firebase database not available');
            return {};
        }

        // Try store-specific fees first
        const storeFeesSnapshot = await window.database.ref(`platformFees/${currentStore}/${platform}`).once('value');
        const storeFees = storeFeesSnapshot.val();
        
        if (storeFees && Object.keys(storeFees).length > 0) {
            console.log(`Found store-specific fees for ${platform}:`, storeFees);
            return storeFees;
        }

        // Fallback to global platform fees
        const globalFeesSnapshot = await window.database.ref(`platformFees/${platform}`).once('value');
        const globalFees = globalFeesSnapshot.val();
        
        if (globalFees && Object.keys(globalFees).length > 0) {
            console.log(`Found global fees for ${platform}:`, globalFees);
            return globalFees;
        }

        console.log(`No fees found for platform ${platform}`);
        return {};
    } catch (error) {
        console.error('Error loading platform fees from Firebase:', error);
        return {};
    }
}

// Get current store helper function (same as sales-orders-tmdt.js)
function getCurrentStore() {
    return localStorage.getItem('selectedStoreId') || 'default';
}

// Debug function to check Firebase platform fees
function debugPlatformFees() {
    const storeId = getCurrentStore()?.id || 'default';
    console.log('🔍 Checking platform fees for store:', storeId);
    
    firebase.database().ref(`platformFees/${storeId}`).once('value').then(snapshot => {
        const data = snapshot.val();
        if (data) {
            console.log('✅ Platform fees found in Firebase:', data);
            Object.keys(data).forEach(platform => {
                console.log(`📊 ${platform}:`, data[platform]);
            });
        } else {
            console.log('⚠️ Modal: No platform fees found from UI');
        }
        // Force show detailed breakdown even without UI fees
        if (totalFees > 0) {
            feeDetails = `
                <div class="fee-item">
                    <span class="fee-name">Phí Giao Dịch (5%)</span>
                    <span class="fee-amount">-${formatCurrency(totalFees * 0.5)}</span>
                </div>
                <div class="fee-item">
                    <span class="fee-name">Phí Hoa Hồng (5%)</span>
                    <span class="fee-amount">-${formatCurrency(totalFees * 0.5)}</span>
                </div>
            `;
        }
        feeDetails = `
            <div class="fee-item">
                <span class="fee-name">Phí Sàn TMĐT</span>
                <span class="fee-amount">-${formatCurrency(totalFees)}</span>
            </div>
        `;
    }).catch(error => {
        console.error('🔥 Error checking platform fees:', error);
    });
}

// Expose to global scope for console testing
window.debugPlatformFees = debugPlatformFees;

// Hide overview content when in packaging view
function hideOverviewContent() {
    const overviewView = document.getElementById('overview-view');
    const analysisSections = document.querySelectorAll('.analysis-section');
    const chartsSection = document.querySelector('.charts-section');
    
    if (overviewView) {
        overviewView.style.display = 'none';
    }
    analysisSections.forEach(section => {
        if (section) {
            section.style.display = 'none';
        }
    });
    if (chartsSection) {
        chartsSection.style.display = 'none';
    }
}

// Show overview content when switching back from packaging view
function showOverviewContent() {
    const overviewView = document.getElementById('overview-view');
    const analysisSections = document.querySelectorAll('.analysis-section');
    const chartsSection = document.querySelector('.charts-section');
    
    if (overviewView) {
        overviewView.style.display = 'block';
    }
    analysisSections.forEach(section => {
        if (section) {
            section.style.display = 'block';
        }
    });
    if (chartsSection) {
        chartsSection.style.display = 'block';
    }
    
    // Show all stat cards for overview
    showAllStatCards();
}

// Show only TMĐT-related content
function showTmdtOnlyContent() {
    console.log('Showing TMĐT only content');
    
    // Hide overview view and show TMĐT view
    
    const tmdtView = document.getElementById('tmdt-view');
    const packagingView = document.getElementById('packaging-view');
    
    // Hide all other views
    if (overviewView) overviewView.style.display = 'none';
    if (wholesaleView) wholesaleView.style.display = 'none';
    if (retailView) retailView.style.display = 'none';
    if (packagingView) packagingView.style.display = 'none';
    
    // Show TMĐT view
    if (tmdtView) {
        tmdtView.style.display = 'block';
    }
    
    // Show analysis sections and charts
    const analysisSections = document.querySelectorAll('.analysis-section');
    const chartsSection = document.querySelector('.charts-section');
    
    analysisSections.forEach(section => {
        section.style.display = 'block';
    });
    
    if (chartsSection) {
        chartsSection.style.display = 'block';
    }
}

// Helper functions to show/hide specific stat cards
function showAllStatCards() {
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.style.display = 'block';
    });
}

function hideTotalStatCard() {
    const totalElement = document.getElementById('total-profit');
    if (totalElement) {
        const totalCard = totalElement.closest('.stat-card');
        if (totalCard) {
            totalCard.style.display = 'none';
        }
    }
}

function hideWholesaleStatCard() {
    const wholesaleElement = document.getElementById('wholesale-profit');
    if (wholesaleElement) {
        const wholesaleCard = wholesaleElement.closest('.stat-card');
        if (wholesaleCard) {
            wholesaleCard.style.display = 'none';
        }
    }
}

function hideRetailStatCard() {
    const retailElement = document.getElementById('retail-profit');
    if (retailElement) {
        const retailCard = retailElement.closest('.stat-card');
        if (retailCard) {
            retailCard.style.display = 'none';
        }
    }
}

function showTmdtStatCard() {
    const tmdtElement = document.getElementById('tmdt-profit');
    if (tmdtElement) {
        const tmdtCard = tmdtElement.closest('.stat-card');
        if (tmdtCard) {
            tmdtCard.style.display = 'block';
        }
    }
}

// Load packaging configuration data
function loadPackagingConfigData() {
    console.log('Loading packaging configuration data...');
    // Initialize packaging config when switching to packaging view
    if (typeof initializePackagingConfig === 'function') {
        try {
            initializePackagingConfig();
        } catch (error) {
            console.error('Error initializing packaging config:', error);
        }
    } else {
        console.error('initializePackagingConfig function not found');
    }
}

// Filter orders by date range
function filterOrdersByDate() {
    const dateFrom = document.getElementById('date-from')?.value;
    const dateTo = document.getElementById('date-to')?.value;
    
    console.log('Date filter changed:', { dateFrom, dateTo });
    
    // Refresh data with current filters
    const storeFilter = document.getElementById('store-select')?.value || 'all';
    const platformFilter = document.getElementById('platform-select')?.value || 'all';
    
    // Apply all filters and refresh statistics
    updateTmdtStatistics(platformFilter, storeFilter, dateFrom, dateTo);
}

// Clear date filter
function clearDateFilter() {
    const dateFrom = document.getElementById('date-from');
    const dateTo = document.getElementById('date-to');
    
    if (dateFrom) dateFrom.value = '';
    if (dateTo) dateTo.value = '';
    
    // Clear date filter and refresh data
    filterOrdersByDate();
}

// Search functionality
let searchTerm = '';
let allTmdtOrders = null;
let dateFrom = null;
let dateTo = null;

function searchOrders() {
    const searchInput = document.getElementById('order-search-input');
    const clearBtn = document.getElementById('clear-search-btn');
    const resultsInfo = document.getElementById('search-results-count');
    
    searchTerm = searchInput.value.toLowerCase().trim();
    
    // Show/hide clear button
    if (searchTerm) {
        clearBtn.style.display = 'block';
    } else {
        clearBtn.style.display = 'none';
    }
    
    // Reset to first page when searching
    currentPage = 1;
    
    // Apply search and render
    renderCurrentPage();
    
    // Update search results info
    updateSearchResultsInfo();
}

function clearSearch() {
    const searchInput = document.getElementById('order-search-input');
    const clearBtn = document.getElementById('clear-search-btn');
    const resultsInfo = document.getElementById('search-results-count');
    
    if (searchInput) searchInput.value = '';
    searchTerm = '';
    if (clearBtn) clearBtn.style.display = 'none';
    if (resultsInfo) resultsInfo.innerHTML = '';
    
    // Reset to first page
    currentPage = 1;
    
    // Re-render without search filter
    renderCurrentPage();
}

function updateSearchResultsInfo() {
    const resultsInfo = document.getElementById('search-results-count');
    
    if (searchTerm) {
        const filteredCount = getFilteredOrders().length;
        resultsInfo.innerHTML = `<span>Tìm thấy ${filteredCount} kết quả cho "${searchTerm}"</span>`;
    } else {
        resultsInfo.innerHTML = '';
    }
}

function getFilteredOrders() {
    console.log('🔍 getFilteredOrders called');
    
    // Use global data sources with fallback
    const ordersData = allTmdtOrders || window.tmdtOrdersData || {};
    if (!ordersData || Object.keys(ordersData).length === 0) {
        console.log('🔍 No TMĐT orders available for filtering');
        return [];
    }

    console.log('🔍 Starting with', Object.keys(ordersData).length, 'total orders');
    
    let filtered = Object.entries(ordersData);
    
    // Apply search date filter if dates are set
    const searchDateFrom = document.getElementById('search-date-from');
    const searchDateTo = document.getElementById('search-date-to');
    
    if (searchDateFrom && searchDateTo && (searchDateFrom.value || searchDateTo.value)) {
        console.log('🔍 Search date filter - From:', searchDateFrom.value, 'To:', searchDateTo.value);
        
        filtered = filtered.filter(([orderId, order]) => {
            // Try multiple date formats and fields
            let orderDateString = order.createdAt || order.timestamp || order.date || order.orderDate;
            
            // If date is in DD/MM/YYYY format, convert to YYYY-MM-DD
            if (orderDateString && typeof orderDateString === 'string') {
                if (orderDateString.includes('/')) {
                    const parts = orderDateString.split('/');
                    if (parts.length === 3) {
                        // Assume DD/MM/YYYY format
                        orderDateString = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    }
                }
            }
            
            const orderDate = new Date(orderDateString);
            console.log('🔍 Order date for', orderId, ':', orderDate, 'Raw:', order.createdAt || order.timestamp || order.date, 'Converted:', orderDateString);
            
            // Skip invalid dates
            if (isNaN(orderDate.getTime())) {
                console.log('🔍 Invalid date, skipping filter for', orderId);
                return true; // Don't filter out orders with invalid dates
            }
            
            let passesFilter = true;
            
            if (searchDateFrom.value) {
                const fromDate = new Date(searchDateFrom.value);
                fromDate.setHours(0, 0, 0, 0);
                passesFilter = passesFilter && orderDate >= fromDate;
                console.log('🔍 From date check:', orderDate.toDateString(), '>=', fromDate.toDateString(), '=', passesFilter);
            }
            
            if (searchDateTo.value) {
                const toDate = new Date(searchDateTo.value);
                toDate.setHours(23, 59, 59, 999);
                passesFilter = passesFilter && orderDate <= toDate;
                console.log('🔍 To date check:', orderDate.toDateString(), '<=', toDate.toDateString(), '=', passesFilter);
            }
            
            return passesFilter;
        });
        
        console.log('🔍 After search date filter:', filtered.length, 'orders');
    }
    
    // Apply main date filter if dates are set (from top filter)
    if (dateFrom && dateTo && dateFrom.value && dateTo.value) {
        const fromDate = new Date(dateFrom.value);
        const toDate = new Date(dateTo.value);
        toDate.setHours(23, 59, 59, 999); // Include full end date
        
        filtered = filtered.filter(([orderId, order]) => {
            const orderDate = new Date(order.createdAt || order.timestamp);
            return orderDate >= fromDate && orderDate <= toDate;
        });
        
        console.log('🔍 After main date filter:', filtered.length, 'orders');
    }
    
    // Apply search filter if search term exists
    if (searchTerm) {
        console.log('🔍 Applying search filter for:', searchTerm);
        
        filtered = filtered.filter(([orderId, order]) => {
            const productName = (order.productName || '').toLowerCase();
            const sku = (order.sku || '').toLowerCase();
            const orderIdLower = orderId.toLowerCase();
            
            return productName.includes(searchTerm) || 
                   sku.includes(searchTerm) || 
                   orderIdLower.includes(searchTerm);
        });
        console.log('🔍 After search filter:', filtered.length, 'orders');
    }
    
    return filtered;
}

// Clear date filter function for search
function clearDateFilter() {
    const searchDateFrom = document.getElementById('search-date-from');
    const searchDateTo = document.getElementById('search-date-to');
    
    if (searchDateFrom) searchDateFrom.value = '';
    if (searchDateTo) searchDateTo.value = '';
    
    // Refresh search results
    searchOrders();
}

// Export detailed profit report to Excel
async function exportProfitReport() {
    console.log('📊 Starting profit report export...');
    
    // Debug current store
    const currentStoreId = getCurrentStore();
    console.log('🏪 EXPORT: Current store ID:', currentStoreId);
    
    // Get filtered orders based on current search/date filters
    const filteredOrders = getFilteredOrders();
    
    if (filteredOrders.length === 0) {
        alert('Không có đơn hàng nào để xuất báo cáo!');
        return;
    }
    
    // Get date range for report title
    const searchDateFrom = document.getElementById('search-date-from');
    const searchDateTo = document.getElementById('search-date-to');
    let dateRangeText = '';
    
    if (searchDateFrom?.value && searchDateTo?.value) {
        dateRangeText = `từ ${searchDateFrom.value} đến ${searchDateTo.value}`;
    } else if (searchDateFrom?.value) {
        dateRangeText = `từ ${searchDateFrom.value}`;
    } else if (searchDateTo?.value) {
        dateRangeText = `đến ${searchDateTo.value}`;
    } else {
        dateRangeText = 'tất cả thời gian';
    }
    
    // Prepare Excel data
    const excelData = [];
    let totalRevenue = 0;
    let totalCost = 0;
    let totalPlatformFees = 0;
    let totalPackagingCost = 0;
    let totalExternalCosts = 0;
    let totalProfit = 0;
    
    // Create headers with all detailed cost columns
    const headers = [
        'STT', 'Mã ĐH', 'Sản Phẩm', 'SKU', 'Số Lượng', 
        'Giá Nhập (VNĐ)', 'Giá Bán (VNĐ)', 'Lợi Nhuận Gộp', 'Tổng Tiền', 
        'Sàn TMĐT', 'Cửa Hàng', 'Ngày Tạo', 
        'Chi Phí Đóng Gói', 'Phí Giao Dịch', 'Phí Hoa Hồng', 'Phí Vận Chuyển Thực Tế',
        'Chiết Khấu Phí VC', 'Giảm Phí VC Người Bán', 'Giảm Phí VC TikTok Shop', 'Phí VC Trả Hàng',
        'Trợ Giá Vận Chuyển', 'Hoa Hồng Liên Kết', 'Phí Voucher Xtra', 'Thuế GTGT',
        'Thuế TNCN', 'Giảm Giá Người Bán', 'Phí Khác', 'Chi Phí Nhân Viên',
        'Chi Phí Thuê Mặt Bằng', 'Chi Phí Điện Nước', 'Chi Phí Bảo Hiểm', 'Chi Phí Thiết Bị',
        'Chi Phí Marketing', 'Chi Phí Vận Chuyển', 'Chi Phí Lưu Kho', 'Chi Phí Hành Chính',
        'Tổng Chi Phí', 'Lợi Nhuận Thực'
    ];
    
    // Add header row
    excelData.push(headers);
    
    // Process each order
    for (let index = 0; index < filteredOrders.length; index++) {
        const [orderId, order] = filteredOrders[index];
        const quantity = parseInt(order.quantity) || 1;
        const importPrice = parseFloat(order.importPrice) || 0;
        const sellingPrice = parseFloat(order.sellingPrice) || 0;
        const grossProfit = (sellingPrice - importPrice) * quantity;
        const totalAmount = sellingPrice * quantity;
        
        // Calculate packaging cost
        const packagingCost = calculatePackagingCost(order.productType || 'dry', order.weight || 1) || 0;
        
        // Ensure order has current store ID for proper external costs calculation
        const currentStoreId = getCurrentStore();
        const orderWithStore = {
            ...order,
            storeId: order.storeId || currentStoreId
        };
        
        console.log(`🔍 EXPORT Order ${index + 1}: storeId=${orderWithStore.storeId}, orderId=${orderId}`);
        
        // Calculate platform fees using the same function as dashboard
        const profitData = await calculateOrderProfitWithPlatformFees(orderWithStore);
        console.log(`💰 EXPORT Order ${index + 1} profitData:`, profitData);
        
        // Extract individual fees for detailed breakdown
        const transactionFee = profitData.transactionFee || 0;
        const commissionFee = profitData.commissionFee || 0;
        const actualShippingFee = profitData.actualShippingFee || 0;
        const shippingDiscount = profitData.shippingDiscount || 0;
        const sellerShippingDiscount = profitData.sellerShippingDiscount || 0;
        const tiktokShippingDiscount = profitData.tiktokShippingDiscount || 0;
        const returnShippingFee = profitData.returnShippingFee || 0;
        const shippingSubsidy = profitData.shippingSubsidy || 0;
        const affiliateCommission = profitData.affiliateCommission || 0;
        const voucherXtraFee = profitData.voucherXtraFee || 0;
        const vatTax = profitData.vatTax || 0;
        const incomeTax = profitData.personalIncomeTax || 0;
        const sellerDiscount = profitData.sellerDiscount || 0;
        const otherFees = profitData.otherFees || 0;
        
        // Calculate total platform fees
        const totalPlatformFeesForOrder = transactionFee + commissionFee + actualShippingFee + 
            returnShippingFee + affiliateCommission + voucherXtraFee + vatTax + incomeTax + 
            sellerDiscount + otherFees - shippingDiscount - sellerShippingDiscount - 
            tiktokShippingDiscount - shippingSubsidy;
        
        // Get external costs from profitData
        const externalCosts = profitData.externalCosts || 0;
        
        // Calculate real profit after all costs - ensure it's a valid number
        const realProfit = (typeof profitData.finalProfit === 'number' && !isNaN(profitData.finalProfit)) 
            ? profitData.finalProfit 
            : (typeof profitData === 'number' && !isNaN(profitData)) 
                ? profitData 
                : 0;
        
        console.log(`💰 EXPORT Order ${index + 1} realProfit: ${realProfit}, type: ${typeof realProfit}`);
        
        const totalCosts = packagingCost + totalPlatformFeesForOrder + externalCosts;
        
        // Format date
        let orderDate = order.createdAt || order.timestamp || order.date || '';
        if (orderDate && typeof orderDate === 'string' && orderDate.includes('/')) {
            const parts = orderDate.split('/');
            if (parts.length === 3) {
                orderDate = `${parts[0]}/${parts[1]}/${parts[2]}`;
            }
        }
        
        // Create row data with all cost details
        const rowData = [
            index + 1, // STT
            orderId,
            order.productName || 'N/A',
            order.sku || 'N/A',
            quantity,
            formatCurrency(importPrice),
            formatCurrency(sellingPrice),
            formatCurrency(grossProfit),
            formatCurrency(totalAmount),
            order.platformName || order.platform || 'N/A',
            order.storeName || 'N/A',
            formatDate(order.orderDate),
            formatCurrency(packagingCost),
            formatCurrency(transactionFee),
            formatCurrency(commissionFee),
            formatCurrency(actualShippingFee), // Phí Vận Chuyển Thực Tế
            formatCurrency(shippingDiscount), // Chiết Khấu Phí VC
            formatCurrency(sellerShippingDiscount), // Giảm Phí VC Người Bán
            formatCurrency(tiktokShippingDiscount), // Giảm Phí VC TikTok Shop
            formatCurrency(returnShippingFee), // Phí VC Trả Hàng
            formatCurrency(shippingSubsidy), // Trợ Giá Vận Chuyển
            formatCurrency(affiliateCommission), // Hoa Hồng Liên Kết
            formatCurrency(voucherXtraFee), // Phí Voucher Xtra
            formatCurrency(vatTax), // Thuế GTGT
            formatCurrency(incomeTax), // Thuế TNCN
            formatCurrency(sellerDiscount), // Giảm Giá Người Bán
            formatCurrency(otherFees), // Phí Khác
            formatCurrency(externalCosts), // Chi Phí Nhân Viên (tổng external costs)
            formatCurrency(0), // Chi Phí Thuê Mặt Bằng
            formatCurrency(0), // Chi Phí Điện Nước
            formatCurrency(0), // Chi Phí Bảo Hiểm
            formatCurrency(0), // Chi Phí Thiết Bị
            formatCurrency(0), // Chi Phí Marketing
            formatCurrency(0), // Chi Phí Vận Chuyển
            formatCurrency(0), // Chi Phí Lưu Kho
            formatCurrency(0), // Chi Phí Hành Chính
            formatCurrency(totalCosts),
            formatCurrency(realProfit)
        ];
        
        excelData.push(rowData);
        
        // Add to totals - ensure all values are valid numbers
        totalRevenue += totalAmount;
        totalCost += importPrice * quantity;
        totalPlatformFees += totalPlatformFeesForOrder;
        totalPackagingCost += packagingCost;
        totalExternalCosts += externalCosts;
        totalProfit += (typeof realProfit === 'number' && !isNaN(realProfit)) ? realProfit : 0;
        
        console.log(`📊 EXPORT Running totals after order ${index + 1}: totalProfit=${totalProfit}`);
    }
    
    // Add summary rows
    excelData.push([]);
    excelData.push(['TỔNG KẾT']);
    excelData.push(['Tổng số đơn hàng:', filteredOrders.length]);
    excelData.push(['Tổng doanh thu:', totalRevenue.toLocaleString('vi-VN') + ' VNĐ']);
    excelData.push(['Tổng giá nhập:', totalCost.toLocaleString('vi-VN') + ' VNĐ']);
    excelData.push(['Tổng phí sàn:', totalPlatformFees.toLocaleString('vi-VN') + ' VNĐ']);
    excelData.push(['Tổng chi phí đóng gói:', totalPackagingCost.toLocaleString('vi-VN') + ' VNĐ']);
    excelData.push(['Tổng chi phí khác:', totalExternalCosts.toLocaleString('vi-VN') + ' VNĐ']);
    // Ensure totalProfit is a valid number before formatting
    const finalTotalProfit = (typeof totalProfit === 'number' && !isNaN(totalProfit)) ? totalProfit : 0;
    console.log(`📊 EXPORT Final totalProfit: ${finalTotalProfit}, original: ${totalProfit}`);
    excelData.push(['Tổng lợi nhuận thực:', finalTotalProfit.toLocaleString('vi-VN') + ' VNĐ']);
    
    // Create and download Excel file
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Báo Cáo Lợi Nhuận TMĐT');
    
    // Generate filename with date range
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 10);
    const filename = `Bao_Cao_Loi_Nhuan_TMDT_${dateRangeText.replace(/[\/\s]/g, '_')}_${timestamp}.xlsx`;
    
    XLSX.writeFile(wb, filename);
    
    console.log('📊 Export completed:', filename);
    alert(`Đã xuất báo cáo thành công!\nFile: ${filename}\nSố đơn hàng: ${filteredOrders.length}\nTổng lợi nhuận: ${finalTotalProfit.toLocaleString('vi-VN')} VNĐ`);
}

window.toggleFeeInput = toggleFeeInput;
window.changeFeeType = changeFeeType;
window.filterOrdersByDate = filterOrdersByDate;
window.clearDateFilter = clearDateFilter;
window.changeCustomFeeType = changeCustomFeeType;
window.onPlatformChange = onPlatformChange;
window.loadSavedFeesForPlatform = loadSavedFeesForPlatformWithCustom;
window.changePage = changePage;
window.goToPage = goToPage;
window.changePageSize = changePageSize;
window.exportProfitReport = exportProfitReport;
window.resetAllFees = resetAllFees;
window.savePlatformFees = savePlatformFees;
window.showAddFeeForm = showAddFeeForm;
window.switchProfitView = switchProfitView;
window.hideAddFeeForm = hideAddFeeForm;
window.addCustomFee = addCustomFee;
window.removeCustomFee = removeCustomFee;
window.clearCustomFees = clearCustomFees;
window.initializeCustomFees = initializeCustomFees;
// Test function to debug search
function testSearchFunction() {
    console.log('🧪 Testing search function...');
    console.log('🧪 allTmdtOrders:', allTmdtOrders);
    console.log('🧪 searchTerm:', searchTerm);
    
    if (allTmdtOrders) {
        const orders = Object.entries(allTmdtOrders);
        console.log('🧪 Sample order data:');
        orders.slice(0, 2).forEach(([orderId, order]) => {
            console.log(`🧪 Order ${orderId}:`, {
                productName: order.productName,
                sku: order.sku,
                orderId: orderId
            });
        });
    }
    
    const filtered = getFilteredOrders();
    console.log('🧪 Filtered results:', filtered);
}

window.searchOrders = searchOrders;
window.clearSearch = clearSearch;
window.testSearchFunction = testSearchFunction;

// Retail profit management functions
function loadRetailProfitData() {
    console.log('🛍️ Loading retail profit data...');
    
    // Initialize retail profit management if available
    if (typeof initializeRetailProfitManagement === 'function') {
        initializeRetailProfitManagement();
    } else {
        console.warn('⚠️ Retail profit management functions not loaded yet');
        // Retry after a short delay
        setTimeout(() => {
            if (typeof initializeRetailProfitManagement === 'function') {
                initializeRetailProfitManagement();
            }
        }, 1000);
    }
}

function showRetailOnlyContent() {
    console.log('🛍️ Showing retail-only content...');
    
    // Hide overview content
    hideOverviewContent();
    
    // Show retail-specific elements
    const retailView = document.getElementById('retail-view');
    if (retailView) {
        retailView.style.display = 'block';
    }
}

// Export retail functions to global scope
window.loadRetailProfitData = loadRetailProfitData;
window.showRetailOnlyContent = showRetailOnlyContent;

// Test function to manually trigger TMĐT data loading and verify filtering
async function testTmdtDataLoadingAndFiltering() {
    console.log('🔥 Manual test: Loading TMĐT data and testing filtering...');
    
    try {
        // Test data loading
        const orders = await loadTmdtSalesOrders();
        console.log('🔥 Test result - Total orders loaded:', Object.keys(orders).length);
        
        // Show breakdown by source
        const sourceBreakdown = {};
        Object.values(orders).forEach(order => {
            const source = order.source || 'unknown';
            sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;
        });
        console.log('🔥 Test result - Orders by source:', sourceBreakdown);
        
        // Show sample orders
        const sampleOrders = Object.entries(orders).slice(0, 3);
        console.log('🔥 Test result - Sample orders:', sampleOrders.map(([id, order]) => ({
            orderId: id,
            source: order.source,
            platform: order.platform,
            productName: order.productName
        })));
        
        // Test filtering logic
        const warehouseOrders = Object.values(orders).filter(order => order.source === 'order_management');
        const tmdtOrders = Object.values(orders).filter(order => order.source === 'tmdt_sales');
        
        console.log('🔥 Test result - Warehouse orders (should be 0):', warehouseOrders.length);
        console.log('🔥 Test result - TMĐT orders:', tmdtOrders.length);
        
        // Force load data
        loadTmdtProfitData();
        updateTmdtOrdersDetailTable('all');
        
        return orders;
    } catch (error) {
        console.error('🔥 Test failed:', error);
        return {};
    }
}

// Export test function
window.testTmdtDataLoadingAndFiltering = testTmdtDataLoadingAndFiltering;

// Test function for custom fees initialization
function testCustomFeesInitialization() {
    console.log('🧪 Testing custom fees initialization...');
    console.log('🧪 customFees type:', typeof customFees);
    console.log('🧪 customFees isArray:', Array.isArray(customFees));
    console.log('🧪 customFees value:', customFees);
    console.log('🧪 customFeeCounter type:', typeof customFeeCounter);
    console.log('🧪 customFeeCounter value:', customFeeCounter);
    
    // Test initialization
    try {
        initializeCustomFees();
        console.log('✅ initializeCustomFees() executed successfully');
        console.log('🧪 After init - customFees:', customFees);
        console.log('🧪 After init - customFeeCounter:', customFeeCounter);
    } catch (error) {
        console.error('❌ Error in initializeCustomFees():', error);
    }
}

// Export test function
window.testCustomFeesInitialization = testCustomFeesInitialization;