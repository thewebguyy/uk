$excludes = @("backend", "functions", "node_modules", ".git", ".firebase", "dist", "deploy.zip", "scripts", "DEPLOYMENT_GUIDE_NAMECHEAP.md", ".gitignore", "firebase.json", ".firebaserc", "firestore.rules", "storage.rules", "firestore.indexes.json", "package.json", "package-lock.json", "readme.txt", "IMPLEMENTATION_PLAN.md", "README.md", "fix_urls.py", "patch_html.py")
$dest = "dist"

Write-Host "Cleaning previous build..."
if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
if (Test-Path "deploy.zip") { Remove-Item "deploy.zip" -Force }

New-Item -ItemType Directory -Force -Path $dest | Out-Null

Write-Host "Copying files to $dest..."
Get-ChildItem -Path . | Where-Object { $excludes -notcontains $_.Name } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $dest -Recurse -Force
}

Write-Host "Creating zip package..."
Compress-Archive -Path "$dest\*" -DestinationPath "deploy.zip" -Force

Write-Host "✅ Success! 'deploy.zip' is ready for upload."
