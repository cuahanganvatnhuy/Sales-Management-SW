// Packaging Cost Configuration Management
// Global variables
let packagingConfig = {
    cold: [],
    dry: [],
    liquid: []
};
let currentProductType = 'cold';
let editingRangeId = null;

// Initialize packaging configuration
async function initializePackagingConfig() {
    try {
        await loadPackagingConfig();
        displayWeightRanges(currentProductType);
    } catch (error) {
        console.error('Error initializing packaging config:', error);
        displayNotification('Lỗi khi tải cấu hình chi phí thùng', 'error');
    }
}

// Load packaging configuration from Firebase
async function loadPackagingConfig() {
    try {
        const snapshot = await database.ref('packagingConfig').once('value');
        const data = snapshot.val();
        
        if (data) {
            packagingConfig = {
                cold: data.cold || [],
                dry: data.dry || [],
                liquid: data.liquid || []
            };
        } else {
            // Initialize with empty configuration
            packagingConfig = {
                cold: [],
                dry: [],
                liquid: []
            };
        }
    } catch (error) {
        console.error('Error loading packaging config:', error);
        throw error;
    }
}

// Save packaging configuration to Firebase
async function savePackagingConfig() {
    console.log('=== savePackagingConfig CALLED ===');
    console.log('Data to save:', JSON.stringify(packagingConfig, null, 2));
    
    try {
        await database.ref('packagingConfig').set(packagingConfig);
        console.log('✅ Firebase save successful');
        displayNotification('Đã lưu cấu hình chi phí thùng thành công', 'success');
        return true;
    } catch (error) {
        console.error('❌ Error saving packaging config:', error);
        displayNotification('Lỗi khi lưu cấu hình chi phí thùng', 'error');
        return false;
    }
}

