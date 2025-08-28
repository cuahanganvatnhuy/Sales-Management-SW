// Excel Order Processor for TMDT Orders
// Handles Excel file upload, parsing, and order creation

let excelData = [];
let processedOrders = [];

// Initialize Excel upload functionality
function initializeExcelUpload() {
    const dropArea = document.getElementById('excelDropAreaCompact');
    const fileInput = document.getElementById('excelFileInputCompact');
    const uploadLink = document.getElementById('excelUploadLinkCompact');
    
    if (!dropArea || !fileInput || !uploadLink) {
        console.error('Excel upload elements not found');
        return;
    }
    

    // Click to upload
    uploadLink.addEventListener('click', (e) => {
        e.preventDefault();
        fileInput.click();
    });

    dropArea.addEventListener('click', () => {
        fileInput.click();
    });

    // Drag and drop
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('dragover');
    });

    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('dragover');
    });

    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleExcelFile(files[0]);
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleExcelFile(e.target.files[0]);
            // Clear the input to allow re-uploading the same file
            e.target.value = '';
        }
    });
}

// Handle Excel file upload and processing
async function handleExcelFile(file) {
    if (!file) return;

    // Clear previous data first
    excelData = [];
    processedOrders = [];
    
    // Hide previous preview
    const previewContainer = document.getElementById('excelPreviewContainer');
    if (previewContainer) {
        previewContainer.style.display = 'none';
    }

    // Validate platform selection first
    if (!validatePlatformSelection()) {
        return;
    }

    // Validate file type
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
        showNotification('Vui lòng chọn file Excel (.xlsx hoặc .xls)', 'error');
        return;
    }

    // Show progress
    showExcelProgress(true, 'Đang đọc file Excel...');

    try {
        // Load SheetJS library if not already loaded
        if (typeof XLSX === 'undefined') {
            await loadSheetJS();
        }

        // Read file
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Get first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length === 0) {
            throw new Error('File Excel trống hoặc không có dữ liệu');
        }

        // Process Excel data
        await processExcelData(jsonData);

    } catch (error) {
        console.error('Error processing Excel file:', error);
        showNotification(`Lỗi xử lý file Excel: ${error.message}`, 'error');
        showExcelProgress(false);
    }
}

// Load SheetJS library dynamically
function loadSheetJS() {
    return new Promise((resolve, reject) => {
        if (typeof XLSX !== 'undefined') {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.onload = () => {
            console.log('SheetJS loaded successfully');
            resolve();
        };
        script.onerror = () => {
            reject(new Error('Failed to load SheetJS library'));
        };
        document.head.appendChild(script);
    });
}

// Process Excel data and match with products
async function processExcelData(jsonData) {
    showExcelProgress(true, 'Đang xử lý dữ liệu...');

    try {
        // Find header row and column mapping
        const headerMapping = findExcelHeaders(jsonData);
        
        if (!headerMapping) {
            throw new Error('Không tìm thấy các cột bắt buộc trong file Excel. Cần có: Order ID, SKU ID hoặc Seller SKU, Product Name, Quantity');
        }

        // Get products from database for matching
        const products = await getProductsFromDatabase();
        
        // Process data rows
        const processedData = [];
        let validCount = 0;
        let errorCount = 0;

        for (let i = headerMapping.headerRowIndex + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;

            const orderData = extractOrderDataFromRow(row, headerMapping);
            
            if (orderData) {
                // Match with existing products
                const matchedProduct = matchProductBySKU(orderData, products);
                
                if (!matchedProduct) {
                    console.log('DEBUG: No match found for SKU:', orderData.sku, '- Skipping this product');
                    continue;
                }
                
                orderData.matchedProduct = matchedProduct;
                orderData.status = 'valid';
                orderData.errorMessage = '';
                
                // Use product name from database instead of Excel
                orderData.productName = matchedProduct.name;
                orderData.productId = matchedProduct.id;
                orderData.price = matchedProduct.price;
                orderData.unit = matchedProduct.unit || 'cái';
                
                processedData.push(orderData);
                
                validCount++;
            }
        }

        excelData = processedData;
        
        // Show preview
        displayExcelPreview(processedData, validCount, errorCount);
        showExcelProgress(false);

    } catch (error) {
        console.error('Error processing Excel data:', error);
        showNotification(`Lỗi xử lý dữ liệu: ${error.message}`, 'error');
        showExcelProgress(false);
    }
}

// Find Excel headers and their positions
function findExcelHeaders(jsonData) {
    const requiredColumns = ['order id', 'sku id', 'seller sku', 'product name', 'quantity'];
    
    console.log('DEBUG: Excel data structure:', jsonData.slice(0, 3)); // Debug first 3 rows
    
    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
        const row = jsonData[i];
        if (!row) continue;
        
        console.log(`DEBUG: Row ${i}:`, row); // Debug each row
        
        const headerMap = {};
        let foundColumns = 0;
        
        row.forEach((cell, index) => {
            if (!cell) return;
            
            const cellText = cell.toString().toLowerCase().trim();
            console.log(`DEBUG: Cell ${index}: "${cellText}"`); // Debug each cell
            
            // Map column names - exact matching for TikTok format
            if (cellText === 'order id') {
                headerMap.orderId = index;
                foundColumns++;
                console.log(`DEBUG: Found Order ID at column ${index}`);
            } else if (cellText === 'sku id') {
                headerMap.skuId = index;
                foundColumns++;
                console.log(`DEBUG: Found SKU ID at column ${index}`);
            } else if (cellText === 'seller sku') {
                headerMap.sellerSku = index;
                foundColumns++;
                console.log(`DEBUG: Found Seller SKU at column ${index}`);
            } else if (cellText === 'product name') {
                headerMap.productName = index;
                foundColumns++;
                console.log(`DEBUG: Found Product Name at column ${index}`);
            } else if (cellText === 'quantity') {
                headerMap.quantity = index;
                foundColumns++;
                console.log(`DEBUG: Found Quantity at column ${index}`);
            }
        });
        
        // Need at least Order ID, SKU (either SKU ID or Seller SKU), Product Name, and Quantity
        if (headerMap.orderId !== undefined && 
            (headerMap.skuId !== undefined || headerMap.sellerSku !== undefined) &&
            headerMap.productName !== undefined && 
            headerMap.quantity !== undefined) {
            
            headerMap.headerRowIndex = i;
            return headerMap;
        }
    }
    
    return null;
}

