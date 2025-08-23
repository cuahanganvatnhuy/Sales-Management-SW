// TikTok Order Processor - Xử lý đơn hàng TikTok từ file PDF
class TikTokOrderProcessor {
    constructor() {
        this.extractedOrders = [];
        this.matchedProducts = [];
        this.unmatchedProducts = [];
        this.initializeFileUpload();
    }

    // Khởi tạo file upload
    initializeFileUpload() {
        this.createUploadUI();
        this.bindEvents();
    }

    // Tạo giao diện upload
    createUploadUI() {
        // Không tạo UI ở đây nữa vì đã có sẵn trong HTML
        // Chỉ tạo container cho extracted orders
        const targetContainer = document.getElementById('pdfUploadContainer');
        if (!targetContainer) return;
        
        targetContainer.innerHTML = `
            <div class="upload-progress" id="uploadProgress" style="display: none;">
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
                <p id="progressText">Đang xử lý...</p>
            </div>
            
            <div class="extracted-orders" id="extractedOrders" style="display: none;">
                <h4><i class="fas fa-list"></i> Đơn hàng đã trích xuất</h4>
                <div id="extractedOrdersList"></div>
                <div class="upload-actions">
                    <button type="button" class="btn btn-primary" id="confirmExtractedOrders">
                        <i class="fas fa-check"></i> Xác nhận tạo đơn hàng
                    </button>
                    <button type="button" class="btn btn-secondary" id="cancelExtraction">
                        <i class="fas fa-times"></i> Hủy
                    </button>
                </div>
            </div>
        `;
    }

