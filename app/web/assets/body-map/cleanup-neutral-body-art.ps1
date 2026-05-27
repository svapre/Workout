Add-Type -AssemblyName System.Drawing

function Remove-BackgroundByFloodFill {
  param(
    [string]$SourcePath,
    [string]$TargetPath,
    [int]$BrightnessThreshold = 222,
    [int]$ChannelTolerance = 38
  )

  $bmp = [System.Drawing.Bitmap]::FromFile($SourcePath)
  $width = $bmp.Width
  $height = $bmp.Height
  $visited = New-Object 'bool[,]' $width, $height
  $queue = [System.Collections.Generic.Queue[System.Drawing.Point]]::new()

  function IsBackgroundPixel([System.Drawing.Color]$pixel) {
    $avg = ($pixel.R + $pixel.G + $pixel.B) / 3
    $spread = [Math]::Max([Math]::Max($pixel.R, $pixel.G), $pixel.B) - [Math]::Min([Math]::Min($pixel.R, $pixel.G), $pixel.B)
    return ($avg -ge $BrightnessThreshold -and $spread -le $ChannelTolerance)
  }

  function EnqueueIfBackground([int]$x, [int]$y) {
    if ($x -lt 0 -or $x -ge $width -or $y -lt 0 -or $y -ge $height) { return }
    if ($visited[$x, $y]) { return }
    $pixel = $bmp.GetPixel($x, $y)
    if (-not (IsBackgroundPixel $pixel)) { return }
    $visited[$x, $y] = $true
    $queue.Enqueue([System.Drawing.Point]::new($x, $y))
  }

  for ($x = 0; $x -lt $width; $x++) {
    EnqueueIfBackground $x 0
    EnqueueIfBackground $x ($height - 1)
  }
  for ($y = 0; $y -lt $height; $y++) {
    EnqueueIfBackground 0 $y
    EnqueueIfBackground ($width - 1) $y
  }

  while ($queue.Count -gt 0) {
    $pt = $queue.Dequeue()
    EnqueueIfBackground ($pt.X - 1) $pt.Y
    EnqueueIfBackground ($pt.X + 1) $pt.Y
    EnqueueIfBackground $pt.X ($pt.Y - 1)
    EnqueueIfBackground $pt.X ($pt.Y + 1)
  }

  $out = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  for ($x = 0; $x -lt $width; $x++) {
    for ($y = 0; $y -lt $height; $y++) {
      $pixel = $bmp.GetPixel($x, $y)
      if ($visited[$x, $y]) {
        $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, $pixel.R, $pixel.G, $pixel.B))
      } else {
        $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $pixel.R, $pixel.G, $pixel.B))
      }
    }
  }

  $out.Save($TargetPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $out.Dispose()
  $bmp.Dispose()
}

$assetDir = 'app/web/assets/body-map'
Remove-BackgroundByFloodFill -SourcePath (Join-Path $assetDir 'neutral-front.png') -TargetPath (Join-Path $assetDir 'neutral-front-transparent.png')
Remove-BackgroundByFloodFill -SourcePath (Join-Path $assetDir 'neutral-back.png') -TargetPath (Join-Path $assetDir 'neutral-back-transparent.png')
