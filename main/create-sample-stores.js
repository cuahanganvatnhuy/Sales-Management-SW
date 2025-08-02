// Script to create sample stores for testing
function createSampleStores() {
    console.log('Creating sample stores...');
    
    const sampleStores = {
        'store1': {
            name: 'Cửa Hàng Trung Tâm',
            address: '123 Đường Nguyễn Huệ, Q1, TP.HCM',
            phone: '0901234567',
            email: 'trungtam@pmqldh.com',
            status: 'active',
            createdAt: new Date().toISOString(),
            manager: 'Nguyễn Văn A'
        },
        'store2': {
            name: 'Cửa Hàng Quận 7',
            address: '456 Đường Nguyễn Thị Thập, Q7, TP.HCM',
            phone: '0901234568',
            email: 'quan7@pmqldh.com',
            status: 'active',
            createdAt: new Date().toISOString(),
            manager: 'Trần Thị B'
        },
        'store3': {
            name: 'Cửa Hàng Thủ Đức',
            address: '789 Đường Võ Văn Ngân, Thủ Đức, TP.HCM',
            phone: '0901234569',
            email: 'thuduc@pmqldh.com',
            status: 'active',
            createdAt: new Date().toISOString(),
            manager: 'Lê Văn C'
        }
    };
    
    // Save to Firebase
    database.ref('stores').set(sampleStores)
        .then(() => {
            console.log('Sample stores created successfully!');
            // Reload stores in header
            if (typeof loadStoresForSelector === 'function') {
                loadStoresForSelector();
            }
        })
        .catch(error => {
            console.error('Error creating sample stores:', error);
        });
}

// Auto-create stores if none exist
function checkAndCreateStores() {
    database.ref('stores').once('value')
        .then(snapshot => {
            const stores = snapshot.val();
            if (!stores || Object.keys(stores).length === 0) {
                console.log('No stores found, creating sample stores...');
                createSampleStores();
            } else {
                console.log('Stores already exist:', Object.keys(stores).length, 'stores');
            }
        })
        .catch(error => {
            console.error('Error checking stores:', error);
        });
}

// Call on page load
if (typeof database !== 'undefined') {
    checkAndCreateStores();
} else {
    console.log('Database not available, waiting...');
    setTimeout(() => {
        if (typeof database !== 'undefined') {
            checkAndCreateStores();
        }
    }, 1000);
}