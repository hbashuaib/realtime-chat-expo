# update-bashchat-hosts.ps1
# Run as Administrator

function Get-WifiIP {
    param([string]$wifiAlias = "Wi-Fi 2")

    # Grab the IPv4 address from the specified Wi-Fi adapter
    $ip = Get-NetIPAddress -InterfaceAlias $wifiAlias -AddressFamily IPv4 `
        | Where-Object { $_.IPAddress -like "192.168.*" -and $_.PrefixOrigin -eq "Dhcp" } `
        | Select-Object -First 1 -ExpandProperty IPAddress

    return $ip
}

function Update-HostsFile {
    param([string]$ip)

    $hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
    $content   = Get-Content $hostsPath

    # Remove any existing bashchat.local entries
    $filtered = $content | Where-Object { $_ -notmatch "bashchat.local" }

    # Add the new mapping
    $newLine = "$ip bashchat.local"
    $filtered += $newLine

    # Write back to hosts file
    Set-Content -Path $hostsPath -Value $filtered -Force
    Write-Host "Updated hosts file: $newLine"
}

# Main
$wifiIP = Get-WifiIP
if ($wifiIP) {
    Update-HostsFile -ip $wifiIP
} else {
    Write-Host "No Wi-Fi IP found for adapter 'Wi-Fi 2'"
}