// Switch between product types
function switchProductType(productType) {
    // Update active tab
    document.querySelectorAll('.product-type-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-type="${productType}"]`).classList.add('active');
    
    // Hide all sections
    document.querySelectorAll('.packaging-config-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(`${productType}-config`).classList.add('active');
    
    currentProductType = productType;
    displayWeightRanges(productType);
}

// Display weight ranges for a product type
function displayWeightRanges(productType) {
    const container = document.getElementById(`${productType}-ranges`);
    const ranges = packagingConfig[productType] || [];
    
    if (ranges.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h4>Chưa có cấu hình chi phí thùng</h4>
                <p>Nhấn "Thêm Khoảng Khối Lượng" để bắt đầu cấu hình</p>
            </div>
        `;
        return;
    }
    
    // Sort ranges by min weight
    ranges.sort((a, b) => a.minWeight - b.minWeight);
    
    container.innerHTML = ranges.map(range => `
        <div class="weight-range-card" data-range-id="${range.id}">
            <div class="range-header">
                <div class="range-title">${range.minWeight}kg - ${range.maxWeight}kg</div>
                <div class="range-actions">
                    <button type="button" class="btn-edit" onclick="editWeightRange('${range.id}')" title="Chỉnh sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn-delete" onclick="deleteWeightRange('${range.id}')" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="range-details">
                <div class="range-detail">
                    <div class="range-detail-label">Khối lượng tối thiểu</div>
                    <div class="range-detail-value">${range.minWeight} kg</div>
                </div>
                <div class="range-detail">
                    <div class="range-detail-label">Khối lượng tối đa</div>
                    <div class="range-detail-value">${range.maxWeight} kg</div>
                </div>
            </div>
            <div class="range-cost">
                ${formatCurrency(range.cost)}
            </div>
            <div class="range-description">
                <strong>Loại thùng:</strong> ${getPackagingTypeName(range.packagingType)}<br>
                <strong>Mô tả:</strong> ${range.description || 'Không có mô tả'}
            </div>
        </div>
    `).join('');
}

// Get packaging type name
function getPackagingTypeName(type) {
    const types = {
        foam: 'Thùng xốp',
        cardboard: 'Thùng carton',
        plastic: 'Thùng nhựa',
        insulated: 'Thùng cách nhiệt'
    };
    return types[type] || type;
}

// Add new weight range
function addWeightRange(productType) {
    currentProductType = productType;
    editingRangeId = null;
    
    // Clear form
    document.getElementById('weightRangeForm').reset();
    document.getElementById('modalTitle').textContent = 'Thêm Khoảng Khối Lượng';
    
    // Show modal
    document.getElementById('weightRangeModal').style.display = 'block';
}

// Edit weight range
function editWeightRange(rangeId) {
    const range = findRangeById(rangeId);
    if (!range) {
        displayNotification('Không tìm thấy khoảng khối lượng', 'error');
        return;
    }
    
    editingRangeId = rangeId;
    
    // Fill form with existing data
    document.getElementById('minWeight').value = range.minWeight;
    document.getElementById('maxWeight').value = range.maxWeight;
    document.getElementById('packagingCost').value = range.cost;
    document.getElementById('packagingType').value = range.packagingType;
    document.getElementById('description').value = range.description || '';
    
    document.getElementById('modalTitle').textContent = 'Chỉnh Sửa Khoảng Khối Lượng';
    
    // Show modal
    document.getElementById('weightRangeModal').style.display = 'block';
}

// Delete weight range
async function deleteWeightRange(rangeId) {
    if (!confirm('Bạn có chắc chắn muốn xóa khoảng khối lượng này?')) {
        return;
    }
    
    const range = findRangeById(rangeId);
    if (!range) {
        displayNotification('Không tìm thấy khoảng khối lượng', 'error');
        return;
    }
    
    // Find product type and remove range
    for (const productType in packagingConfig) {
        const index = packagingConfig[productType].findIndex(r => r.id === rangeId);
        if (index !== -1) {
            packagingConfig[productType].splice(index, 1);
            
            // Save to Firebase
            await savePackagingConfig();
            
            displayWeightRanges(productType);
            displayNotification('Đã xóa khoảng khối lượng thành công', 'success');
            break;
        }
    }
}

// Find range by ID
function findRangeById(rangeId) {
    for (const productType in packagingConfig) {
        const range = packagingConfig[productType].find(r => r.id === rangeId);
        if (range) {
            return range;
        }
    }
    return null;
}

// Save weight range
async function saveWeightRange() {
    const form = document.getElementById('weightRangeForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const minWeight = parseFloat(document.getElementById('minWeight').value);
    const maxWeight = parseFloat(document.getElementById('maxWeight').value);
    const cost = parseInt(document.getElementById('packagingCost').value);
    const packagingType = document.getElementById('packagingType').value;
    const description = document.getElementById('description').value.trim();
    
    // Validation
    if (minWeight >= maxWeight) {
        displayNotification('Khối lượng tối thiểu phải nhỏ hơn khối lượng tối đa', 'error');
        return;
    }
    
    // Check for overlapping ranges (excluding current editing range)
    const existingRanges = packagingConfig[currentProductType].filter(r => r.id !== editingRangeId);
    const hasOverlap = existingRanges.some(range => {
        return (minWeight >= range.minWeight && minWeight <= range.maxWeight) ||
               (maxWeight >= range.minWeight && maxWeight <= range.maxWeight) ||
               (minWeight <= range.minWeight && maxWeight >= range.maxWeight);
    });
    
    if (hasOverlap) {
        displayNotification('Khoảng khối lượng bị trùng lặp với cấu hình hiện có', 'error');
        return;
    }
    
    const rangeData = {
        minWeight,
        maxWeight,
        cost,
        packagingType,
        description
    };
    
    if (editingRangeId) {
        // Update existing range
        const range = findRangeById(editingRangeId);
        if (range) {
            Object.assign(range, rangeData);
            console.log('=== PACKAGING CONFIG UPDATE ===');
            console.log('Updated range:', range);
            displayNotification('Đã cập nhật khoảng khối lượng thành công', 'success');
        }
    } else {
        // Add new range
        rangeData.id = `${currentProductType}_${Date.now()}`;
        packagingConfig[currentProductType].push(rangeData);
        console.log('=== PACKAGING CONFIG ADD ===');
        console.log('Added new range:', rangeData);
        console.log('Current config for', currentProductType, ':', packagingConfig[currentProductType]);
        displayNotification('Đã thêm khoảng khối lượng thành công', 'success');
    }
    
    // Save to Firebase
    console.log('=== SAVING TO FIREBASE ===');
    console.log('Full packaging config:', packagingConfig);
    await savePackagingConfig();
    console.log('✅ Saved to Firebase successfully');
    
    displayWeightRanges(currentProductType);
    closeWeightRangeModal();
}

// Close weight range modal
function closeWeightRangeModal() {
    document.getElementById('weightRangeModal').style.display = 'none';
    editingRangeId = null;
}

// Reset packaging configuration to default
async function resetPackagingConfig() {
    if (!confirm('Bạn có chắc chắn muốn khôi phục cấu hình mặc định? Tất cả cấu hình hiện tại sẽ bị xóa.')) {
        return;
    }
    
    try {
        // Delete current config
        await database.ref('packagingConfig').remove();
        
        // Reload default config
        await loadPackagingConfig();
        displayWeightRanges(currentProductType);
        
        displayNotification('Đã khôi phục cấu hình mặc định thành công', 'success');
    } catch (error) {
        console.error('Error resetting packaging config:', error);
        displayNotification('Lỗi khi khôi phục cấu hình mặc định', 'error');
    }
}

// Preview packaging cost
function previewPackagingCost() {
    document.getElementById('previewModal').style.display = 'block';
    updatePreview();
}

// Update preview result
function updatePreview() {
    const productType = document.getElementById('previewProductType').value;
    const weight = parseFloat(document.getElementById('previewWeight').value);
    const resultDiv = document.getElementById('previewResult');
    
    if (!weight || weight <= 0) {
        resultDiv.innerHTML = '<p>Vui lòng nhập khối lượng hợp lệ</p>';
        resultDiv.classList.remove('has-result');
        return;
    }
    
    const cost = calculatePackagingCost(productType, weight);
    
    if (cost === null) {
        resultDiv.innerHTML = `
            <p><i class="fas fa-exclamation-triangle"></i></p>
            <p>Không tìm thấy cấu hình phù hợp cho khối lượng ${weight}kg</p>
            <p class="preview-details">Vui lòng thêm cấu hình cho khoảng khối lượng này</p>
        `;
        resultDiv.classList.remove('has-result');
    } else {
        const range = findRangeForWeight(productType, weight);
        resultDiv.innerHTML = `
            <div class="preview-cost">${formatCurrency(cost)}</div>
            <div class="preview-details">
                Loại sản phẩm: ${getProductTypeName(productType)}<br>
                Khối lượng: ${weight}kg<br>
                Khoảng áp dụng: ${range.minWeight}kg - ${range.maxWeight}kg<br>
                Loại thùng: ${getPackagingTypeName(range.packagingType)}
            </div>
        `;
        resultDiv.classList.add('has-result');
    }
}

// Calculate packaging cost for given product type and weight
function calculatePackagingCost(productType, weight) {
    console.log('=== calculatePackagingCost DEBUG ===');
    console.log('Input productType:', productType);
    console.log('Input weight:', weight);
    console.log('Available config keys:', Object.keys(packagingConfig));
    
    // Use the productType directly as it's stored in Firebase
    // No mapping needed since config is stored with English keys
    const mappedType = productType;
    console.log('Mapped type:', mappedType);
    
    const ranges = packagingConfig[mappedType] || [];
    console.log('Found ranges:', ranges);
    
    const applicableRange = ranges.find(range => 
        weight >= range.minWeight && weight <= range.maxWeight
    );
    
    console.log('Applicable range:', applicableRange);
    const cost = applicableRange ? applicableRange.cost : 0;
    console.log('Final packaging cost:', cost);
    
    return cost;
}

// Find range for specific weight
function findRangeForWeight(productType, weight) {
    const ranges = packagingConfig[productType] || [];
    return ranges.find(range => 
        weight >= range.minWeight && weight <= range.maxWeight
    );
}

// Get product type name
function getProductTypeName(type) {
    const types = {
        cold: 'Hàng Lạnh',
        dry: 'Hàng Khô',
        liquid: 'Hàng Nước'
    };
    return types[type] || type;
}

// Close preview modal
function closePreviewModal() {
    document.getElementById('previewModal').style.display = 'none';
}

// Calculate total packaging cost for an order
function calculateOrderPackagingCost(orderItems) {
    if (!orderItems || orderItems.length === 0) {
        return 0;
    }
    
    // Group items by product type
    const groupedItems = {};
    
    orderItems.forEach(item => {
        const productType = item.productType || 'dry'; // Default to dry if not specified
        const weight = parseFloat(item.weight || 0) * parseInt(item.quantity || 1);
        
        if (!groupedItems[productType]) {
            groupedItems[productType] = 0;
        }
        groupedItems[productType] += weight;
    });
    
    // Calculate packaging cost for each group
    let totalPackagingCost = 0;
    
    for (const [productType, totalWeight] of Object.entries(groupedItems)) {
        if (totalWeight > 0) {
            const cost = calculatePackagingCost(productType, totalWeight);
            if (cost !== null) {
                totalPackagingCost += cost;
            }
        }
    }
    
    return totalPackagingCost;
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Show notification
function displayNotification(message, type = 'info') {
    // Use existing notification system if available
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        // Fallback to alert
        alert(message);
    }
}

// Close modals when clicking outside
window.addEventListener('click', function(event) {
    const weightRangeModal = document.getElementById('weightRangeModal');
    const previewModal = document.getElementById('previewModal');
    
    if (event.target === weightRangeModal) {
        closeWeightRangeModal();
    }
    
    if (event.target === previewModal) {
        closePreviewModal();
    }
});

// Clear all packaging configuration data (for testing)
async function clearAllPackagingConfig() {
    try {
        await database.ref('packagingConfig').remove();
        packagingConfig = {
            cold: [],
            dry: [],
            liquid: []
        };
        displayWeightRanges(currentProductType);
        displayNotification('Đã xóa toàn bộ cấu hình chi phí thùng', 'success');
        console.log('All packaging config cleared successfully');
    } catch (error) {
        console.error('Error clearing packaging config:', error);
        displayNotification('Lỗi khi xóa cấu hình', 'error');
    }
}

// Expose functions to global scope for HTML access
window.initializePackagingConfig = initializePackagingConfig;
window.switchProductType = switchProductType;
window.addWeightRange = addWeightRange;
window.editWeightRange = editWeightRange;
window.deleteWeightRange = deleteWeightRange;
window.saveWeightRange = saveWeightRange;
window.cancelWeightRange = cancelWeightRange;
window.openPreviewModal = openPreviewModal;
window.closePreviewModal = closePreviewModal;
window.calculatePreviewCost = calculatePreviewCost;
window.calculatePackagingCost = calculatePackagingCost;
window.calculateOrderPackagingCost = calculateOrderPackagingCost;
window.clearAllPackagingConfig = clearAllPackagingConfig;
window.calculatePackagingCost = calculatePackagingCost;
window.initializePackagingConfig = initializePackagingConfig;