// Extract order data from Excel row
function extractOrderDataFromRow(row, headerMapping) {
    try {
        const orderId = row[headerMapping.orderId]?.toString().trim();
        const skuId = headerMapping.skuId !== undefined ? row[headerMapping.skuId]?.toString().trim() : '';
        const sellerSku = headerMapping.sellerSku !== undefined ? row[headerMapping.sellerSku]?.toString().trim() : '';
        const productName = row[headerMapping.productName]?.toString().trim();
        const quantity = parseFloat(row[headerMapping.quantity]) || 0;
        
        if (!orderId || (!skuId && !sellerSku) || !productName || quantity <= 0) {
            return null;
        }
        
        return {
            orderId,
            skuId,
            sellerSku,
            productName,
            quantity,
            sku: sellerSku || skuId // Use Seller SKU first, fallback to SKU ID
        };
    } catch (error) {
        console.error('Error extracting row data:', error);
        return null;
    }
}

// Get products from database
async function getProductsFromDatabase() {
    return new Promise((resolve) => {
        if (typeof database === 'undefined') {
            console.warn('Database not available, using empty products list');
            resolve([]);
            return;
        }
        
        database.ref('products').once('value')
            .then(snapshot => {
                const products = [];
                if (snapshot.exists()) {
                    snapshot.forEach(childSnapshot => {
                        const product = childSnapshot.val();
                        product.id = childSnapshot.key;
                        products.push(product);
                    });
                }
                resolve(products);
            })
            .catch(error => {
                console.error('Error fetching products:', error);
                resolve([]);
            });
    });
}

// Match product by SKU
function matchProductBySKU(orderData, products) {
    console.log('DEBUG: Matching SKU:', orderData);
    console.log('DEBUG: Available products:', products.map(p => ({id: p.id, name: p.name, sku: p.sku})));
    
    // Get SKU from either sellerSku or skuId
    const sku = (orderData.sellerSku || orderData.skuId || orderData.sku || '').toLowerCase().trim();
    
    if (!sku) {
        console.log('DEBUG: No SKU found in order data');
        return null;
    }
    
    console.log('DEBUG: Looking for SKU:', sku);
    
    // Try exact match first
    let match = products.find(product => 
        product.sku && product.sku.toLowerCase().trim() === sku
    );
    
    if (match) {
        console.log('DEBUG: Found exact match:', match);
        return match;
    }
    
    // Try partial match if no exact match
    match = products.find(product => 
        product.sku && (
            product.sku.toLowerCase().includes(sku) ||
            sku.includes(product.sku.toLowerCase())
        )
    );
    
    if (match) {
        console.log('DEBUG: Found partial match:', match);
        return match;
    }
    
    // Try matching by product name
    const productName = (orderData.productName || '').toLowerCase().trim();
    if (productName) {
        match = products.find(product => 
            product.name && (
                product.name.toLowerCase().includes(productName) ||
                productName.includes(product.name.toLowerCase())
            )
        );
        
        if (match) {
            console.log('DEBUG: Found name match:', match);
            return match;
        }
    }
    
    console.log('DEBUG: No match found for SKU:', sku, '- Skipping this product');
    return null;
}

