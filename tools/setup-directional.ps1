$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path -Parent $PSScriptRoot
$assetBase = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master'
foreach ($entry in @(@('munchlax', '0446', '먹고자'), @('psyduck', '0054', '고라파덕'))) {
    $petRoot = Join-Path $projectRoot ('personal-species/' + $entry[0])
    $pmdRoot = Join-Path $petRoot 'pmd'
    New-Item -ItemType Directory -Force $pmdRoot | Out-Null
    foreach ($file in @('AnimData.xml', 'credits.txt')) {
        Invoke-WebRequest ($assetBase + '/sprite/' + $entry[1] + '/' + $file) -OutFile (Join-Path $pmdRoot $file)
    }
    [xml]$xml = Get-Content (Join-Path $pmdRoot 'AnimData.xml')
    $animations = [ordered]@{}
    foreach ($pair in @(@('idle', 'Idle'), @('walk', 'Walk'), @('sleep', 'Sleep'), @('sit', 'Idle'), @('dragged', 'Idle'), @('react', 'Pose'))) {
        $meta = $xml.AnimData.Anims.Anim | Where-Object { $_.Name -eq $pair[1] } | Select-Object -First 1
        $file = $pair[1] + '-Anim.png'
        $imagePath = Join-Path $pmdRoot $file
        if (!(Test-Path -LiteralPath $imagePath)) {
            Invoke-WebRequest ($assetBase + '/sprite/' + $entry[1] + '/' + $file) -OutFile $imagePath
        }
        $fw = [int]$meta.FrameWidth
        $fh = [int]$meta.FrameHeight
        $durations = @($meta.Durations.Duration | ForEach-Object { [int]$_ })
        $bitmap = [System.Drawing.Bitmap]::new($imagePath)
        try {
            $rows = @()
            for ($row = 0; $row -lt $bitmap.Height / $fh; $row++) {
                $frames = @()
                for ($col = 0; $col -lt $durations.Count; $col++) {
                    $minX = $fw; $minY = $fh; $maxX = -1; $maxY = -1
                    for ($y = 0; $y -lt $fh; $y++) {
                        for ($x = 0; $x -lt $fw; $x++) {
                            if ($bitmap.GetPixel($col * $fw + $x, $row * $fh + $y).A -gt 0) {
                                $minX = [Math]::Min($minX, $x); $maxX = [Math]::Max($maxX, $x)
                                $minY = [Math]::Min($minY, $y); $maxY = [Math]::Max($maxY, $y)
                            }
                        }
                    }
                    if ($maxX -lt 0) { $minX = 0; $minY = 0; $maxX = $fw - 1; $maxY = $fh - 1 }
                    $frames += @{ sx = $col * $fw + $minX; sy = $row * $fh + $minY; sw = $maxX - $minX + 1; sh = $maxY - $minY + 1 }
                }
                $rows += ,$frames
            }
            $animations[$pair[0]] = @{
                sheet = 'pmd/' + $file; frameWidth = $fw; frameHeight = $fh
                frameCount = $durations.Count; fps = 60.0 * $durations.Count / ($durations | Measure-Object -Sum).Sum
                loop = $pair[0] -ne 'react'; displaySize = 96; pixelArt = $true; sourceFrames = $rows
            }
        } finally { $bitmap.Dispose() }
    }
    $configPath = Join-Path $petRoot 'species.json'
    if (!(Test-Path (Join-Path $petRoot 'species-illustration-backup.json'))) {
        Copy-Item -LiteralPath $configPath -Destination (Join-Path $petRoot 'species-illustration-backup.json')
    }
    $config = @{
        id = $entry[0]; displayName = $entry[2]; version = '0.2.0'; animations = $animations
        behavior = @{ walkSpeedPxPerSec = 45; idleMinMs = 1200; idleMaxMs = 3500; walkMinMs = 8000; walkMaxMs = 16000; spriteScale = 3 }
        attribution = @{ author = 'CHUNSOFT (see pmd/credits.txt)'; license = 'Original game sprites; rights remain with their owners. Repository license does not replace original game rights.'; sourceUrl = 'https://github.com/PMDCollab/SpriteCollab/tree/master/sprite/' + $entry[1] }
    }
    [System.IO.File]::WriteAllText($configPath, ($config | ConvertTo-Json -Depth 15), [System.Text.UTF8Encoding]::new($false))
    @"
Directional sprite source: $assetBase/sprite/$($entry[1])
Original credits: CHUNSOFT (full animation credits in pmd/credits.txt).
Images have not been modified. sourceFrames records alpha bounds for drawing.
Personal local assets, excluded from Git. Original game artwork rights remain with their owners.
"@ | Set-Content -LiteralPath (Join-Path $petRoot 'SPRITE-CREDITS.txt') -Encoding utf8
    Write-Output ($entry[0] + ': directional frames configured')
}
