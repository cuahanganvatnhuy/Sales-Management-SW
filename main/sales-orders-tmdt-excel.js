// TMDT Sales Orders Excel Upload Handler
// Handles Excel file upload, parsing, and order creation for TMDT sales orders

let excelOrderData = [];
let processedTmdtOrders = [];

// Initialize Excel upload functionality for TMDT orders
function initializeTmdtExcelUpload() {
    const dropArea = document.getElementById('excelDropAreaCompact');
    const fileInput = document.getElementById('excelFileInputCompact');
    const uploadLink = document.getElementById('excelUploadLinkCompact');
    
    if (!dropArea || !fileInput || !uploadLink) {
        console.error('TMDT Excel upload elements not found');
        return;
    }
    
    console.log('✅ Initializing TMDT Excel upload functionality');

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
            handleTmdtExcelFile(files[0]);
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleTmdtExcelFile(e.target.files[0]);
            // Clear the input to allow re-uploading the same file
            e.target.value = '';
        }
    });
}

// Handle Excel file upload and processing for TMDT orders
async function handleTmdtExcelFile(file) {
    if (!file) return;

    // Clear previous data first
    excelOrderData = [];
    processedTmdtOrders = [];
    
    console.log('🔥 Processing TMDT Excel file:', file.name);

    // Validate platform selection first
    const platformSelect = document.getElementById('ecommercePlatform');
    if (!platformSelect || !platformSelect.value) {
        showNotification('Vui lòng chọn sàn TMĐT trước khi upload file Excel!', 'error');
        return;
    }

    // Validate file type
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
        showNotification('Vui lòng chọn file Excel (.xlsx hoặc .xls)', 'error');
        return;
    }

    // Show progress
    showTmdtExcelProgress(true, 'Đang đọc file Excel...');

    try {
        // Load SheetJS library if not already loaded
        if (typeof XLSX === 'undefined') {
            await loadSheetJSLibrary();
        }

        // Read file
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Get first worksheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
            throw new Error('File Excel không có dữ liệu hoặc chỉ có header');
        }

        // Process Excel data
        showTmdtExcelProgress(true, 'Đang xử lý dữ liệu...');
        await processTmdtExcelData(jsonData, platformSelect.value);
        
        showTmdtExcelProgress(false);
        showNotification(`Đã xử lý thành công ${processedTmdtOrders.length} đơn hàng từ Excel!`, 'success');
        
        // Generate preview forms instead of creating orders automatically
        if (processedTmdtOrders.length > 0) {
            generateSalesOrderFormsFromExcel();
        }

    } catch (error) {
        console.error('❌ Error processing TMDT Excel file:', error);
        showTmdtExcelProgress(false);
        showNotification(`Lỗi xử lý file Excel: ${error.message}`, 'error');
    }
}