// Display Excel preview - now just creates order forms directly
function displayExcelPreview(data, validCount, errorCount) {
    // Create order forms for valid orders only (skip preview)
    const validOrders = data.filter(order => order.status === 'valid');
    createOrderFormsFromExcel(validOrders);
}

// Create order forms from Excel data - group by Order ID
function createOrderFormsFromExcel(validOrders) {
    console.log('Creating order forms from Excel data:', validOrders);
    
    // Group products by Order ID
    const orderGroups = groupProductsByOrderId(validOrders);
    console.log('Grouped orders:', orderGroups);
    
    // Set the order count to match number of unique orders
    const orderCountInput = document.getElementById('orderCount');
    if (orderCountInput) {
        orderCountInput.value = orderGroups.length;
    }
    
    // Generate manual order forms
    generateOrderForms();
    
    // Wait a bit for forms to be created, then fill them with Excel data
    setTimeout(() => {
        fillFormsWithExcelData(orderGroups);
    }, 500);
    
    console.log('Excel data will be filled into manual order forms');
}

// Group products by Order ID
function groupProductsByOrderId(validOrders) {
    const orderGroups = {};
    
    validOrders.forEach(order => {
        const orderId = order.orderId || order.orderNumber || 'DEFAULT_ORDER';
        
        if (!orderGroups[orderId]) {
            orderGroups[orderId] = {
                orderId: orderId,
                products: [],
                totalAmount: 0
            };
        }
        
        orderGroups[orderId].products.push(order);
        orderGroups[orderId].totalAmount += (order.quantity || 1) * (order.price || 0);
    });
    
    // Convert to array format
    return Object.values(orderGroups);
}

function fillFormsWithExcelData(orderGroups) {
    console.log('Filling forms with Excel data (grouped):', orderGroups);
    console.log('productsData available:', !!productsData, Object.keys(productsData || {}).length);
    
    orderGroups.forEach((orderGroup, index) => {
        const orderNumber = index + 1;
        const firstProduct = orderGroup.products[0]; // Use first product for main form
        
        // Get product name from database
        const product = productsData[firstProduct.productId];
        const productName = product ? product.name : `Sản phẩm SKU: ${firstProduct.sku}`;
        const productPrice = product ? product.price : firstProduct.price;
        
        console.log(`Filling order ${orderNumber}:`, {
            orderId: orderGroup.orderId,
            productsCount: orderGroup.products.length,
            firstProduct: {
                sku: firstProduct.sku,
                productId: firstProduct.productId,
                productName: productName,
                quantity: firstProduct.quantity,
                price: productPrice
            },
            totalAmount: orderGroup.totalAmount
        });
        
        // Fill all fields directly without relying on dropdown events
        setTimeout(() => {
            // 0. Fill Order ID (mã đơn hàng)
            const orderIdDisplay = document.querySelector(`#order-${orderNumber} .order-header h5`);
            if (orderIdDisplay) {
                orderIdDisplay.textContent = `Đơn Hàng ${orderNumber} - Mã: ${orderGroup.orderId}`;
                console.log(`✓ Order ID displayed: ${orderGroup.orderId}`);
            }
            
            // 1. Fill product dropdown - first product
            const productSelect = document.getElementById(`product_${orderNumber}`);
            if (productSelect) {
                productSelect.innerHTML = '';
                
                const productOption = document.createElement('option');
                productOption.value = firstProduct.productId;
                productOption.textContent = productName;
                productOption.selected = true;
                productSelect.appendChild(productOption);
                
                productSelect.value = firstProduct.productId;
                productSelect.dispatchEvent(new Event('change', { bubbles: true }));
                console.log(`✓ Product filled: ${productName} (ID: ${firstProduct.productId})`);
            }
            
            // 2. Fill SKU
            const skuInput = document.getElementById(`sku_${orderNumber}`);
            if (skuInput) {
                skuInput.value = firstProduct.sku;
                console.log(`✓ SKU filled: ${firstProduct.sku}`);
            }
            
            // 3. Fill quantity - sum all products in this order
            const totalQuantity = orderGroup.products.reduce((sum, prod) => sum + (prod.quantity || 1), 0);
            const quantityInput = document.getElementById(`quantity_${orderNumber}`);
            if (quantityInput) {
                quantityInput.value = totalQuantity;
                console.log(`✓ Total quantity filled: ${totalQuantity} (${orderGroup.products.length} products)`);
            }
            
            // 4. Fill price - average price or first product price
            const priceInput = document.getElementById(`price_${orderNumber}`);
            if (priceInput) {
                priceInput.value = productPrice;
                console.log(`✓ Price filled: ${productPrice}`);
            }
            
            // 5. Fill total - use calculated total from all products
            const totalInput = document.getElementById(`total_${orderNumber}`);
            if (totalInput) {
                totalInput.value = orderGroup.totalAmount;
                console.log(`✓ Total amount filled: ${orderGroup.totalAmount}`);
            }
            
            // 6. Add note about multiple products
            if (orderGroup.products.length > 1) {
                const noteArea = document.querySelector(`#order-${orderNumber} .additional-info`);
                if (noteArea) {
                    const productList = orderGroup.products.map(p => `${p.sku} (x${p.quantity})`).join(', ');
                    noteArea.innerHTML = `<small><strong>Nhiều sản phẩm:</strong> ${productList}</small>`;
                    console.log(`✓ Multi-product note added: ${productList}`);
                }
            }
            
            // 7. Update overall total
            if (window.updateOrderTotal) {
                updateOrderTotal();
            }
            
        }, orderNumber * 100); // Stagger each order by 100ms
    });
    
    console.log('Excel data filled into manual forms successfully');
}

