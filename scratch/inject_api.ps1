$rootDir = (Get-Item .).FullName
Get-ChildItem -Path . -Filter *.html -Recurse | Where-Object { $_.FullName -notlike "*\.git\*" -and $_.FullName -notlike "*\.gemini\*" -and $_.FullName -notlike "*\.agents\*" } | ForEach-Object {
    $filePath = $_.FullName
    $relative = Resolve-Path -Path $filePath -Relative
    
    $cleanPath = $relative.TrimStart(".\")
    $parts = $cleanPath -split '[\\/]'
    $depth = $parts.Length - 1
    
    if ($depth -eq 0) {
        $apiPath = "js/api.js"
    } elseif ($depth -eq 1) {
        $apiPath = "../js/api.js"
    } elseif ($depth -eq 2) {
        $apiPath = "../../js/api.js"
    } else {
        $prefix = ""
        for ($i = 0; $i -lt $depth; $i++) {
            $prefix += "../"
        }
        $apiPath = "${prefix}js/api.js"
    }

    $content = Get-Content -Raw -Path $filePath -Encoding utf8
    if ($content -like "*api.js*") {
        Write-Host "[ALREADY] $cleanPath"
        return
    }

    $scriptTag = "<script src=""$apiPath""></script>"
    $updated = $false

    if ($content -match "(<script\s+[^>]*src=[`"'][^`"']*base\.js[`"'][^>]*>\s*</script>)") {
        $matched = $Matches[1]
        $replacement = "$scriptTag`r`n    $matched"
        $content = $content -replace [regex]::Escape($matched), $replacement
        $updated = $true
    }
    elseif ($content -match "(<script\s+[^>]*src=[`"'][^`"']*app\.js[`"'][^>]*>\s*</script>)") {
        $matched = $Matches[1]
        $replacement = "$scriptTag`r`n    $matched"
        $content = $content -replace [regex]::Escape($matched), $replacement
        $updated = $true
    }
    elseif ($content -match "(</body>)") {
        $matched = $Matches[1]
        $replacement = "    $scriptTag`r`n$matched"
        $content = $content -replace [regex]::Escape($matched), $replacement
        $updated = $true
    }

    if ($updated) {
        [System.IO.File]::WriteAllText($filePath, $content, [System.Text.Encoding]::UTF8)
        Write-Host "[INJECTED] $cleanPath -> $apiPath"
    } else {
        Write-Host "[SKIP] $cleanPath"
    }
}
