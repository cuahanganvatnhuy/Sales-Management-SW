# PowerShell script to add page protection to all HTML files in view folder

Write-Host "🛡️ Adding page protection to all HTML files..." -ForegroundColor Green

# Get all HTML files in view folder
$viewFolder = "e:\CascadeProjects\Sales-Management-SW\view"
$htmlFiles = Get-ChildItem -Path $viewFolder -Filter "*.html"

Write-Host "Found $($htmlFiles.Count) HTML files" -ForegroundColor Yellow

foreach ($file in $htmlFiles) {
    Write-Host "Processing: $($file.Name)" -ForegroundColor Cyan
    
    # Read file content
    $content = Get-Content -Path $file.FullName -Raw
    
    # Check if page protection is already added
    if ($content -match 'page-protection\.js') {
        Write-Host "  ✅ Page protection already exists" -ForegroundColor Green
        continue
    }
    
    # Check if simple-auth.js exists
    if ($content -notmatch 'simple-auth\.js') {
        # Add simple-auth.js before firebase.js
        $content = $content -replace '(<script src="../main/firebase\.js"></script>)', '<script src="../main/simple-auth.js"></script>`r`n    $1'
        Write-Host "  ➕ Added simple-auth.js" -ForegroundColor Blue
    }
    
    # Add page-protection.js after simple-auth.js
    if ($content -match 'simple-auth\.js') {
        $content = $content -replace '(<script src="../main/simple-auth\.js"></script>)', '$1`r`n    <script src="../main/page-protection.js"></script>'
        Write-Host "  ➕ Added page-protection.js" -ForegroundColor Blue
    } else {
        # Fallback: add after firebase.js
        $content = $content -replace '(<script src="../main/firebase\.js"></script>)', '$1`r`n    <script src="../main/simple-auth.js"></script>`r`n    <script src="../main/page-protection.js"></script>'
        Write-Host "  ➕ Added both simple-auth.js and page-protection.js" -ForegroundColor Blue
    }
    
    # Write back to file
    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
    Write-Host "  ✅ Updated successfully" -ForegroundColor Green
}

Write-Host "`n🎉 Page protection added to all HTML files!" -ForegroundColor Green
Write-Host "📋 Summary:" -ForegroundColor Yellow
Write-Host "  - Total files processed: $($htmlFiles.Count)" -ForegroundColor White
Write-Host "  - simple-auth.js and page-protection.js added to all files" -ForegroundColor White
Write-Host "  - Each page will now check permissions before loading" -ForegroundColor White