    // Bind events
    bindEvents() {
        // Sử dụng compact UI elements
        const dropArea = document.getElementById('pdfDropAreaCompact');
        const fileInput = document.getElementById('pdfFileInputCompact');
        const uploadLink = document.getElementById('uploadLinkCompact');

        // Click to select file
        uploadLink?.addEventListener('click', () => {
            fileInput?.click();
        });

        // File input change
        fileInput?.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        // Drag and drop
        dropArea?.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropArea.classList.add('drag-over');
        });

        dropArea?.addEventListener('dragleave', () => {
            dropArea.classList.remove('drag-over');
        });

        dropArea?.addEventListener('drop', (e) => {
            e.preventDefault();
            dropArea.classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files);
        });

        // Confirm extracted orders
        document.getElementById('confirmExtractedOrders')?.addEventListener('click', () => {
            this.createOrdersFromExtracted();
        });

        // Cancel extraction
        document.getElementById('cancelExtraction')?.addEventListener('click', () => {
            this.cancelExtraction();
        });
    }

    // Xử lý files được upload
    async handleFiles(files) {
        if (!files || files.length === 0) return;

        this.showProgress(true);
        this.extractedOrders = [];
        this.matchedProducts = [];
        this.unmatchedProducts = [];

        for (let file of files) {
            if (file.type === 'application/pdf') {
                await this.processPDFFile(file);
            } else {
                showNotification('Chỉ hỗ trợ file PDF!', 'warning');
            }
        }

        this.showProgress(false);
        this.displayExtractedOrders();
    }

    // Xử lý file PDF
    async processPDFFile(file) {
        try {
            console.log('Processing PDF file:', file.name);
            this.updateProgress('Kiểm tra thư viện PDF.js...');
            
            // Kiểm tra PDF.js
            if (typeof pdfjsLib === 'undefined') {
                throw new Error('PDF.js không được tải. Vui lòng refresh trang.');
            }
            
            this.updateProgress('Đang đọc file PDF...');
            // Sử dụng PDF.js để đọc file PDF
            const arrayBuffer = await file.arrayBuffer();
            console.log('File converted to ArrayBuffer, size:', arrayBuffer.byteLength);
            
            const loadingTask = pdfjsLib.getDocument(arrayBuffer);
            const pdf = await loadingTask.promise;
            console.log('PDF loaded, pages:', pdf.numPages);
            
            let fullText = '';
            
            // Đọc tất cả các trang
            for (let i = 1; i <= pdf.numPages; i++) {
                this.updateProgress(`Đang đọc trang ${i}/${pdf.numPages}...`);
                console.log(`Reading page ${i}/${pdf.numPages}`);
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
            }
            
            console.log('Extracted text length:', fullText.length);
            console.log('First 200 chars:', fullText.substring(0, 200));

            this.updateProgress('Trích xuất thông tin đơn hàng...');
            // Trích xuất thông tin đơn hàng
            this.extractOrderInfo(fullText, file.name);
            
        } catch (error) {
            console.error('Error processing PDF:', error);
            
            let errorMessage = `Lỗi xử lý file ${file.name}`;
            
            if (error.message.includes('PDF.js')) {
                errorMessage += ': PDF.js không hoạt động. Vui lòng kiểm tra kết nối internet.';
            } else if (error.message.includes('Invalid PDF')) {
                errorMessage += ': File không phải là PDF hợp lệ.';
            } else {
                errorMessage += `: ${error.message}`;
            }
            
            showNotification(errorMessage, 'error');
        }
    }

    // Trích xuất thông tin đơn hàng từ text
    extractOrderInfo(text, fileName) {
        console.log('PDF Text:', text);
        
        // Tìm thông tin sản phẩm
        const productMatches = this.findProductInfo(text);
        
        // Tìm thông tin khách hàng
        const customerInfo = this.findCustomerInfo(text);
        
        // Tìm Order ID
        const orderId = this.findOrderId(text) || `ORDER_${Date.now()}`;
        
        if (productMatches.length > 0) {
            const extractedOrder = {
                fileName: fileName,
                orderId: orderId,
                customer: customerInfo,
                products: productMatches,
                extractedAt: new Date().toISOString()
            };
            
            console.log(`Successfully extracted order ${orderId} with ${productMatches.length} products`);
            this.extractedOrders = [extractedOrder];
            this.matchProductsWithDatabase();
        } else {
            showNotification('Không trích xuất được thông tin sản phẩm nào', 'warning');
        }
    }
    
    // Trích xuất thông tin sản phẩm từ text đơn hàng (table format)
    extractProductInfo(orderText) {
        console.log('Extracting from order text:', orderText.substring(0, 500));
        
        const lines = orderText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        // Tìm header của bảng (Product Name, SKU, Seller SKU, Qty)
        let tableStartIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase();
            if (line.includes('product name') && line.includes('sku') && line.includes('qty')) {
                tableStartIndex = i;
                console.log('Found table header at line:', i, lines[i]);
                break;
            }
        }
        
        if (tableStartIndex === -1) {
            console.warn('No table header found');
            return null;
        }
        
        // Tìm dòng sản phẩm (dòng tiếp theo sau header)
        for (let i = tableStartIndex + 1; i < lines.length && i < tableStartIndex + 10; i++) {
            const line = lines[i];
            
            // Bỏ qua các dòng trống hoặc dòng kẻ ngang
            if (!line || line.match(/^[-\s=_]+$/)) {
                continue;
            }
            
            // Kiểm tra xem có phải là dòng sản phẩm không
            if (this.isProductDataLine(line)) {
                console.log('Found product data line:', line);
                
                const productInfo = this.parseProductTableLine(line);
                if (productInfo) {
                    console.log('Extracted product:', productInfo);
                    return productInfo;
                }
            }
        }
        
        console.warn('No product data found in table');
        return null;
    }
    
    // Kiểm tra xem dòng có phải là dữ liệu sản phẩm không
    isProductDataLine(line) {
        // Dòng sản phẩm thường có tên sản phẩm và số ở cuối
        const hasProductName = line.length > 10;
        const hasNumber = /\d+$/.test(line.trim()); // Kết thúc bằng số (Qty)
        
        return hasProductName && hasNumber;
    }
    
    // Parse dòng dữ liệu sản phẩm từ bảng
    parseProductTableLine(line) {
        // Tách các phần của dòng
        // Format: "Bột phô mai Hàn Quốc hồng 100gr - Túi zip tiện lợi - Ship toàn quốc    Mặc định    1"
        
        // Lấy số lượng ở cuối dòng
        const qtyMatch = line.match(/\s+(\d+)\s*$/);
        const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;
        
        // Lấy phần còn lại làm tên sản phẩm (loại bỏ qty và SKU)
        let productPart = line;
        if (qtyMatch) {
            productPart = line.substring(0, line.lastIndexOf(qtyMatch[0])).trim();
        }
        
        // Loại bỏ SKU (thường là "Mặc định" hoặc các từ cuối)
        const skuPattern = /\s+(Mặc \u0111ịnh|Default|[A-Z0-9_-]+)\s*$/i;
        const skuMatch = productPart.match(skuPattern);
        let sku = 'Mặc định';
        
        if (skuMatch) {
            sku = skuMatch[1].trim();
            productPart = productPart.substring(0, productPart.lastIndexOf(skuMatch[0])).trim();
        }
        
        // Tên sản phẩm là phần còn lại
        let productName = productPart.trim();
        
        // Trích xuất khối lượng từ tên sản phẩm
        const weightPattern = /(\d+(?:\.\d+)?)(gr|g|kg|ml|lít|l)\b/i;
        const weightMatch = productName.match(weightPattern);
        const weight = weightMatch ? `${weightMatch[1]}${weightMatch[2].toLowerCase()}` : null;
        
        // Lấy tên ngắn gọn (4-5 từ đầu)
        const words = productName.split(' ');
        const shortName = words.slice(0, Math.min(5, words.length)).join(' ');
        
        return {
            name: shortName,
            weight: weight,
            quantity: quantity,
            sku: sku,
            fullName: productName
        };
    }
    
    // Tìm số lượng trong các dòng gần vị trí hiện tại
    findQuantityInLines(lines, currentIndex) {
        // Tìm trong 3 dòng trước và sau
        const searchRange = 3;
        const startIndex = Math.max(0, currentIndex - searchRange);
        const endIndex = Math.min(lines.length - 1, currentIndex + searchRange);
        
        for (let i = startIndex; i <= endIndex; i++) {
            const line = lines[i];
            
            // Pattern cho "Qty Total: 1" hoặc "Total: 1 Qty"
            const qtyPattern = /(?:qty|quantity|total)\s*:?\s*(\d+)|\b(\d+)\s*(?:qty|quantity)/i;
            const qtyMatch = line.match(qtyPattern);
            
            if (qtyMatch) {
                const qty = parseInt(qtyMatch[1] || qtyMatch[2]);
                if (qty > 0 && qty <= 100) { // Giới hạn hợp lý
                    console.log(`Found quantity ${qty} in line: ${line}`);
                    return qty;
                }
            }
        }
        
        console.log('No quantity found, defaulting to 1');
        return 1; // Mặc định
    }
    
    // Trích xuất thông tin khách hàng
    extractCustomerInfo(orderText) {
        const customerInfo = {};
        
        // Tìm tên khách hàng
        const nameMatch = orderText.match(/Người nhận\s*:?\s*([^\n]+)/i);
        if (nameMatch) {
            customerInfo.name = nameMatch[1].trim();
        }
        
        // Tìm số điện thoại
        const phoneMatch = orderText.match(/(?:\+84|0)(\d{9,10})/i);
        if (phoneMatch) {
            customerInfo.phone = phoneMatch[0];
        }
        
        return customerInfo;
    }

    // Tìm thông tin sản phẩm
    findProductInfo(text) {
        const products = [];
        
        // Pattern để tìm sản phẩm (dựa trên bill mẫu)
        // Tìm dòng có tên sản phẩm và số lượng
        const lines = text.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Tìm dòng có chứa thông tin sản phẩm
            // Ví dụ: "Bột phô mai Hàn Quốc hồng 100gr - Túi zip tiện lợi - Ship toàn quốc"
            if (this.isProductLine(line)) {
                const productInfo = this.parseProductLine(line);
                
                // Tìm số lượng ở dòng tiếp theo hoặc cùng dòng
                const quantity = this.findQuantity(lines, i);
                
                if (productInfo) {
                    products.push({
                        originalName: line,
                        productName: productInfo.name,
                        weight: productInfo.weight,
                        quantity: quantity || 1,
                        matchedProduct: null,
                        suggestedPrice: null
                    });
                }
            }
        }
        
        return products;
    }

    // Kiểm tra xem dòng có phải là thông tin sản phẩm không
    isProductLine(line) {
        // Các từ khóa thường có trong tên sản phẩm
        const productKeywords = [
            'bột', 'phô mai', 'hàn quốc', 'túi zip', 'ship',
            'gr', 'kg', 'ml', 'lít', 'gói', 'hộp', 'chai'
        ];
        
        const lowerLine = line.toLowerCase();
        
        // Kiểm tra có ít nhất 2 từ khóa sản phẩm
        const keywordCount = productKeywords.filter(keyword => 
            lowerLine.includes(keyword)
        ).length;
        
        return keywordCount >= 2 && line.length > 10;
    }

    // Parse thông tin sản phẩm từ dòng text
    parseProductLine(line) {
        // Trích xuất tên sản phẩm chính và khối lượng
        // Ví dụ: "Bột phô mai Hàn Quốc hồng 100gr - Túi zip tiện lợi"
        
        // Tìm khối lượng (100gr, 500ml, 1kg, etc.)
        const weightMatch = line.match(/(\d+(?:\.\d+)?)(gr|g|kg|ml|lít|l)/i);
        const weight = weightMatch ? `${weightMatch[1]}${weightMatch[2].toLowerCase()}` : null;
        
        // Lấy phần đầu làm tên sản phẩm (trước dấu - hoặc trước khối lượng)
        let productName = line;
        
        if (weightMatch) {
            // Lấy phần trước khối lượng
            productName = line.substring(0, weightMatch.index).trim();
        }
        
        // Loại bỏ các từ không cần thiết
        productName = productName.replace(/\s*-\s*.*$/, '').trim();
        
        // Lấy từ khóa chính (2-3 từ đầu)
        const words = productName.split(' ');
        const mainName = words.slice(0, Math.min(3, words.length)).join(' ');
        
        return {
            name: mainName,
            weight: weight,
            fullName: line
        };
    }

    // Tìm số lượng sản phẩm
    findQuantity(lines, currentIndex) {
        // Tìm trong dòng hiện tại và các dòng gần đó
        for (let i = Math.max(0, currentIndex - 1); i <= Math.min(lines.length - 1, currentIndex + 2); i++) {
            const line = lines[i];
            
            // Tìm pattern "Qty Total: 1" hoặc "Số lượng: 1"
            const qtyMatch = line.match(/(?:qty|quantity|số lượng)\s*:?\s*(\d+)/i);
            if (qtyMatch) {
                return parseInt(qtyMatch[1]);
            }
            
            // Tìm số đơn giản ở cuối dòng
            const numberMatch = line.match(/\b(\d+)\s*$/);  
            if (numberMatch && parseInt(numberMatch[1]) <= 100) { // Giới hạn số lượng hợp lý
                return parseInt(numberMatch[1]);
            }
        }
        
        return 1; // Mặc định là 1
    }

    // Tìm thông tin khách hàng
    findCustomerInfo(text) {
        const customerInfo = {};
        
        // Tìm tên khách hàng
        const nameMatch = text.match(/Người nhận\s*:?\s*([^\n]+)/i);
        if (nameMatch) {
            customerInfo.name = nameMatch[1].trim();
        }
        
        // Tìm địa chỉ
        const addressMatch = text.match(/(?:địa chỉ|address)\s*:?\s*([^\n]+)/i);
        if (addressMatch) {
            customerInfo.address = addressMatch[1].trim();
        }
        
        return customerInfo;
    }

    // Tìm Order ID
    findOrderId(text) {
        const orderIdMatch = text.match(/Order ID\s*:?\s*([A-Z0-9]+)/i);
        return orderIdMatch ? orderIdMatch[1] : null;
    }

    // So sánh sản phẩm với database
    async matchProductsWithDatabase() {
        if (!productsData) {
            showNotification('Chưa load được dữ liệu sản phẩm!', 'warning');
            return;
        }

        this.matchedProducts = [];
        this.unmatchedProducts = [];

        for (let order of this.extractedOrders) {
            // Mỗi order chỉ có 1 sản phẩm
            const matchedProduct = this.findMatchingProduct(order.productName);
            
            if (matchedProduct) {
                order.matchedProduct = matchedProduct;
                order.suggestedPrice = matchedProduct.price;
                this.matchedProducts.push(order);
                console.log(`Matched: ${order.productName} -> ${matchedProduct.name}`);
            } else {
                order.matchedProduct = null;
                order.suggestedPrice = null;
                this.unmatchedProducts.push(order);
                console.log(`Unmatched: ${order.productName}`);
            }
        }
        
        console.log(`Matching results: ${this.matchedProducts.length} matched, ${this.unmatchedProducts.length} unmatched`);
    }

    // Tìm sản phẩm matching trong database
    findMatchingProduct(productName) {
        if (!productsData) return null;
        
        const searchName = productName.toLowerCase();
        
        // Tìm exact match trước
        for (let [id, product] of Object.entries(productsData)) {
            if (product.name.toLowerCase() === searchName) {
                return { id, ...product };
            }
        }
        
        // Tìm partial match
        for (let [id, product] of Object.entries(productsData)) {
            const dbName = product.name.toLowerCase();
            
            // Kiểm tra từ khóa chính
            const searchWords = searchName.split(' ');
            const dbWords = dbName.split(' ');
            
            let matchCount = 0;
            for (let searchWord of searchWords) {
                if (searchWord.length > 2) { // Bỏ qua từ quá ngắn
                    for (let dbWord of dbWords) {
                        if (dbWord.includes(searchWord) || searchWord.includes(dbWord)) {
                            matchCount++;
                            break;
                        }
                    }
                }
            }
            
            // Nếu match >= 60% từ khóa
            if (matchCount / searchWords.length >= 0.6) {
                return { id, ...product };
            }
        }
        
        return null;
    }

    // Hiển thị tiến trình
    showProgress(show, message = 'Đang xử lý...') {
        const progressDiv = document.getElementById('uploadProgress');
        const progressText = document.getElementById('progressText');
        const pdfUploadGroup = document.getElementById('pdfUploadGroup');
        
        if (show) {
            progressDiv.style.display = 'block';
            if (progressText) {
                progressText.textContent = message;
            }
            if (pdfUploadGroup) {
                pdfUploadGroup.style.opacity = '0.6';
            }
        } else {
            progressDiv.style.display = 'none';
            if (pdfUploadGroup) {
                pdfUploadGroup.style.opacity = '1';
            }
        }
    }
    
    // Cập nhật thông báo tiến trình
    updateProgress(message) {
        const progressText = document.getElementById('progressText');
        if (progressText) {
            progressText.textContent = message;
        }
        console.log('Progress:', message);
    }

    // Hiển thị đơn hàng đã trích xuất
    async displayExtractedOrders() {
        if (this.extractedOrders.length === 0) {
            showNotification('Không tìm thấy thông tin đơn hàng trong file PDF!', 'warning');
            return;
        }

        // So sánh với database
        await this.matchProductsWithDatabase();

        const extractedDiv = document.getElementById('extractedOrders');
        const listDiv = document.getElementById('extractedOrdersList');
        
        // Thêm header với bulk actions
        let html = `
            <div class="extracted-orders-header">
                <div class="bulk-selection">
                    <label class="checkbox-container">
                        <input type="checkbox" id="selectAllExtracted" onchange="toggleSelectAllExtracted()">
                        <span class="checkmark"></span>
                        Chọn tất cả
                    </label>
                    <button type="button" class="btn btn-danger btn-sm" id="deleteSelectedExtracted" 
                            onclick="deleteSelectedExtractedOrders()" style="display: none;">
                        <i class="fas fa-trash"></i> Xóa đã chọn
                    </button>
                </div>
                <div class="extraction-stats">
                    <span class="total-count">${this.extractedOrders.length} đơn hàng</span>
                    <span class="selected-count" id="selectedExtractedCount" style="display: none;"></span>
                </div>
            </div>
        `;
        
        for (let orderIndex = 0; orderIndex < this.extractedOrders.length; orderIndex++) {
            const order = this.extractedOrders[orderIndex];
            
            html += `
                <div class="extracted-order-item" data-order-index="${orderIndex}">
                    <div class="order-header">
                        <div class="order-title">
                            <div class="checkbox-container">
                                <input type="checkbox" class="extracted-order-checkbox" 
                                       data-order-index="${orderIndex}" 
                                       onchange="updateExtractedBulkActions()">
                                <span class="checkmark"></span>
                            </div>
                            <h5><i class="fas fa-shopping-cart"></i> Đơn hàng #${order.orderId}</h5>
                        </div>
                        <button class="delete-single-extracted btn-sm" 
                                onclick="deleteSingleExtractedOrder(${orderIndex})">
                            <i class="fas fa-trash"></i> Xóa
                        </button>
                    </div>
                    
                    <div class="order-details">
                        <div class="customer-info">
                            <p><strong>Khách hàng:</strong> ${order.customerInfo?.name || 'Chưa xác định'}</p>
                            <p><strong>SĐT:</strong> ${order.customerInfo?.phone || 'Chưa có'}</p>
                            <p><strong>File:</strong> ${order.fileName}</p>
                        </div>
                        
                        <div class="products-list">
                            <div class="product-item">
                                <div class="product-info">
                                    <h6>${order.productName} ${order.weight ? `(${order.weight})` : ''}</h6>
                                    <p><strong>Số lượng:</strong> ${order.quantity}</p>
                                    <p><strong>SKU:</strong> ${order.sku || 'N/A'}</p>
                                    <p class="original-name">Tên gốc: ${order.fullName || order.productName}</p>
                                </div>
                                
                                <div class="match-info">
                                    ${order.matchedProduct ? `
                                        <div class="matched-product">
                                            <i class="fas fa-check-circle text-success"></i>
                                            <span class="text-success">Tìm thấy: <strong>${order.matchedProduct.name}</strong></span>
                                            <br>
                                            <span class="price text-primary">Giá: ${order.matchedProduct.price?.toLocaleString() || 'N/A'} VNĐ/kg</span>
                                        </div>
                                    ` : `
                                        <div class="unmatched-product">
                                            <i class="fas fa-exclamation-triangle text-warning"></i>
                                            <span class="text-warning">Không tìm thấy trong DB</span>
                                            <br>
                                            <input type="number" class="form-control price-input mt-2" 
                                                   placeholder="Nhập giá (VNĐ/kg)" 
                                                   data-order-index="${orderIndex}"
                                                   style="max-width: 200px;">
                                        </div>
                                    `}
                                </div>
                            </div>
                        </div>`;
            
            html += `
                    </div>
                </div>
            `;
        }
        
        listDiv.innerHTML = html;
        extractedDiv.style.display = 'block';
        
        showNotification(`Đã trích xuất ${this.extractedOrders.length} đơn hàng từ PDF! Vui lòng kiểm tra và xác nhận.`, 'info');
    }

    // Tạo đơn hàng từ thông tin đã trích xuất
    async createOrdersFromExtracted() {
        try {
            showLoading(true);
            
            // Lấy giá cho sản phẩm chưa match
            this.collectUnmatchedPrices();
            
            // Tạo đơn hàng
            const orders = [];
            const orderDate = document.getElementById('orderDate')?.value || new Date().toISOString().split('T')[0];
            
            for (let extractedOrder of this.extractedOrders) {
                for (let product of extractedOrder.products) {
                    if (product.matchedProduct || product.manualPrice) {
                        const price = product.suggestedPrice || product.manualPrice;
                        const total = price * product.quantity;
                        
                        orders.push({
                            date: orderDate,
                            productId: product.matchedProduct?.id || `manual_${Date.now()}`,
                            productName: product.matchedProduct?.name || product.productName,
                            sku: product.matchedProduct?.sku || product.sku || 'N/A',
                            quantity: product.quantity,
                            price: price,
                            total: total,
                            source: 'tiktok_pdf',
                            originalOrderId: extractedOrder.orderId,
                            customerName: extractedOrder.customer.name,
                            fileName: extractedOrder.fileName
                        });
                    }
                }
            }
            
            // Lưu đơn hàng vào Firebase
            if (orders.length > 0) {
                const selectedStoreId = localStorage.getItem('selectedStoreId');
                if (!selectedStoreId) {
                    throw new Error('Vui lòng chọn cửa hàng trước khi tạo đơn hàng!');
                }
                
                for (let order of orders) {
                    const orderId = database.ref('orders').push().key;
                    const orderData = {
                        id: orderId,
                        storeId: selectedStoreId,
                        date: order.date,
                        type: 'tmdt_order', // Đánh dấu là đơn hàng TMĐT
                        source: order.source,
                        originalOrderId: order.originalOrderId,
                        customerName: order.customerName,
                        fileName: order.fileName,
                        products: [{
                            id: order.productId,
                            name: order.productName,
                            sku: order.sku,
                            quantity: order.quantity,
                            price: order.price,
                            total: order.total
                        }],
                        totalAmount: order.total,
                        status: 'completed',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    
                    await database.ref(`orders/${orderId}`).set(orderData);
                    
                    // Tạo warehouse transaction để trừ kho - LUÔN TẠO cho mọi đơn hàng
                    const transactionId = database.ref('warehouseTransactions').push().key;
                    const transaction = {
                        id: transactionId,
                        type: 'out',
                        orderType: 'tmdt_order', // Đánh dấu loại đơn hàng
                        orderId: orderId,
                        productId: order.productId,
                        productName: order.productName,
                        productSku: order.sku,
                        productCategory: 'TMĐT',
                        quantity: order.quantity,
                        unitPrice: order.price,
                        totalValue: order.total,
                        reason: 'sale',
                        note: `Đơn hàng TMĐT #${order.originalOrderId} từ ${order.fileName}`,
                        timestamp: Date.now(),
                        date: new Date().toISOString(),
                        userId: 'admin',
                        storeId: selectedStoreId
                    };
                    
                    console.log('Creating warehouse transaction:', transaction);
                    await database.ref(`warehouseTransactions/${transactionId}`).set(transaction);
                    
                    // Cập nhật tồn kho chỉ nếu có productId thật
                    if (order.productId && !order.productId.startsWith('manual_')) {
                        const productRef = database.ref(`products/${order.productId}/stock`);
                        const currentStock = await productRef.once('value');
                        const newStock = (currentStock.val() || 0) - order.quantity;
                        await productRef.set(Math.max(0, newStock));
                        console.log(`Updated stock for ${order.productName}: ${currentStock.val()} -> ${newStock}`);
                    }
                }
                
                showNotification(`Đã tạo thành công ${orders.length} đơn hàng TMĐT!`, 'success');
                this.cancelExtraction();
                
                // Reload dữ liệu
                if (typeof loadOrders === 'function') {
                    await loadOrders();
                }
                
                // Refresh warehouse usage report if it's currently visible
                if (typeof generateUsageReport === 'function') {
                    setTimeout(() => {
                        console.log('Auto-refreshing warehouse usage report...');
                        generateUsageReport();
                    }, 1500);
                }
                
                // Force refresh warehouse data
                if (typeof loadTransactionHistory === 'function') {
                    setTimeout(() => {
                        console.log('Auto-refreshing transaction history...');
                        loadTransactionHistory();
                    }, 2000);
                }
                
                // Refresh warehouse data if available
                if (typeof loadWarehouseData === 'function') {
                    await loadWarehouseData();
                }
                if (typeof displayWarehouseTable === 'function') {
                    displayWarehouseTable();
                }
            } else {
                showNotification('Không có đơn hàng nào để tạo!', 'warning');
            }
            
        } catch (error) {
            console.error('Error creating orders:', error);
            showNotification('Lỗi tạo đơn hàng!', 'error');
        } finally {
            showLoading(false);
        }
    }

    // Thu thập giá cho sản phẩm chưa match
    collectUnmatchedPrices() {
        const priceInputs = document.querySelectorAll('.price-input');
        
        priceInputs.forEach(input => {
            const orderIndex = parseInt(input.dataset.order);
            const productIndex = parseInt(input.dataset.product);
            const price = parseFloat(input.value);
            
            if (price && price > 0) {
                this.extractedOrders[orderIndex].products[productIndex].manualPrice = price;
            }
        });
    }

    // Hủy trích xuất
    cancelExtraction() {
        document.getElementById('extractedOrders').style.display = 'none';
        const pdfInput = document.getElementById('pdfFileInputCompact');
        if (pdfInput) pdfInput.value = '';
        this.extractedOrders = [];
        this.matchedProducts = [];
        this.unmatchedProducts = [];
    }

    // Xóa đơn hàng đã trích xuất theo index
    deleteExtractedOrderByIndex(orderIndex) {
        if (orderIndex >= 0 && orderIndex < this.extractedOrders.length) {
            this.extractedOrders.splice(orderIndex, 1);
            
            // Refresh display
            if (this.extractedOrders.length > 0) {
                this.displayExtractedOrders();
            } else {
                this.cancelExtraction();
                showNotification('Đã xóa tất cả đơn hàng!', 'info');
            }
        }
    }

    // Xóa nhiều đơn hàng đã trích xuất
    deleteMultipleExtractedOrders(orderIndexes) {
        // Sắp xếp giảm dần để xóa từ cuối lên đầu
        orderIndexes.sort((a, b) => b - a);
        
        for (let index of orderIndexes) {
            if (index >= 0 && index < this.extractedOrders.length) {
                this.extractedOrders.splice(index, 1);
            }
        }
        
        // Refresh display
        if (this.extractedOrders.length > 0) {
            this.displayExtractedOrders();
        } else {
            this.cancelExtraction();
            showNotification('Đã xóa tất cả đơn hàng!', 'info');
        }
    }
}

