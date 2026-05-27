Add-Type -AssemblyName System.Drawing

function Get-BackgroundColor {
  param([System.Drawing.Bitmap]$Bitmap)
  $samples = @(
    @{x=5;y=5}, @{x=40;y=40}, @{x=($Bitmap.Width-6);y=5}, @{x=($Bitmap.Width-6);y=($Bitmap.Height-6)},
    @{x=5;y=($Bitmap.Height-6)}, @{x=[math]::Floor($Bitmap.Width/2);y=8}, @{x=8;y=[math]::Floor($Bitmap.Height/2)}
  )
  $r=0; $g=0; $b=0
  foreach($s in $samples){
    $c=$Bitmap.GetPixel($s.x,$s.y)
    $r += $c.R; $g += $c.G; $b += $c.B
  }
  $count = $samples.Count
  return [pscustomobject]@{ R = [math]::Round($r/$count); G = [math]::Round($g/$count); B = [math]::Round($b/$count) }
}

function RemoveLightMatte {
  param(
    [string]$SourcePath,
    [string]$TargetPath,
    [double]$Low = 8,
    [double]$High = 58
  )

  $bmp = [System.Drawing.Bitmap]::FromFile($SourcePath)
  $bg = Get-BackgroundColor -Bitmap $bmp
  $bgLum = ($bg.R + $bg.G + $bg.B) / 3.0
  $out = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

  for ($x = 0; $x -lt $bmp.Width; $x++) {
    for ($y = 0; $y -lt $bmp.Height; $y++) {
      $p = $bmp.GetPixel($x,$y)
      $lum = ($p.R + $p.G + $p.B) / 3.0
      $diffLum = $bgLum - $lum
      $diffColor = [math]::Sqrt(([math]::Pow($p.R - $bg.R,2) + [math]::Pow($p.G - $bg.G,2) + [math]::Pow($p.B - $bg.B,2)) / 3.0)
      $signal = [math]::Max($diffLum, $diffColor)
      $alpha = ($signal - $Low) / ($High - $Low)
      if ($alpha -lt 0) { $alpha = 0 }
      if ($alpha -gt 1) { $alpha = 1 }

      if ($alpha -le 0.001) {
        $out.SetPixel($x,$y,[System.Drawing.Color]::FromArgb(0,0,0,0))
        continue
      }

      $r = (($p.R / 255.0) - (($bg.R / 255.0) * (1 - $alpha))) / $alpha
      $g = (($p.G / 255.0) - (($bg.G / 255.0) * (1 - $alpha))) / $alpha
      $b = (($p.B / 255.0) - (($bg.B / 255.0) * (1 - $alpha))) / $alpha

      $r = [math]::Round([math]::Min(1,[math]::Max(0,$r)) * 255)
      $g = [math]::Round([math]::Min(1,[math]::Max(0,$g)) * 255)
      $b = [math]::Round([math]::Min(1,[math]::Max(0,$b)) * 255)
      $a = [math]::Round($alpha * 255)

      $out.SetPixel($x,$y,[System.Drawing.Color]::FromArgb($a,$r,$g,$b))
    }
  }

  $out.Save($TargetPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $out.Dispose()
  $bmp.Dispose()
}

$assetDir = 'app/web/assets/body-map'
RemoveLightMatte -SourcePath (Join-Path $assetDir 'neutral-front.png') -TargetPath (Join-Path $assetDir 'neutral-front-transparent.png')
RemoveLightMatte -SourcePath (Join-Path $assetDir 'neutral-back.png') -TargetPath (Join-Path $assetDir 'neutral-back-transparent.png')