// Process Excel data and convert to TMDT orders
async function processTmdtExcelData(jsonData, platform) {
    console.log('🔥 Processing Excel data with', jsonData.length, 'rows');
    
    // Find header row and column mapping (copied from excel-order-processor.js)
    const headerMapping = findTmdtExcelHeaders(jsonData);
    
    if (!headerMapping) {
        throw new Error('Không tìm thấy các cột bắt buộc trong file Excel. Cần có: Order ID, SKU ID hoặc Seller SKU, Product Name, Quantity');
    }
    
    console.log('🔥 Header mapping found:', headerMapping);
    
    // Get selling products from database for matching
    const products = await getTmdtSellingProductsFromDatabase();
    
    // Process each data row
    for (let i = headerMapping.headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        if (!row || row.length === 0) continue;
        
        try {
            const orderData = extractTmdtOrderDataFromRow(row, headerMapping, platform, i + 1);
            if (orderData) {
                // Match with existing selling products
                const matchedProduct = matchTmdtProductBySKU(orderData, products);
                
                if (!matchedProduct) {
                    console.log('DEBUG: No match found for SKU:', orderData.sku, '- Skipping this product');
                    continue;
                }
                
                // Add matched product data with null checks
                orderData.matchedProduct = matchedProduct;
                orderData.productId = matchedProduct.id || '';
                orderData.productName = matchedProduct.name || orderData.productName || orderData.sku || 'Unknown Product';
                
                // Add productType and weight for packaging cost calculation
                orderData.productType = matchedProduct.productType || 'dry';
                orderData.weight = parseFloat(matchedProduct.weight || 0);
                
                console.log('📦 Added packaging data to TMDT Excel order:', {
                    orderId: orderData.orderId,
                    sku: orderData.sku,
                    productType: orderData.productType,
                    weight: orderData.weight
                });
                
                // Price logic: Use system price first, fallback to Excel price if system price not available
                let finalSellingPrice = 0;
                if (matchedProduct.sellingPrice && matchedProduct.sellingPrice > 0) {
                    // Use system selling price (priority 1)
                    finalSellingPrice = matchedProduct.sellingPrice;
                    console.log(`🔥 Using system price: ${finalSellingPrice} (from database)`);
                } else if (orderData.skuSubtotalAfterDiscount > 0) {
                    // Calculate unit price from Excel subtotal (priority 2)
                    finalSellingPrice = orderData.skuSubtotalAfterDiscount / orderData.quantity;
                    console.log(`🔥 Using Excel price: ${finalSellingPrice} (from subtotal: ${orderData.skuSubtotalAfterDiscount}) - system price not available`);
                } else {
                    // No price available from either source
                    finalSellingPrice = 0;
                    console.log(`⚠️ No price available from system or Excel for SKU: ${orderData.sku}`);
                }
                
                orderData.sellingPrice = finalSellingPrice || 0;
                orderData.importPrice = matchedProduct.importPrice || 0;
                orderData.profitPerUnit = (finalSellingPrice || 0) - (matchedProduct.importPrice || 0);
                orderData.totalProfit = orderData.profitPerUnit * orderData.quantity;
                orderData.totalAmount = (finalSellingPrice || 0) * orderData.quantity;
                orderData.status = 'valid';
                
                // Add store information
                const currentStoreId = getCurrentStore();
                if (currentStoreId) {
                    orderData.storeId = currentStoreId;
                    
                    // Try to get store name from various sources
                    let storeName = currentStoreId; // fallback to ID
                    
                    // Try getStoreName function if available
                    if (typeof getStoreName === 'function') {
                        storeName = getStoreName(currentStoreId) || currentStoreId;
                    }
                    // Try from global storesData if available
                    else if (window.storesData && window.storesData[currentStoreId]) {
                        storeName = window.storesData[currentStoreId].name || currentStoreId;
                    }
                    // Try from localStorage current store
                    else {
                        try {
                            const currentStore = JSON.parse(localStorage.getItem('currentStore') || '{}');
                            if (currentStore.id === currentStoreId && currentStore.name) {
                                storeName = currentStore.name;
                            }
                        } catch (e) {
                            console.warn('Could not parse currentStore from localStorage');
                        }
                    }
                    
                    orderData.storeName = storeName;
                }
                
                console.log('🏪 Added store info to Excel order:', {
                    orderId: orderData.orderId,
                    storeId: orderData.storeId,
                    storeName: orderData.storeName
                });
                
                // Ensure all required fields are present
                orderData.sku = orderData.sku || matchedProduct.sku || '';
                orderData.quantity = orderData.quantity || 0;
                
                processedTmdtOrders.push(orderData);
            }
        } catch (error) {
            console.error(`❌ Error processing row ${i + 1}:`, error);
        }
    }
    
    console.log('🔥 Processed TMDT orders:', processedTmdtOrders.length);
}