// Global functions for extracted orders management
function toggleSelectAllExtracted() {
    const selectAll = document.getElementById('selectAllExtracted');
    const checkboxes = document.querySelectorAll('.extracted-order-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll.checked;
    });
    
    updateExtractedBulkActions();
}

function updateExtractedBulkActions() {
    const checkboxes = document.querySelectorAll('.extracted-order-checkbox');
    const selectedCheckboxes = document.querySelectorAll('.extracted-order-checkbox:checked');
    const selectAll = document.getElementById('selectAllExtracted');
    const deleteButton = document.getElementById('deleteSelectedExtracted');
    const selectedCount = document.getElementById('selectedExtractedCount');
    
    // Update select all state
    if (selectedCheckboxes.length === 0) {
        selectAll.indeterminate = false;
        selectAll.checked = false;
    } else if (selectedCheckboxes.length === checkboxes.length) {
        selectAll.indeterminate = false;
        selectAll.checked = true;
    } else {
        selectAll.indeterminate = true;
        selectAll.checked = false;
    }
    
    // Show/hide bulk actions
    if (selectedCheckboxes.length > 0) {
        deleteButton.style.display = 'inline-block';
        selectedCount.style.display = 'inline';
        selectedCount.textContent = `(${selectedCheckboxes.length} đã chọn)`;
    } else {
        deleteButton.style.display = 'none';
        selectedCount.style.display = 'none';
    }
}

