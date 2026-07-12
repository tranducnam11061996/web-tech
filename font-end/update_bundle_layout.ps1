$file = 'D:\web-tech\font-end\src\styles\style.css'
$lines = [System.IO.File]::ReadAllLines($file)

$startIndex = -1
$endIndex = -1

for ($i=0; $i -lt $lines.Length; $i++) {
    if ($lines[$i] -match "^\.product-bundle-item-bottom \{") {
        $startIndex = $i
    }
    if ($startIndex -ne -1 -and $lines[$i] -match "^\.product-bundle-item-price-col \{") {
        $endIndex = $i - 1
        break
    }
}

if ($startIndex -ne -1 -and $endIndex -ne -1) {
    $before = $lines[0..($startIndex - 1)]
    $after = $lines[($endIndex + 1)..($lines.Length - 1)]
    
    $newBlock = @'
.product-bundle-item-bottom {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
}
'@
    $newLines = $newBlock -split "`n"
    $result = $before + $newLines + $after
    [System.IO.File]::WriteAllLines($file, $result)
    Write-Host "Replaced bundle item bottom CSS lines $startIndex to $endIndex"
} else {
    Write-Host "Could not find bundle item bottom CSS section bounds."
}
