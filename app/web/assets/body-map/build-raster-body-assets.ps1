Add-Type -AssemblyName System.Drawing
[System.Drawing.Drawing2D.GraphicsPath] | Out-Null

$srcDir = 'd:\code\Workout\art\body-map-final\raster'
$dstDir = 'd:\code\Workout\app\web\assets\body-map'
New-Item -ItemType Directory -Force -Path $dstDir | Out-Null

$frontNeutralSrc = Join-Path $srcDir 'neutral-front.png'
$backNeutralSrc = Join-Path $srcDir 'neutral-back.png'
$frontGuideSrc = Join-Path $srcDir 'colored-guide-front.png'
$backGuideSrc = Join-Path $srcDir 'colored-guide-back.png'

$frontNeutralOut = Join-Path $dstDir 'neutral-front-transparent.png'
$backNeutralOut = Join-Path $dstDir 'neutral-back-transparent.png'

$frontMaskMap = @{
  'bm_neck' = 'mask-front-neck.png'
  'bm_shoulders' = 'mask-front-shoulders.png'
  'bm_chest' = 'mask-front-chest.png'
  'bm_biceps' = 'mask-front-biceps.png'
  'bm_forearms' = 'mask-front-forearms.png'
  'bm_core' = 'mask-front-core.png'
  'bm_hip_flexors' = 'mask-front-hip-flexors.png'
  'bm_quads' = 'mask-front-quads.png'
  'bm_calves' = 'mask-front-calves.png'
}

$backMaskMap = @{
  'bm_neck' = 'mask-back-neck.png'
  'bm_shoulders' = 'mask-back-shoulders.png'
  'bm_back' = 'mask-back-back.png'
  'bm_triceps' = 'mask-back-triceps.png'
  'bm_forearms' = 'mask-back-forearms.png'
  'bm_lower_back' = 'mask-back-lower-back.png'
  'bm_glutes' = 'mask-back-glutes.png'
  'bm_hamstrings' = 'mask-back-hamstrings.png'
  'bm_calves' = 'mask-back-calves.png'
}

$frontRegionIds = @('bm_neck','bm_shoulders','bm_chest','bm_biceps','bm_forearms','bm_core','bm_hip_flexors','bm_quads','bm_calves')
$backRegionIds = @('bm_neck','bm_shoulders','bm_back','bm_triceps','bm_forearms','bm_lower_back','bm_glutes','bm_hamstrings','bm_calves')

$colors = @{
  'bm_neck' = @(0x6B,0x8D,0xAD)
  'bm_shoulders' = @(0xE8,0x87,0x3D)
  'bm_chest' = @(0x3D,0x9B,0x6F)
  'bm_back' = @(0x3D,0x9B,0x6F)
  'bm_biceps' = @(0xD4,0x63,0x7A)
  'bm_triceps' = @(0xD4,0x63,0x7A)
  'bm_forearms' = @(0x8B,0x6D,0xB0)
  'bm_core' = @(0x45,0xA5,0xA5)
  'bm_lower_back' = @(0x45,0xA5,0xA5)
  'bm_hip_flexors' = @(0xD4,0x5B,0x5B)
  'bm_glutes' = @(0xD4,0x5B,0x5B)
  'bm_quads' = @(0xC4,0xA2,0x3D)
  'bm_hamstrings' = @(0xC4,0xA2,0x3D)
  'bm_calves' = @(0x5B,0x9F,0xD4)
}

function Is-BrightGreenBackground {
  param([System.Drawing.Color]$Color)
  return ($Color.G -ge 190 -and $Color.G -ge ($Color.R + 110) -and $Color.G -ge ($Color.B + 110))
}