function deleteSingleExtractedOrder(orderIndex) {
    if (!confirm('Bạn có chắc muốn xóa đơn hàng này?')) {
        return;
    }
    
    if (window.tikTokProcessor) {
        window.tikTokProcessor.deleteExtractedOrderByIndex(orderIndex);
        showNotification('Đã xóa đơn hàng!', 'success');
    }
}

function deleteSelectedExtractedOrders() {
    const selectedCheckboxes = document.querySelectorAll('.extracted-order-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        showNotification('Vui lòng chọn ít nhất một đơn hàng để xóa!', 'warning');
        return;
    }
    
    if (!confirm(`Bạn có chắc muốn xóa ${selectedCheckboxes.length} đơn hàng đã chọn?`)) {
        return;
    }
    
    const orderIndexes = Array.from(selectedCheckboxes).map(cb => parseInt(cb.dataset.orderIndex));
    
    if (window.tikTokProcessor) {
        window.tikTokProcessor.deleteMultipleExtractedOrders(orderIndexes);
        showNotification(`Đã xóa ${selectedCheckboxes.length} đơn hàng!`, 'success');
    }
}

// Khởi tạo processor khi DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Kiểm tra xem có PDF.js không
    if (typeof pdfjsLib === 'undefined') {
        console.warn('PDF.js not loaded. PDF processing will not work.');
        return;
    }
    
    // Khởi tạo TikTok Order Processor
    window.tikTokProcessor = new TikTokOrderProcessor();
});