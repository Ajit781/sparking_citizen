Write-Host "Fixing timestamps..."
Get-ChildItem -Path "node_modules\react-native-vision-camera" -Recurse -File | ForEach-Object { $_.LastWriteTime = (Get-Date) }
Get-ChildItem -Path "node_modules\react-native-nitro-modules" -Recurse -File | ForEach-Object { $_.LastWriteTime = (Get-Date) }
Get-ChildItem -Path "node_modules\react-native-nitro-image" -Recurse -File | ForEach-Object { $_.LastWriteTime = (Get-Date) }
Remove-Item -Recurse -Force "node_modules\react-native-vision-camera\android\.cxx" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "node_modules\react-native-nitro-modules\android\.cxx" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "node_modules\react-native-nitro-image\android\.cxx" -ErrorAction SilentlyContinue
Write-Host "Done!"