function Get-NonGreenBounds {
  param([System.Drawing.Bitmap]$Bitmap)
  $minX = $Bitmap.Width; $minY = $Bitmap.Height; $maxX = -1; $maxY = -1
  for ($x = 0; $x -lt $Bitmap.Width; $x++) {
    for ($y = 0; $y -lt $Bitmap.Height; $y++) {
      $c = $Bitmap.GetPixel($x, $y)
      if (Is-BrightGreenBackground $c) { continue }
      if ($x -lt $minX) { $minX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
  if ($maxX -lt 0) { throw 'Could not detect foreground bounds.' }
  [System.Drawing.Rectangle]::new($minX, $minY, $maxX - $minX + 1, $maxY - $minY + 1)
}

function Expand-Rect {
  param([System.Drawing.Rectangle]$Rect, [int]$Pad, [int]$MaxW, [int]$MaxH)
  $x = [Math]::Max(0, $Rect.X - $Pad)
  $y = [Math]::Max(0, $Rect.Y - $Pad)
  $r = [Math]::Min($MaxW - 1, $Rect.Right - 1 + $Pad)
  $b = [Math]::Min($MaxH - 1, $Rect.Bottom - 1 + $Pad)
  [System.Drawing.Rectangle]::new($x, $y, $r - $x + 1, $b - $y + 1)
}

function Sample-Background {
  param([System.Drawing.Bitmap]$Bitmap)
  $points = @(
    @{ X = 5; Y = 5 },
    @{ X = [Math]::Floor($Bitmap.Width / 2); Y = 5 },
    @{ X = $Bitmap.Width - 6; Y = 5 },
    @{ X = 5; Y = $Bitmap.Height - 6 },
    @{ X = $Bitmap.Width - 6; Y = $Bitmap.Height - 6 }
  )
  $r = 0; $g = 0; $b = 0
  foreach ($pt in $points) {
    $c = $Bitmap.GetPixel($pt.X, $pt.Y)
    $r += $c.R; $g += $c.G; $b += $c.B
  }
  $count = $points.Count
  [pscustomobject]@{
    R = [Math]::Round($r / $count)
    G = [Math]::Round($g / $count)
    B = [Math]::Round($b / $count)
  }
}

function Build-CleanTransparentCrop {
  param([string]$SourcePath, [System.Drawing.Rectangle]$CropRect, [string]$TargetPath)
  $bmp = [System.Drawing.Bitmap]::FromFile($SourcePath)
  $bg = Sample-Background -Bitmap $bmp
  $bgLum = ($bg.R + $bg.G + $bg.B) / 3.0
  $out = New-Object System.Drawing.Bitmap($CropRect.Width, $CropRect.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  for ($x = 0; $x -lt $CropRect.Width; $x++) {
    for ($y = 0; $y -lt $CropRect.Height; $y++) {
      $p = $bmp.GetPixel($CropRect.X + $x, $CropRect.Y + $y)
      $lum = ($p.R + $p.G + $p.B) / 3.0
      $diffLum = $bgLum - $lum
      $diffColor = [Math]::Sqrt(([Math]::Pow($p.R - $bg.R, 2) + [Math]::Pow($p.G - $bg.G, 2) + [Math]::Pow($p.B - $bg.B, 2)) / 3.0)
      $signal = [Math]::Max($diffLum, $diffColor)
      $alpha = ($signal - 6) / 56
      if ($alpha -lt 0) { $alpha = 0 }
      if ($alpha -gt 1) { $alpha = 1 }
      if ($alpha -le 0.001) {
        $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        continue
      }
      $unmixR = (($p.R / 255.0) - (($bg.R / 255.0) * (1 - $alpha))) / $alpha
      $unmixG = (($p.G / 255.0) - (($bg.G / 255.0) * (1 - $alpha))) / $alpha
      $unmixB = (($p.B / 255.0) - (($bg.B / 255.0) * (1 - $alpha))) / $alpha
      $unmixR = [Math]::Min(1, [Math]::Max(0, $unmixR))
      $unmixG = [Math]::Min(1, [Math]::Max(0, $unmixG))
      $unmixB = [Math]::Min(1, [Math]::Max(0, $unmixB))
      $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb([Math]::Round($alpha * 255), [Math]::Round($unmixR * 255), [Math]::Round($unmixG * 255), [Math]::Round($unmixB * 255)))
    }
  }
  $out.Save($TargetPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $out.Dispose(); $bmp.Dispose()
}

function Get-ColorDistance {
  param([System.Drawing.Color]$Pixel, [int[]]$Color)
  return [Math]::Sqrt([Math]::Pow($Pixel.R - $Color[0], 2) + [Math]::Pow($Pixel.G - $Color[1], 2) + [Math]::Pow($Pixel.B - $Color[2], 2))
}

function Remove-IsolatedPixels {
  param([System.Drawing.Bitmap]$Bitmap)
  $copy = $Bitmap.Clone([System.Drawing.Rectangle]::new(0,0,$Bitmap.Width,$Bitmap.Height), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  for ($x = 1; $x -lt ($Bitmap.Width - 1); $x++) {
    for ($y = 1; $y -lt ($Bitmap.Height - 1); $y++) {
      $pixel = $Bitmap.GetPixel($x, $y)
      if ($pixel.A -eq 0) { continue }
      $neighbors = 0
      for ($dx = -1; $dx -le 1; $dx++) {
        for ($dy = -1; $dy -le 1; $dy++) {
          if ($dx -eq 0 -and $dy -eq 0) { continue }
          if ($Bitmap.GetPixel($x + $dx, $y + $dy).A -gt 0) { $neighbors++ }
        }
      }
      if ($neighbors -le 1) {
        $copy.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0,0,0,0))
      }
    }
  }
  for ($x = 0; $x -lt $Bitmap.Width; $x++) {
    for ($y = 0; $y -lt $Bitmap.Height; $y++) {
      $Bitmap.SetPixel($x, $y, $copy.GetPixel($x, $y))
    }
  }
  $copy.Dispose()
}

function Build-ResizedMask {
  param(
    [string]$GuidePath,
    [System.Drawing.Rectangle]$GuideRect,
    [string]$RegionId,
    [string[]]$PaletteIds,
    [System.Drawing.Size]$TargetSize,
    [string]$TargetPath,
    [double]$Threshold = 48,
    [double]$Margin = 4
  )
  $bmp = [System.Drawing.Bitmap]::FromFile($GuidePath)
  $raw = New-Object System.Drawing.Bitmap($GuideRect.Width, $GuideRect.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  for ($x = 0; $x -lt $GuideRect.Width; $x++) {
    for ($y = 0; $y -lt $GuideRect.Height; $y++) {
      $p = $bmp.GetPixel($GuideRect.X + $x, $GuideRect.Y + $y)
      if (Is-BrightGreenBackground $p) {
        $raw.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0,0,0,0))
        continue
      }
      $maxChannel = [Math]::Max($p.R, [Math]::Max($p.G, $p.B))
      $minChannel = [Math]::Min($p.R, [Math]::Min($p.G, $p.B))
      $chroma = $maxChannel - $minChannel
      if ($maxChannel -lt 85 -or $chroma -lt 20) {
        $raw.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0,0,0,0))
        continue
      }

      $bestId = $null
      $bestDistance = [double]::PositiveInfinity
      $secondDistance = [double]::PositiveInfinity
      foreach ($candidateId in $PaletteIds) {
        $distance = Get-ColorDistance -Pixel $p -Color $colors[$candidateId]
        if ($distance -lt $bestDistance) {
          $secondDistance = $bestDistance
          $bestDistance = $distance
          $bestId = $candidateId
        } elseif ($distance -lt $secondDistance) {
          $secondDistance = $distance
        }
      }

      $isMatch = ($bestId -eq $RegionId) -and ($bestDistance -le $Threshold) -and (($secondDistance - $bestDistance) -ge $Margin)
      if ($isMatch) {
        $raw.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255,255,255,255))
      } else {
        $raw.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0,0,0,0))
      }
    }
  }

  Remove-IsolatedPixels -Bitmap $raw

  $out = New-Object System.Drawing.Bitmap($TargetSize.Width, $TargetSize.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $gfx = [System.Drawing.Graphics]::FromImage($out)
  $gfx.Clear([System.Drawing.Color]::FromArgb(0,0,0,0))
  $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
  $gfx.DrawImage($raw, [System.Drawing.Rectangle]::new(0, 0, $TargetSize.Width, $TargetSize.Height), [System.Drawing.Rectangle]::new(0, 0, $GuideRect.Width, $GuideRect.Height), [System.Drawing.GraphicsUnit]::Pixel)
  $gfx.Dispose()
  Remove-IsolatedPixels -Bitmap $out
  $out.Save($TargetPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $raw.Dispose(); $out.Dispose(); $bmp.Dispose()
}

function Build-Preview {
  param([string]$BasePath, [hashtable]$MaskMap, [string[]]$HighlightIds, [string]$OutPath)
  $base = [System.Drawing.Bitmap]::FromFile($BasePath)
  $canvas = New-Object System.Drawing.Bitmap($base.Width, $base.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($canvas)
  $g.Clear([System.Drawing.Color]::FromArgb(255, 12, 20, 35))
  $g.DrawImage($base, 0, 0)
  foreach ($id in $HighlightIds) {
    $maskPath = Join-Path $dstDir $MaskMap[$id]
    $mask = [System.Drawing.Bitmap]::FromFile($maskPath)
    for ($x = 0; $x -lt $mask.Width; $x++) {
      for ($y = 0; $y -lt $mask.Height; $y++) {
        $m = $mask.GetPixel($x, $y)
        if ($m.A -gt 0) {
          $existing = $canvas.GetPixel($x, $y)
          $overlay = [System.Drawing.Color]::FromArgb(180, 79, 209, 197)
          $alpha = $overlay.A / 255.0
          $r = [Math]::Round($overlay.R * $alpha + $existing.R * (1 - $alpha))
          $gch = [Math]::Round($overlay.G * $alpha + $existing.G * (1 - $alpha))
          $b = [Math]::Round($overlay.B * $alpha + $existing.B * (1 - $alpha))
          $canvas.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $r, $gch, $b))
        }
      }
    }
    $mask.Dispose()
  }
  $g.Dispose(); $canvas.Save($OutPath, [System.Drawing.Imaging.ImageFormat]::Png); $canvas.Dispose(); $base.Dispose()
}

