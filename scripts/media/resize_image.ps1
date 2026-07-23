Add-Type -AssemblyName System.Drawing

$inputPath = "C:\Users\sophi\Desktop\MAXENCE\business\CleanmyMap-main\documentation\liberte-UX-UI\01-HOMEPAGE\homepage-backup.png"
$outputPath = "C:\Users\sophi\Desktop\MAXENCE\business\CleanmyMap-main\documentation\liberte-UX-UI\01-HOMEPAGE\homepage sonnet 4.5.png"

$originalImage = [System.Drawing.Image]::FromFile($inputPath)
$maxDimension = 3000

# Calculate new dimensions keeping aspect ratio
$ratio = [Math]::Min($maxDimension / $originalImage.Width, $maxDimension / $originalImage.Height)
$newWidth = [int]($originalImage.Width * $ratio)
$newHeight = [int]($originalImage.Height * $ratio)

Write-Host "Original: $($originalImage.Width) x $($originalImage.Height)"
Write-Host "Resized: $newWidth x $newHeight"

$resizedImage = New-Object System.Drawing.Bitmap($newWidth, $newHeight)
$graphics = [System.Drawing.Graphics]::FromImage($resizedImage)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.DrawImage($originalImage, 0, 0, $newWidth, $newHeight)

$resizedImage.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

$originalImage.Dispose()
$resizedImage.Dispose()
$graphics.Dispose()

Write-Host "Image resized successfully"
