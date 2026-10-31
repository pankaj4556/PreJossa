import urllib.request
import urllib.parse
import http.cookiejar
import json
import io

print("--- Starting End-to-End Payment & Download Acceptance Test ---")

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

# 1. Login as Student
login_data = json.dumps({'email': 'student@josaa.in', 'password': 'student123'}).encode('utf-8')
req = urllib.request.Request('http://localhost:3000/api/auth/login', data=login_data, headers={'Content-Type': 'application/json'})
resp = opener.open(req)
user_info = json.loads(resp.read().decode('utf-8'))
print("1. Logged in as student:", user_info['user']['email'])

# 2. Check initial payment status for Choice List #2
req = urllib.request.Request('http://localhost:3000/api/payment-status/2')
resp = opener.open(req)
status_data = json.loads(resp.read().decode('utf-8'))
print("2. Initial payment status:", status_data['status'], "| Unlocked:", status_data['isUnlocked'])
assert status_data['isUnlocked'] == False

# 3. Try downloading without payment (Must be blocked with HTTP 403)
try:
    req = urllib.request.Request('http://localhost:3000/api/download/pdf/2')
    opener.open(req)
    print("ERROR: Download succeeded when it should be locked!")
except urllib.error.HTTPError as e:
    print(f"3. Download correctly locked: HTTP {e.code} ({e.reason})")
    assert e.code == 403

# 4. Submit Payment Proof using Multipart FormData
boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
body = io.BytesIO()

def add_field(name, val):
    body.write(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{val}\r\n'.encode('utf-8'))

def add_file(name, filename, file_bytes):
    body.write(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"; filename="{filename}"\r\nContent-Type: image/png\r\n\r\n'.encode('utf-8'))
    body.write(file_bytes)
    body.write(b'\r\n')

add_field('choiceListId', '2')
add_field('upiReferenceId', '428909871234')

# Sample 1x1 png bytes
png_1x1 = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82'
add_file('proofImage', 'payment-screenshot.png', png_1x1)
body.write(f'--{boundary}--\r\n'.encode('utf-8'))

body_bytes = body.getvalue()
req = urllib.request.Request('http://localhost:3000/api/submit-payment', data=body_bytes, headers={
    'Content-Type': f'multipart/form-data; boundary={boundary}'
})
resp = opener.open(req)
sub_data = json.loads(resp.read().decode('utf-8'))
print("4. Payment submitted successfully. ID:", sub_data['payment']['paymentId'], "| Status:", sub_data['payment']['status'])
payment_id = sub_data['payment']['paymentId']

# 5. Check status is now 'pending'
req = urllib.request.Request('http://localhost:3000/api/payment-status/2')
resp = opener.open(req)
status_data = json.loads(resp.read().decode('utf-8'))
print("5. Current status:", status_data['status'], "| Unlocked:", status_data['isUnlocked'])
assert status_data['status'] == 'pending'
assert status_data['isUnlocked'] == False

# 6. Admin Login in separate cookie session
admin_cj = http.cookiejar.CookieJar()
admin_opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(admin_cj))

admin_login_data = urllib.parse.urlencode({'username': 'admin', 'password': 'admin123'}).encode('utf-8')
req = urllib.request.Request('http://localhost:3000/admin/login', data=admin_login_data, headers={'Content-Type': 'application/x-www-form-urlencoded'})
admin_opener.open(req)
print("6. Admin logged in successfully.")

# 7. Admin Approves Payment
req = urllib.request.Request(f'http://localhost:3000/admin/payments/{payment_id}/approve', data=b'{}', headers={'Content-Type': 'application/json'})
resp = admin_opener.open(req)
appr_data = json.loads(resp.read().decode('utf-8'))
print("7. Admin approved payment:", appr_data['message'])

# 8. Student checks status -> now 'approved' and unlocked!
req = urllib.request.Request('http://localhost:3000/api/payment-status/2')
resp = opener.open(req)
status_data = json.loads(resp.read().decode('utf-8'))
print("8. Student status:", status_data['status'], "| Unlocked:", status_data['isUnlocked'])
assert status_data['isUnlocked'] == True

# 9. Download all 4 formats (PDF, Excel, Word, CSV)
formats = ['pdf', 'xlsx', 'docx', 'csv']
for fmt in formats:
    req = urllib.request.Request(f'http://localhost:3000/api/download/{fmt}/2')
    resp = opener.open(req)
    content = resp.read()
    print(f"9. Successfully downloaded {fmt.upper()} ({len(content)} bytes) - Content-Type: {resp.headers.get('Content-Type')}")
    assert len(content) > 100

print("=== ALL ACCEPTANCE TEST CRITERIA PASSED SUCCESSFULLY! ===")