$frontNeutralBmp = [System.Drawing.Bitmap]::FromFile($frontNeutralSrc)
$frontGuideBmp = [System.Drawing.Bitmap]::FromFile($frontGuideSrc)
$backNeutralBmp = [System.Drawing.Bitmap]::FromFile($backNeutralSrc)
$backGuideBmp = [System.Drawing.Bitmap]::FromFile($backGuideSrc)

$frontNeutralRect = Expand-Rect (Get-NonGreenBounds $frontNeutralBmp) 8 $frontNeutralBmp.Width $frontNeutralBmp.Height
$frontGuideRect = Expand-Rect (Get-NonGreenBounds $frontGuideBmp) 8 $frontGuideBmp.Width $frontGuideBmp.Height
$backNeutralRect = Expand-Rect (Get-NonGreenBounds $backNeutralBmp) 8 $backNeutralBmp.Width $backNeutralBmp.Height
$backGuideRect = Expand-Rect (Get-NonGreenBounds $backGuideBmp) 8 $backGuideBmp.Width $backGuideBmp.Height
$frontSize = [System.Drawing.Size]::new($frontNeutralRect.Width, $frontNeutralRect.Height)
$backSize = [System.Drawing.Size]::new($backNeutralRect.Width, $backNeutralRect.Height)
$frontNeutralBmp.Dispose(); $frontGuideBmp.Dispose(); $backNeutralBmp.Dispose(); $backGuideBmp.Dispose()