// Calculate Excel order total
function calculateExcelOrderTotal(orderNumber) {
    const quantityInput = document.getElementById(`quantity_${orderNumber}`);
    const priceInput = document.getElementById(`price_${orderNumber}`);
    const totalInput = document.getElementById(`total_${orderNumber}`);
    
    if (quantityInput && priceInput && totalInput) {
        const quantity = parseFloat(quantityInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;
        const total = quantity * price;
        
        totalInput.value = total.toLocaleString('vi-VN') + ' VNĐ';
        
        // Update processed orders data
        const orderIndex = orderNumber - 1;
        if (processedOrders[orderIndex]) {
            processedOrders[orderIndex].quantity = quantity;
            processedOrders[orderIndex].price = price;
            processedOrders[orderIndex].total = total;
        }
    }
}

// Get current Excel orders from form inputs
function getCurrentExcelOrders() {
    console.log('DEBUG: getCurrentExcelOrders called');
    const orders = [];
    const orderForms = document.querySelectorAll('.order-form-item');
    console.log('DEBUG: Found order forms:', orderForms.length);
    
    orderForms.forEach((form, index) => {
        const orderNumber = index + 1;
        console.log(`DEBUG: Processing form ${orderNumber}`);
        
        const productSelect = document.getElementById(`product_${orderNumber}`);
        const quantityInput = document.getElementById(`quantity_${orderNumber}`);
        const priceInput = document.getElementById(`price_${orderNumber}`);
        const skuInput = form.querySelector(`input[name="sku_${orderNumber}"]`);
        
        console.log(`DEBUG: Form ${orderNumber} elements:`, {
            productSelect: productSelect ? productSelect.value : 'not found',
            quantityInput: quantityInput ? quantityInput.value : 'not found',
            priceInput: priceInput ? priceInput.value : 'not found',
            skuInput: skuInput ? skuInput.value : 'not found'
        });
        
        if (productSelect && quantityInput && priceInput && skuInput) {
            const quantity = parseFloat(quantityInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            
            console.log(`DEBUG: Form ${orderNumber} values:`, { quantity, price, productId: productSelect.value });
            
            if (quantity > 0 && price > 0 && productSelect.value) {
                // Get original order data
                const originalOrder = processedOrders[index];
                
                const orderData = {
                    orderId: originalOrder ? originalOrder.orderId : `EXCEL_${Date.now()}_${index}`,
                    productId: productSelect.value,
                    productName: productSelect.options[productSelect.selectedIndex].text,
                    sku: skuInput.value,
                    quantity: quantity,
                    price: price,
                    total: quantity * price,
                    unit: originalOrder ? originalOrder.unit : 'cái',
                    isValid: true
                };
                
                console.log(`DEBUG: Adding order ${orderNumber}:`, orderData);
                orders.push(orderData);
            } else {
                console.log(`DEBUG: Skipping form ${orderNumber} - invalid values`);
            }
        } else {
            console.log(`DEBUG: Skipping form ${orderNumber} - missing elements`);
        }
    });
    
    console.log('DEBUG: Final orders array:', orders);
    return orders;
}

// Delete Excel order form
function deleteExcelOrderForm(orderNumber) {
    const orderForm = document.getElementById(`orderForm_${orderNumber}`);
    if (orderForm) {
        orderForm.remove();
        
        // Remove from processed orders
        const orderIndex = orderNumber - 1;
        if (processedOrders[orderIndex]) {
            processedOrders.splice(orderIndex, 1);
        }
        
        // Update remaining order numbers
        updateExcelOrderNumbers();
    }
}

// Update Excel order numbers after deletion
function updateExcelOrderNumbers() {
    const orderForms = document.querySelectorAll('.order-form-item');
    orderForms.forEach((form, index) => {
        const newOrderNumber = index + 1;
        const oldId = form.id;
        
        // Update form ID
        form.id = `orderForm_${newOrderNumber}`;
        
        // Update title
        const title = form.querySelector('.order-form-title');
        if (title) {
            const titleText = title.innerHTML;
            title.innerHTML = titleText.replace(/Đơn Hàng \d+/, `Đơn Hàng ${newOrderNumber}`);
        }
        
        // Update delete button onclick
        const deleteBtn = form.querySelector('.delete-order-btn');
        if (deleteBtn) {
            deleteBtn.setAttribute('onclick', `deleteExcelOrderForm(${newOrderNumber})`);
        }
        
        // Update all input IDs and names
        const inputs = form.querySelectorAll('input, select');
        inputs.forEach(input => {
            const oldName = input.name || input.id;
            if (oldName) {
                const newName = oldName.replace(/_\d+$/, `_${newOrderNumber}`);
                input.name = newName;
                input.id = newName;
            }
        });
        
        // Update labels
        const labels = form.querySelectorAll('label');
        labels.forEach(label => {
            const forAttr = label.getAttribute('for');
            if (forAttr) {
                const newFor = forAttr.replace(/_\d+$/, `_${newOrderNumber}`);
                label.setAttribute('for', newFor);
            }
        });
        
        // Update oninput handlers
        const quantityInput = form.querySelector(`input[name="quantity_${newOrderNumber}"]`);
        const priceInput = form.querySelector(`input[name="price_${newOrderNumber}"]`);
        if (quantityInput) {
            quantityInput.setAttribute('oninput', `calculateExcelOrderTotal(${newOrderNumber})`);
        }
        if (priceInput) {
            priceInput.setAttribute('oninput', `calculateExcelOrderTotal(${newOrderNumber})`);
        }
    });
}

// Excel orders will use the existing manual order creation system

// Show/hide Excel progress
function showExcelProgress(show, message = '') {
    const progressDiv = document.getElementById('excelUploadProgress');
    const progressText = document.getElementById('excelProgressText');
    
    if (!progressDiv) return;
    
    if (show) {
        progressDiv.style.display = 'flex';
        if (progressText && message) {
            progressText.textContent = message;
        }
    } else {
        progressDiv.style.display = 'none';
    }
}

// Get processed orders for form submission
function getProcessedExcelOrders() {
return processedOrders;
}

// Get selected platform information
function getSelectedPlatform() {
const platformSelect = document.getElementById('ecommercePlatform');
const otherPlatformName = document.getElementById('otherPlatformName');

if (!platformSelect || !platformSelect.value) {
    return null;
}

const platform = platformSelect.value;
let platformName = platformSelect.options[platformSelect.selectedIndex].text;

if (platform === 'other') {
    if (!otherPlatformName || !otherPlatformName.value.trim()) {
        return null;
    }
    platformName = otherPlatformName.value.trim();
}

return {
    platform: platform,
    platformName: platformName
};
}

// Validate platform selection
function validatePlatformSelection() {
    const platformInfo = getSelectedPlatform();
    if (!platformInfo) {
        alert('Vui lòng chọn sàn TMĐT trước khi upload file Excel!');
        return false;
    }

    if (platformInfo.platform === 'other' && !platformInfo.platformName.trim()) {
        alert('Vui lòng nhập tên sàn TMĐT khác!');
        return false;
    }
    
    return true;
}

// Get validated Excel orders for order creation
function getValidatedExcelOrders() {
    return processedOrders.filter(order => order.isValid);
}

// Export functions
window.initializeExcelUpload = initializeExcelUpload;
window.getProcessedExcelOrders = getProcessedExcelOrders;
window.getValidatedExcelOrders = getValidatedExcelOrders;
window.getCurrentExcelOrders = getCurrentExcelOrders;
