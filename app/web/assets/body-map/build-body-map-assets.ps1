Add-Type -AssemblyName System.Drawing

function Make-TransparentCrop {
  param(
    [string]$SourcePath,
    [string]$TargetPath,
    [int]$X,
    [int]$Y,
    [int]$Width,
    [int]$Height,
    [int]$Threshold = 245
  )

  $bmp = [System.Drawing.Bitmap]::FromFile($SourcePath)
  $crop = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  for ($cx = 0; $cx -lt $Width; $cx++) {
    for ($cy = 0; $cy -lt $Height; $cy++) {
      $pixel = $bmp.GetPixel($X + $cx, $Y + $cy)
      if ($pixel.R -ge $Threshold -and $pixel.G -ge $Threshold -and $pixel.B -ge $Threshold) {
        $crop.SetPixel($cx, $cy, [System.Drawing.Color]::FromArgb(0, $pixel.R, $pixel.G, $pixel.B))
      } else {
        $crop.SetPixel($cx, $cy, [System.Drawing.Color]::FromArgb(255, $pixel.R, $pixel.G, $pixel.B))
      }
    }
  }
  $crop.Save($TargetPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $crop.Dispose()
  $bmp.Dispose()
}

function Make-ColorMask {
  param(
    [string]$SourcePath,
    [string]$TargetPath,
    [int]$X,
    [int]$Y,
    [int]$Width,
    [int]$Height,
    [int[]]$Color,
    [int]$Tolerance = 34
  )

  $bmp = [System.Drawing.Bitmap]::FromFile($SourcePath)
  $mask = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  for ($cx = 0; $cx -lt $Width; $cx++) {
    for ($cy = 0; $cy -lt $Height; $cy++) {
      $pixel = $bmp.GetPixel($X + $cx, $Y + $cy)
      $match = ([Math]::Abs($pixel.R - $Color[0]) -le $Tolerance) -and ([Math]::Abs($pixel.G - $Color[1]) -le $Tolerance) -and ([Math]::Abs($pixel.B - $Color[2]) -le $Tolerance)
      if ($match) {
        $mask.SetPixel($cx, $cy, [System.Drawing.Color]::FromArgb(255, 255, 255, 255))
      } else {
        $mask.SetPixel($cx, $cy, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
      }
    }
  }
  $mask.Save($TargetPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $mask.Dispose()
  $bmp.Dispose()
}

$assetDir = 'app/web/assets/body-map'
New-Item -ItemType Directory -Force -Path $assetDir | Out-Null

$neutral = Join-Path $assetDir 'neutral-pair.png'
$guide = Join-Path $assetDir 'region-guide.png'

# shared crop boxes from the approved Gemini pair
$frontX = 820; $backX = 1458; $cropY = 70; $cropW = 570; $cropH = 1400

Make-TransparentCrop -SourcePath $neutral -TargetPath (Join-Path $assetDir 'neutral-front-transparent.png') -X $frontX -Y $cropY -Width $cropW -Height $cropH
Make-TransparentCrop -SourcePath $neutral -TargetPath (Join-Path $assetDir 'neutral-back-transparent.png') -X $backX -Y $cropY -Width $cropW -Height $cropH

$colors = @{
  neck = @(87, 130, 169)
  shoulders = @(248, 163, 0)
  chest = @(40, 114, 54)
  biceps = @(197, 52, 144)
  forearms = @(88, 28, 112)
  core = @(34, 145, 150)
  hip_flexors = @(208, 66, 59)
  quads = @(247, 221, 37)
  calves = @(107, 189, 235)
  back = @(40, 114, 54)
  triceps = @(197, 52, 144)
  lower_back = @(96, 212, 233)
  glutes = @(208, 66, 59)
  hamstrings = @(247, 221, 37)
}

# front masks from the approved colored guide
Make-ColorMask -SourcePath $guide -TargetPath (Join-Path $assetDir 'mask-front-neck.png') -X $frontX -Y $cropY -Width $cropW -Height $cropH -Color $colors.neck -Tolerance 34
Make-ColorMask -SourcePath $guide -TargetPath (Join-Path $assetDir 'mask-front-shoulders.png') -X $frontX -Y $cropY -Width $cropW -Height $cropH -Color $colors.shoulders -Tolerance 34
Make-ColorMask -SourcePath $guide -TargetPath (Join-Path $assetDir 'mask-front-chest.png') -X $frontX -Y $cropY -Width $cropW -Height $cropH -Color $colors.chest -Tolerance 34
Make-ColorMask -SourcePath $guide -TargetPath (Join-Path $assetDir 'mask-front-biceps.png') -X $frontX -Y $cropY -Width $cropW -Height $cropH -Color $colors.biceps -Tolerance 34
Make-ColorMask -SourcePath $guide -TargetPath (Join-Path $assetDir 'mask-front-forearms.png') -X $frontX -Y $cropY -Width $cropW -Height $cropH -Color $colors.forearms -Tolerance 34
Make-ColorMask -SourcePath $guide -TargetPath (Join-Path $assetDir 'mask-front-core.png') -X $frontX -Y $cropY -Width $cropW -Height $cropH -Color $colors.core -Tolerance 34
Make-ColorMask -SourcePath $guide -TargetPath (Join-Path $assetDir 'mask-front-hip-flexors.png') -X $frontX -Y $cropY -Width $cropW -Height $cropH -Color $colors.hip_flexors -Tolerance 34
Make-ColorMask -SourcePath $guide -TargetPath (Join-Path $assetDir 'mask-front-quads.png') -X $frontX -Y $cropY -Width $cropW -Height $cropH -Color $colors.quads -Tolerance 34
Make-ColorMask -SourcePath $guide -TargetPath (Join-Path $assetDir 'mask-front-calves.png') -X $frontX -Y $cropY -Width $cropW -Height $cropH -Color $colors.calves -Tolerance 34

# back masks
Make-ColorMask -SourcePath $guide -TargetPath (Join-Path $assetDir 'mask-back-neck.png') -X $backX -Y $cropY -Width $cropW -Height $cropH -Color $colors.neck -Tolerance 34
Make-ColorMask -SourcePath $guide -TargetPath (Join-Path $assetDir 'mask-back-shoulders.png') -X $backX -Y $cropY -Width $cropW -Height $cropH -Color $colors.shoulders -Tolerance 34
Make-ColorMask -SourcePath $guide -TargetPath (Join-Path $assetDir 'mask-back-back.png') -X $backX -Y $cropY -Width $cropW -Height $cropH -Color $colors.back -Tolerance 34
Make-ColorMask -SourcePath $guide -TargetPath (Join-Path $assetDir 'mask-back-triceps.png') -X $backX -Y $cropY -Width $cropW -Height $cropH -Color $colors.triceps -Tolerance 34
Make-ColorMask -SourcePath $guide -TargetPath (Join-Path $assetDir 'mask-back-forearms.png') -X $backX -Y $cropY -Width $cropW -Height $cropH -Color $colors.forearms -Tolerance 34
Make-ColorMask -SourcePath $guide -TargetPath (Join-Path $assetDir 'mask-back-lower-back.png') -X $backX -Y $cropY -Width $cropW -Height $cropH -Color $colors.lower_back -Tolerance 34
Make-ColorMask -SourcePath $guide -TargetPath (Join-Path $assetDir 'mask-back-glutes.png') -X $backX -Y $cropY -Width $cropW -Height $cropH -Color $colors.glutes -Tolerance 34
Make-ColorMask -SourcePath $guide -TargetPath (Join-Path $assetDir 'mask-back-hamstrings.png') -X $backX -Y $cropY -Width $cropW -Height $cropH -Color $colors.hamstrings -Tolerance 34
Make-ColorMask -SourcePath $guide -TargetPath (Join-Path $assetDir 'mask-back-calves.png') -X $backX -Y $cropY -Width $cropW -Height $cropH -Color $colors.calves -Tolerance 34