Build-CleanTransparentCrop -SourcePath $frontNeutralSrc -CropRect $frontNeutralRect -TargetPath $frontNeutralOut
Build-CleanTransparentCrop -SourcePath $backNeutralSrc -CropRect $backNeutralRect -TargetPath $backNeutralOut

foreach ($id in $frontMaskMap.Keys) {
  Build-ResizedMask -GuidePath $frontGuideSrc -GuideRect $frontGuideRect -RegionId $id -PaletteIds $frontRegionIds -TargetSize $frontSize -TargetPath (Join-Path $dstDir $frontMaskMap[$id])
}
foreach ($id in $backMaskMap.Keys) {
  Build-ResizedMask -GuidePath $backGuideSrc -GuideRect $backGuideRect -RegionId $id -PaletteIds $backRegionIds -TargetSize $backSize -TargetPath (Join-Path $dstDir $backMaskMap[$id])
}

Build-Preview -BasePath $frontNeutralOut -MaskMap $frontMaskMap -HighlightIds @('bm_biceps') -OutPath (Join-Path $dstDir 'preview-front-biceps.png')
Build-Preview -BasePath $backNeutralOut -MaskMap $backMaskMap -HighlightIds @('bm_back') -OutPath (Join-Path $dstDir 'preview-back-back.png')

Write-Output "front neutral rect: $($frontNeutralRect.X),$($frontNeutralRect.Y),$($frontNeutralRect.Width),$($frontNeutralRect.Height)"
Write-Output "front guide rect: $($frontGuideRect.X),$($frontGuideRect.Y),$($frontGuideRect.Width),$($frontGuideRect.Height)"
Write-Output "back neutral rect: $($backNeutralRect.X),$($backNeutralRect.Y),$($backNeutralRect.Width),$($backNeutralRect.Height)"
Write-Output "back guide rect: $($backGuideRect.X),$($backGuideRect.Y),$($backGuideRect.Width),$($backGuideRect.Height)"
