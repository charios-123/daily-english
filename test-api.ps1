$apiKey = $env:ZHIPU_API_KEY
if (-not $apiKey) { Write-Host "请先设置环境变量 ZHIPU_API_KEY（可在 backend-go/.env 中配置）"; exit 1 }
$id = $apiKey.Split(".")[0]
$secret = $apiKey.Split(".")[1]

$header = '{"alg":"HS256","sign_type":"SIGN"}'
$encodedHeader = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($header)) -replace '\+','-' -replace '/','_' -replace '='

$now = [int](Get-Date -UFormat %s)
$payload = "{`"api_key`":`"$id`",`"exp`":$($now+3600),`"timestamp`":$now}"
$encodedPayload = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($payload)) -replace '\+','-' -replace '/','_' -replace '='

$content = "$encodedHeader.$encodedPayload"
$hmac = New-Object System.Security.Cryptography.HMACSHA256([System.Text.Encoding]::UTF8.GetBytes($secret))
$signature = $hmac.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($content))
$encodedSignature = [Convert]::ToBase64String($signature) -replace '\+','-' -replace '/','_' -replace '='

$jwt = "$encodedHeader.$encodedPayload.$encodedSignature"
Write-Host "JWT Token: $jwt"
Write-Host "JWT Length: $($jwt.Length)"

$body = @"
{
    "model": "glm-4-flash",
    "messages": [
        {"role": "user", "content": "hello"}
    ]
}
"@

Write-Host "`nSending request to Zhipu API..."
try {
    $response = Invoke-WebRequest -Uri "https://open.bigmodel.cn/api/paas/v4/chat/completions" -Method POST -ContentType "application/json" -Headers @{"Authorization"="Bearer $jwt"} -Body $body -TimeoutSec 30
    Write-Host "Response Code: $($response.StatusCode)"
    Write-Host "Response: $($response.Content)"
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Error Body: $($reader.ReadToEnd())"
    }
}