// Find Excel headers and their positions (copied from excel-order-processor.js)
function findTmdtExcelHeaders(jsonData) {
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
            } else if (cellText === 'sku subtotal after discount') {
                headerMap.skuSubtotalAfterDiscount = index;
                console.log(`DEBUG: Found SKU Subtotal After Discount at column ${index}`);
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

// Detect column indices from Excel headers
function detectTmdtExcelColumns(headers) {
    const columnMap = {};
    
    headers.forEach((header, index) => {
        const headerLower = header.toString().toLowerCase();
        
        // Product name detection
        if (headerLower.includes('product') || headerLower.includes('tên sản phẩm') || 
            headerLower.includes('sản phẩm') || headerLower.includes('name')) {
            columnMap.productName = index;
        }
        
        // SKU detection
        if (headerLower.includes('sku') || headerLower.includes('mã sản phẩm')) {
            columnMap.sku = index;
        }
        
        // Quantity detection
        if (headerLower.includes('quantity') || headerLower.includes('số lượng') || 
            headerLower.includes('sl') || headerLower.includes('qty')) {
            columnMap.quantity = index;
        }
        
        // Order ID detection
        if (headerLower.includes('order') && headerLower.includes('id') || 
            headerLower.includes('mã đơn') || headerLower.includes('order_id')) {
            columnMap.orderId = index;
        }
    });
    
    return columnMap;
}

// Extract order data from Excel row (copied from excel-order-processor.js)
function extractTmdtOrderDataFromRow(row, headerMapping, platform, rowNumber) {
    try {
        const orderId = row[headerMapping.orderId]?.toString().trim();
        const skuId = headerMapping.skuId !== undefined ? row[headerMapping.skuId]?.toString().trim() : '';
        const sellerSku = headerMapping.sellerSku !== undefined ? row[headerMapping.sellerSku]?.toString().trim() : '';
        const productName = row[headerMapping.productName]?.toString().trim();
        const quantity = parseFloat(row[headerMapping.quantity]) || 0;
        
        // Extract SKU Subtotal After Discount if available
        const skuSubtotalAfterDiscount = headerMapping.skuSubtotalAfterDiscount !== undefined ? 
            parseFloat(row[headerMapping.skuSubtotalAfterDiscount]) || 0 : 0;
        
        if (!orderId || (!skuId && !sellerSku) || !productName || quantity <= 0) {
            return null;
        }
        
        return {
            orderId,
            skuId,
            sellerSku,
            productName,
            quantity,
            skuSubtotalAfterDiscount, // Add the discount price from Excel
            sku: sellerSku || skuId, // Use Seller SKU first, fallback to SKU ID
            platform: platform,
            platformName: getPlatformName(platform),
            orderDate: new Date().toISOString().split('T')[0],
            status: 'pending',
            source: 'tmdt_excel',
            orderType: 'ecommerce',
            rowNumber: rowNumber
        };
    } catch (error) {
        console.error('Error extracting row data:', error);
        return null;
    }
}

// Process single Excel row to create order data
async function processTmdtExcelRow(row, columnMap, platform, rowNumber) {
    const productName = row[columnMap.productName] || '';
    const sku = row[columnMap.sku] || '';
    const quantity = parseFloat(row[columnMap.quantity]) || 0;
    const excelOrderId = row[columnMap.orderId] || '';
    
    if (!productName && !sku) {
        console.log(`⚠️ Row ${rowNumber}: No product name or SKU`);
        return null;
    }
    
    if (quantity <= 0) {
        console.log(`⚠️ Row ${rowNumber}: Invalid quantity: ${quantity}`);
        return null;
    }
    
    // Find matching selling product
    const sellingProduct = findMatchingSellingProduct(productName, sku);
    
    if (!sellingProduct) {
        console.log(`⚠️ Row ${rowNumber}: No matching selling product found for ${productName} (${sku})`);
        return null;
    }
    
    // Check stock availability
    const currentStock = sellingProduct.currentStock || sellingProduct.inventory || 0;
    if (currentStock < quantity) {
        console.log(`⚠️ Row ${rowNumber}: Insufficient stock. Available: ${currentStock}, Required: ${quantity}`);
        return null;
    }
    
    // Use Excel Order ID as primary, generate fallback if empty
    const orderId = excelOrderId && excelOrderId.trim() !== '' ? excelOrderId.trim() : generateTmdtOrderId();
    
    console.log('📋 Order ID processing:', {
        excelOrderId: excelOrderId,
        finalOrderId: orderId,
        usingExcelId: !!(excelOrderId && excelOrderId.trim() !== '')
    });
    
    // Calculate prices and profit
    const sellingPrice = sellingProduct.sellingPrice || 0;
    const importPrice = sellingProduct.importPrice || 0;
    const profitPerUnit = sellingPrice - importPrice;
    const totalProfit = profitPerUnit * quantity;
    const totalAmount = sellingPrice * quantity;
    
    return {
        orderId: orderId,
        excelOrderId: excelOrderId,
        productId: sellingProduct.id,
        productName: sellingProduct.productName,
        sku: sellingProduct.sku,
        quantity: quantity,
        sellingPrice: sellingPrice,
        importPrice: importPrice,
        profitPerUnit: profitPerUnit,
        totalProfit: totalProfit,
        totalAmount: totalAmount,
        platform: platform,
        platformName: getPlatformName(platform),
        orderDate: new Date().toISOString().split('T')[0],
        status: 'active',
        source: 'excel',
        orderType: 'tmdt',
        createdAt: new Date().toISOString(),
        rowNumber: rowNumber
    };
}

// Match product by SKU (copied from excel-order-processor.js)
function matchTmdtProductBySKU(orderData, products) {
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

// Get selling products from database (copied from excel-order-processor.js)
async function getTmdtSellingProductsFromDatabase() {
    return new Promise((resolve) => {
        if (typeof database === 'undefined') {
            console.warn('Database not available, using empty products list');
            resolve([]);
            return;
        }
        
        // Get current store ID
        const storeId = getCurrentStore();
        if (!storeId) {
            console.warn('No store ID found, using global sellingProducts');
            database.ref('sellingProducts').once('value')
                .then(snapshot => {
                    const products = [];
                    if (snapshot.exists()) {
                        snapshot.forEach(childSnapshot => {
                            const product = childSnapshot.val();
                            if (product.status === 'active') {
                                product.id = childSnapshot.key;
                                products.push(product);
                            }
                        });
                    }
                    console.log('📦 Loaded global selling products:', products.length);
                    resolve(products);
                })
                .catch(error => {
                    console.error('Error fetching global selling products:', error);
                    resolve([]);
                });
            return;
        }
        
        // Get store-specific selling products
        database.ref(`stores/${storeId}/sellingProducts`).once('value')
            .then(snapshot => {
                const products = [];
                if (snapshot.exists()) {
                    snapshot.forEach(childSnapshot => {
                        const product = childSnapshot.val();
                        if (product.status === 'active') {
                            product.id = childSnapshot.key;
                            products.push(product);
                        }
                    });
                }
                console.log('📦 Loaded store selling products:', products.length, 'for store:', storeId);
                
                // If no products in store, try global sellingProducts as fallback
                if (products.length === 0) {
                    console.log('📦 No products in store, trying global sellingProducts...');
                    return database.ref('sellingProducts').once('value')
                        .then(globalSnapshot => {
                            const globalProducts = [];
                            if (globalSnapshot.exists()) {
                                globalSnapshot.forEach(childSnapshot => {
                                    const product = childSnapshot.val();
                                    if (product.status === 'active') {
                                        product.id = childSnapshot.key;
                                        globalProducts.push(product);
                                    }
                                });
                            }
                            console.log('📦 Loaded global selling products as fallback:', globalProducts.length);
                            console.log('📦 Sample product with packaging data:', globalProducts[0] ? {
                                name: globalProducts[0].name || globalProducts[0].productName,
                                sku: globalProducts[0].sku,
                                productType: globalProducts[0].productType,
                                weight: globalProducts[0].weight
                            } : 'No products found');
                            resolve(globalProducts);
                        });
                }
                
                console.log('📦 Sample product with packaging data:', products[0] ? {
                    name: products[0].name || products[0].productName,
                    sku: products[0].sku,
                    productType: products[0].productType,
                    weight: products[0].weight
                } : 'No products found');
                resolve(products);
            })
            .catch(error => {
                console.error('Error fetching store selling products:', error);
                // Try global as fallback on error
                console.log('📦 Error loading store products, trying global...');
                database.ref('sellingProducts').once('value')
                    .then(globalSnapshot => {
                        const globalProducts = [];
                        if (globalSnapshot.exists()) {
                            globalSnapshot.forEach(childSnapshot => {
                                const product = childSnapshot.val();
                                if (product.status === 'active') {
                                    product.id = childSnapshot.key;
                                    globalProducts.push(product);
                                }
                            });
                        }
                        console.log('📦 Loaded global selling products on error fallback:', globalProducts.length);
                        resolve(globalProducts);
                    })
                    .catch(() => resolve([]));
            });
    });
};

// Get platform display name
function getPlatformName(platform) {
    const platformNames = {
        'shopee': 'Shopee',
        'lazada': 'Lazada',
        'tiktok': 'TikTok Shop',
        'sendo': 'Sendo',
        'tiki': 'Tiki'
    };
    return platformNames[platform] || platform;
}

// Create TMDT orders from processed Excel data
async function createTmdtOrdersFromExcel() {
    if (processedTmdtOrders.length === 0) {
        showNotification('Không có đơn hàng nào để tạo!', 'error');
        return;
    }
    
    console.log('🔥 Creating TMDT orders from Excel:', processedTmdtOrders.length);
    
    try {
        // Save orders to Firebase
        for (const orderData of processedTmdtOrders) {
            // Clean orderData to remove undefined values
            const cleanOrderData = {};
            Object.keys(orderData).forEach(key => {
                if (orderData[key] !== undefined && orderData[key] !== null) {
                    cleanOrderData[key] = orderData[key];
                }
            });
            
            // Ensure required fields have default values
            if (!cleanOrderData.productName) {
                cleanOrderData.productName = cleanOrderData.sku || 'Unknown Product';
            }
            if (!cleanOrderData.orderId) {
                cleanOrderData.orderId = `TMDT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            }
            
            console.log('🔥 Clean order data:', cleanOrderData);
            
            let orderRef;
            
            if (typeof getStoreDataPath === 'function') {
                const salesOrdersPath = getStoreDataPath('salesOrders');
                orderRef = database.ref(salesOrdersPath).push();
            } else {
                orderRef = database.ref('salesOrders').push();
            }
            
            await orderRef.set(cleanOrderData);
            console.log('✅ TMDT order created:', cleanOrderData.orderId);
        }
        
        showNotification(`Đã tạo thành công ${processedTmdtOrders.length} đơn hàng TMĐT từ Excel!`, 'success');
        
        // Reload orders display
        if (typeof loadSalesOrders === 'function') {
            loadSalesOrders();
        }
        
        // Clear processed data
        processedTmdtOrders = [];
        
    } catch (error) {
        console.error('❌ Error creating TMDT orders from Excel:', error);
        showNotification('Có lỗi khi tạo đơn hàng từ Excel!', 'error');
    }
}

// Show/hide Excel upload progress
function showTmdtExcelProgress(show, message = '') {
    const progressDiv = document.getElementById('excelUploadProgress');
    const progressText = document.getElementById('excelProgressText');
    
    if (progressDiv) {
        progressDiv.style.display = show ? 'flex' : 'none';
    }
    
    if (progressText && message) {
        progressText.textContent = message;
    }
}

// Load SheetJS library dynamically
async function loadSheetJSLibrary() {
    return new Promise((resolve, reject) => {
        if (typeof XLSX !== 'undefined') {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        script.onload = () => {
            console.log('✅ SheetJS library loaded');
            resolve();
        };
        script.onerror = () => {
            reject(new Error('Failed to load SheetJS library'));
        };
        document.head.appendChild(script);
    });
}

// Generate sales order forms from Excel data (similar to manual creation)
function generateSalesOrderFormsFromExcel() {
    console.log('🔥 Generating sales order forms from Excel data:', processedTmdtOrders.length);
    
    // Show the sales order forms container
    const salesOrderFormsContainer = document.getElementById('salesOrderFormsContainer');
    if (salesOrderFormsContainer) {
        salesOrderFormsContainer.style.display = 'block';
        
        // Clear existing forms
        salesOrderFormsContainer.innerHTML = '';
        
        // Generate forms for each processed order
        processedTmdtOrders.forEach((orderData, index) => {
            const formHtml = `
                <div class="order-form-card" data-order-index="${index}" style="padding: 17px;">
                    <div class="order-header">
                        <h4><i class="fas fa-shopping-cart"></i> Đơn Hàng Bán ${index + 1}</h4>
                        <button type="button" class="btn btn-danger btn-sm" onclick="removeSalesOrderForm(${index})">
                            <i class="fas fa-trash"></i> Xóa
                        </button>
                    </div>
                    
                    <div class="order-form-content">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Sản Phẩm:</label>
                                <input type="text" value="${orderData.productName}" readonly class="form-control">
                            </div>
                            
                            <div class="form-group">
                                <label>SKU:</label>
                                <input type="text" value="${orderData.sku}" readonly class="form-control">
                            </div>
                            
                            <div class="form-group">
                                <label>Số Lượng:</label>
                                <input type="number" value="${orderData.quantity}" readonly class="form-control">
                            </div>
                            
                            <div class="form-group">
                                <label>Giá Nhập:</label>
                                <input type="text" value="${orderData.importPrice.toLocaleString('vi-VN')} ₫" readonly class="form-control">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label>Giá Bán:</label>
                                <input type="number" value="${orderData.sellingPrice}" 
                                       class="form-control selling-price-input" 
                                       data-order-index="${index}" 
                                       onchange="updateOrderTotal(${index})"
                                       placeholder="Nhập giá bán">
                            </div>
                            
                            <div class="form-group">
                                <label>Lợi Nhuận:</label>
                                <input type="text" id="profit-${index}" value="${orderData.totalProfit.toLocaleString('vi-VN')} ₫" readonly class="form-control profit-display">
                            </div>
                            
                            <div class="form-group" >
                                <label>Tổng Tiền:</label>
                                <input  type="text" id="total-${index}" value="${orderData.totalAmount.toLocaleString('vi-VN')} ₫" readonly class="form-control total-display">
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            salesOrderFormsContainer.insertAdjacentHTML('beforeend', formHtml);
        });
        
        // Update existing create all button to work with Excel data
        const existingCreateButton = document.querySelector('.form-actions button[type="submit"]');
        if (existingCreateButton) {
            existingCreateButton.type = 'button';
            existingCreateButton.onclick = createAllSalesOrdersFromExcel;
        }
    }
}

// Create all sales orders from Excel (called when user clicks the button)
async function createAllSalesOrdersFromExcel() {
    if (processedTmdtOrders.length === 0) {
        showNotification('Không có đơn hàng nào để tạo!', 'error');
        return;
    }
    
    try {
        await createTmdtOrdersFromExcel();
        
        // Clear the forms after successful creation
        const salesOrderFormsContainer = document.getElementById('salesOrderFormsContainer');
        if (salesOrderFormsContainer) {
            salesOrderFormsContainer.innerHTML = '';
            salesOrderFormsContainer.style.display = 'none';
        }
        
    } catch (error) {
        console.error('❌ Error creating all orders:', error);
        showNotification('Có lỗi khi tạo đơn hàng!', 'error');
    }
}

// Update order total when selling price changes
function updateOrderTotal(index) {
    const sellingPriceInput = document.querySelector(`input[data-order-index="${index}"].selling-price-input`);
    const totalElement = document.getElementById(`total-${index}`);
    const profitElement = document.getElementById(`profit-${index}`);
    
    if (sellingPriceInput && totalElement && processedTmdtOrders[index]) {
        const newSellingPrice = parseFloat(sellingPriceInput.value) || 0;
        const quantity = processedTmdtOrders[index].quantity;
        const importPrice = processedTmdtOrders[index].importPrice || 0;
        const newTotal = newSellingPrice * quantity;
        const profitPerUnit = newSellingPrice - importPrice;
        const totalProfit = profitPerUnit * quantity;
        
        // Update the display (now using input elements)
        totalElement.value = newTotal.toLocaleString('vi-VN') + ' ₫';
        if (profitElement) {
            profitElement.value = totalProfit.toLocaleString('vi-VN') + ' ₫';
            profitElement.className = totalProfit >= 0 ? 'form-control profit-display positive' : 'form-control profit-display negative';
        }
        
        // Update the data
        processedTmdtOrders[index].sellingPrice = newSellingPrice;
        processedTmdtOrders[index].totalAmount = newTotal;
        processedTmdtOrders[index].profitPerUnit = profitPerUnit;
        processedTmdtOrders[index].totalProfit = totalProfit;
        
        console.log(`🔥 Updated order ${index + 1}: Price=${newSellingPrice}, Total=${newTotal}, Profit=${totalProfit}`);
    }
}

// Remove individual sales order form
function removeSalesOrderForm(index) {
    // Remove from processedTmdtOrders array
    processedTmdtOrders.splice(index, 1);
    
    // Regenerate forms to update indices and count
    generateSalesOrderFormsFromExcel();
    
    showNotification(`Đã xóa đơn hàng ${index + 1}`, 'success');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ TMDT Excel upload module loaded');
});
